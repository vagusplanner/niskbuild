import { BRAND_COLORS } from '@/lib/brand-colors';

export { BRAND_COLORS };
export const BRAND_TAGLINE = 'Build anything. Own everything.';

/** Same CSS tokens as Docs (`app/globals.css` + DocsMarkdown) */
export const DOCS_UI_COLORS = {
  background: BRAND_COLORS.bgBase,
  foreground: BRAND_COLORS.parchment,
  muted: BRAND_COLORS.parchmentMuted,
  link: BRAND_COLORS.copperMelt,
  linkHover: BRAND_COLORS.copperPrimary,
  accent: BRAND_COLORS.copperLight,
  code: BRAND_COLORS.copperLight,
  blockquoteBorder: BRAND_COLORS.copperPrimary,
} as const;

/** In-app display — copper lockup SVG + square icon PNG from brand PDF export */
export const BRAND_LOGO = {
  lockup: {
    src: '/logo/niskbuild-lockup.svg',
    aspectRatio: 750 / 200,
    alt: `NiskBuild — ${BRAND_TAGLINE}`,
  },
  icon: {
    src: '/logo/icon-512.png',
    aspectRatio: 1,
    alt: 'NiskBuild',
  },
} as const;

export type BrandAsset = {
  id: string;
  label: string;
  description: string;
  useCase: string;
  previewSrc: string;
  previewBg: 'dark' | 'light';
  pdfHref: string;
  pdfFilename: string;
  pngHref: string;
  pngFilename: string;
  pngWidth?: number;
  pngHeight?: number;
};

export type BrandAssetGroup = {
  id: string;
  title: string;
  blurb: string;
  assets: BrandAsset[];
};

export const BRAND_PALETTE_SWATCHES = [
  { name: 'Forge dark (background)', token: '--bg-base', hex: BRAND_COLORS.bgBase, usage: 'App shell, Docs, Google theme-color' },
  { name: 'Copper primary', token: '--copper-primary', hex: BRAND_COLORS.copperPrimary, usage: 'Buttons, borders, logo facets' },
  { name: 'Copper light / melt', token: '--copper-melt', hex: BRAND_COLORS.copperMelt, usage: 'Links on Docs, taglines, highlights' },
  { name: 'Cream / parchment', token: '--foreground', hex: BRAND_COLORS.parchment, usage: 'Body text on dark UI' },
  { name: 'Copper dark', token: '--copper-dark', hex: BRAND_COLORS.copperDark, usage: 'Hover states, depth' },
  { name: 'Iron surface', token: '--surface', hex: BRAND_COLORS.ironLight, usage: 'Cards, panels' },
] as const;

/** Official downloads — PDF source files + PNG exports for social */
export const BRAND_ASSET_GROUPS: BrandAssetGroup[] = [
  {
    id: 'social-profile',
    title: 'Profile & avatar',
    blurb: 'Square icon for Instagram, X, LinkedIn, Facebook, TikTok, and Discord profile photos.',
    assets: [
      {
        id: 'icon',
        label: 'App icon',
        description: 'Official copper forge mark — square format.',
        useCase: 'Profile picture · App stores · Google search favicon',
        previewSrc: '/logo/icon-512.png',
        previewBg: 'dark',
        pdfHref: '/logo/niskbuild-icon.pdf',
        pdfFilename: 'niskbuild-icon.pdf',
        pngHref: '/logo/icon-512.png',
        pngFilename: 'niskbuild-icon-512.png',
        pngWidth: 512,
        pngHeight: 512,
      },
      {
        id: 'icon-small',
        label: 'Small profile icon',
        description: '180×180 — Twitter/X, Slack, Apple touch icon.',
        useCase: 'Smaller avatar slots · link previews',
        previewSrc: '/logo/icon-180.png',
        previewBg: 'dark',
        pdfHref: '/logo/niskbuild-icon.pdf',
        pdfFilename: 'niskbuild-icon.pdf',
        pngHref: '/logo/icon-180.png',
        pngFilename: 'niskbuild-icon-180.png',
        pngWidth: 180,
        pngHeight: 180,
      },
    ],
  },
  {
    id: 'social-posts',
    title: 'Posts & banners',
    blurb: 'Full lockup with NiskBuild wordmark and tagline — for posts, covers, and press.',
    assets: [
      {
        id: 'lockup',
        label: 'Full lockup',
        description: 'Icon + NiskBuild + tagline on brand forge background.',
        useCase: 'Instagram posts · LinkedIn banner · presentations',
        previewSrc: '/logo/niskbuild-lockup-brand.png',
        previewBg: 'dark',
        pdfHref: '/logo/niskbuild-lockup-full.pdf',
        pdfFilename: 'niskbuild-lockup.pdf',
        pngHref: '/logo/niskbuild-lockup-brand.png',
        pngFilename: 'niskbuild-lockup.png',
      },
      {
        id: 'lockup-light',
        label: 'Lockup — light background',
        description: 'Copper mark on cream — for white/light social posts.',
        useCase: 'Light Instagram stories · print on white',
        previewSrc: '/logo/niskbuild-lockup-light.svg',
        previewBg: 'light',
        pdfHref: '/logo/niskbuild-lockup-full.pdf',
        pdfFilename: 'niskbuild-lockup.pdf',
        pngHref: '/logo/niskbuild-lockup-brand.png',
        pngFilename: 'niskbuild-lockup.png',
      },
    ],
  },
  {
    id: 'wordmark',
    title: 'Wordmark only',
    blurb: 'Typography without the icon — for tight spaces and watermarks.',
    assets: [
      {
        id: 'wordmark',
        label: 'Wordmark',
        description: 'NiskBuild typography in official copper palette.',
        useCase: 'Watermarks · footers · co-branding',
        previewSrc: '/logo/niskbuild-wordmark-brand.png',
        previewBg: 'dark',
        pdfHref: '/logo/niskbuild-wordmark.pdf',
        pdfFilename: 'niskbuild-wordmark.pdf',
        pngHref: '/logo/niskbuild-wordmark-brand.png',
        pngFilename: 'niskbuild-wordmark.png',
      },
    ],
  },
];

export const BRAND_PDF_FILES: Record<string, { path: string; filename: string }> = {
  icon: { path: 'niskbuild-icon.pdf', filename: 'niskbuild-icon.pdf' },
  lockup: { path: 'niskbuild-lockup-full.pdf', filename: 'niskbuild-lockup.pdf' },
  wordmark: { path: 'niskbuild-wordmark.pdf', filename: 'niskbuild-wordmark.pdf' },
};
