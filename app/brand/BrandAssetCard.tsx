'use client';

import { useState } from 'react';
import {
  BRAND_LIGHT_BG,
  type BrandAsset,
  type IconSizeOption,
} from '@/lib/brand-assets';

function DownloadLink({
  href,
  filename,
  label,
  primary = false,
}: {
  href: string;
  filename: string;
  label: string;
  primary?: boolean;
}) {
  const isApi = href.startsWith('/api/');
  return (
    <a
      href={href}
      {...(!isApi ? { download: filename } : {})}
      className={
        primary
          ? 'inline-flex items-center gap-2 rounded-lg border border-[var(--copper-primary)]/40 bg-[var(--copper-primary)]/10 px-4 py-2 text-sm font-semibold text-[var(--copper-melt)] hover:bg-[var(--copper-primary)]/20 transition-colors'
          : 'inline-flex items-center gap-2 rounded-lg border border-nisk px-4 py-2 text-sm font-medium text-nisk-muted hover:text-white hover:border-[var(--copper-primary)]/30 transition-colors'
      }
    >
      <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
        />
      </svg>
      {label}
    </a>
  );
}

function PreviewBox({
  src,
  alt,
  light,
  iconSquare,
}: {
  src: string;
  alt: string;
  light: boolean;
  iconSquare?: boolean;
}) {
  const bg = light ? BRAND_LIGHT_BG : '#3a3530';

  if (iconSquare) {
    return (
      <div
        className="relative aspect-square w-full max-w-[200px] mx-auto overflow-hidden rounded-xl"
        style={{ backgroundColor: bg }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className="absolute inset-0 w-full h-full object-fill block" />
      </div>
    );
  }

  return (
    <div
      className="flex items-center justify-center rounded-xl border border-nisk min-h-[140px] p-4"
      style={{ backgroundColor: light ? BRAND_LIGHT_BG : 'var(--bg-base, #1a1612)' }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="max-h-28 max-w-full object-contain" />
    </div>
  );
}

function IconSizePicker({
  sizes,
  defaultId,
  label,
  onChange,
}: {
  sizes: IconSizeOption[];
  defaultId: string;
  label: string;
  onChange: (size: IconSizeOption) => void;
}) {
  const [active, setActive] = useState(defaultId);

  const select = (size: IconSizeOption) => {
    setActive(size.id);
    onChange(size);
  };

  const current = sizes.find((s) => s.id === active) ?? sizes[0];

  return (
    <div className="space-y-2">
      <p className="text-[10px] uppercase tracking-wider text-nisk-muted">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {sizes.map((size) => (
          <button
            key={size.id}
            type="button"
            onClick={() => select(size)}
            className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
              active === size.id
                ? 'border-[var(--copper-primary)] bg-[var(--copper-primary)]/15 text-[var(--copper-melt)]'
                : 'border-nisk text-nisk-muted hover:text-white hover:border-[var(--copper-primary)]/30'
            }`}
          >
            {size.label}
          </button>
        ))}
      </div>
      <p className="text-[10px] text-[var(--copper-melt)]/80">
        Selected: {current.label} — preview before download
      </p>
    </div>
  );
}

function pdfApiId(assetId: string): string {
  return assetId;
}

export default function BrandAssetCard({ asset }: { asset: BrandAsset }) {
  const defaultSize =
    asset.iconSizes?.find((s) => s.id === asset.defaultIconSize) ?? asset.iconSizes?.[0];

  const [selectedIcon, setSelectedIcon] = useState<IconSizeOption | undefined>(defaultSize);

  const light = asset.previewBg === 'light';
  const isIconCard = !!asset.iconSizes?.length;

  const previewSrc = isIconCard && selectedIcon ? selectedIcon.previewSrc : asset.previewSrc;
  const pngHref = isIconCard && selectedIcon ? selectedIcon.pngHref : asset.pngHref;
  const pngFilename = isIconCard && selectedIcon ? selectedIcon.pngFilename : asset.pngFilename;
  const pngLabel =
    isIconCard && selectedIcon
      ? `PNG ${selectedIcon.width}×${selectedIcon.height}`
      : asset.pngWidth
        ? `PNG ${asset.pngWidth}×${asset.pngHeight}`
        : 'Download PNG';

  return (
    <article className="glass-panel rounded-2xl border border-nisk p-5 flex flex-col gap-4">
      {isIconCard && asset.iconSizes && (
        <IconSizePicker
          sizes={asset.iconSizes}
          defaultId={asset.defaultIconSize ?? asset.iconSizes[0].id}
          label="Choose size to preview"
          onChange={setSelectedIcon}
        />
      )}

      <PreviewBox src={previewSrc} alt={asset.label} light={light} iconSquare={isIconCard} />

      <div className="flex-1">
        <h3 className="font-semibold text-white mb-1">{asset.label}</h3>
        <p className="text-sm text-nisk-muted mb-1">{asset.description}</p>
        <p className="text-xs text-[var(--copper-melt)]/80">{asset.useCase}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <DownloadLink
          href={`/api/brand/download/${pdfApiId(asset.id)}`}
          filename={asset.pdfFilename}
          label="Download PDF"
          primary
        />
        <DownloadLink href={pngHref} filename={pngFilename} label={pngLabel} />
      </div>
    </article>
  );
}
