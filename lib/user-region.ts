/** Country-level region for anonymous analytics — never city/GPS */

export const ANALYTICS_REGIONS = [
  'United States',
  'United Kingdom',
  'Canada',
  'Australia',
  'Germany',
  'France',
  'Spain',
  'Italy',
  'Netherlands',
  'Brazil',
  'India',
  'Japan',
  'China',
  'South Korea',
  'Mexico',
  'Other',
] as const;

export type AnalyticsRegion = (typeof ANALYTICS_REGIONS)[number];

const LOCALE_REGION_MAP: Record<string, AnalyticsRegion> = {
  us: 'United States',
  gb: 'United Kingdom',
  uk: 'United Kingdom',
  ca: 'Canada',
  au: 'Australia',
  de: 'Germany',
  fr: 'France',
  es: 'Spain',
  it: 'Italy',
  nl: 'Netherlands',
  br: 'Brazil',
  in: 'India',
  jp: 'Japan',
  cn: 'China',
  kr: 'South Korea',
  mx: 'Mexico',
};

const TZ_REGION_HINTS: [RegExp, AnalyticsRegion][] = [
  [/America\/(New_York|Chicago|Los_Angeles|Denver)/, 'United States'],
  [/Europe\/London/, 'United Kingdom'],
  [/America\/Toronto|America\/Vancouver/, 'Canada'],
  [/Australia\//, 'Australia'],
  [/Europe\/(Berlin|Paris|Madrid|Rome|Amsterdam)/, 'Germany'],
  [/America\/Sao_Paulo/, 'Brazil'],
  [/Asia\/(Kolkata|Tokyo|Seoul|Shanghai)/, 'India'],
];

export function regionFromLocale(locale: string): AnalyticsRegion {
  const parts = locale.replace('_', '-').split('-');
  const country = (parts[1] || parts[0] || '').toLowerCase();
  return LOCALE_REGION_MAP[country] || 'Other';
}

export function detectBrowserRegion(): AnalyticsRegion {
  if (typeof navigator === 'undefined') return 'Other';

  const locale = navigator.language || 'en-US';
  const fromLocale = regionFromLocale(locale);

  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    for (const [pattern, region] of TZ_REGION_HINTS) {
      if (pattern.test(tz)) return region;
    }
  } catch {
    /* ignore */
  }

  return fromLocale;
}

export function normalizeAnalyticsRegion(value: string | null | undefined): AnalyticsRegion {
  if (!value) return 'Other';
  const match = ANALYTICS_REGIONS.find((r) => r === value);
  return match || 'Other';
}

export function getClientLocale(): string {
  if (typeof navigator === 'undefined') return 'en-US';
  return navigator.language || 'en-US';
}
