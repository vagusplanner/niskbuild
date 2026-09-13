/** Saturated full-fill colors for calendar event chips (no left-stripe / washed wash). */

export const CATEGORY_HEX = {
  work: '#3b82f6',
  personal: '#10b981',
  health: '#f43f5e',
  prayer: '#8b5cf6',
  holiday: '#f59e0b',
  family: '#ec4899',
  social: '#06b6d4',
  other: '#64748b',
};

export function isHexColor(value) {
  return typeof value === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim());
}

export function hexTextColor(hex) {
  const raw = String(hex || '').replace('#', '');
  const full = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw;
  if (full.length !== 6) return '#ffffff';
  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;
  return 0.299 * r + 0.587 * g + 0.114 * b > 0.55 ? '#0f172a' : '#ffffff';
}

export function eventFillColor(event, eventColorMode) {
  if (isHexColor(event?.color)) return event.color.trim();
  const fromMode = eventColorMode?.[event?.category];
  if (isHexColor(fromMode)) return fromMode.trim();
  return CATEGORY_HEX[event?.category] || CATEGORY_HEX.other;
}

export function eventChipStyle(event, eventColorMode) {
  const backgroundColor = eventFillColor(event, eventColorMode);
  return {
    backgroundColor,
    color: hexTextColor(backgroundColor),
  };
}
