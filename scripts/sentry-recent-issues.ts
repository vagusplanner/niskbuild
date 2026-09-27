/**
 * Pull recent unresolved Sentry issues for SuperEduc8 / NiskBuild production.
 *
 * Important: this org's events live on the **EU (de)** region host
 * `https://de.sentry.io` — `https://sentry.io` authenticates but returns
 * zero projects for the same token (empty /api/0/projects/).
 *
 * Usage: npx tsx scripts/sentry-recent-issues.ts
 */
import { readFileSync } from 'node:fs';

function loadEnv() {
  for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!process.env[m[1]]) process.env[m[1]] = v;
  }
}

loadEnv();

const TOKEN = process.env.SENTRY_AUTH_TOKEN?.trim();
const ORG = process.env.SENTRY_ORG?.trim() || 'sofiane-kemih';
const PROJECT = process.env.SENTRY_PROJECT?.trim() || 'javascript-nextjs';
/** EU region — required for this account's project listing / issues API. */
const SENTRY_URL = (process.env.SENTRY_URL || 'https://de.sentry.io').replace(/\/$/, '');

async function main() {
  if (!TOKEN) throw new Error('SENTRY_AUTH_TOKEN missing in .env.local');

  const headers = { Authorization: `Bearer ${TOKEN}` };

  const projectsRes = await fetch(`${SENTRY_URL}/api/0/projects/`, { headers });
  if (!projectsRes.ok) {
    throw new Error(`projects ${projectsRes.status}: ${await projectsRes.text()}`);
  }
  const projects = (await projectsRes.json()) as Array<{
    slug: string;
    organization?: { slug?: string };
  }>;
  console.log(
    'projects',
    projects.map((p) => `${p.organization?.slug}/${p.slug}`)
  );
  if (projects.length === 0) {
    throw new Error(
      `No projects from ${SENTRY_URL} — wrong region? (US sentry.io returns [] for this token)`
    );
  }

  const qs = new URLSearchParams({
    query: 'is:unresolved lastSeen:-24h',
    sort: 'freq',
    limit: '25',
  });
  const issuesRes = await fetch(
    `${SENTRY_URL}/api/0/projects/${ORG}/${PROJECT}/issues/?${qs}`,
    { headers }
  );
  if (!issuesRes.ok) {
    throw new Error(`issues ${issuesRes.status}: ${await issuesRes.text()}`);
  }
  const issues = (await issuesRes.json()) as Array<{
    title: string;
    culprit?: string;
    count?: string;
    lastSeen?: string;
    permalink?: string;
  }>;

  console.log(`unresolved_24h (${ORG}/${PROJECT})`, issues.length);
  for (const issue of issues) {
    console.log(
      '-',
      issue.count,
      issue.title,
      '|',
      issue.culprit || '',
      '| last',
      issue.lastSeen
    );
    if (issue.permalink) console.log(' ', issue.permalink);
  }

  console.log('\nPASS sentry recent issues (DE region)');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
