import Link from 'next/link';
import type { ReactNode } from 'react';

type LogoSize = 'micro' | 'sm' | 'md' | 'lg' | 'xl' | 'hero';
/** @deprecated use lockup — all main placements use the Sovereign Integrated lockup */
type LogoVariant = 'full' | 'icon' | 'lockup' | 'text' | 'image';

const LOCKUP_SRC = '/logo/niskbuild-lockup.svg';
const ICON_SRC = '/logo/niskbuild-icon.svg';

/** Sovereign Integrated lockup viewBox 750×200 */
const LOCKUP_RATIO = 750 / 200;
const ICON_RATIO = 1;

interface NiskBuildLogoProps {
  variant?: LogoVariant;
  size?: LogoSize;
  /** @deprecated lockup always includes tagline */
  showTagline?: boolean;
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
  const alt = 'NiskBuild — Build anything. Own everything.';

  const frameClass =
    variant === 'icon'
      ? 'rounded-xl overflow-hidden ring-1 ring-[rgba(15,23,42,0.08)] shadow-[0_2px_8px_rgba(15,23,42,0.08)]'
      : 'rounded-xl overflow-hidden ring-1 ring-[rgba(15,23,42,0.08)] shadow-[0_4px_20px_rgba(15,23,42,0.08)]';

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

  if (variant === 'icon') {
    return wrap(
      <LogoImg src={ICON_SRC} alt="NiskBuild" heightPx={h} aspectRatio={ICON_RATIO} priority />
    );
  }

  return wrap(
    <LogoImg src={LOCKUP_SRC} alt={alt} heightPx={h} aspectRatio={LOCKUP_RATIO} priority />
  );
}
