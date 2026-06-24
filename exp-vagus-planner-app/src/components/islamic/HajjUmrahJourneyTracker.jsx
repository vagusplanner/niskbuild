import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SDK } from '@/lib/custom-sdk.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CheckCircle2, Circle, MapPin, Calendar, Users, 
  Plane, Hotel, FileText, AlertCircle, Clock, Package
} from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { toast } from 'sonner';

const HAJJ_RITUALS = [
  { id: 1, name: 'Ihram', location: 'Miqat', description: 'Enter state of consecration at the Miqat' },
  { id: 2, name: 'Tawaf al-Qudum', location: 'Kaaba', description: 'Arrival circumambulation (7 rounds)' },
  { id: 3, name: "Sa'i", location: 'Safa & Marwah', description: 'Walk 7 times between Safa and Marwah' },
  { id: 4, name: 'Day of Tarwiyah (8th Dhul Hijjah)', location: 'Mina', description: 'Travel to Mina and stay overnight' },
  { id: 5, name: 'Day of Arafah (9th Dhul Hijjah)', location: 'Arafat', description: 'Standing at Arafat — the pillar of Hajj' },
  { id: 6, name: 'Muzdalifah', location: 'Muzdalifah', description: 'Night stay, collect 70 pebbles' },
  { id: 7, name: 'Rami al-Jamarat', location: 'Mina', description: 'Stone the three pillars (Jamarat)' },
  { id: 8, name: 'Hady (Sacrifice)', location: 'Mina', description: 'Animal sacrifice on Eid al-Adha' },
  { id: 9, name: 'Halq / Taqsir', location: 'Mina', description: 'Shave or trim hair — partial exit from Ihram' },
  { id: 10, name: 'Tawaf al-Ifadah', location: 'Kaaba', description: 'Main circumambulation of Hajj' },
  { id: 11, name: "Sa'i (if not done earlier)", location: 'Safa & Marwah', description: 'Second Sa\'i if not completed after Tawaf al-Qudum' },
  { id: 12, name: 'Ayyam al-Tashreeq', location: 'Mina', description: 'Stay in Mina on 11th, 12th (and optionally 13th)' },
  { id: 13, name: 'Tawaf al-Wada', location: 'Kaaba', description: 'Farewell circumambulation before leaving Makkah' },
];

const UMRAH_RITUALS = [
  { id: 1, name: 'Ihram', location: 'Miqat', description: 'Enter state of consecration — make intention and wear Ihram' },
  { id: 2, name: 'Tawaf', location: 'Kaaba', description: 'Circumambulate the Kaaba 7 times, starting from the Black Stone' },
  { id: 3, name: "Sa'i", location: 'Safa & Marwah', description: 'Walk 7 times between Safa and Marwah' },
  { id: 4, name: 'Halq / Taqsir', location: 'Makkah', description: 'Shave or trim hair — exits from state of Ihram' },
];

export default function HajjUmrahJourneyTracker() {
  const [activeJourney, setActiveJourney] = useState('hajj');
  const queryClient = useQueryClient();

  const { data: rituals = [] } = useQuery({
    queryKey: ['hajjRituals', activeJourney],
    queryFn: () => SDK.entities.HajjRitual.filter({ type: activeJourney })
  });

  const { data: group } = useQuery({
    queryKey: ['pilgrimageGroup'],
    queryFn: async () => {
      const groups = await SDK.entities.PilgrimageGroup.list();
      return groups[0];
    }
  });

  const completeRitualMutation = useMutation({
    mutationFn: ({ id, data }) => SDK.entities.HajjRitual.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['hajjRituals']);
      toast.success('Ritual marked as complete!');
    }
  });

  const completedCount = rituals.filter(r => r.completed).length;
  const progress = rituals.length > 0 ? (completedCount / rituals.length) * 100 : 0;

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 border-purple-200 dark:border-purple-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-purple-900 dark:text-purple-100">
              <MapPin className="w-5 h-5" />
              Hajj/Umrah Journey
            </CardTitle>
            <Tabs value={activeJourney} onValueChange={setActiveJourney} className="w-auto">
              <TabsList>
                <TabsTrigger value="hajj">Hajj</TabsTrigger>
                <TabsTrigger value="umrah">Umrah</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Progress Overview */}
          <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Journey Progress
              </span>
              <span className="text-sm font-bold text-purple-600">
                {completedCount}/{activeJourney === 'hajj' ? HAJJ_RITUALS.length : UMRAH_RITUALS.length} Complete
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Group Info */}
          {group && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      {group.name}
                    </h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                      Group Leader: {group.leader_name}
                    </p>
                  </div>
                  <Badge variant="outline">{group.member_count} members</Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Rituals Checklist */}
          <div className="space-y-2">
            <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">
              {activeJourney === 'hajj' ? 'Hajj Rituals Checklist' : 'Umrah Rituals Checklist'}
              <span className="ml-2 text-xs font-normal text-slate-500">
                ({activeJourney === 'hajj' ? HAJJ_RITUALS.length : UMRAH_RITUALS.length} steps)
              </span>
            </h4>
            {(activeJourney === 'hajj' ? HAJJ_RITUALS : UMRAH_RITUALS).map((ritual, index) => {
              const completed = rituals.find(r => r.ritual_name === ritual.name)?.completed || false;
              
              return (
                <motion.div
                  key={ritual.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className={completed ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800' : ''}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => {
                            const existing = rituals.find(r => r.ritual_name === ritual.name);
                            if (existing) {
                              completeRitualMutation.mutate({
                                id: existing.id,
                                data: { completed: !completed, completed_date: new Date().toISOString() }
                              });
                            } else {
                              // Create new ritual record
                              SDK.entities.HajjRitual.create({
                                ritual_name: ritual.name,
                                type: activeJourney,
                                order: ritual.id,
                                location: ritual.location,
                                completed: true,
                                completed_date: new Date().toISOString()
                              }).then(() => queryClient.invalidateQueries(['hajjRituals']));
                            }
                          }}
                          className="flex-shrink-0 mt-1"
                        >
                          {completed ? (
                            <CheckCircle2 className="w-6 h-6 text-green-600" />
                          ) : (
                            <Circle className="w-6 h-6 text-slate-400" />
                          )}
                        </button>
                        
                        <div className="flex-1">
                          <h5 className={`font-semibold ${completed ? 'text-green-900 dark:text-green-100 line-through' : 'text-slate-900 dark:text-slate-100'}`}>
                            {ritual.name}
                          </h5>
                          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                            {ritual.description}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            <span className="text-xs text-slate-500">{ritual.location}</span>
                          </div>
                        </div>

                        <Badge variant="outline" className="text-xs">
                          Step {ritual.id}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-3 pt-4 border-t">
            <Button variant="outline" className="w-full">
              <Plane className="w-4 h-4 mr-2" />
              Flight Info
            </Button>
            <Button variant="outline" className="w-full">
              <Hotel className="w-4 h-4 mr-2" />
              Hotels
            </Button>
            <Button variant="outline" className="w-full">
              <FileText className="w-4 h-4 mr-2" />
              Documents
            </Button>
            <Button variant="outline" className="w-full">
              <Package className="w-4 h-4 mr-2" />
              Packing List
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}