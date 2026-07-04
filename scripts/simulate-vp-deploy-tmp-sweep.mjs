/**
 * Benchmark warm-container /tmp sweep: sequential vs parallel vs time budget.
 * Mirrors lib/vp-deploy.ts (SWEEP_TIME_BUDGET_MS=20000, SWEEP_DELETE_CONCURRENCY=8).
 */
import fs from 'fs/promises';
import path from 'path';

const SIM_TAG = 'simbench';
const SWEEP_TIME_BUDGET_MS = 20_000;
const SWEEP_DELETE_CONCURRENCY = 8;
/** Artificial per-delete latency to simulate slow rm of large vp-build-* trees. */
const SIMULATED_DELETE_MS = 400;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function isVpDeployTmpLeftoverEntry(name) {
  if (name === '.npm-cache') return true;
  if (name.startsWith('vp-build-')) return true;
  if (name.startsWith('vp-artifact-dl-') && name.endsWith('.tar.gz')) return true;
  if (name.startsWith('vp-node-modules-') && (name.endsWith('.tar.gz') || name.endsWith('.json'))) {
    return true;
  }
  if (name.startsWith('vp-npm-cache-')) return true;
  if (name.startsWith('vp-artifact-')) return true;
  return false;
}

function leftoverSortKeyMs(name, mtimeMs) {
  if (name.startsWith('vp-build-')) {
    const last = name.slice(name.lastIndexOf('-') + 1);
    const parsed = Number(last);
    if (Number.isFinite(parsed) && parsed > 1_000_000_000_000) return parsed;
  }
  return mtimeMs;
}

async function sortLeftoversOldestFirst(names, mtimeByName) {
  const keyed = names.map((name) => ({
    name,
    sortKey: leftoverSortKeyMs(name, mtimeByName.get(name) ?? Number.MAX_SAFE_INTEGER),
  }));
  keyed.sort((a, b) => a.sortKey - b.sortKey || a.name.localeCompare(b.name));
  return keyed.map((k) => k.name);
}

async function removeEntry(name, simulateSlow) {
  if (simulateSlow) await sleep(SIMULATED_DELETE_MS);
  await fs.rm(path.join('/tmp', name), { recursive: true, force: true });
}

async function sweepSequential(names, mtimeByName, simulateSlow) {
  const sorted = await sortLeftoversOldestFirst(names, mtimeByName);
  const removed = [];
  const started = Date.now();
  for (const name of sorted) {
    await removeEntry(name, simulateSlow);
    removed.push(name);
  }
  return { removed, remaining: [], ms: Date.now() - started, budgetExceeded: false };
}

async function sweepParallelTimed(names, mtimeByName, budgetMs, concurrency, simulateSlow) {
  const sorted = await sortLeftoversOldestFirst(names, mtimeByName);
  const removed = [];
  const started = Date.now();
  let i = 0;
  let budgetExceeded = false;

  while (i < sorted.length) {
    if (Date.now() - started >= budgetMs) {
      budgetExceeded = true;
      break;
    }
    const batch = sorted.slice(i, i + concurrency);
    i += batch.length;
    await Promise.all(
      batch.map(async (name) => {
        await removeEntry(name, simulateSlow);
        removed.push(name);
      })
    );
  }

  const remaining = sorted.filter((n) => !removed.includes(n));
  if (remaining.length > 0 && Date.now() - started >= budgetMs) budgetExceeded = true;

  return { removed, remaining, ms: Date.now() - started, budgetExceeded };
}

async function createDebris(count) {
  const names = [];
  const mtimeByName = new Map();
  const baseTs = Date.now() - count * 60_000;

  for (let i = 0; i < count; i++) {
    const ts = baseTs + i * 60_000;
    const name = `vp-build-${SIM_TAG}-${String(i).padStart(2, '0')}-${ts}`;
    const dir = path.join('/tmp', name);
    await fs.mkdir(path.join(dir, 'node_modules', 'fake-pkg'), { recursive: true });
    await fs.writeFile(path.join(dir, 'node_modules', 'fake-pkg', 'index.js'), 'x'.repeat(8192));
    await fs.writeFile(path.join(dir, 'package.json'), '{}');
    names.push(name);
    mtimeByName.set(name, ts);
  }

  // Small cache/file debris (cleared quickly — oldest vp-build dirs prioritized first).
  const extras = [
    `vp-artifact-dl-${SIM_TAG}.tar.gz`,
    `vp-node-modules-${SIM_TAG}.tar.gz`,
    `.npm-cache-${SIM_TAG}`,
  ];
  for (const name of extras) {
    const target = path.join('/tmp', name);
    if (name.endsWith('.tar.gz')) {
      await fs.writeFile(target, Buffer.alloc(64 * 1024));
    } else {
      await fs.mkdir(target, { recursive: true });
    }
    names.push(name);
    mtimeByName.set(name, baseTs - 120_000);
  }

  return { names, mtimeByName };
}

async function cleanupSim(names) {
  for (const name of names) {
    await fs.rm(path.join('/tmp', name), { recursive: true, force: true }).catch(() => {});
  }
}

async function runBenchmark(label, count, mode, budgetMs) {
  const { names, mtimeByName } = await createDebris(count);
  const leftovers = names.filter(isVpDeployTmpLeftoverEntry);
  let result;

  if (mode === 'sequential') {
    result = await sweepSequential(leftovers, mtimeByName, true);
  } else {
    result = await sweepParallelTimed(
      leftovers,
      mtimeByName,
      budgetMs,
      SWEEP_DELETE_CONCURRENCY,
      true
    );
  }

  console.log(`\n--- ${label} ---`);
  console.log(`entries: ${leftovers.length}, mode: ${mode}, budget: ${budgetMs}ms`);
  console.log(`cleared: ${result.removed.length}, remaining: ${result.remaining.length}`);
  console.log(`wall time: ${result.ms}ms, budgetExceeded: ${result.budgetExceeded}`);
  if (result.remaining.length) {
    console.log(`remaining (first 5): ${result.remaining.slice(0, 5).join(', ')}`);
  }
  if (result.removed.length) {
    console.log(`first removed (oldest): ${result.removed[0]}`);
  }

  await cleanupSim(names.filter((n) => result.remaining.includes(n)));
  return result;
}

const DIR_COUNT = 48;

console.log(
  `VP deploy /tmp sweep benchmark (${DIR_COUNT} vp-build dirs + extras, ${SIMULATED_DELETE_MS}ms simulated delete each)\n`
);

const sequential = await runBenchmark(
  'SEQUENTIAL (old behavior)',
  DIR_COUNT,
  'sequential',
  Infinity
);

const parallel = await runBenchmark(
  'PARALLEL (concurrency=8, no budget cap)',
  DIR_COUNT,
  'parallel',
  SWEEP_TIME_BUDGET_MS
);

const budgetTest = await runBenchmark(
  'PARALLEL + 2s budget (overflow test)',
  DIR_COUNT,
  'parallel',
  2_000
);

const speedup = (sequential.ms / parallel.ms).toFixed(1);
console.log('\n=== SUMMARY ===');
console.log(`Sequential: ${sequential.ms}ms (${sequential.removed.length} cleared)`);
console.log(`Parallel:   ${parallel.ms}ms (${parallel.removed.length} cleared) — ~${speedup}x faster`);
console.log(
  `Budget 2s:  ${budgetTest.ms}ms — cleared ${budgetTest.removed.length}/${DIR_COUNT + 3}, ` +
    `remaining ${budgetTest.remaining.length}, budgetExceeded=${budgetTest.budgetExceeded}`
);

if (budgetTest.remaining.length === 0) {
  console.error('Budget test FAILED — expected remaining entries');
  process.exit(1);
}
if (!budgetTest.budgetExceeded) {
  console.error('Budget test FAILED — expected budgetExceeded=true');
  process.exit(1);
}
if (parallel.ms >= sequential.ms) {
  console.error('Parallel benchmark FAILED — expected faster than sequential');
  process.exit(1);
}

console.log('Benchmark PASSED');
