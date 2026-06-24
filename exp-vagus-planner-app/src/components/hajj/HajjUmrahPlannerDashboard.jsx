import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, CheckCircle2, Book } from 'lucide-react';
import { SDK } from '@/lib/custom-sdk.js';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const HAJJ_RITUALS = [
  { name: 'Ihram', location: 'Miqat', dua: 'Labbayk Allahumma Labbayk...' },
  { name: 'Tawaf al-Qudum', location: 'Kaaba', dua: 'Bismillah, Allahu Akbar' },
  { name: 'Sai between Safa & Marwa', location: 'Safa-Marwa', dua: 'Inna as-Safa wal-Marwata...' },
  { name: 'Day in Mina', location: 'Mina', dua: '' },
  { name: 'Stand at Arafat', location: 'Arafat', dua: 'La ilaha illallah...' },
  { name: 'Muzdalifah Night', location: 'Muzdalifah', dua: '' },
  { name: 'Stone Jamarat', location: 'Mina', dua: 'Bismillah, Allahu Akbar' },
  { name: 'Sacrifice (Qurbani)', location: 'Mina', dua: 'Bismillah, Allahu Akbar' },
  { name: 'Tawaf al-Ifadah', location: 'Kaaba', dua: '' },
  { name: 'Final Tawaf (Wada)', location: 'Kaaba', dua: '' }
];

export default function HajjUmrahPlannerDashboard({ type = 'hajj' }) {
  const queryClient = useQueryClient();

  const { data: rituals = [] } = useQuery({
    queryKey: ['hajjRituals', type],
    queryFn: async () => {
      const all = await SDK.entities.HajjRitual.list();
      return all.filter(r => r.type === type);
    }
  });

  const createRitualMutation = useMutation({
    mutationFn: (ritual) => SDK.entities.HajjRitual.create(ritual),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hajjRituals'] });
    }
  });

  const toggleRitualMutation = useMutation({
    mutationFn: ({ id, completed }) => {
      const ritual = rituals.find(r => r.id === id);
      return SDK.entities.HajjRitual.update(id, {
        ...ritual,
        completed,
        completed_date: completed ? new Date().toISOString() : null
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hajjRituals'] });
      toast.success('Progress updated!');
    }
  });

  const initializeRituals = async () => {
    for (let i = 0; i < HAJJ_RITUALS.length; i++) {
      await createRitualMutation.mutateAsync({
        ritual_name: HAJJ_RITUALS[i].name,
        type,
        order: i + 1,
        location: HAJJ_RITUALS[i].location,
        dua_text: HAJJ_RITUALS[i].dua,
        completed: false
      });
    }
    toast.success('Rituals initialized!');
  };

  const completed = rituals.filter(r => r.completed).length;
  const progress = rituals.length > 0 ? (completed / rituals.length) * 100 : 0;

  return (
    <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🕋</span>
            {type === 'hajj' ? 'Hajj' : 'Umrah'} Planner
          </div>
          {rituals.length === 0 && (
            <Button onClick={initializeRituals} size="sm" className="bg-emerald-600">
              Start {type === 'hajj' ? 'Hajj' : 'Umrah'}
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {rituals.length > 0 && (
          <>
            {/* Progress */}
            <div className="p-4 bg-white rounded-xl border-2 border-emerald-200">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-slate-800">Progress</span>
                <span className="text-sm text-slate-600">{completed}/{rituals.length}</span>
              </div>
              <div className="h-3 bg-emerald-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Rituals Checklist */}
            <div className="space-y-2">
              {rituals.sort((a, b) => a.order - b.order).map((ritual) => (
                <div 
                  key={ritual.id}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    ritual.completed 
                      ? 'bg-emerald-100 border-emerald-300' 
                      : 'bg-white border-slate-200 hover:border-emerald-200'
                  }`}
                >
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ritual.completed}
                      onChange={(e) => toggleRitualMutation.mutate({
                        id: ritual.id,
                        completed: e.target.checked
                      })}
                      className="w-5 h-5 mt-0.5"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold ${ritual.completed ? 'text-emerald-800' : 'text-slate-800'}`}>
                          {ritual.order}. {ritual.ritual_name}
                        </span>
                        {ritual.completed && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-600">
                        <MapPin className="w-3 h-3" />
                        {ritual.location}
                      </div>
                      {ritual.dua_text && (
                        <div className="mt-2 p-2 bg-white/50 rounded text-sm text-slate-700 italic">
                          {ritual.dua_text}
                        </div>
                      )}
                    </div>
                  </label>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}