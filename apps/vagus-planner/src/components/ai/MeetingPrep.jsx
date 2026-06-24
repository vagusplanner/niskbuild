import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, Loader } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function MeetingPrep({ eventTitle, eventDescription, attendees, onClose }) {
  const [prep, setPrep] = useState(null);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    const generatePrep = async () => {
      try {
        const response = await base44.functions.invoke('smartMeetingPrep', {
          eventTitle,
          eventDescription,
          attendees
        });
        setPrep(response.data);
      } catch (err) {
        console.error('Error generating prep:', err);
      } finally {
        setLoading(false);
      }
    };

    generatePrep();
  }, [eventTitle, eventDescription, attendees]);

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
      <Card className="bg-gradient-to-br from-purple-50 dark:from-purple-950 to-pink-50 dark:to-pink-950 border-purple-200 dark:border-purple-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            Meeting Preparation
          </CardTitle>
          <CardDescription>{eventTitle}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <Loader className="w-4 h-4 animate-spin" /> Generating prep materials...
            </div>
          ) : prep ? (
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">📋 Agenda</h4>
                <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{prep.agenda}</p>
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">📚 Briefing</h4>
                <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{prep.briefing}</p>
              </div>
              {prep.topics?.length > 0 && (
                <div>
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">💬 Discussion Topics</h4>
                  <ul className="text-sm text-slate-700 dark:text-slate-300 space-y-1">
                    {prep.topics.map((topic, i) => (
                      <li key={i} className="flex gap-2">
                        <span>•</span> {topic}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-600 dark:text-slate-400">Failed to generate preparation materials</p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}