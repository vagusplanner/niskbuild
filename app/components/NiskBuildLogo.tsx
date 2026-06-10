import Image from 'next/image';
import Link from 'next/link';

type LogoSize = 'micro' | 'sm' | 'md' | 'lg' | 'xl';
type LogoVariant = 'full' | 'icon' | 'lockup' | 'text' | 'image';

interface NiskBuildLogoProps {
  variant?: LogoVariant;
  size?: LogoSize;
  showTagline?: boolean;
  href?: string;
  className?: string;
}

const SIZE_MAP: Record<LogoSize, { icon: number; text: string; tagline: string; lockupH: string; gap: string }> = {
  micro: { icon: 22, text: 'text-sm', tagline: 'text-[7px]', lockupH: 'h-6', gap: 'gap-2' },
  sm: { icon: 26, text: 'text-base', tagline: 'text-[8px]', lockupH: 'h-7', gap: 'gap-2' },
  md: { icon: 32, text: 'text-lg', tagline: 'text-[9px]', lockupH: 'h-8', gap: 'gap-2.5' },
  lg: { icon: 40, text: 'text-xl', tagline: 'text-[10px]', lockupH: 'h-10', gap: 'gap-3' },
  xl: { icon: 52, text: 'text-2xl', tagline: 'text-xs', lockupH: 'h-14', gap: 'gap-3' },
};

function NIcon({ size }: { size: number }) {
  return (
    <Image
      src="/logo/niskbuild-n-icon.svg"
      alt=""
      width={size}
      height={Math.round(size * 1.2)}
      className="shrink-0"
      aria-hidden
    />
  );
}

function Wordmark({ textClass, showTagline, taglineClass }: { textClass: string; showTagline?: boolean; taglineClass: string }) {
  return (
    <div className="flex flex-col leading-none">
      <span className={`font-extrabold tracking-[0.12em] ${textClass}`}>
        <span className="text-white">NISK</span>
        <span className="text-[var(--secondary)]"> BUILD</span>
      </span>
      {showTagline && (
        <span className={`${taglineClass} text-[var(--accent-cyan)] tracking-[0.2em] mt-1 font-semibold uppercase`}>
          Build anything. Own everything.
        </span>
      )}
    </div>
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

  if (variant === 'image') {
    const img = (
      <Image
        src="/logo/niskbuild-lockup.png"
        alt="NiskBuild"
        width={280}
        height={56}
        className={`object-contain w-auto ${s.lockupH} ${className}`}
        priority
      />
    );
    if (href) {
      return (
        <Link href={href} className="hover:opacity-90 transition-opacity inline-flex">
          {img}
        </Link>
      );
    }
    return img;
  }

  if (variant === 'text') {
    const textLogo = (
      <span className={`font-bold text-gradient-brand ${s.text} ${className}`}>NiskBuild</span>
    );
    if (href) {
      return (
        <Link href={href} className="hover:opacity-90 transition-opacity">
          {textLogo}
        </Link>
      );
    }
    return textLogo;
  }

  if (variant === 'lockup') {
    const lockup = (
      <Image
        src="/logo/niskbuild-lockup.svg"
        alt="NiskBuild — Build anything. Own everything."
        width={300}
        height={52}
        className={`object-contain w-auto ${s.lockupH} ${className}`}
        priority
      />
    );
    if (href) {
      return (
        <Link href={href} className="hover:opacity-90 transition-opacity inline-flex">
          {lockup}
        </Link>
      );
    }
    return lockup;
  }

  const content = (
    <div className={`flex items-center ${variant === 'icon' ? '' : s.gap} ${className}`}>
      {(variant === 'full' || variant === 'icon') && <NIcon size={s.icon} />}
      {(variant === 'full') && (
        <Wordmark textClass={s.text} showTagline={showTagline} taglineClass={s.tagline} />
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="hover:opacity-90 transition-opacity inline-flex">
        {content}
      </Link>
    );
  }

  return content;
}
