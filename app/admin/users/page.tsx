"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { getSafeSession } from '@/lib/supabaseSession';
import Layout from '@/app/components/Layout';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);

  // 🔐 CHANGE THIS TO YOUR EMAIL ADDRESS
  const ADMIN_EMAIL = 'sofiane.kemih@gmail.com';

  useEffect(() => {
    const checkAuth = async () => {
      const session = await getSafeSession();
      const userEmail = session?.user?.email;
      
      if (userEmail === ADMIN_EMAIL) {
        setAuthorized(true);
        fetchUsers();
      } else {
        setAuthorized(false);
        setLoading(false);
      }
    };
    
    checkAuth();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      setUsers([]);
    } else if (profiles) {
      const usersWithCounts = [];
      
      for (const profile of profiles) {
        const { count } = await supabase
          .from('projects')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', profile.id);
        
        usersWithCounts.push({
          ...profile,
          project_count: count || 0,
        });
      }
      
      setUsers(usersWithCounts);
    }
    
    setLoading(false);
  };

  // FIXED: Proper Supabase update syntax
  const updateUserTier = async (userId: string, newTier: string) => {
    setUpdating(userId);
    
    const { error } = await supabase
      .from('profiles')
      .update({ 
        subscription_tier: newTier,
        subscription_status: 'active'
      })
      .eq('id', userId);
    
    if (error) {
      alert('Error updating user: ' + error.message);
    } else {
      alert(`✅ User updated to ${newTier}`);
      fetchUsers();
    }
    
    setUpdating(null);
  };

  const getTierBadgeColor = (tier: string) => {
    switch (tier) {
      case 'free': return 'bg-gray-500/20 text-gray-400';
      case 'pro': return 'bg-blue-500/20 text-blue-400';
      case 'agency': return 'bg-purple-500/20 text-purple-400';
      case 'scale': return 'bg-emerald-500/20 text-emerald-400';
      case 'white_label': return 'bg-yellow-500/20 text-yellow-400';
      case 'team_enterprise': return 'bg-orange-500/20 text-orange-400';
      case 'sovereign': return 'bg-rose-500/20 text-rose-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[50vh] text-white">Loading admin panel...</div>
      </Layout>
    );
  }

  if (!authorized) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[50vh] text-center">
          <div>
            <h1 className="text-2xl font-bold text-[var(--error)] mb-4">Unauthorized</h1>
            <p className="text-nisk-muted">You don't have permission to view this page.</p>
            <p className="text-nisk-muted text-sm mt-2">Admin email: {ADMIN_EMAIL}</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">👑 Admin Dashboard</h1>
            <p className="text-gray-400 mt-1">Manage user subscriptions and tiers</p>
          </div>
          <button
            onClick={fetchUsers}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            🔄 Refresh
          </button>
        </div>

        <div className="bg-nisk-card rounded-xl border border-nisk overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-800/50 border-b border-gray-800">
                <tr>
                  <th className="text-left p-4 text-gray-300 font-medium">Email</th>
                  <th className="text-left p-4 text-gray-300 font-medium">Current Tier</th>
                  <th className="text-left p-4 text-gray-300 font-medium">Projects</th>
                  <th className="text-left p-4 text-gray-300 font-medium">Status</th>
                  <th className="text-left p-4 text-gray-300 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-gray-800 hover:bg-gray-800/30">
                    <td className="p-4 text-white">{user.email}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTierBadgeColor(user.subscription_tier)}`}>
                        {user.subscription_tier || 'free'}
                      </span>
                    </td>
                    <td className="p-4 text-gray-300">{user.project_count}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs ${user.subscription_status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                        {user.subscription_status || 'active'}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => updateUserTier(user.id, 'free')}
                          disabled={updating === user.id}
                          className="px-3 py-1 text-xs rounded-lg bg-gray-700 hover:bg-gray-600 text-white transition-colors disabled:opacity-50"
                        >
                          Free
                        </button>
                        <button
                          onClick={() => updateUserTier(user.id, 'pro')}
                          disabled={updating === user.id}
                          className="px-3 py-1 text-xs rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-50"
                        >
                          Pro ($69)
                        </button>
                        <button
                          onClick={() => updateUserTier(user.id, 'agency')}
                          disabled={updating === user.id}
                          className="px-3 py-1 text-xs rounded-lg bg-purple-600 hover:bg-purple-500 text-white transition-colors disabled:opacity-50"
                        >
                          Agency ($199)
                        </button>
                        <button
                          onClick={() => updateUserTier(user.id, 'scale')}
                          disabled={updating === user.id}
                          className="px-3 py-1 text-xs rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-50"
                        >
                          Scale ($549)
                        </button>
                        <button
                          onClick={() => updateUserTier(user.id, 'white_label')}
                          disabled={updating === user.id}
                          className="px-3 py-1 text-xs rounded-lg bg-yellow-600 hover:bg-yellow-500 text-white transition-colors disabled:opacity-50"
                        >
                          White ($999)
                        </button>
                        <button
                          onClick={() => updateUserTier(user.id, 'team_enterprise')}
                          disabled={updating === user.id}
                          className="px-3 py-1 text-xs rounded-lg bg-orange-600 hover:bg-orange-500 text-white transition-colors disabled:opacity-50"
                        >
                          Team ($1,799)
                        </button>
                        <button
                          onClick={() => updateUserTier(user.id, 'sovereign')}
                          disabled={updating === user.id}
                          className="px-3 py-1 text-xs rounded-lg bg-rose-600 hover:bg-rose-500 text-white transition-colors disabled:opacity-50"
                        >
                          Sovereign ($3,499)
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 text-center text-gray-500 text-xs">
          <p>🔒 Admin access restricted to: {ADMIN_EMAIL}</p>
        </div>
      </div>
    </Layout>
  );
}