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
  lockupLight: {
    src: '/logo/niskbuild-lockup-light.svg',
    aspectRatio: 750 / 200,
    alt: `NiskBuild — ${BRAND_TAGLINE}`,
  },
  iconLight: {
    src: '/logo/niskbuild-icon-light.svg',
    aspectRatio: 1,
    alt: 'NiskBuild',
  },
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
  wordmark: {
    src: '/logo/niskbuild-wordmark-light.svg',
    aspectRatio: 600 / 160,
    alt: 'NiskBuild wordmark',
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
  /** App / profile icons — pick size before download */
  iconSizes?: IconSizeOption[];
  defaultIconSize?: string;
};

export type BrandAssetGroup = {
  id: string;
  title: string;
  blurb: string;
  assets: BrandAsset[];
};

export const BRAND_PALETTE_SWATCHES = [
  { name: 'Forge dark (background)', token: '--bg-base', hex: BRAND_COLORS.bgBase, usage: 'App shell, Docs, Google theme-color' },
  { name: 'Cream light (icon box)', token: 'creamLight', hex: BRAND_COLORS.creamLight, usage: 'App icon · wordmark · lockup light' },
  { name: 'Matte iron', token: 'ironMatte', hex: BRAND_COLORS.ironMatte, usage: 'Logo forge plate (lighter, visible on dark UI)' },
  { name: 'Copper primary', token: '--copper-primary', hex: BRAND_COLORS.copperPrimary, usage: 'Buttons, borders, logo facets' },
  { name: 'Copper light / melt', token: '--copper-melt', hex: BRAND_COLORS.copperMelt, usage: 'Links on Docs, taglines, highlights' },
  { name: 'Cream / parchment', token: '--foreground', hex: BRAND_COLORS.parchment, usage: 'Body text on dark UI' },
] as const;

const ICON_PREVIEW = BRAND_LOGO.iconLight.src;

export const BRAND_ASSET_GROUPS: BrandAssetGroup[] = [
  {
    id: 'social-profile',
    title: 'Profile & avatar',
    blurb: 'Square icon for Instagram, X, LinkedIn, Facebook, TikTok, and Discord profile photos.',
    assets: [
      {
        id: 'icon',
        label: 'App icon',
        description: 'Official copper forge mark on cream — full-bleed for favicons and app stores.',
        useCase: 'Profile picture · App stores · Google search favicon',
        previewSrc: ICON_PREVIEW,
        previewBg: 'light',
        pdfHref: '/logo/niskbuild-icon.pdf',
        pdfFilename: 'niskbuild-icon.pdf',
        pngHref: '/logo/icon-512.png',
        pngFilename: 'niskbuild-icon-512.png',
        pngWidth: 512,
        pngHeight: 512,
        defaultIconSize: '512',
        iconSizes: [
          {
            id: '512',
            label: '512×512',
            previewSrc: ICON_PREVIEW,
            pngHref: '/logo/icon-512.png',
            pngFilename: 'niskbuild-icon-512.png',
            width: 512,
            height: 512,
          },
          {
            id: '180',
            label: '180×180',
            previewSrc: ICON_PREVIEW,
            pngHref: '/logo/icon-180.png',
            pngFilename: 'niskbuild-icon-180.png',
            width: 180,
            height: 180,
          },
          {
            id: '32',
            label: '32×32',
            previewSrc: ICON_PREVIEW,
            pngHref: '/logo/icon-32.png',
            pngFilename: 'niskbuild-icon-32.png',
            width: 32,
            height: 32,
          },
        ],
      },
      {
        id: 'icon-small',
        label: 'Small profile icon',
        description: '180×180 — Twitter/X, Slack, Apple touch icon. Same cream full-bleed mark.',
        useCase: 'Smaller avatar slots · link previews · Firefox tab',
        previewSrc: ICON_PREVIEW,
        previewBg: 'light',
        pdfHref: '/logo/niskbuild-icon.pdf',
        pdfFilename: 'niskbuild-icon.pdf',
        pngHref: '/logo/icon-180.png',
        pngFilename: 'niskbuild-icon-180.png',
        pngWidth: 180,
        pngHeight: 180,
        defaultIconSize: '180',
        iconSizes: [
          {
            id: '180',
            label: '180×180',
            previewSrc: ICON_PREVIEW,
            pngHref: '/logo/icon-180.png',
            pngFilename: 'niskbuild-icon-180.png',
            width: 180,
            height: 180,
          },
          {
            id: '512',
            label: '512×512',
            previewSrc: ICON_PREVIEW,
            pngHref: '/logo/icon-512.png',
            pngFilename: 'niskbuild-icon-512.png',
            width: 512,
            height: 512,
          },
        ],
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
        label: 'Full lockup (matte iron)',
        description: 'Icon + NiskBuild + tagline on lighter matte iron (readable on dark UI).',
        useCase: 'Instagram posts · LinkedIn banner · in-app navbar',
        previewSrc: BRAND_LOGO.lockup.src,
        previewBg: 'dark',
        pdfHref: '/logo/niskbuild-lockup-full.pdf',
        pdfFilename: 'niskbuild-lockup.pdf',
        pngHref: '/logo/niskbuild-lockup-raster.png',
        pngFilename: 'niskbuild-lockup.png',
      },
      {
        id: 'lockup-light',
        label: 'Lockup — light background',
        description: 'Copper mark on cream — for white/light social posts.',
        useCase: 'Light Instagram stories · print on white',
        previewSrc: BRAND_LOGO.lockupLight.src,
        previewBg: 'light',
        pdfHref: '/logo/niskbuild-lockup-full.pdf',
        pdfFilename: 'niskbuild-lockup.pdf',
        pngHref: '/logo/niskbuild-lockup-light-raster.png',
        pngFilename: 'niskbuild-lockup-light.png',
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
        description: 'NiskBuild typography on cream — official copper palette.',
        useCase: 'Watermarks · footers · co-branding',
        previewSrc: BRAND_LOGO.wordmarkLight.src,
        previewBg: 'light',
        pdfHref: '/logo/niskbuild-wordmark.pdf',
        pdfFilename: 'niskbuild-wordmark.pdf',
        pngHref: '/logo/niskbuild-wordmark-raster.png',
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
