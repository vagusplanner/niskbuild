/**
 * Local simulation: create fake warm-container debris in /tmp, run the same sweep
 * patterns as lib/vp-deploy.ts, report before/after disk + listings.
 *
 * Only removes debris created by this script (SIM_TAG). Logs what a full production
 * sweep would additionally target if other VP leftovers exist in /tmp.
 */
import fs from 'fs/promises';
import path from 'path';

const SIM_TAG = 'simdeadbeef';

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

async function readTmpDiskStats() {
  const stats = await fs.statfs('/tmp');
  const bavail = Number(stats.bavail);
  const blocks = Number(stats.blocks);
  const bsize = Number(stats.bsize);
  return {
    freeMb: (bavail * bsize) / (1024 * 1024),
    totalMb: (blocks * bsize) / (1024 * 1024),
  };
}

async function logState(label) {
  const disk = await readTmpDiskStats();
  const names = (await fs.readdir('/tmp')).sort();
  const leftovers = names.filter(isVpDeployTmpLeftoverEntry);
  console.log(`\n=== ${label} ===`);
  console.log(`disk: free=${disk.freeMb.toFixed(1)}MB total=${disk.totalMb.toFixed(1)}MB`);
  console.log(`/tmp: ${names.length} entries`);
  console.log(`VP leftovers (${leftovers.length}): ${leftovers.join(', ') || '(none)'}`);
  return { disk, leftovers, names };
}

async function sweepSimDebris(createdNames) {
  const removed = [];
  for (const name of createdNames) {
    try {
      await fs.rm(path.join('/tmp', name), { recursive: true, force: true });
      removed.push(name);
    } catch {
      // already gone
    }
  }
  return removed;
}

const debris = [
  { type: 'dir', name: `vp-build-${SIM_TAG}-1111111111111` },
  { type: 'dir', name: `vp-build-${SIM_TAG}-2222222222222` },
  { type: 'file', name: `vp-artifact-dl-vp-build-${SIM_TAG}.tar.gz`, bytes: 512 * 1024 },
  { type: 'file', name: `vp-node-modules-${SIM_TAG}.tar.gz`, bytes: 1024 * 1024 },
  { type: 'file', name: `vp-node-modules-${SIM_TAG}.json`, bytes: 128 },
  { type: 'dir', name: `vp-npm-cache-${SIM_TAG}` },
  { type: 'dir', name: `vp-artifact-${SIM_TAG}XXXXXX` },
  { type: 'dir', name: `.npm-cache-${SIM_TAG}` },
];

const createdNames = debris.map((d) => d.name);

console.log('Creating simulated warm-container debris in /tmp…');
for (const item of debris) {
  const target = path.join('/tmp', item.name);
  if (item.type === 'dir') {
    await fs.mkdir(target, { recursive: true });
    await fs.writeFile(path.join(target, 'placeholder.txt'), 'sim');
  } else {
    await fs.writeFile(target, Buffer.alloc(item.bytes ?? 0, 0xab));
  }
  console.log(`  + ${item.name}`);
}

// Also create real-pattern .npm-cache with marker so we do not clobber an existing cache.
const simNpmCache = path.join('/tmp', '.npm-cache');
try {
  await fs.access(simNpmCache);
  console.log('  (skipped .npm-cache — already exists on this machine)');
} catch {
  await fs.mkdir(simNpmCache, { recursive: true });
  await fs.writeFile(path.join(simNpmCache, `.vp-sim-${SIM_TAG}`), 'sim');
  createdNames.push('.npm-cache');
  console.log('  + .npm-cache (sim marker only)');
}

const before = await logState('BEFORE sweep');

const allLeftovers = before.leftovers;
const preExisting = allLeftovers.filter((n) => !createdNames.includes(n));
if (preExisting.length) {
  console.log(
    `\nNote: ${preExisting.length} pre-existing VP leftover(s) in /tmp (production sweep would remove): ${preExisting.join(', ')}`
  );
}

const removed = await sweepSimDebris(createdNames);
console.log(`\nRemoved ${removed.length} sim entries: ${removed.join(', ')}`);
const after = await logState('AFTER sweep');

const simLeft = after.leftovers.filter((n) => n.includes(SIM_TAG));
if (simLeft.length) {
  console.error('\nSimulation FAILED — sim debris still present:', simLeft);
  process.exit(1);
}

const freedMb = after.disk.freeMb - before.disk.freeMb;
console.log(`\nDisk change: ${freedMb >= 0 ? '+' : ''}${freedMb.toFixed(1)}MB free after removing ~1.5MB sim debris`);
console.log('Simulation PASSED');
