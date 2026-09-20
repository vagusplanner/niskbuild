import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';

type LogoSize = 'sm' | 'md' | 'lg' | 'xl';
type LogoVariant = 'icon' | 'lockup' | 'wordmark';

interface SuperEduc8LogoProps {
  variant?: LogoVariant;
  size?: LogoSize;
  href?: string;
  className?: string;
}

const ICON_PX: Record<LogoSize, number> = {
  sm: 32,
  md: 40,
  lg: 48,
  xl: 56,
};

const WORDMARK_HEIGHT: Record<LogoSize, number> = {
  sm: 28,
  md: 36,
  lg: 44,
  xl: 52,
};

export default function SuperEduc8Logo({
  variant = 'lockup',
  size = 'md',
  href,
  className = '',
}: SuperEduc8LogoProps) {
  const iconPx = ICON_PX[size];
  const wordmarkH = WORDMARK_HEIGHT[size];

  const content: ReactNode =
    variant === 'icon' ? (
      <Image
        src="/brand/supereduc8/icon.svg"
        alt="SuperEduc8"
        width={iconPx}
        height={iconPx}
        className="rounded-[22%] object-contain"
        unoptimized
        priority
      />
    ) : variant === 'wordmark' ? (
      <Image
        src="/brand/supereduc8/wordmark.svg"
        alt="SuperEduc8"
        width={Math.round(wordmarkH * (764 / 200))}
        height={wordmarkH}
        className="object-contain object-left"
        unoptimized
        priority
      />
    ) : (
      <span className="inline-flex items-center gap-2.5 min-w-0">
        <Image
          src="/brand/supereduc8/icon.svg"
          alt=""
          width={iconPx}
          height={iconPx}
          className="shrink-0 rounded-[22%] object-contain"
          unoptimized
          priority
        />
        <span
          className="leading-none truncate font-bold tracking-tight"
          style={{ fontSize: size === 'xl' ? '1.5rem' : size === 'lg' ? '1.25rem' : '1.125rem' }}
        >
          <span style={{ color: '#E05A25' }}>Super</span>
          <span style={{ color: '#0F458F' }}>Educ8</span>
        </span>
      </span>
    );

  if (href) {
    return (
      <Link
        href={href}
        className={`inline-flex shrink-0 items-center hover:opacity-95 transition-opacity focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2B7DE8] rounded-lg ${className}`}
      >
        {content}
      </Link>
    );
  }

  return <span className={`inline-flex shrink-0 items-center ${className}`}>{content}</span>;
}
