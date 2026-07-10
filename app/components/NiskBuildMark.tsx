type NiskBuildMarkProps = {
  className?: string;
  title?: string;
  /** Optional suffix so multiple marks on one page don't clash gradient ids */
  gradientId?: string;
};

/**
 * Final forge mark — inline SVG from public/logo/niskbuild-icon.svg
 * Token-matched: --copper-primary → --copper-melt → --nisk-color on ironDark.
 */
export default function NiskBuildMark({
  className = '',
  title = 'NiskBuild',
  gradientId = 'default',
}: NiskBuildMarkProps) {
  const body = `fused-body-${gradientId}`;
  const dot = `fused-dot-${gradientId}`;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      className={className}
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      <defs>
        <linearGradient id={body} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#b87333" />
          <stop offset="55%" stopColor="#d49a5c" />
          <stop offset="100%" stopColor="#e8dcc8" />
        </linearGradient>
        <linearGradient id={dot} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#e8dcc8" />
          <stop offset="100%" stopColor="#d49a5c" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" fill="#1a1612" />
      <path d="M200,80 Q100,250 200,420 Q160,250 200,80 Z" fill={`url(#${body})`} />
      <path d="M312,80 Q412,250 312,420 Q352,250 312,80 Z" fill={`url(#${body})`} />
      <polygon points="256,222 288,254 256,286 224,254" fill={`url(#${dot})`} />
    </svg>
  );
}
