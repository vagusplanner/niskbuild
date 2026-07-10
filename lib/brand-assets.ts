import { BRAND_COLORS } from '@/lib/brand-colors';

export { BRAND_COLORS };
export const BRAND_TAGLINE = 'Build anything. Own everything.';

/** Cream preview box — checker / light surface behind transparent assets */
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

/** Canonical paths under public/brand/ (high-res kit) + public/logo/ (app favicons). */
export const BRAND_LOGO = {
  iconDark: {
    src: '/brand/niskbuild-icon-dark.svg',
    aspectRatio: 1,
    alt: 'NiskBuild icon on dark plate',
  },
  iconTransparent: {
    src: '/brand/niskbuild-icon-transparent.svg',
    aspectRatio: 1,
    alt: 'NiskBuild icon (transparent)',
  },
  /** App / meta default — dark forge plate */
  icon: {
    src: '/logo/niskbuild-icon.svg',
    aspectRatio: 1,
    alt: 'NiskBuild',
  },
  wordmarkDark: {
    src: '/brand/niskbuild-wordmark-dark.svg',
    aspectRatio: 1189 / 354,
    alt: 'NiskBuild wordmark on dark plate',
  },
  wordmarkTransparent: {
    src: '/brand/niskbuild-wordmark-transparent.svg',
    aspectRatio: 1195 / 360,
    alt: 'NiskBuild wordmark (transparent)',
  },
  wordmarkLockupDark: {
    src: '/brand/niskbuild-wordmark-lockup-dark.svg',
    aspectRatio: 1773 / 704,
    alt: 'NiskBuild wordmark lockup on dark plate',
  },
  wordmarkLockupTransparent: {
    src: '/brand/niskbuild-wordmark-lockup-transparent.svg',
    aspectRatio: 1779 / 710,
    alt: 'NiskBuild wordmark lockup (transparent)',
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
  /** Vector download (always preferred when present) */
  svgHref: string;
  svgFilename: string;
  /** Fallback / single PNG when iconSizes is absent */
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
  paired?: boolean;
};

export const BRAND_PALETTE_SWATCHES = [
  { name: 'Forge dark (background)', token: '--bg-base', hex: BRAND_COLORS.bgBase, usage: 'App shell, Docs, Google theme-color' },
  { name: 'Cream light (preview)', token: 'creamLight', hex: BRAND_COLORS.creamLight, usage: 'Transparent-asset preview surface' },
  { name: 'Copper primary', token: '--copper-primary', hex: BRAND_COLORS.copperPrimary, usage: 'Buttons, borders, logo facets' },
  { name: 'Copper light / melt', token: '--copper-melt', hex: BRAND_COLORS.copperMelt, usage: 'Links on Docs, taglines, highlights' },
  { name: 'Cream / parchment', token: '--foreground', hex: BRAND_COLORS.parchment, usage: 'Body text on dark UI / dark-plate wordmarks' },
] as const;

function iconSizes(variant: 'dark' | 'transparent'): IconSizeOption[] {
  return ([512, 1024, 2048] as const).map((size) => ({
    id: String(size),
    label: `${size}×${size}`,
    previewSrc: `/brand/icon-${variant}-${size}.png`,
    pngHref: `/brand/icon-${variant}-${size}.png`,
    pngFilename: `niskbuild-icon-${variant}-${size}.png`,
    width: size,
    height: size,
  }));
}

export const BRAND_ASSET_GROUPS: BrandAssetGroup[] = [
  {
    id: 'icons',
    title: 'Icon mark',
    blurb:
      'Final forge mark — SVG (vector) plus PNG at 512 / 1024 / 2048. Dark plate for avatars; transparent for overlays.',
    assets: [
      {
        id: 'icon-dark',
        label: 'Icon — dark plate',
        description: 'Copper forge mark on #1a1612 iron plate. Full-bleed square for profiles and app icons.',
        useCase: 'Profile picture · App stores · Favicon source',
        previewSrc: BRAND_LOGO.iconDark.src,
        previewBg: 'dark',
        svgHref: '/brand/niskbuild-icon-dark.svg',
        svgFilename: 'niskbuild-icon-dark.svg',
        pngHref: '/brand/icon-dark-2048.png',
        pngFilename: 'niskbuild-icon-dark-2048.png',
        pngWidth: 2048,
        pngHeight: 2048,
        defaultIconSize: '2048',
        iconSizes: iconSizes('dark'),
      },
      {
        id: 'icon-transparent',
        label: 'Icon — transparent',
        description: 'Same mark with no background — true alpha PNG / clean SVG for light or dark surfaces.',
        useCase: 'Overlays · Docs · Co-branding on any background',
        previewSrc: BRAND_LOGO.iconTransparent.src,
        previewBg: 'light',
        svgHref: '/brand/niskbuild-icon-transparent.svg',
        svgFilename: 'niskbuild-icon-transparent.svg',
        pngHref: '/brand/icon-transparent-2048.png',
        pngFilename: 'niskbuild-icon-transparent-2048.png',
        pngWidth: 2048,
        pngHeight: 2048,
        defaultIconSize: '2048',
        iconSizes: iconSizes('transparent'),
      },
    ],
  },
  {
    id: 'wordmark-typography',
    title: 'Wordmark typography',
    blurb:
      '“NiskBuild” only — Geist Bold outlined paths, no icon. SVG + PNG at 2048px wide. Transparent uses iron fill + copper outline for contrast on light grounds.',
    paired: true,
    assets: [
      {
        id: 'wordmark-dark',
        label: 'Wordmark — dark plate',
        description: 'Typography only on forge dark (#1a1612). Parchment fill for dark UI and banners.',
        useCase: 'Nav bars · Footers · Dark social',
        previewSrc: BRAND_LOGO.wordmarkDark.src,
        previewBg: 'dark',
        svgHref: '/brand/niskbuild-wordmark-dark.svg',
        svgFilename: 'niskbuild-wordmark-dark.svg',
        pngHref: '/brand/niskbuild-wordmark-dark-2048.png',
        pngFilename: 'niskbuild-wordmark-dark-2048.png',
        pngWidth: 2048,
        pngHeight: 610,
      },
      {
        id: 'wordmark-transparent',
        label: 'Wordmark — transparent',
        description: 'Typography only, no background. Iron fill (#1a1612) with copper stroke for legibility on light/neutral surfaces.',
        useCase: 'Light layouts · Print · Watermarks',
        previewSrc: BRAND_LOGO.wordmarkTransparent.src,
        previewBg: 'light',
        svgHref: '/brand/niskbuild-wordmark-transparent.svg',
        svgFilename: 'niskbuild-wordmark-transparent.svg',
        pngHref: '/brand/niskbuild-wordmark-transparent-2048.png',
        pngFilename: 'niskbuild-wordmark-transparent-2048.png',
        pngWidth: 2048,
        pngHeight: 617,
      },
    ],
  },
  {
    id: 'wordmark-lockups',
    title: 'Wordmark lockup',
    blurb:
      'Icon + “NiskBuild” in Geist Bold (outlined paths). SVG vector + PNG at 2048px wide. Dark plate fully padded to the mark contour.',
    paired: true,
    assets: [
      {
        id: 'lockup-dark',
        label: 'Lockup — dark plate',
        description: 'Icon + Geist wordmark on forge dark (#1a1612), plate sized to fully contain the lockup with padding.',
        useCase: 'Press headers · Dark social · Presentations',
        previewSrc: BRAND_LOGO.wordmarkLockupDark.src,
        previewBg: 'dark',
        svgHref: '/brand/niskbuild-wordmark-lockup-dark.svg',
        svgFilename: 'niskbuild-wordmark-lockup-dark.svg',
        pngHref: '/brand/niskbuild-wordmark-lockup-dark-2048.png',
        pngFilename: 'niskbuild-wordmark-lockup-dark-2048.png',
        pngWidth: 2048,
        pngHeight: 813,
      },
      {
        id: 'lockup-transparent',
        label: 'Lockup — transparent',
        description: 'Same lockup, no plate. Wordmark uses iron fill + copper outline so it stays readable on light backgrounds; icon keeps the copper gradient.',
        useCase: 'Light layouts · Slide decks · Co-branding',
        previewSrc: BRAND_LOGO.wordmarkLockupTransparent.src,
        previewBg: 'light',
        svgHref: '/brand/niskbuild-wordmark-lockup-transparent.svg',
        svgFilename: 'niskbuild-wordmark-lockup-transparent.svg',
        pngHref: '/brand/niskbuild-wordmark-lockup-transparent-2048.png',
        pngFilename: 'niskbuild-wordmark-lockup-transparent-2048.png',
        pngWidth: 2048,
        pngHeight: 817,
      },
    ],
  },
];
