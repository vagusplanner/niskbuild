export type BuilderChatWidth = 'compact' | 'comfortable' | 'wide';
export type BuilderPromptSize = 'sm' | 'md' | 'lg';

const CHAT_WIDTHS: Record<BuilderChatWidth, number> = {
  compact: 260,
  comfortable: 340,
  wide: 420,
};

const CHAT_WIDTH_MIN = 220;
const CHAT_WIDTH_MAX = 520;

const PROMPT_ROWS: Record<BuilderPromptSize, number> = {
  sm: 3,
  md: 5,
  lg: 8,
};

const PROMPT_HEIGHT_DEFAULT = 140;
const PROMPT_HEIGHT_MIN = 72;
const PROMPT_HEIGHT_MAX = 360;

const STORAGE_CHAT = 'niskbuild_builder_chat_width';
const STORAGE_CHAT_PX = 'niskbuild_builder_chat_width_px';
const STORAGE_PROMPT = 'niskbuild_builder_prompt_size';
const STORAGE_PROMPT_PX = 'niskbuild_builder_prompt_height_px';

export function getBuilderChatWidth(): BuilderChatWidth {
  if (typeof window === 'undefined') return 'comfortable';
  const v = localStorage.getItem(STORAGE_CHAT);
  if (v === 'compact' || v === 'wide' || v === 'comfortable') return v;
  return 'comfortable';
}

export function setBuilderChatWidth(width: BuilderChatWidth) {
  localStorage.setItem(STORAGE_CHAT, width);
}

export function chatWidthPx(width: BuilderChatWidth): number {
  return CHAT_WIDTHS[width];
}

export function getBuilderChatWidthPx(): number {
  if (typeof window === 'undefined') return CHAT_WIDTHS.comfortable;
  const raw = localStorage.getItem(STORAGE_CHAT_PX);
  const n = raw ? Number(raw) : NaN;
  if (Number.isFinite(n) && n >= CHAT_WIDTH_MIN && n <= CHAT_WIDTH_MAX) return n;
  return chatWidthPx(getBuilderChatWidth());
}

export function setBuilderChatWidthPx(px: number) {
  const clamped = Math.min(CHAT_WIDTH_MAX, Math.max(CHAT_WIDTH_MIN, Math.round(px)));
  localStorage.setItem(STORAGE_CHAT_PX, String(clamped));
}

export function getBuilderPromptHeightPx(): number {
  if (typeof window === 'undefined') return PROMPT_HEIGHT_DEFAULT;
  const raw = localStorage.getItem(STORAGE_PROMPT_PX);
  const n = raw ? Number(raw) : NaN;
  if (Number.isFinite(n) && n >= PROMPT_HEIGHT_MIN && n <= PROMPT_HEIGHT_MAX) return n;
  return PROMPT_HEIGHT_DEFAULT;
}

export function setBuilderPromptHeightPx(px: number) {
  const clamped = Math.min(PROMPT_HEIGHT_MAX, Math.max(PROMPT_HEIGHT_MIN, Math.round(px)));
  localStorage.setItem(STORAGE_PROMPT_PX, String(clamped));
}

export { CHAT_WIDTH_MIN, CHAT_WIDTH_MAX, PROMPT_HEIGHT_MIN, PROMPT_HEIGHT_MAX };

export function getBuilderPromptSize(): BuilderPromptSize {
  if (typeof window === 'undefined') return 'md';
  const v = localStorage.getItem(STORAGE_PROMPT);
  if (v === 'sm' || v === 'lg' || v === 'md') return v;
  return 'md';
}

export function setBuilderPromptSize(size: BuilderPromptSize) {
  localStorage.setItem(STORAGE_PROMPT, size);
}

export function promptTextareaRows(size: BuilderPromptSize): number {
  return PROMPT_ROWS[size];
}

export function cycleChatWidth(current: BuilderChatWidth): BuilderChatWidth {
  const order: BuilderChatWidth[] = ['compact', 'comfortable', 'wide'];
  const i = order.indexOf(current);
  return order[(i + 1) % order.length];
}

export function cyclePromptSize(current: BuilderPromptSize): BuilderPromptSize {
  const order: BuilderPromptSize[] = ['sm', 'md', 'lg'];
  const i = order.indexOf(current);
  return order[(i + 1) % order.length];
}
