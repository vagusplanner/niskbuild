import Link from 'next/link';

const NISKBUILD_ORIGIN = 'https://www.niskbuild.com';

type Props = {
  /** Visual density — `inline` for footers, `bar` for app chrome. */
  variant?: 'inline' | 'bar';
  className?: string;
  /** Override link label. Default: "Built with NiskBuild". */
  label?: string;
};

/**
 * Small, unobtrusive product credit for NiskBuild-family surfaces
 * (SuperEduc8, Vagus Planner, etc.). Prefer not on NiskBuild's own chrome —
 * that UI already is NiskBuild.
 */
export default function BuiltWithNiskBuild({
  variant = 'inline',
  className = '',
  label = 'Built with NiskBuild',
}: Props) {
  const link = (
    <Link
      href={NISKBUILD_ORIGIN}
      target="_blank"
      rel="noopener noreferrer"
      className="underline-offset-2 hover:underline"
    >
      {label}
    </Link>
  );

  if (variant === 'bar') {
    return (
      <p
        className={`text-center text-[10px] leading-none tracking-wide text-current/50 ${className}`.trim()}
      >
        {link}
      </p>
    );
  }

  return (
    <p className={`text-xs text-current/50 ${className}`.trim()}>
      {link}
    </p>
  );
}
