import Link from 'next/link';
import type { ReactNode } from 'react';
import { BRAND_LOGO } from '@/lib/brand-assets';

type LogoSize = 'micro' | 'sm' | 'md' | 'lg' | 'xl' | 'hero';
type LogoVariant = 'icon' | 'lockup';

interface NiskBuildLogoProps {
  variant?: LogoVariant;
  size?: LogoSize;
  href?: string;
  className?: string;
}

const HEIGHT_PX: Record<LogoSize, number> = {
  micro: 32,
  sm: 40,
  md: 52,
  lg: 68,
  xl: 96,
  hero: 128,
};

function LogoImg({
  src,
  alt,
  heightPx,
  aspectRatio,
  className = '',
  priority = false,
}: {
  src: string;
  alt: string;
  heightPx: number;
  aspectRatio: number;
  className?: string;
  priority?: boolean;
}) {
  const widthPx = Math.round(heightPx * aspectRatio);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={widthPx}
      height={heightPx}
      className={`block max-w-full h-auto object-contain ${className}`}
      style={{ height: heightPx, width: 'auto', maxWidth: widthPx }}
      fetchPriority={priority ? 'high' : undefined}
      decoding="async"
      draggable={false}
    />
  );
}

export default function NiskBuildLogo({
  variant = 'lockup',
  size = 'md',
  href,
  className = '',
}: NiskBuildLogoProps) {
  const h = HEIGHT_PX[size];
  const asset = variant === 'icon' ? BRAND_LOGO.icon : BRAND_LOGO.lockup;

  const frameClass =
    variant === 'icon'
      ? 'rounded-xl overflow-hidden ring-1 ring-[rgba(184,115,51,0.25)] shadow-[0_2px_12px_var(--copper-glow)]'
      : 'rounded-xl overflow-hidden ring-1 ring-[rgba(184,115,51,0.22)] shadow-[0_4px_20px_var(--copper-glow)]';

  const wrap = (node: ReactNode) =>
    href ? (
      <Link
        href={href}
        className={`inline-flex shrink-0 hover:opacity-95 transition-opacity ${frameClass} ${className}`}
      >
        {node}
      </Link>
    ) : (
      <span className={`inline-flex shrink-0 ${frameClass} ${className}`}>{node}</span>
    );

  return wrap(
    <LogoImg
      src={asset.src}
      alt={asset.alt}
      heightPx={h}
      aspectRatio={asset.aspectRatio}
      priority
    />
  );
}
