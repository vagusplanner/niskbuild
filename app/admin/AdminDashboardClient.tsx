'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { LegacyAdminDashboardData } from '@/lib/admin/legacy-dashboard';

type Props = {
  data: LegacyAdminDashboardData;
};

export default function AdminDashboardClient({ data }: Props) {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'builds'>('overview');

  const maxBuildCount = Math.max(...(data.buildsByDay.map((d) => d.count) || [1]), 1);
  const paidTotal =
    data.proUsers + data.agencyUsers + data.scaleUsers + data.whiteLabelUsers;
  const freeUsers = data.totalUsers - paidTotal;

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold text-[var(--foreground)] mb-2">📊 Platform stats</h1>
      <p className="text-nisk-muted mb-6">Build activity and subscriber tiers (service-role aggregates)</p>

      <div className="flex flex-wrap gap-2 mb-6 border-b border-nisk pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-lg transition-colors ${activeTab === 'overview' ? 'bg-[var(--primary)] text-white' : 'text-nisk-muted hover:text-[var(--foreground)]'}`}
        >
          📈 Overview
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-lg transition-colors ${activeTab === 'users' ? 'bg-[var(--primary)] text-white' : 'text-nisk-muted hover:text-[var(--foreground)]'}`}
        >
          👥 Users
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('builds')}
          className={`px-4 py-2 rounded-lg transition-colors ${activeTab === 'builds' ? 'bg-[var(--primary)] text-white' : 'text-nisk-muted hover:text-[var(--foreground)]'}`}
        >
          🏗️ Builds
        </button>
        <Link
          href="/admin/support"
          className="px-4 py-2 rounded-lg bg-[var(--primary)] hover:opacity-90 text-[var(--foreground)] transition-colors"
        >
          💬 Support
        </Link>
        <Link
          href="/admin/analytics"
          className="px-4 py-2 rounded-lg bg-[var(--surface-elevated)] hover:bg-[var(--card-bg)] text-[var(--foreground)] transition-colors"
        >
          📊 Demand Analytics
        </Link>
        <Link
          href="/admin/demand-analytics"
          className="px-4 py-2 rounded-lg bg-[var(--surface-elevated)] hover:bg-[var(--card-bg)] text-[var(--foreground)] transition-colors"
        >
          🏷️ Prompt categories
        </Link>
        <Link
          href="/admin/insights"
          className="px-4 py-2 rounded-lg bg-[var(--surface-elevated)] hover:bg-[var(--card-bg)] text-[var(--foreground)] transition-colors"
        >
          📈 Privacy &amp; Analytics
        </Link>
        <Link
          href="/admin/users"
          className="px-4 py-2 rounded-lg bg-[var(--surface-elevated)] hover:bg-[var(--card-bg)] text-[var(--foreground)] transition-colors"
        >
          👑 Manage Users
        </Link>
      </div>

      {activeTab === 'overview' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-nisk-card border border-nisk p-6">
              <div className="text-3xl font-bold text-[var(--primary)]">{data.totalUsers}</div>
              <div className="text-sm text-nisk-muted">Total Users</div>
            </div>
            <div className="bg-nisk-card border border-nisk p-6">
              <div className="text-3xl font-bold text-emerald-400">{data.activeUsers7d}</div>
              <div className="text-sm text-nisk-muted">Active (7d)</div>
            </div>
            <div className="bg-nisk-card border border-nisk p-6">
              <div className="text-3xl font-bold text-blue-400">{data.totalBuilds}</div>
              <div className="text-sm text-nisk-muted">Total Builds</div>
            </div>
            <div className="bg-nisk-card border border-nisk p-6">
              <div className="text-3xl font-bold text-yellow-400">
                {data.conversionRate.toFixed(1)}%
              </div>
              <div className="text-sm text-nisk-muted">Conversion Rate</div>
            </div>
          </div>

          <div className="bg-nisk-card border border-nisk p-6 mb-8">
            <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">📈 Builds (Last 7 Days)</h2>
            <div className="flex items-end gap-2 h-32">
              {data.buildsByDay.map((day) => (
                <div key={day.date} className="flex-1 flex flex-col items-center">
                  <div
                    className="w-full bg-[var(--primary)] rounded-t"
                    style={{
                      height: `${Math.min(100, (day.count / maxBuildCount) * 100)}px`,
                    }}
                  />
                  <div className="text-xs text-nisk-muted mt-2">
                    {new Date(day.date).toLocaleDateString(undefined, { weekday: 'short' })}
                  </div>
                  <div className="text-xs text-[var(--foreground)]">{day.count}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-nisk-card border border-nisk p-6">
              <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">🔥 Top App Categories</h2>
              <div className="space-y-3">
                {data.topCategories.map((cat) => (
                  <div key={cat.category} className="flex justify-between items-center">
                    <span className="text-nisk-muted capitalize">{cat.category}</span>
                    <span className="text-[var(--primary)]">{cat.count} builds</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-nisk-card border border-nisk p-6">
              <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">🔧 Top Features Used</h2>
              <div className="space-y-3">
                {data.topFeatures.map((feature) => (
                  <div key={feature.feature} className="flex justify-between items-center">
                    <span className="text-nisk-muted capitalize">{feature.feature}</span>
                    <span className="text-emerald-400">{feature.count} times</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'users' && (
        <div className="bg-nisk-card border border-nisk p-6">
          <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">👥 Users by Tier</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-nisk-muted">Free / Sandbox</span>
                <span className="text-nisk-muted">{freeUsers} users</span>
              </div>
              <div className="w-full bg-[var(--accent-lavender)] rounded-full h-2">
                <div
                  className="bg-[var(--muted)] h-2 rounded-full"
                  style={{
                    width: `${data.totalUsers ? (freeUsers / data.totalUsers) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-nisk-muted">Pro Worker ($129)</span>
                <span className="text-blue-400">{data.proUsers} users</span>
              </div>
              <div className="w-full bg-[var(--accent-lavender)] rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full"
                  style={{
                    width: `${data.totalUsers ? (data.proUsers / data.totalUsers) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-nisk-muted">Agency Studio ($299)</span>
                <span className="text-[var(--primary)]">{data.agencyUsers} users</span>
              </div>
              <div className="w-full bg-[var(--accent-lavender)] rounded-full h-2">
                <div
                  className="bg-[var(--primary)] h-2 rounded-full"
                  style={{
                    width: `${data.totalUsers ? (data.agencyUsers / data.totalUsers) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-nisk-muted">Scale ($549) / White-Label</span>
                <span className="text-emerald-400">
                  {data.scaleUsers + data.whiteLabelUsers} users
                </span>
              </div>
              <div className="w-full bg-[var(--accent-lavender)] rounded-full h-2">
                <div
                  className="bg-emerald-500 h-2 rounded-full"
                  style={{
                    width: `${data.totalUsers ? ((data.scaleUsers + data.whiteLabelUsers) / data.totalUsers) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'builds' && (
        <div className="bg-nisk-card border border-nisk p-6">
          <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">🏗️ Build Statistics</h2>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <div className="text-2xl font-bold text-[var(--foreground)]">{data.totalBuilds}</div>
              <div className="text-xs text-nisk-muted">Total builds (all time)</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-emerald-400">{data.buildsToday}</div>
              <div className="text-xs text-nisk-muted">Builds today</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-[var(--primary)]">{data.totalProjects}</div>
              <div className="text-xs text-nisk-muted">Saved projects</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-400">
                {data.totalProjects
                  ? (data.totalBuilds / data.totalProjects).toFixed(1)
                  : '0.0'}
              </div>
              <div className="text-xs text-nisk-muted">Avg builds per project</div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-center">
        <p className="text-xs text-emerald-400">
          🔒 Build metadata is aggregated. Tier counts use full platform profiles via admin API.
        </p>
      </div>
    </div>
  );
}
