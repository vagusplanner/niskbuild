import 'server-only';

import {
  getDocArticleBySlug,
  listDocArticles,
  searchDocArticles,
} from '@/lib/docs/fetch-articles';
import { searchTips, type TipCard } from '@/lib/tips/tips-data';
import type { BuilderSurfaceContext, NiskCitation } from '@/lib/nisk-context';

export type { BuilderSurfaceContext, NiskCitation };

export type NiskRetrievalResult = {
  /** Block to append to the system prompt */
  contextBlock: string;
  citations: NiskCitation[];
};

const STOP = new Set([
  'a',
  'an',
  'the',
  'to',
  'for',
  'of',
  'in',
  'on',
  'and',
  'or',
  'is',
  'are',
  'how',
  'do',
  'i',
  'my',
  'me',
  'can',
  'what',
  'where',
  'when',
  'with',
  'from',
  'please',
  'help',
  'need',
  'want',
]);

function tokens(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[^a-z0-9+/]+/)
    .filter((t) => t.length > 1 && !STOP.has(t));
}

function tipExcerpt(tip: TipCard): string {
  return `When: ${tip.when}\nWhy: ${tip.why}\nHow: ${tip.how}`;
}

function clip(text: string, max = 700): string {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, max).trim()}…`;
}

/**
 * RAG-lite for Nisk: reuse docs list/search + tips corpus.
 * Pulls short excerpts and citation hrefs — does not duplicate full CMS into the prompt.
 */
export async function retrieveNiskKnowledge(
  query: string,
  userTier?: string
): Promise<NiskRetrievalResult> {
  const q = query.trim();
  if (q.length < 2) {
    return { contextBlock: '', citations: [] };
  }

  const kw = tokens(q);
  const tipHits = searchTips(q, 3);

  let docSummaries = await searchDocArticles(q, userTier);
  if (docSummaries.length === 0 && kw.length > 0) {
    const all = await listDocArticles(userTier);
    const scored = all
      .map((a) => {
        const hay = `${a.title} ${a.category} ${a.slug}`.toLowerCase();
        let score = 0;
        for (const t of kw) {
          if (hay.includes(t)) score += a.title.toLowerCase().includes(t) ? 3 : 1;
        }
        return { a, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .map((x) => x.a);
    docSummaries = scored;
  } else {
    docSummaries = docSummaries.slice(0, 4);
  }

  const citations: NiskCitation[] = [];
  const parts: string[] = [];

  for (const tip of tipHits) {
    citations.push({ type: 'tips', href: '/tips', title: tip.title });
    parts.push(
      `[Tip] ${tip.title}\nSource: /tips (section: ${tip.section})\nAlso: ${tip.href}\n${tipExcerpt(tip)}`
    );
  }

  for (const summary of docSummaries.slice(0, 3)) {
    const full = await getDocArticleBySlug(summary.slug);
    const body = full?.content ? clip(full.content.replace(/^#+\s.*/m, '').trim()) : '';
    const href = `/docs/${summary.slug}`;
    citations.push({ type: 'docs', href, title: summary.title });
    parts.push(
      `[Doc] ${summary.title} (${summary.category})\nSource: ${href}\n${body || '(title match — open the doc for full guide)'}`
    );
  }

  if (parts.length === 0) {
    return { contextBlock: '', citations: [] };
  }

  const contextBlock = [
    'Retrieved product knowledge (use this; cite the Source links when you rely on them):',
    ...parts.map((p, i) => `---\n${i + 1}. ${p}`),
  ].join('\n');

  return { contextBlock, citations };
}

/** Human-readable UI surface for the system prompt. */
export function describeBuilderSurface(surface?: BuilderSurfaceContext | null): string {
  if (!surface) return '';
  const bits: string[] = [];
  if (surface.projectSettingsOpen) {
    const tab = surface.projectSettingsTab ? ` (tab: ${surface.projectSettingsTab})` : '';
    bits.push(`Project Settings drawer is open${tab}`);
  }
  if (surface.inspectorOpen) {
    const tab = surface.inspectorTab || 'code';
    bits.push(`Code/Styles inspector is open (tab: ${tab})`);
  }
  if (surface.visualEditMode) {
    bits.push('Visual edit mode is on');
  }
  return bits.join('; ');
}
