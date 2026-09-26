/**
 * RAG-lite for SuperEduc8 "8" — retrieves from the real Tips corpus only.
 * Does not use NiskBuild docs/tips.
 */

import {
  SE8_TIPS,
  searchSe8Tips,
  type Se8TipCard,
} from '@/lib/shift-ai/tips-data';
import { shiftAiAppPath } from '@/lib/supereduc8-host';

export type Se8EightCitation = {
  type: 'tips';
  href: string;
  title: string;
};

export type Se8EightRetrievalResult = {
  contextBlock: string;
  citations: Se8EightCitation[];
};

function tipExcerpt(tip: Se8TipCard): string {
  return `When: ${tip.when}\nWhy: ${tip.why}\nHow: ${tip.how}`;
}

function pathBoostTips(pathname: string | null | undefined): Se8TipCard[] {
  const p = (pathname || '').replace(/\/+$/, '') || '/';
  const publicPath = p.startsWith('/builder/shift-ai')
    ? p.slice('/builder/shift-ai'.length) || '/'
    : p;

  if (publicPath === '/billing' || publicPath.startsWith('/billing')) {
    return SE8_TIPS.filter((t) => t.section === 'billing').slice(0, 3);
  }
  if (publicPath === '/settings' || publicPath.startsWith('/settings')) {
    return SE8_TIPS.filter((t) => t.section === 'account' || t.section === 'for-parents').slice(
      0,
      3
    );
  }
  if (publicPath === '/assistant' || publicPath.startsWith('/assistant')) {
    return SE8_TIPS.filter((t) => t.id === 'ai-tutor').slice(0, 1);
  }
  if (publicPath === '/homework' || publicPath.startsWith('/homework')) {
    return SE8_TIPS.filter((t) => t.id === 'homework-help').slice(0, 1);
  }
  if (publicPath === '/flashcards' || publicPath.startsWith('/flashcards')) {
    return SE8_TIPS.filter((t) => t.id === 'flashcards').slice(0, 1);
  }
  if (publicPath === '/tips' || publicPath.startsWith('/tips')) {
    return SE8_TIPS.filter((t) => t.id === 'find-tips-later').slice(0, 1);
  }
  return [];
}

/**
 * Retrieve tip excerpts for "8". Optional pathname boosts page-relevant tips.
 * `hostname` controls citation deep-link shape (SE8 clean vs /builder/shift-ai).
 */
export function retrieveSe8EightKnowledge(
  query: string,
  opts?: { pathname?: string | null; hostname?: string }
): Se8EightRetrievalResult {
  const q = query.trim();
  if (q.length < 2) {
    return { contextBlock: '', citations: [] };
  }

  const searchHits = searchSe8Tips(q, 4);
  const boosted = pathBoostTips(opts?.pathname);
  const seen = new Set<string>();
  const tips: Se8TipCard[] = [];

  for (const tip of [...searchHits, ...boosted]) {
    if (seen.has(tip.id)) continue;
    seen.add(tip.id);
    tips.push(tip);
    if (tips.length >= 5) break;
  }

  if (tips.length === 0) {
    return { contextBlock: '', citations: [] };
  }

  const host = opts?.hostname;
  const citations: Se8EightCitation[] = [];
  const parts: string[] = [];

  for (const tip of tips) {
    const deepLink = shiftAiAppPath(tip.subpath, host);
    const tipsPage = shiftAiAppPath('/tips', host);
    citations.push({ type: 'tips', href: deepLink, title: tip.title });
    parts.push(
      `[Tip] ${tip.title}\nSource tip card: ${tipsPage}#${tip.section}\nDeep-link: ${deepLink}\nSection: ${tip.section}\n${tipExcerpt(tip)}`
    );
  }

  const contextBlock = [
    'Retrieved SuperEduc8 Tips (ground answers here; cite Deep-link / Source when you rely on them):',
    ...parts.map((p, i) => `---\n${i + 1}. ${p}`),
  ].join('\n');

  return { contextBlock, citations };
}
