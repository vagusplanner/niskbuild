"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);

  // 🔐 CHANGE THIS TO YOUR EMAIL ADDRESS
  const ADMIN_EMAIL = 'sofiane.kemih@gmail.com';

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
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
    
    // Fetch all profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
    } else {
      // Fetch project counts for each user
      const usersWithCounts = await Promise.all(
        (profiles || []).map(async (profile) => {
          const { count, error } = await supabase
            .from('projects')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', profile.id);
          
          return {
            ...profile,
            project_count: count || 0,
          };
        })
      );
      setUsers(usersWithCounts);
    }
    
    setLoading(false);
  };

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
      fetchUsers(); // Refresh the list
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
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center">
        <div className="text-white">Loading admin panel...</div>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-400 mb-4">Unauthorized</h1>
          <p className="text-gray-400">You don't have permission to view this page.</p>
          <p className="text-gray-500 text-sm mt-2">Admin email: {ADMIN_EMAIL}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0F19] p-8">
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

        <div className="bg-gray-900/50 rounded-xl border border-gray-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-800/50 border-b border-gray-800">
                </table>
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
    </div>
  );
}