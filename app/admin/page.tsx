"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { getSafeSession } from '@/lib/supabaseSession';
import { isAdminUser } from '@/lib/admin-auth';
import Layout from '@/app/components/Layout';

interface AnalyticsData {
  totalUsers: number;
  totalProjects: number;
  totalBuilds: number;
  buildsToday: number;
  activeUsers7d: number;
  conversionRate: number;
  proUsers: number;
  agencyUsers: number;
  scaleUsers: number;
  whiteLabelUsers: number;
  buildsByDay: { date: string; count: number }[];
  topFeatures: { feature: string; count: number }[];
  topCategories: { category: string; count: number }[];
}

export default function AdminDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'builds' | 'errors'>('overview');

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (isAdminUser(session?.user ?? null)) {
        setAuthorized(true);
        fetchAnalytics();
      } else {
        setAuthorized(false);
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);

    try {
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      const { count: totalProjects } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true });

      const { count: totalBuilds } = await supabase
        .from('metadata_logs')
        .select('*', { count: 'exact', head: true });

      const today = new Date().toISOString().split('T')[0];
      const { count: buildsToday } = await supabase
        .from('metadata_logs')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today);

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const { count: activeUsers7d } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('last_seen_at', sevenDaysAgo.toISOString());

      const { count: proUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('subscription_tier', 'pro');

      const { count: agencyUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('subscription_tier', 'agency');

      const { count: scaleUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('subscription_tier', 'scale');

      const { count: whiteLabelUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('subscription_tier', 'white_label');

      const paidUsers =
        (proUsers || 0) + (agencyUsers || 0) + (scaleUsers || 0) + (whiteLabelUsers || 0);
      const conversionRate = totalUsers ? (paidUsers / totalUsers) * 100 : 0;

      const { data: buildsData } = await supabase
        .from('metadata_logs')
        .select('created_at')
        .gte('created_at', sevenDaysAgo.toISOString());

      type BuildLogRow = { created_at: string | null };
      const buildRows = (buildsData || []) as BuildLogRow[];

      const buildsByDay: { date: string; count: number }[] = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const count =
          buildRows.filter((b) => b.created_at?.startsWith(dateStr)).length || 0;
        buildsByDay.unshift({ date: dateStr, count });
      }

      const { data: featuresData } = await supabase
        .from('metadata_logs')
        .select('features_list')
        .not('features_list', 'is', null);

      const featureCounts: Record<string, number> = {};
      type FeatureLogRow = { features_list: string[] | null };
      (featuresData as FeatureLogRow[] | null)?.forEach((log) => {
        log.features_list?.forEach((feature: string) => {
          featureCounts[feature] = (featureCounts[feature] || 0) + 1;
        });
      });
      const topFeatures = Object.entries(featureCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([feature, count]) => ({ feature, count }));

      const { data: categoriesData } = await supabase
        .from('metadata_logs')
        .select('app_category');

      const categoryCounts: Record<string, number> = {};
      type CategoryLogRow = { app_category: string | null };
      (categoriesData as CategoryLogRow[] | null)?.forEach((log) => {
        const cat = log.app_category || 'unknown';
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
      });
      const topCategories = Object.entries(categoryCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([category, count]) => ({ category, count }));

      setData({
        totalUsers: totalUsers || 0,
        totalProjects: totalProjects || 0,
        totalBuilds: totalBuilds || 0,
        buildsToday: buildsToday || 0,
        activeUsers7d: activeUsers7d || 0,
        conversionRate,
        proUsers: proUsers || 0,
        agencyUsers: agencyUsers || 0,
        scaleUsers: scaleUsers || 0,
        whiteLabelUsers: whiteLabelUsers || 0,
        buildsByDay,
        topFeatures,
        topCategories,
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-400">Loading admin dashboard...</div>
        </div>
      </Layout>
    );
  }

  if (!authorized) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-400 mb-4">Unauthorized</h1>
            <p className="text-gray-400">Admin access only</p>
          </div>
        </div>
      </Layout>
    );
  }

  const maxBuildCount = Math.max(...(data?.buildsByDay.map((d) => d.count) || [1]), 1);
  const paidTotal =
    (data?.proUsers || 0) +
    (data?.agencyUsers || 0) +
    (data?.scaleUsers || 0) +
    (data?.whiteLabelUsers || 0);
  const freeUsers = (data?.totalUsers || 0) - paidTotal;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold text-white mb-2">📊 Admin Dashboard</h1>
        <p className="text-gray-400 mb-6">Platform analytics & user management</p>

        <div className="flex gap-2 mb-6 border-b border-gray-800 pb-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-lg transition-colors ${activeTab === 'overview' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            📈 Overview
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-lg transition-colors ${activeTab === 'users' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            👥 Users
          </button>
          <button
            onClick={() => setActiveTab('builds')}
            className={`px-4 py-2 rounded-lg transition-colors ${activeTab === 'builds' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            🏗️ Builds
          </button>
          <button
            onClick={() => { window.location.href = '/admin/support'; }}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
          >
            💬 Support
          </button>
          <button
            onClick={() => { window.location.href = '/admin/users'; }}
            className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white transition-colors"
          >
            👑 Manage Users
          </button>
        </div>

        {activeTab === 'overview' && data && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-6">
                <div className="text-3xl font-bold text-purple-400">{data.totalUsers}</div>
                <div className="text-sm text-gray-400">Total Users</div>
              </div>
              <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-6">
                <div className="text-3xl font-bold text-emerald-400">{data.activeUsers7d}</div>
                <div className="text-sm text-gray-400">Active (7d)</div>
              </div>
              <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-6">
                <div className="text-3xl font-bold text-blue-400">{data.totalBuilds}</div>
                <div className="text-sm text-gray-400">Total Builds</div>
              </div>
              <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-6">
                <div className="text-3xl font-bold text-yellow-400">
                  {data.conversionRate.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-400">Conversion Rate</div>
              </div>
            </div>

            <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-6 mb-8">
              <h2 className="text-lg font-semibold text-white mb-4">📈 Builds (Last 7 Days)</h2>
              <div className="flex items-end gap-2 h-32">
                {data.buildsByDay.map((day, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center">
                    <div
                      className="w-full bg-purple-500 rounded-t"
                      style={{
                        height: `${Math.min(100, (day.count / maxBuildCount) * 100)}px`,
                      }}
                    />
                    <div className="text-xs text-gray-400 mt-2">
                      {new Date(day.date).toLocaleDateString(undefined, { weekday: 'short' })}
                    </div>
                    <div className="text-xs text-white">{day.count}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-6">
                <h2 className="text-lg font-semibold text-white mb-4">🔥 Top App Categories</h2>
                <div className="space-y-3">
                  {data.topCategories.map((cat, i) => (
                    <div key={i} className="flex justify-between items-center">
                      <span className="text-gray-300 capitalize">{cat.category}</span>
                      <span className="text-purple-400">{cat.count} builds</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-6">
                <h2 className="text-lg font-semibold text-white mb-4">🔧 Top Features Used</h2>
                <div className="space-y-3">
                  {data.topFeatures.map((feature, i) => (
                    <div key={i} className="flex justify-between items-center">
                      <span className="text-gray-300 capitalize">{feature.feature}</span>
                      <span className="text-emerald-400">{feature.count} times</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'users' && data && (
          <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-6">
            <h2 className="text-lg font-semibold text-white mb-4">👥 Users by Tier</h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-gray-300">Free / Sandbox</span>
                  <span className="text-gray-400">{freeUsers} users</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-2">
                  <div
                    className="bg-gray-500 h-2 rounded-full"
                    style={{
                      width: `${data.totalUsers ? (freeUsers / data.totalUsers) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-gray-300">Pro Worker ($129)</span>
                  <span className="text-blue-400">{data.proUsers} users</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-2">
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
                  <span className="text-gray-300">Agency Studio ($299)</span>
                  <span className="text-purple-400">{data.agencyUsers} users</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-2">
                  <div
                    className="bg-purple-500 h-2 rounded-full"
                    style={{
                      width: `${data.totalUsers ? (data.agencyUsers / data.totalUsers) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-gray-300">Scale ($549) / White-Label</span>
                  <span className="text-emerald-400">
                    {data.scaleUsers + data.whiteLabelUsers} users
                  </span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-2">
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

        {activeTab === 'builds' && data && (
          <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-6">
            <h2 className="text-lg font-semibold text-white mb-4">🏗️ Build Statistics</h2>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <div className="text-2xl font-bold text-white">{data.totalBuilds}</div>
                <div className="text-xs text-gray-400">Total builds (all time)</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-emerald-400">{data.buildsToday}</div>
                <div className="text-xs text-gray-400">Builds today</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-400">{data.totalProjects}</div>
                <div className="text-xs text-gray-400">Saved projects</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-400">
                  {data.totalProjects
                    ? (data.totalBuilds / data.totalProjects).toFixed(1)
                    : '0.0'}
                </div>
                <div className="text-xs text-gray-400">Avg builds per project</div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-center">
          <p className="text-xs text-emerald-400">
            🔒 All analytics are anonymous. No personal data is stored in metadata_logs.
            Only aggregated patterns are collected to improve the platform.
          </p>
        </div>
      </div>
    </Layout>
  );
}
