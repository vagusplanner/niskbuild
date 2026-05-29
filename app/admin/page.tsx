"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

// Define types for the data structure
interface CategoryData {
  app_category: string | null;
}

interface FeatureData {
  features_list: string[] | null;
}

interface PromptsData {
  prompts_count: number | null;
}

interface ExportData {
  exported_locally: boolean | null;
}

interface DashboardData {
  totalBuilds: number;
  buildsToday: number;
  topCategories: [string, number][];
  topFeatures: [string, number][];
  avgPrompts: string;
  exportRate: string;
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  // 🔐 CHANGE THIS TO YOUR EMAIL ADDRESS
  const AUTHORIZED_EMAIL = 'sofiane.kemih@gmail.com';

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const userEmail = session?.user?.email;
      
      if (userEmail === AUTHORIZED_EMAIL) {
        setAuthorized(true);
        fetchData();
      } else {
        setAuthorized(false);
        setLoading(false);
      }
    };
    
    checkAuth();
  }, []);

  const fetchData = async () => {
    try {
      // Get total builds
      const { count: totalBuilds } = await supabase
        .from('metadata_logs')
        .select('*', { count: 'exact', head: true });
      
      // Get builds today
      const today = new Date().toISOString().split('T')[0];
      const { count: buildsToday } = await supabase
        .from('metadata_logs')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today);
      
      // Get top 5 app categories
      const { data: categoryData } = await supabase
        .from('metadata_logs')
        .select('app_category');
      
      const categoryCounts: Record<string, number> = {};
      if (categoryData && categoryData.length > 0) {
        (categoryData as CategoryData[]).forEach((log: CategoryData) => {
          const cat = log.app_category || 'unknown';
          categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
        });
      }
      const topCategories = Object.entries(categoryCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
      
      // Get top 10 features
      const { data: featureData } = await supabase
        .from('metadata_logs')
        .select('features_list');
      
      const featureCounts: Record<string, number> = {};
      if (featureData && featureData.length > 0) {
        (featureData as FeatureData[]).forEach((log: FeatureData) => {
          if (log.features_list && log.features_list.length > 0) {
            log.features_list.forEach((feature: string) => {
              featureCounts[feature] = (featureCounts[feature] || 0) + 1;
            });
          }
        });
      }
      const topFeatures = Object.entries(featureCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
      
      // Get average prompts per build
      const { data: promptsData } = await supabase
        .from('metadata_logs')
        .select('prompts_count');
      
      let avgPrompts = 0;
      if (promptsData && promptsData.length > 0) {
        const totalPrompts = (promptsData as PromptsData[]).reduce((sum: number, log: PromptsData) => {
          return sum + (log.prompts_count || 0);
        }, 0);
        avgPrompts = totalPrompts / promptsData.length;
      }
      
      // Get export rate
      const { data: exportData } = await supabase
        .from('metadata_logs')
        .select('exported_locally');
      
      let exportRate = 0;
      if (exportData && exportData.length > 0) {
        const exportsCount = (exportData as ExportData[]).filter((log: ExportData) => log.exported_locally === true).length;
        exportRate = (exportsCount / exportData.length) * 100;
      }
      
      setData({
        totalBuilds: totalBuilds || 0,
        buildsToday: buildsToday || 0,
        topCategories,
        topFeatures,
        avgPrompts: avgPrompts.toFixed(1),
        exportRate: exportRate.toFixed(1),
      });
      
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center">
        <div className="text-white">Loading admin dashboard...</div>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-400 mb-4">Unauthorized</h1>
          <p className="text-gray-400">You don't have permission to view this page.</p>
          <p className="text-gray-500 text-sm mt-2">Please sign in with your admin account.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0F19] p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-2">📊 NiskBuild Intelligence Dashboard</h1>
        <p className="text-gray-400 mb-8">Anonymous build data - Your secret competitive moat</p>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <div className="text-3xl font-bold text-purple-400">{data?.totalBuilds || 0}</div>
            <div className="text-sm text-gray-400">Total Builds (All Time)</div>
          </div>
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <div className="text-3xl font-bold text-emerald-400">{data?.buildsToday || 0}</div>
            <div className="text-sm text-gray-400">Builds Today</div>
          </div>
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <div className="text-3xl font-bold text-blue-400">{data?.avgPrompts || '0'}</div>
            <div className="text-sm text-gray-400">Avg Prompts Per Build</div>
          </div>
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <div className="text-3xl font-bold text-yellow-400">{data?.exportRate || '0'}%</div>
            <div className="text-sm text-gray-400">Export Rate (ZIP)</div>
          </div>
        </div>
        
        {/* Top Categories */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <h2 className="text-lg font-semibold text-white mb-4">🔥 Top 5 App Categories</h2>
            {data?.topCategories && data.topCategories.length > 0 ? (
              <div className="space-y-3">
                {data.topCategories.map(([category, count], i: number) => (
                  <div key={category} className="flex items-center gap-3">
                    <div className="w-8 text-gray-400">#{i + 1}</div>
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className="text-white capitalize">{category}</span>
                        <span className="text-purple-400">{count} builds</span>
                      </div>
                      <div className="w-full bg-gray-800 rounded-full h-2">
                        <div 
                          className="bg-purple-500 h-2 rounded-full transition-all"
                          style={{ width: `${(count / (data.topCategories[0]?.[1] || 1)) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-sm">No data yet. Generate some apps first!</p>
            )}
          </div>
          
          {/* Top Features */}
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <h2 className="text-lg font-semibold text-white mb-4">🔧 Top 10 Features Used</h2>
            {data?.topFeatures && data.topFeatures.length > 0 ? (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {data.topFeatures.map(([feature, count]) => (
                  <div key={feature} className="flex justify-between items-center py-2 border-b border-gray-800">
                    <span className="text-gray-300 capitalize">{feature}</span>
                    <span className="text-emerald-400 text-sm">{count} apps</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-sm">No data yet. Features will appear as users build apps.</p>
            )}
          </div>
        </div>
        
        {/* Footer */}
        <div className="text-center text-gray-500 text-xs mt-8">
          <p>🔒 All data is anonymous. No personal information is stored.</p>
          <p className="mt-1">Differential privacy active: 4% of boolean values are flipped.</p>
        </div>
      </div>
    </div>
  );
}// Force new build
