/** Detect truncated / incomplete HTML generation output. */

export type TruncationReason =
  | 'finish_reason_length'
  | 'missing_closing_html'
  | 'cut_mid_tag'
  | 'unclosed_script_or_style';

const LENGTH_STOP_REASONS = new Set([
  'length',
  'max_tokens',
  'max_token',
]);

/** Strip markdown fences the model sometimes wraps around HTML. */
export function stripGenerationFences(raw: string): string {
  let cleaned = raw.trim();
  const fenced = cleaned.match(
    /```(?:html|javascript|jsx|tsx|typescript|css)?\s*\n?([\s\S]*?)\n?```/i
  );
  if (fenced) cleaned = fenced[1].trim();
  return cleaned;
}

export function providerIndicatesTruncation(
  stopReason: string | null | undefined
): boolean {
  if (!stopReason) return false;
  return LENGTH_STOP_REASONS.has(stopReason.trim().toLowerCase());
}

function hasClosingHtml(code: string): boolean {
  return /<\/html\s*>/i.test(code);
}

function looksLikeHtmlDocument(code: string): boolean {
  return (
    /<!DOCTYPE\s+html/i.test(code) ||
    /<html[\s>]/i.test(code) ||
    /<head[\s>]/i.test(code) ||
    /<body[\s>]/i.test(code)
  );
}

function cutMidTag(code: string): boolean {
  const lastLt = code.lastIndexOf('<');
  const lastGt = code.lastIndexOf('>');
  return lastLt > lastGt;
}

function unclosedScriptOrStyle(code: string): boolean {
  const openScript = (code.match(/<script\b[^>]*>/gi) || []).length;
  const closeScript = (code.match(/<\/script\s*>/gi) || []).length;
  if (openScript > closeScript) return true;
  const openStyle = (code.match(/<style\b[^>]*>/gi) || []).length;
  const closeStyle = (code.match(/<\/style\s*>/gi) || []).length;
  return openStyle > closeStyle;
}

/**
 * Structural checks for incomplete HTML (independent of provider stop reason).
 */
export function detectIncompleteHtml(raw: string): TruncationReason | null {
  const code = stripGenerationFences(raw);
  if (!code || code.length < 40) return null;
  if (!looksLikeHtmlDocument(code)) return null;

  if (cutMidTag(code)) return 'cut_mid_tag';
  if (!hasClosingHtml(code)) return 'missing_closing_html';
  if (unclosedScriptOrStyle(code)) return 'unclosed_script_or_style';
  return null;
}

export function assessGenerationCompleteness(
  raw: string,
  stopReason?: string | null
): { complete: boolean; reason: TruncationReason | null } {
  const structural = detectIncompleteHtml(raw);
  if (structural) return { complete: false, reason: structural };

  // Provider hit the token ceiling but document may still look closed — only
  // treat as truncated when the HTML is also missing a proper close.
  if (providerIndicatesTruncation(stopReason) && !hasClosingHtml(stripGenerationFences(raw))) {
    return { complete: false, reason: 'finish_reason_length' };
  }

  return { complete: true, reason: null };
}

export function truncationUserMessage(reason: TruncationReason | null): string {
  const detail =
    reason === 'finish_reason_length'
      ? 'the model hit its output length limit'
      : reason === 'cut_mid_tag'
        ? 'output stopped mid-tag'
        : reason === 'unclosed_script_or_style'
          ? 'a <script> or <style> block was left open'
          : 'the page was missing a closing </html>';

  return `Generation was cut off before the page finished (${detail}). Partial output was kept — click Generate again to retry.`;
}

export const CONTINUE_GENERATION_USER_MESSAGE = `Continue exactly where you left off. Output ONLY the remaining HTML needed to finish the document through </html>. Do not repeat earlier content. Do not use markdown fences.`;

export function buildContinuationMessages(
  originalPrompt: string,
  partialCode: string
): Array<{ role: 'user' | 'assistant'; content: string }> {
  return [
    { role: 'user', content: originalPrompt },
    { role: 'assistant', content: stripGenerationFences(partialCode) },
    { role: 'user', content: CONTINUE_GENERATION_USER_MESSAGE },
  ];
}
