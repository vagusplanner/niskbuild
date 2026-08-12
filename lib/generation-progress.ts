/** Live generation progress: marker parsing, stripping, and heuristic fallback. */

export type ProgressStepSource = 'marker' | 'heuristic';

export type ProgressStep = {
  id: string;
  label: string;
  source: ProgressStepSource;
};

export type LiveProgressSource = 'markers' | 'heuristic' | 'none';

/** Exact format instructed in the HTML code system prompt. */
export const PROGRESS_MARKER_RE =
  /<!--\s*@step:([a-z0-9_-]+)\|([^>\n]+?)-->/gi;

/**
 * Switch to heuristic steps if the model has not emitted any markers by this
 * many characters of streamed code (Option C safety fallback).
 */
export const MARKER_FALLBACK_MIN_CHARS = 600;

export function stripProgressMarkers(html: string): string {
  if (!html) return html;
  return html
    .replace(PROGRESS_MARKER_RE, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n');
}

export function countProgressMarkers(html: string): number {
  if (!html) return 0;
  const re = new RegExp(PROGRESS_MARKER_RE.source, 'gi');
  return (html.match(re) || []).length;
}

export function extractProgressMarkers(html: string): ProgressStep[] {
  if (!html) return [];
  const steps: ProgressStep[] = [];
  const seen = new Set<string>();
  const re = new RegExp(PROGRESS_MARKER_RE.source, 'gi');
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    const id = match[1].trim().toLowerCase();
    const label = match[2].trim();
    if (!id || !label || seen.has(id)) continue;
    seen.add(id);
    steps.push({ id, label, source: 'marker' });
  }
  return steps;
}

/** Deterministic steps derived from HTML shape when markers are absent. */
export function deriveHeuristicProgress(html: string): ProgressStep[] {
  if (!html) return [];
  const steps: ProgressStep[] = [];

  if (/<!DOCTYPE\s+html/i.test(html) || /<html[\s>]/i.test(html)) {
    steps.push({
      id: 'structure',
      label: 'Setting up structure',
      source: 'heuristic',
    });
  }

  if (
    /tailwind\.config/i.test(html) ||
    /cdn\.tailwindcss\.com/i.test(html) ||
    /:root\s*\{/i.test(html)
  ) {
    steps.push({
      id: 'styles',
      label: 'Applying styles',
      source: 'heuristic',
    });
  }

  if (
    /<section[\s>]/i.test(html) ||
    /<main[\s>]/i.test(html) ||
    /<header[\s>]/i.test(html)
  ) {
    steps.push({
      id: 'content',
      label: 'Adding content',
      source: 'heuristic',
    });
  }

  if (/<\/html\s*>/i.test(html)) {
    steps.push({
      id: 'complete',
      label: 'Finishing page',
      source: 'heuristic',
    });
  }

  return steps;
}

/**
 * Prefer model markers; after MARKER_FALLBACK_MIN_CHARS with none, use heuristics.
 */
export function resolveLiveProgress(accumulated: string): {
  steps: ProgressStep[];
  source: LiveProgressSource;
} {
  const markers = extractProgressMarkers(accumulated);
  if (markers.length > 0) {
    return { steps: markers, source: 'markers' };
  }

  if (accumulated.length >= MARKER_FALLBACK_MIN_CHARS) {
    const heuristic = deriveHeuristicProgress(accumulated);
    if (heuristic.length > 0) {
      return { steps: heuristic, source: 'heuristic' };
    }
  }

  return { steps: [], source: 'none' };
}
