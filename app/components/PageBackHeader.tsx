import Link from 'next/link';

type PageBackHeaderProps = {
  href: string;
  label: string;
  className?: string;
};

export default function PageBackHeader({ href, label, className = '' }: PageBackHeaderProps) {
  return (
    <div className={`max-w-6xl mx-auto px-4 pt-6 ${className}`}>
      <Link
        href={href}
        className="inline-flex items-center gap-1.5 text-sm text-nisk-muted hover:text-[var(--accent-cyan)] transition-colors"
      >
        <span aria-hidden>←</span>
        {label}
      </Link>
    </div>
  );
}
