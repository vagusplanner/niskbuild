/**
 * Pre-launch generation + partial-edit safety audit.
 * Uses the same system prompt text and page-scope logic as production.
 * Writes artifacts under .tmp-gen-audit/ (gitignored via .tmp*)
 */
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import Groq from 'groq-sdk';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const outDir = resolve(root, '.tmp-gen-audit');
mkdirSync(outDir, { recursive: true });

// Load .env.local without printing secrets
const envPath = resolve(root, '.env.local');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m || process.env[m[1]]) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    process.env[m[1]] = v;
  }
}

const GROQ_CODE_MODEL = 'openai/gpt-oss-120b';
const CODE_MAX_TOKENS = 8192; // stream route value

// Inline the production system prompt (keep in sync with lib/html-code-system-prompt.ts)
const HTML_CODE_SYSTEM_PROMPT = readFileSync(
  resolve(root, 'lib/html-code-system-prompt.ts'),
  'utf8'
)
  .match(/export const HTML_CODE_SYSTEM_PROMPT = `([\s\S]*?)`;/)?.[1];

if (!HTML_CODE_SYSTEM_PROMPT) {
  console.error('Failed to extract HTML_CODE_SYSTEM_PROMPT');
  process.exit(1);
}

// Minimal ports of project-pages helpers used in production merge/scope
function isHtmlPage(path) {
  return /\.html?$/i.test(path);
}
function listHtmlPages(files) {
  return files.filter((f) => isHtmlPage(f.path));
}
function pageDisplayLabel(path) {
  const base = path.replace(/^pages\//, '').replace(/\.(html|htm)$/i, '');
  if (base === 'index') return 'Home';
  return base.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
function extractTag(html, tag) {
  const m = html.match(new RegExp(`<${tag}[^>]*>([^<]{1,120})</${tag}>`, 'i'));
  return m?.[1]?.trim();
}
function extractHeadBlock(html) {
  const m = html.match(/<head[\s\S]*?<\/head>/i);
  return m ? m[0] : '<head><title>App</title></head>';
}
function extractNavBlock(html) {
  const m = html.match(/<nav[\s\S]*?<\/nav>/i);
  return m?.[0] ?? '';
}
function truncateHtmlForEditContext(html, maxChars) {
  const trimmed = html.trim();
  if (!trimmed || trimmed.length <= maxChars) return trimmed;
  const head = extractHeadBlock(trimmed);
  const nav = extractNavBlock(trimmed);
  const rootVars = [];
  for (const block of trimmed.match(/<style[\s\S]*?<\/style>/gi) ?? []) {
    const root = block.match(/:root\s*\{[\s\S]*?\}/i);
    if (root) rootVars.push(root[0]);
  }
  let priority = [
    '<!-- PRIORITY: head / design tokens / nav (truncated for context) -->',
    head,
    rootVars.length ? `<style>\n${rootVars.join('\n')}\n</style>` : '',
    nav,
  ]
    .filter(Boolean)
    .join('\n');
  if (priority.length > maxChars) return `${priority.slice(0, maxChars)}\n<!-- …truncated… -->`;
  const remaining = maxChars - priority.length - 80;
  const bodyMatch = trimmed.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  let bodySlice = bodyMatch?.[1]?.trim() ?? trimmed;
  if (nav && bodySlice.includes(nav)) {
    bodySlice = bodySlice.replace(nav, '<!-- nav omitted — see above -->');
  }
  if (bodySlice.length <= remaining) return `${priority}\n<!-- BODY -->\n${bodySlice}`;
  return `${priority}\n<!-- BODY (truncated) -->\n${bodySlice.slice(0, remaining)}\n<!-- …truncated… -->`;
}

function inferProjectContext({ files, activePage, generatedCode }) {
  const pages = listHtmlPages(files);
  const indexContent =
    files.find((f) => f.path === 'index.html')?.content?.trim() || generatedCode;
  return {
    activePage,
    pageLabel: pageDisplayLabel(activePage),
    allPages: pages.map((p) => p.path),
    projectTitle: extractTag(indexContent, 'title'),
    primaryHeading: extractTag(indexContent, 'h1'),
    siteKind: 'saas',
    isExistingProject: indexContent.length > 200 && indexContent.includes('<'),
  };
}

function buildPageScopedPrompt(userPrompt, ctx, sources) {
  if (!ctx.isExistingProject) return userPrompt;
  const others = ctx.allPages.filter((p) => p !== ctx.activePage).join(', ') || 'none yet';
  const indexSnippet = sources?.indexHtml
    ? truncateHtmlForEditContext(sources.indexHtml, 14000)
    : '';
  const activeIsIndex = ctx.activePage === 'index.html';
  const activeSnippet =
    !activeIsIndex && sources?.activeHtml && sources.activeHtml !== sources.indexHtml
      ? truncateHtmlForEditContext(sources.activeHtml, 10000)
      : '';
  const referenceBlocks = [];
  if (indexSnippet) {
    referenceBlocks.push(
      `--- EXISTING index.html (design system / nav reference) ---\n${indexSnippet}\n---`
    );
  }
  if (activeSnippet) {
    referenceBlocks.push(
      `--- CURRENT ${ctx.activePage} (edit this file; preserve its structure unless asked to change) ---\n${activeSnippet}\n---`
    );
  }
  const referenceSection = referenceBlocks.length
    ? `\n${referenceBlocks.join('\n\n')}\n`
    : '\n(No prior HTML available — invent a cohesive design and keep it consistent.)\n';
  return `MULTI-PAGE PROJECT — edit one HTML file only.

Project: ${ctx.projectTitle || ctx.primaryHeading || 'User app'}
Site type: ${ctx.siteKind || 'website'}
Active page: ${ctx.pageLabel} (${ctx.activePage})
Other pages: ${others}
${referenceSection}
Rules:
- Return ONE complete HTML document for ${ctx.activePage} only (<!DOCTYPE html> … </html>).
- Reuse the existing color palette, CSS variables, typography (Google Fonts), spacing, and navigation from the reference HTML above — do not invent a new visual system.
- Link nav items to sibling pages (${others}) using relative paths.
- Do not output markdown fences or explanations.

User request:
${userPrompt}`;
}

function mergeGeneratedIntoFiles(files, activePage, rawCode) {
  const cleaned = rawCode.trim();
  const exists = files.some((f) => f.path === activePage);
  if (exists) {
    return files.map((f) => (f.path === activePage ? { ...f, content: cleaned } : f));
  }
  return [...files, { path: activePage, name: activePage.split('/').pop(), content: cleaned }];
}

function sha(s) {
  return createHash('sha256').update(s).digest('hex').slice(0, 16);
}

function analyzeHtml(html, label) {
  const hasDoctype = /<!DOCTYPE html>/i.test(html);
  const hasTailwindCdn = /cdn\.tailwindcss\.com/i.test(html);
  const hasGoogleFonts = /fonts\.googleapis\.com/i.test(html);
  const hasRootVars = /:root\s*\{/i.test(html);
  const hasLorem = /lorem ipsum/i.test(html);
  const banned = ['Unlock', 'Take it to the next level', 'Seamless experience', 'Revolutionize'];
  const bannedHits = banned.filter((b) => html.includes(b));
  const scriptBlocks = (html.match(/<script[\s\S]*?<\/script>/gi) || []).length;
  const interactive =
    /<(button|input|select|textarea|form)\b/i.test(html) ||
    /\bonclick\s*=/i.test(html) ||
    /addEventListener/i.test(html);
  const charts =
    /chart|canvas|svg.*path|recharts|Chart\.js|new Chart/i.test(html);
  const kanban = /kanban|drag|todo|in.?progress|done|column/i.test(html);
  const tasks = /task/i.test(html);
  const incomplete = /\/\/ TODO|placeholder|coming soon|lorem/i.test(html);
  const endsHtml = /<\/html>\s*$/i.test(html.trim());
  const fontLinks = (html.match(/fonts\.googleapis\.com\/css2?\?[^"']+/gi) || []).length;

  // Rough "AI slop" signals
  const indigoSlate = /indigo-|slate-|#3498db|#4567b7/i.test(html);
  const creamTerracotta = /#F4F1EA|#E07A5F|terracotta|cream/i.test(html);

  return {
    label,
    chars: html.length,
    hasDoctype,
    hasTailwindCdn,
    hasGoogleFonts,
    fontLinks,
    hasRootVars,
    hasLorem,
    bannedHits,
    scriptBlocks,
    interactive,
    charts,
    kanban,
    tasks,
    incomplete,
    endsHtml,
    indigoSlate,
    creamTerracotta,
    sha: sha(html),
    title: extractTag(html, 'title') || null,
    h1: extractTag(html, 'h1') || null,
  };
}

async function generate(prompt, tag) {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) throw new Error('GROQ_API_KEY missing');
  const groq = new Groq({ apiKey });
  const started = Date.now();
  console.log(`\n=== Generating [${tag}] with ${GROQ_CODE_MODEL} (max_tokens=${CODE_MAX_TOKENS}) ===`);
  console.log(`Prompt chars: ${prompt.length}`);

  const completion = await groq.chat.completions.create({
    messages: [
      { role: 'system', content: HTML_CODE_SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ],
    model: GROQ_CODE_MODEL,
    temperature: 0.7,
    max_tokens: CODE_MAX_TOKENS,
  });

  const code = completion.choices[0]?.message?.content || '';
  const finish = completion.choices[0]?.finish_reason ?? null;
  const ms = Date.now() - started;
  const usage = completion.usage || {};
  writeFileSync(resolve(outDir, `${tag}.html`), code);
  writeFileSync(
    resolve(outDir, `${tag}.meta.json`),
    JSON.stringify({ ms, finish, usage, model: GROQ_CODE_MODEL, promptChars: prompt.length }, null, 2)
  );
  console.log(`Done in ${ms}ms | chars=${code.length} | finish=${finish} | usage=${JSON.stringify(usage)}`);
  return { code, finish, ms, usage };
}

function makeSiblingPage(indexHtml, path, marker) {
  const head = extractHeadBlock(indexHtml);
  const nav = extractNavBlock(indexHtml);
  const label = pageDisplayLabel(path);
  return `<!DOCTYPE html>
<html lang="en">
${head.replace(/<title>[^<]*<\/title>/i, `<title>${label} — ${marker}</title>`)}
<body>
${nav}
<main id="page-root" data-page="${path}" data-audit-marker="${marker}">
  <h1>${label}</h1>
  <p>UNIQUE_MARKER_${marker}: This page must survive untouched if another page is edited.</p>
  <ul>
    <li>Item A-${marker}</li>
    <li>Item B-${marker}</li>
    <li>Item C-${marker}</li>
  </ul>
</main>
</body>
</html>`;
}

async function main() {
  const report = { model: GROQ_CODE_MODEL, ranAt: new Date().toISOString() };

  // --- TEST 1: fresh generate ---
  const genPrompt =
    'Build a project management web app called "ForgeBoard" for a small product team. Include: (1) a dashboard with summary metrics and at least one chart, (2) a kanban board with To Do / In Progress / Done columns and sample cards that can be moved, (3) a task list with add/complete/delete. Use a distinctive visual identity (not generic indigo SaaS). Single-page HTML app is fine if sections are clearly separated with nav anchors or tabs. Make it actually interactive with vanilla JS.';

  const gen = await generate(genPrompt, '01-initial');
  const genAnalysis = analyzeHtml(gen.code, 'initial');
  report.generation = { ...genAnalysis, finish: gen.finish, ms: gen.ms, usage: gen.usage };

  // Clean markdown fences if model wrapped (production cleanGeneratedCode does this)
  let indexHtml = gen.code
    .replace(/^```html?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  // --- TEST 2: multi-page project + scoped edit ---
  // Simulate user having added Tasks + Settings pages with unique markers
  const markerTasks = 'TASKS_PAGE_7f3a9c';
  const markerSettings = 'SETTINGS_PAGE_2b8e1d';
  let files = [
    { path: 'index.html', name: 'index.html', content: indexHtml },
    {
      path: 'pages/tasks.html',
      name: 'tasks.html',
      content: makeSiblingPage(indexHtml, 'pages/tasks.html', markerTasks),
    },
    {
      path: 'pages/settings.html',
      name: 'settings.html',
      content: makeSiblingPage(indexHtml, 'pages/settings.html', markerSettings),
    },
  ];

  const beforeHashes = Object.fromEntries(files.map((f) => [f.path, sha(f.content)]));
  writeFileSync(resolve(outDir, '02-before-edit-files.json'), JSON.stringify(beforeHashes, null, 2));

  // Edit ONLY index.html (dashboard color scheme) — same as builder when activeFile=index.html
  const activePage = 'index.html';
  const ctx = inferProjectContext({
    files,
    activePage,
    generatedCode: indexHtml,
  });
  const editUser =
    'Make the dashboard page use a different color scheme: deep forest green and warm cream accents. Keep all functionality. Do not touch other pages.';
  const scoped = buildPageScopedPrompt(editUser, ctx, {
    indexHtml: files.find((f) => f.path === 'index.html').content,
    activeHtml: files.find((f) => f.path === activePage).content,
  });
  writeFileSync(resolve(outDir, '02-scoped-prompt.txt'), scoped);

  const edit = await generate(scoped, '03-edited-index');
  let editedIndex = edit.code
    .replace(/^```html?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  const afterFiles = mergeGeneratedIntoFiles(files, activePage, editedIndex);
  const afterHashes = Object.fromEntries(afterFiles.map((f) => [f.path, sha(f.content)]));

  const tasksBefore = files.find((f) => f.path === 'pages/tasks.html').content;
  const settingsBefore = files.find((f) => f.path === 'pages/settings.html').content;
  const tasksAfter = afterFiles.find((f) => f.path === 'pages/tasks.html').content;
  const settingsAfter = afterFiles.find((f) => f.path === 'pages/settings.html').content;
  const indexAfter = afterFiles.find((f) => f.path === 'index.html').content;

  const preservation = {
    mechanism: 'mergeGeneratedIntoFiles only replaces activePage; other file contents unmodified in memory',
    scopedPromptInjected: scoped.includes('MULTI-PAGE PROJECT — edit one HTML file only'),
    tasksUnchanged: tasksBefore === tasksAfter && tasksAfter.includes(markerTasks),
    settingsUnchanged: settingsBefore === settingsAfter && settingsAfter.includes(markerSettings),
    indexChanged: beforeHashes['index.html'] !== afterHashes['index.html'],
    beforeHashes,
    afterHashes,
    tasksMarkerPresent: tasksAfter.includes(`UNIQUE_MARKER_${markerTasks}`),
    settingsMarkerPresent: settingsAfter.includes(`UNIQUE_MARKER_${markerSettings}`),
    editFinish: edit.finish,
    editChars: editedIndex.length,
    editAnalysis: analyzeHtml(editedIndex, 'edited-index'),
  };

  // Risk case: if user edits while on wrong page OR if model returns multi-file — check model obeyed "one file"
  const modelReturnedMultipleDocs = (editedIndex.match(/<!DOCTYPE html>/gi) || []).length > 1;
  preservation.modelReturnedMultipleDocs = modelReturnedMultipleDocs;
  preservation.modelMentionedOtherPages =
    /pages\/tasks|pages\/settings|SETTINGS_PAGE|TASKS_PAGE/i.test(editedIndex);

  report.partialEdit = preservation;

  // --- TEST 3: edit a sibling page only ---
  const ctx2 = inferProjectContext({
    files: afterFiles,
    activePage: 'pages/tasks.html',
    generatedCode: indexAfter,
  });
  const scoped2 = buildPageScopedPrompt(
    'Add a filter bar to the Tasks page and change the heading color to coral. Keep the UNIQUE_MARKER text.',
    ctx2,
    {
      indexHtml: indexAfter,
      activeHtml: tasksAfter,
    }
  );
  const edit2 = await generate(scoped2, '04-edited-tasks');
  let editedTasks = edit2.code
    .replace(/^```html?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
  const after2 = mergeGeneratedIntoFiles(afterFiles, 'pages/tasks.html', editedTasks);

  const preservation2 = {
    indexUnchanged:
      afterFiles.find((f) => f.path === 'index.html').content ===
      after2.find((f) => f.path === 'index.html').content,
    settingsUnchanged:
      afterFiles.find((f) => f.path === 'pages/settings.html').content ===
      after2.find((f) => f.path === 'pages/settings.html').content,
    tasksChanged:
      afterFiles.find((f) => f.path === 'pages/tasks.html').content !==
      after2.find((f) => f.path === 'pages/tasks.html').content,
    settingsMarkerSurvived: after2
      .find((f) => f.path === 'pages/settings.html')
      .content.includes(markerSettings),
    indexShaBefore: sha(afterFiles.find((f) => f.path === 'index.html').content),
    indexShaAfter: sha(after2.find((f) => f.path === 'index.html').content),
    modelKeptMarker: editedTasks.includes(markerTasks) || editedTasks.includes(`UNIQUE_MARKER_${markerTasks}`),
  };
  report.siblingPageEdit = preservation2;

  writeFileSync(resolve(outDir, 'REPORT.json'), JSON.stringify(report, null, 2));
  console.log('\n========== REPORT ==========');
  console.log(JSON.stringify(report, null, 2));
  console.log(`\nArtifacts in ${outDir}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
