import Link from 'next/link';

type Stat = {
  label: string;
  value: string | number;
  hint?: string;
};

interface AdminPlatformShellProps {
  title: string;
  description: string;
  stats: Stat[];
  children: React.ReactNode;
}

export default function AdminPlatformShell({
  title,
  description,
  stats,
  children,
}: AdminPlatformShellProps) {
  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-[var(--foreground)]">{title}</h1>
          <p className="text-nisk-muted mt-1">{description}</p>
        </div>
        <Link
          href="/admin/layer-overview"
          className="px-4 py-2 rounded-lg border border-nisk text-sm font-medium text-[var(--foreground)] hover:bg-[var(--surface-elevated)] transition-colors"
        >
          📊 Layer Overview
        </Link>
      </div>

      {stats.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-nisk-card border border-nisk rounded-xl p-4">
              <p className="text-2xl font-bold text-[var(--primary)]">{stat.value}</p>
              <p className="text-sm text-nisk-muted">{stat.label}</p>
              {stat.hint && <p className="text-xs text-nisk-muted mt-1">{stat.hint}</p>}
            </div>
          ))}
        </div>
      )}

      {children}
    </div>
  );
}
