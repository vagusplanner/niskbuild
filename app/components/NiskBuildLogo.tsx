import Link from 'next/link';
import type { ReactNode } from 'react';
import NiskBuildMark from '@/app/components/NiskBuildMark';

type LogoSize = 'micro' | 'sm' | 'md' | 'lg' | 'xl' | 'hero';
type LogoVariant = 'icon' | 'lockup';

interface NiskBuildLogoProps {
  variant?: LogoVariant;
  size?: LogoSize;
  href?: string;
  className?: string;
}

/** Icon square height (px) — wordmark scales beside it in Geist. */
const ICON_PX: Record<LogoSize, number> = {
  micro: 28,
  sm: 32,
  md: 40,
  lg: 48,
  xl: 56,
  hero: 72,
};

const WORDMARK_CLASS: Record<LogoSize, string> = {
  micro: 'text-sm font-semibold tracking-tight',
  sm: 'text-base font-semibold tracking-tight',
  md: 'text-lg font-semibold tracking-tight',
  lg: 'text-xl font-bold tracking-tight',
  xl: 'text-2xl font-bold tracking-tight',
  hero: 'text-3xl md:text-4xl font-bold tracking-tight',
};

export default function NiskBuildLogo({
  variant = 'lockup',
  size = 'md',
  href,
  className = '',
}: NiskBuildLogoProps) {
  const iconPx = ICON_PX[size];

  const mark = (
    <NiskBuildMark
      gradientId={`${variant}-${size}`}
      className="shrink-0 rounded-[22%] shadow-[0_2px_12px_var(--copper-glow)] ring-1 ring-[rgba(184,115,51,0.22)]"
      title="NiskBuild"
    />
  );

  const content: ReactNode =
    variant === 'icon' ? (
      <span className="inline-flex" style={{ width: iconPx, height: iconPx }}>
        {mark}
      </span>
    ) : (
      <span className="inline-flex items-center gap-2.5 min-w-0">
        <span className="inline-flex shrink-0" style={{ width: iconPx, height: iconPx }}>
          {mark}
        </span>
        <span
          className={`${WORDMARK_CLASS[size]} text-[var(--nisk-color)] leading-none truncate`}
        >
          NiskBuild
        </span>
      </span>
    );

  if (href) {
    return (
      <Link
        href={href}
        className={`inline-flex shrink-0 items-center hover:opacity-95 transition-opacity focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--copper-primary)] rounded-lg ${className}`}
      >
        {content}
      </Link>
    );
  }

  return <span className={`inline-flex shrink-0 items-center ${className}`}>{content}</span>;
}
