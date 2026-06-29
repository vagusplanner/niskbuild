import { BRAND_COLORS } from '@/lib/brand-colors';

export { BRAND_COLORS };
export const BRAND_TAGLINE = 'Build anything. Own everything.';

/** Cream preview box — matches Lockup light background */
export const BRAND_LIGHT_BG = BRAND_COLORS.creamLight;

export const DOCS_UI_COLORS = {
  background: BRAND_COLORS.bgBase,
  foreground: BRAND_COLORS.parchment,
  stepText: BRAND_COLORS.parchmentMuted,
  muted: BRAND_COLORS.parchmentMuted,
  link: BRAND_COLORS.copperMelt,
  linkHover: BRAND_COLORS.copperPrimary,
  accent: BRAND_COLORS.copperLight,
  code: BRAND_COLORS.copperLight,
  blockquoteBorder: BRAND_COLORS.copperPrimary,
} as const;

export const BRAND_LOGO = {
  lockup: {
    src: '/logo/niskbuild-lockup.svg',
    aspectRatio: 750 / 200,
    alt: `NiskBuild — ${BRAND_TAGLINE}`,
  },
  lockupCompact: {
    src: '/logo/niskbuild-lockup-compact.svg',
    aspectRatio: 600 / 160,
    alt: `NiskBuild — ${BRAND_TAGLINE}`,
  },
  lockupLight: {
    src: '/logo/niskbuild-lockup-light.svg',
    aspectRatio: 750 / 200,
    alt: `NiskBuild — ${BRAND_TAGLINE}`,
  },
  lockupMatteWide: {
    src: '/logo/niskbuild-lockup-matte-wide.svg',
    aspectRatio: 750 / 200,
    alt: 'NiskBuild wide lockup on matte iron',
  },
  iconLight: {
    src: '/logo/niskbuild-icon-light.svg',
    aspectRatio: 1,
    alt: 'NiskBuild',
  },
  iconMatte: {
    src: '/logo/niskbuild-icon.svg',
    aspectRatio: 1,
    alt: 'NiskBuild matte iron icon',
  },
  /** Dark UI default — matte iron square icon */
  icon: {
    src: '/logo/niskbuild-icon.svg',
    aspectRatio: 1,
    alt: 'NiskBuild',
  },
  wordmarkLight: {
    src: '/logo/niskbuild-wordmark-light.svg',
    aspectRatio: 600 / 160,
    alt: 'NiskBuild wordmark',
  },
  wordmarkMatte: {
    src: '/logo/niskbuild-wordmark-matte.svg',
    aspectRatio: 600 / 160,
    alt: 'NiskBuild wordmark on matte iron',
  },
  wordmarkMatteWide: {
    src: '/logo/niskbuild-wordmark-matte-wide.svg',
    aspectRatio: 750 / 160,
    alt: 'NiskBuild wide wordmark on matte iron',
  },
} as const;

export type IconSizeOption = {
  id: string;
  label: string;
  previewSrc: string;
  pngHref: string;
  pngFilename: string;
  width: number;
  height: number;
};

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
  iconSizes?: IconSizeOption[];
  defaultIconSize?: string;
};

export type BrandAssetGroup = {
  id: string;
  title: string;
  blurb: string;
  assets: BrandAsset[];
  /** Render assets side-by-side (e.g. lockup + wordmark) */
  paired?: boolean;
};

export const BRAND_PALETTE_SWATCHES = [
  { name: 'Forge dark (background)', token: '--bg-base', hex: BRAND_COLORS.bgBase, usage: 'App shell, Docs, Google theme-color' },
  { name: 'Cream light (icon box)', token: 'creamLight', hex: BRAND_COLORS.creamLight, usage: 'App icon · wordmark · lockup light' },
  { name: 'Matte iron', token: 'ironMatte', hex: BRAND_COLORS.ironMatte, usage: 'Logo forge plate (lighter, visible on dark UI)' },
  { name: 'Copper primary', token: '--copper-primary', hex: BRAND_COLORS.copperPrimary, usage: 'Buttons, borders, logo facets' },
  { name: 'Copper light / melt', token: '--copper-melt', hex: BRAND_COLORS.copperMelt, usage: 'Links on Docs, taglines, highlights' },
  { name: 'Cream / parchment', token: '--foreground', hex: BRAND_COLORS.parchment, usage: 'Body text on dark UI' },
] as const;

const CREAM_ICON_SIZES: IconSizeOption[] = [
  {
    id: '512',
    label: '512×512',
    previewSrc: '/logo/icon-512.png',
    pngHref: '/logo/icon-512.png',
    pngFilename: 'niskbuild-icon-512.png',
    width: 512,
    height: 512,
  },
  {
    id: '180',
    label: '180×180',
    previewSrc: '/logo/icon-180.png',
    pngHref: '/logo/icon-180.png',
    pngFilename: 'niskbuild-icon-180.png',
    width: 180,
    height: 180,
  },
  {
    id: '32',
    label: '32×32',
    previewSrc: '/logo/icon-32.png',
    pngHref: '/logo/icon-32.png',
    pngFilename: 'niskbuild-icon-32.png',
    width: 32,
    height: 32,
  },
];

const MATTE_ICON_SIZES: IconSizeOption[] = [
  {
    id: '512',
    label: '512×512',
    previewSrc: '/logo/icon-matte-512.png',
    pngHref: '/logo/icon-matte-512.png',
    pngFilename: 'niskbuild-icon-matte-512.png',
    width: 512,
    height: 512,
  },
  {
    id: '180',
    label: '180×180',
    previewSrc: '/logo/icon-matte-180.png',
    pngHref: '/logo/icon-matte-180.png',
    pngFilename: 'niskbuild-icon-matte-180.png',
    width: 180,
    height: 180,
  },
  {
    id: '32',
    label: '32×32',
    previewSrc: '/logo/icon-matte-32.png',
    pngHref: '/logo/icon-matte-32.png',
    pngFilename: 'niskbuild-icon-matte-32.png',
    width: 32,
    height: 32,
  },
];

export const BRAND_ASSET_GROUPS: BrandAssetGroup[] = [
  {
    id: 'social-profile',
    title: 'Profile & avatar',
    blurb: 'Square icons for social profiles, app stores, and favicons. Pick a size to preview before download.',
    assets: [
      {
        id: 'icon',
        label: 'App icon (cream)',
        description: 'Copper forge mark on cream — full-bleed for favicons and light backgrounds.',
        useCase: 'Profile picture · App stores · Firefox tab favicon',
        previewSrc: BRAND_LOGO.iconLight.src,
        previewBg: 'light',
        pdfHref: '/api/brand/download/icon',
        pdfFilename: 'niskbuild-icon.pdf',
        pngHref: '/logo/icon-512.png',
        pngFilename: 'niskbuild-icon-512.png',
        pngWidth: 512,
        pngHeight: 512,
        defaultIconSize: '512',
        iconSizes: CREAM_ICON_SIZES,
      },
      {
        id: 'icon-matte',
        label: 'Profile icon (matte iron)',
        description: 'Same mark as the full lockup — lighter matte iron plate, readable on dark UI.',
        useCase: 'Discord · dark-mode profiles · in-app avatar',
        previewSrc: BRAND_LOGO.iconMatte.src,
        previewBg: 'dark',
        pdfHref: '/api/brand/download/icon-matte',
        pdfFilename: 'niskbuild-icon-matte.pdf',
        pngHref: '/logo/icon-matte-512.png',
        pngFilename: 'niskbuild-icon-matte-512.png',
        pngWidth: 512,
        pngHeight: 512,
        defaultIconSize: '512',
        iconSizes: MATTE_ICON_SIZES,
      },
    ],
  },
  {
    id: 'brand-lockups',
    title: 'Wordmark typography',
    blurb: 'Matte iron typography (no icon, no rounded border) paired with cream wordmark.',
    paired: true,
    assets: [
      {
        id: 'wordmark-matte',
        label: 'Wordmark (matte iron)',
        description: 'NiskBuild typography on full-bleed matte iron — no dark contour box.',
        useCase: 'LinkedIn banner · dark social posts · navbar',
        previewSrc: BRAND_LOGO.wordmarkMatte.src,
        previewBg: 'dark',
        pdfHref: '/api/brand/download/wordmark-matte',
        pdfFilename: 'niskbuild-wordmark-matte.pdf',
        pngHref: '/logo/niskbuild-wordmark-matte-raster.png',
        pngFilename: 'niskbuild-wordmark-matte.png',
      },
      {
        id: 'wordmark',
        label: 'Wordmark (cream)',
        description: 'Typography on cream — same copper palette.',
        useCase: 'Watermarks · footers · light co-branding',
        previewSrc: BRAND_LOGO.wordmarkLight.src,
        previewBg: 'light',
        pdfHref: '/api/brand/download/wordmark',
        pdfFilename: 'niskbuild-wordmark.pdf',
        pngHref: '/logo/niskbuild-wordmark-raster.png',
        pngFilename: 'niskbuild-wordmark.png',
      },
    ],
  },
  {
    id: 'social-posts',
    title: 'Wide banners & lockups',
    blurb: '750×200 banners — typography-only wordmark vs full lockup with forge icon.',
    assets: [
      {
        id: 'wordmark-matte-wide',
        label: 'Wide wordmark (matte iron)',
        description: 'Typography only on matte iron — no icon.',
        useCase: 'Text-only press headers · minimal dark banners',
        previewSrc: BRAND_LOGO.wordmarkMatteWide.src,
        previewBg: 'dark',
        pdfHref: '/api/brand/download/wordmark-matte-wide',
        pdfFilename: 'niskbuild-wordmark-matte-wide.pdf',
        pngHref: '/logo/niskbuild-wordmark-matte-wide-raster.png',
        pngFilename: 'niskbuild-wordmark-matte-wide.png',
      },
      {
        id: 'lockup-matte-wide',
        label: 'Wide lockup (matte iron)',
        description: 'Forge icon + NiskBuild typography on matte iron plate.',
        useCase: 'LinkedIn banners · dark social posts · press kit',
        previewSrc: BRAND_LOGO.lockupMatteWide.src,
        previewBg: 'dark',
        pdfHref: '/api/brand/download/lockup-matte-wide',
        pdfFilename: 'niskbuild-lockup-matte-wide.pdf',
        pngHref: '/logo/niskbuild-lockup-matte-wide-raster.png',
        pngFilename: 'niskbuild-lockup-matte-wide.png',
      },
      {
        id: 'lockup-light',
        label: 'Lockup — light background',
        description: 'Forge icon + typography on cream — for light posts and print.',
        useCase: 'Light Instagram stories · print on white',
        previewSrc: BRAND_LOGO.lockupLight.src,
        previewBg: 'light',
        pdfHref: '/api/brand/download/lockup-light',
        pdfFilename: 'niskbuild-lockup-light.pdf',
        pngHref: '/logo/niskbuild-lockup-light-raster.png',
        pngFilename: 'niskbuild-lockup-light.png',
      },
    ],
  },
];

export const BRAND_PDF_FILES: Record<string, { path: string; filename: string }> = {
  icon: { path: 'niskbuild-icon.pdf', filename: 'niskbuild-icon.pdf' },
  'icon-matte': { path: 'niskbuild-icon-matte.pdf', filename: 'niskbuild-icon-matte.pdf' },
  wordmark: { path: 'niskbuild-wordmark.pdf', filename: 'niskbuild-wordmark.pdf' },
  'wordmark-matte': { path: 'niskbuild-wordmark-matte.pdf', filename: 'niskbuild-wordmark-matte.pdf' },
  'wordmark-matte-wide': {
    path: 'niskbuild-wordmark-matte-wide.pdf',
    filename: 'niskbuild-wordmark-matte-wide.pdf',
  },
  'lockup-matte-wide': {
    path: 'niskbuild-lockup-matte-wide.pdf',
    filename: 'niskbuild-lockup-matte-wide.pdf',
  },
  'lockup-light': { path: 'niskbuild-lockup-light.pdf', filename: 'niskbuild-lockup-light.pdf' },
};
