import React from 'react';
import { motion } from 'framer-motion';
import GamificationDashboard from '../components/gamification/GamificationDashboard';
import UnifiedGamificationTracker from '../components/gamification/UnifiedGamificationTracker';
import PageAssistant from '@/components/assistant/PageAssistant';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function GamificationPage() {
  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Achievements & Rewards</h1>
          <p className="text-slate-600">Track your progress, earn points, and unlock badges</p>
        </div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-6"
        >
          <PageAssistant 
            pageName="Gamification" 
            quickActions={[
              "Show my points breakdown",
              "What badges can I earn?",
              "Check my challenges",
              "How do I earn more points?"
            ]}
          />
        </motion.div>
        
        <Tabs defaultValue="points" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="points">Points & Badges</TabsTrigger>
            <TabsTrigger value="challenges">Challenges & Ranks</TabsTrigger>
          </TabsList>

          <TabsContent value="points" className="mt-6">
            <UnifiedGamificationTracker />
          </TabsContent>

          <TabsContent value="challenges" className="mt-6">
            <GamificationDashboard />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}