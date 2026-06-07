"use client";

import { useEffect, useState } from "react";
import Layout from '@/app/components/Layout';

export default function AdminInsights() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/log-structure')
      .then(res => res.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Layout>
        <div className="text-white">Loading insights...</div>
      </Layout>
    );
  }

  return (
    <Layout>
    <div className="text-white max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">📊 NiskBuild Market Insights</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-gray-900 p-4 rounded-xl">
          <div className="text-3xl font-bold text-purple-400">{data?.total_builds || 0}</div>
          <div className="text-sm text-gray-400">Total Builds</div>
        </div>
        <div className="bg-gray-900 p-4 rounded-xl">
          <div className="text-3xl font-bold text-emerald-400">{data?.success_rate || '0%'}</div>
          <div className="text-sm text-gray-400">Success Rate</div>
        </div>
        <div className="bg-gray-900 p-4 rounded-xl">
          <div className="text-3xl font-bold text-blue-400">{data?.top_templates?.[0]?.count || 0}</div>
          <div className="text-sm text-gray-400">Most Popular Template</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-900 p-4 rounded-xl">
          <h2 className="text-lg font-semibold mb-3">🔥 Top Templates</h2>
          {data?.top_templates?.map((t: any, i: number) => (
            <div key={i} className="flex justify-between py-2 border-b border-gray-800">
              <span>{t.name}</span>
              <span className="text-purple-400">{t.count} builds</span>
            </div>
          ))}
        </div>

        <div className="bg-gray-900 p-4 rounded-xl">
          <h2 className="text-lg font-semibold mb-3">🔌 Popular Integrations</h2>
          {data?.top_integrations?.map((i: any, idx: number) => (
            <div key={idx} className="flex justify-between py-2 border-b border-gray-800">
              <span>{i.name}</span>
              <span className="text-blue-400">{i.count} apps</span>
            </div>
          ))}
        </div>
      </div>
    </div>
    </Layout>
  );
}