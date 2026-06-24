import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Navigation, Clock, MapPin, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function SmartTravelTime() {
  const [travelBlocks, setTravelBlocks] = useState([]);
  const [loading, setLoading] = useState(false);

  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.Event.list()
  });

  const calculateTravelTime = async (events) => {
    // Simple calculation - 30 mins for same city, 1+ hour for different locations
    const suggestions = [];
    
    for (let i = 0; i < events.length - 1; i++) {
      const current = events[i];
      const next = events[i + 1];
      
      if (!current.location || !next.location) continue;
      
      const currentEnd = new Date(current.end_date);
      const nextStart = new Date(next.start_date);
      const gapMinutes = (nextStart - currentEnd) / (1000 * 60);
      
      // Estimate: 30 mins for same city, 60+ for different
      const sameCity = current.location.includes(next.location?.split(',')[0]);
      const estimatedTravelTime = sameCity ? 30 : 60;
      
      if (gapMinutes < estimatedTravelTime) {
        suggestions.push({
          from: current.title,
          to: next.title,
          fromLocation: current.location,
          toLocation: next.location,
          estimatedMinutes: estimatedTravelTime,
          availableMinutes: Math.round(gapMinutes)
        });
      }
    }
    
    return suggestions;
  };

  const handleCreateTravelBlocks = async () => {
    setLoading(true);
    try {
      const suggestions = await calculateTravelTime(events);
      
      for (const suggestion of suggestions) {
        const event = events.find(e => e.title === suggestion.from);
        if (!event) continue;
        
        const endTime = new Date(event.end_date);
        const travelStart = endTime;
        const travelEnd = new Date(travelStart.getTime() + suggestion.estimatedMinutes * 60000);
        
        await base44.entities.Event.create({
          title: `🚗 Travel: ${suggestion.from} → ${suggestion.to}`,
          start_date: travelStart.toISOString(),
          end_date: travelEnd.toISOString(),
          category: 'other',
          location: `${suggestion.fromLocation} → ${suggestion.toLocation}`,
          description: `Estimated travel time: ${suggestion.estimatedMinutes} mins`,
          color: 'orange'
        });
      }
      
      setTravelBlocks(suggestions);
      toast.success(`Created ${suggestions.length} travel time blocks`);
    } catch (err) {
      toast.error('Failed to create travel blocks');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <Card className="bg-gradient-to-br from-orange-50 dark:from-orange-950 to-amber-50 dark:to-amber-950 border-orange-200 dark:border-orange-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Navigation className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            Smart Travel Time
          </CardTitle>
          <CardDescription>Auto-detect location changes and block travel time</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {travelBlocks.length > 0 && (
            <div className="space-y-2">
              {travelBlocks.map((block, idx) => (
                <div key={idx} className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-orange-200 dark:border-orange-700">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="font-medium text-slate-900 dark:text-slate-100">{block.from} → {block.to}</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{block.fromLocation}</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">→ {block.toLocation}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-orange-700 dark:text-orange-300">{block.estimatedMinutes} min</p>
                      <p className="text-xs text-red-600 dark:text-red-400">only {block.availableMinutes}m gap</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Button 
            onClick={handleCreateTravelBlocks} 
            disabled={loading}
            className="w-full"
          >
            <Plus className="w-4 h-4 mr-2" />
            {loading ? 'Creating blocks...' : 'Create Travel Blocks'}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}