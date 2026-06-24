import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Briefcase, Clock, DollarSign, Plus } from 'lucide-react';
import { SDK } from '@/lib/custom-sdk.js';
import { useQuery } from '@tanstack/react-query';

const CLIENT_COLORS = [
  { bg: 'from-blue-500 to-indigo-600', badge: 'bg-blue-100 text-blue-800' },
  { bg: 'from-purple-500 to-violet-600', badge: 'bg-purple-100 text-purple-800' },
  { bg: 'from-green-500 to-emerald-600', badge: 'bg-green-100 text-green-800' },
  { bg: 'from-orange-500 to-red-600', badge: 'bg-orange-100 text-orange-800' },
  { bg: 'from-pink-500 to-rose-600', badge: 'bg-pink-100 text-pink-800' }
];

export default function ClientContextSwitcher({ currentClient, onClientChange }) {
  const { data: events = [] } = useQuery({
    queryKey: ['workEvents'],
    queryFn: async () => {
      const allEvents = await SDK.entities.Event.filter({ category: 'work' });
      return allEvents;
    }
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['workTasks'],
    queryFn: async () => {
      const allTasks = await SDK.entities.Task.filter({ category: 'work' });
      return allTasks;
    }
  });

  // Extract unique clients from events and tasks
  const clients = [...new Set([
    ...events.map(e => e.location).filter(Boolean),
    ...tasks.map(t => t.notes?.match(/Client: (.+)/)?.[1]).filter(Boolean)
  ])].map((name, idx) => {
    const clientEvents = events.filter(e => e.location === name);
    const clientTasks = tasks.filter(t => t.notes?.includes(`Client: ${name}`));
    
    // Calculate billable hours (rough estimate)
    const totalMinutes = clientEvents.reduce((acc, e) => {
      const duration = (new Date(e.end_date) - new Date(e.start_date)) / 60000;
      return acc + duration;
    }, 0);
    
    return {
      name,
      color: CLIENT_COLORS[idx % CLIENT_COLORS.length],
      events: clientEvents.length,
      tasks: clientTasks.length,
      billableHours: Math.round(totalMinutes / 60 * 10) / 10
    };
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-blue-600" />
          Client Dashboard
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {clients.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No clients yet</p>
            <p className="text-xs mt-1">Add client name to event location</p>
          </div>
        ) : (
          clients.map((client, idx) => (
            <button
              key={idx}
              onClick={() => onClientChange(client.name)}
              className={`w-full text-left p-4 rounded-xl transition-all ${
                currentClient === client.name
                  ? `bg-gradient-to-r ${client.color.bg} text-white shadow-lg scale-105`
                  : 'bg-slate-50 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className={`font-semibold ${currentClient === client.name ? 'text-white' : 'text-slate-800'}`}>
                    {client.name}
                  </h4>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex items-center gap-1">
                      <Clock className={`w-3 h-3 ${currentClient === client.name ? 'text-white/80' : 'text-slate-500'}`} />
                      <span className={`text-xs ${currentClient === client.name ? 'text-white/90' : 'text-slate-600'}`}>
                        {client.billableHours}h
                      </span>
                    </div>
                    <Badge className={currentClient === client.name ? 'bg-white/20 text-white' : client.color.badge}>
                      {client.events} events
                    </Badge>
                    <Badge className={currentClient === client.name ? 'bg-white/20 text-white' : client.color.badge}>
                      {client.tasks} tasks
                    </Badge>
                  </div>
                </div>
                {currentClient === client.name && (
                  <div className="p-2 bg-white/20 rounded-lg">
                    <DollarSign className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
            </button>
          ))
        )}
      </CardContent>
    </Card>
  );
}