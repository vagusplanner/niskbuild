import React from 'react';
import { motion } from 'framer-motion';
import { Activity } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import HealthTracking from '@/components/health/HealthTracking';
import UnifiedHealthAIPanel from '@/components/assistant/UnifiedHealthAIPanel';
import AIBusinessInsights from '@/components/analytics/AIBusinessInsights';
import PullToRefresh from '@/components/mobile/PullToRefresh';

export default function HealthPage() {
  const queryClient = useQueryClient();

  const handleRefresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['sleep'] }),
      queryClient.invalidateQueries({ queryKey: ['mood'] }),
      queryClient.invalidateQueries({ queryKey: ['exercise'] }),
      queryClient.invalidateQueries({ queryKey: ['nutrition'] }),
      queryClient.invalidateQueries({ queryKey: ['energy'] })
    ]);
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-3xl lg:text-4xl font-bold text-slate-800 flex items-center gap-3">
            <Activity className="w-8 h-8 text-purple-600" />
            Health Tracking
          </h1>
          <p className="text-slate-500 mt-1">
            AI-powered insights on your sleep, energy, and wellness patterns
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-6"
        >
          <UnifiedHealthAIPanel />
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <HealthTracking />
        </motion.div>
      </div>
    </div>
    </PullToRefresh>
  );
}