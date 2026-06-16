import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';

type LogoSize = 'micro' | 'sm' | 'md' | 'lg' | 'xl';
type LogoVariant = 'full' | 'icon' | 'lockup' | 'text' | 'image';

/** Brand assets exported from attached PDFs (public/logo/*.pdf) */
const BRAND = {
  icon: '/logo/niskbuild-icon-brand.png',
  lockup: '/logo/niskbuild-lockup-brand.png',
  wordmark: '/logo/niskbuild-wordmark-brand.png',
} as const;

interface NiskBuildLogoProps {
  variant?: LogoVariant;
  size?: LogoSize;
  showTagline?: boolean;
  href?: string;
  className?: string;
}

const SIZE_MAP: Record<
  LogoSize,
  { iconPx: number; lockupH: string; wordmarkH: string }
> = {
  micro: { iconPx: 24, lockupH: 'h-8', wordmarkH: 'h-7' },
  sm: { iconPx: 28, lockupH: 'h-9', wordmarkH: 'h-8' },
  md: { iconPx: 36, lockupH: 'h-11', wordmarkH: 'h-10' },
  lg: { iconPx: 44, lockupH: 'h-14', wordmarkH: 'h-12' },
  xl: { iconPx: 56, lockupH: 'h-[4.5rem]', wordmarkH: 'h-16' },
};

function BrandImage({
  src,
  alt,
  heightClass,
  className = '',
  priority = false,
}: {
  src: string;
  alt: string;
  heightClass: string;
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src={src}
      alt={alt}
      width={640}
      height={160}
      className={`object-contain w-auto ${heightClass} ${className}`}
      priority={priority}
    />
  );
}

export default function NiskBuildLogo({
  variant = 'full',
  size = 'md',
  showTagline = false,
  href,
  className = '',
}: NiskBuildLogoProps) {
  const s = SIZE_MAP[size];

  const wrap = (node: ReactNode) =>
    href ? (
      <Link href={href} className="hover:opacity-90 transition-opacity inline-flex">
        {node}
      </Link>
    ) : (
      node
    );

  if (variant === 'icon') {
    return wrap(
      <Image
        src={BRAND.icon}
        alt="NiskBuild"
        width={s.iconPx}
        height={s.iconPx}
        className={`shrink-0 rounded-xl object-cover ${className}`}
        priority
      />
    );
  }

  if (variant === 'text') {
    return wrap(
      <BrandImage
        src={BRAND.wordmark}
        alt="NiskBuild — Build anything. Own everything."
        heightClass={s.wordmarkH}
        className={className}
        priority
      />
    );
  }

  const lockupAlt = 'NiskBuild — Build anything. Own everything.';

  if (variant === 'image' || variant === 'lockup') {
    return wrap(
      <BrandImage
        src={BRAND.lockup}
        alt={lockupAlt}
        heightClass={s.lockupH}
        className={className}
        priority
      />
    );
  }

  // full: icon + lockup wordmark row, or full lockup when tagline requested
  if (showTagline) {
    return wrap(
      <BrandImage
        src={BRAND.lockup}
        alt={lockupAlt}
        heightClass={s.lockupH}
        className={className}
        priority
      />
    );
  }

  return wrap(
    <div className={`flex items-center gap-2.5 ${className}`}>
      <Image
        src={BRAND.icon}
        alt=""
        width={s.iconPx}
        height={s.iconPx}
        className="shrink-0 rounded-lg object-cover"
        aria-hidden
        priority
      />
      <BrandImage
        src={BRAND.wordmark}
        alt={lockupAlt}
        heightClass={s.wordmarkH}
      />
    </div>
  );
}
