import Link from 'next/link';
import {
  exportStatusClass,
  exportStatusLabel,
  fetchLayerOverviewStats,
  formatUsd,
  formatUsdFromCents,
} from '@/lib/layer-overview-stats';

function LayerCard({
  title,
  accent,
  children,
}: {
  title: string;
  accent: 'blue' | 'purple' | 'orange';
  children: React.ReactNode;
}) {
  const accentBorder = {
    blue: 'border-l-blue-500',
    purple: 'border-l-purple-500',
    orange: 'border-l-orange-500',
  }[accent];

  return (
    <div
      className={`bg-nisk-card border border-nisk border-l-4 ${accentBorder} rounded-xl p-6`}
    >
      <p className="text-xs uppercase tracking-wider text-nisk-muted font-semibold mb-4">
        {title}
      </p>
      {children}
    </div>
  );
}

function StatLine({ label, value, valueClass }: { label: string; value: React.ReactNode; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-nisk-muted">{label}</span>
      <span className={valueClass ?? 'text-[var(--foreground)] font-medium'}>{value}</span>
    </div>
  );
}

export default async function AdminLayerOverview() {
  const stats = await fetchLayerOverviewStats();

  const primaryAppLine =
    stats.firstParty.appCount === 1 && stats.firstParty.primaryAppName
      ? `1 app — ${stats.firstParty.primaryAppName}`
      : `${stats.firstParty.appCount} app${stats.firstParty.appCount === 1 ? '' : 's'}`;

  const appStoreClass =
    stats.firstParty.appStoreLabel === 'Live'
      ? 'text-emerald-400 font-semibold'
      : 'text-nisk-muted font-medium';

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Layer overview</h1>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/tenants"
            className="px-3 py-1.5 text-xs rounded-lg border border-nisk text-nisk-muted hover:text-[var(--foreground)] hover:bg-[var(--surface-elevated)]"
          >
            Tenants
          </Link>
          <Link
            href="/admin/apps"
            className="px-3 py-1.5 text-xs rounded-lg border border-nisk text-nisk-muted hover:text-[var(--foreground)] hover:bg-[var(--surface-elevated)]"
          >
            Apps
          </Link>
          <Link
            href="/admin/marketplace"
            className="px-3 py-1.5 text-xs rounded-lg border border-nisk text-nisk-muted hover:text-[var(--foreground)] hover:bg-[var(--surface-elevated)]"
          >
            Marketplace
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        <LayerCard title="Layer 1 — Platform" accent="blue">
          <p className="text-4xl font-bold text-[var(--foreground)] mb-4">
            {stats.platform.subscribers.toLocaleString()} subscribers
          </p>
          <div className="space-y-2">
            <StatLine label="MRR" value={formatUsd(stats.platform.mrrUsd)} />
            <StatLine
              label="Active projects"
              value={stats.platform.activeProjects.toLocaleString()}
            />
          </div>
        </LayerCard>

        <LayerCard title="Layer 2 — First-party" accent="purple">
          <p className="text-4xl font-bold text-[var(--foreground)] mb-4">{primaryAppLine}</p>
          <div className="space-y-2">
            <StatLine
              label="End users"
              value={stats.firstParty.endUsers.toLocaleString()}
            />
            <StatLine
              label="App Store status"
              value={stats.firstParty.appStoreLabel}
              valueClass={appStoreClass}
            />
          </div>
        </LayerCard>

        <LayerCard title="Layer 3 — Marketplace" accent="orange">
          <p className="text-4xl font-bold text-[var(--foreground)] mb-4">
            {formatUsdFromCents(stats.marketplace.salesCentsThisMonth)} sales this month
          </p>
          <div className="space-y-2">
            <StatLine
              label="App clones sold"
              value={stats.marketplace.clonesSoldThisMonth.toLocaleString()}
            />
            <StatLine
              label="Export jobs pending"
              value={stats.marketplace.exportJobsPending.toLocaleString()}
              valueClass={
                stats.marketplace.exportJobsPending > 0
                  ? 'text-orange-400 font-semibold'
                  : 'text-[var(--foreground)] font-medium'
              }
            />
          </div>
        </LayerCard>
      </div>

      <section className="bg-nisk-card border border-nisk rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-nisk">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">App Store export queue</h2>
        </div>

        {stats.exportQueue.length === 0 ? (
          <p className="px-6 py-10 text-sm text-nisk-muted text-center">
            No export jobs yet. Jobs from <code className="text-xs">marketplace.export_jobs</code>{' '}
            will appear here.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--surface-elevated)] border-b border-nisk">
                <tr>
                  <th className="text-left px-6 py-3 font-medium text-nisk-muted">Requester</th>
                  <th className="text-left px-6 py-3 font-medium text-nisk-muted">App</th>
                  <th className="text-left px-6 py-3 font-medium text-nisk-muted">Status</th>
                  <th className="text-right px-6 py-3 font-medium text-nisk-muted">Fee</th>
                </tr>
              </thead>
              <tbody>
                {stats.exportQueue.map((job) => (
                  <tr key={job.id} className="border-b border-nisk last:border-0">
                    <td className="px-6 py-4 text-[var(--foreground)]">{job.requesterEmail}</td>
                    <td className="px-6 py-4 text-[var(--foreground)]">{job.appName}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium border ${exportStatusClass(job.status)}`}
                      >
                        {exportStatusLabel(job.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-[var(--foreground)] font-medium">
                      {formatUsdFromCents(job.feeCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
