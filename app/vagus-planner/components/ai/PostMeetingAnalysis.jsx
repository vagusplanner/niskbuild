import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, AlertCircle, Target, Loader } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function PostMeetingAnalysis({ meetingTitle, onSave }) {
  const [notes, setNotes] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    if (!notes.trim()) {
      toast.error('Please enter meeting notes');
      return;
    }

    setLoading(true);
    try {
      const response = await base44.functions.invoke('postMeetingAI', {
        meetingNotes: notes,
        meetingTitle
      });
      setAnalysis(response.data);
    } catch (err) {
      toast.error('Failed to analyze meeting');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!analysis) return;

    try {
      // Create tasks for action items
      for (const item of analysis.actionItems || []) {
        await base44.entities.Task.create({
          title: item.task,
          assigned_to: item.owner || null,
          category: 'work',
          status: 'todo',
          notes: `From meeting: ${meetingTitle}`
        });
      }

      toast.success('Action items saved to tasks');
      if (onSave) onSave();
    } catch (err) {
      toast.error('Failed to save action items');
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Meeting Notes</CardTitle>
          <CardDescription>Paste your meeting notes to extract action items and decisions</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Paste or type your meeting notes here..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="min-h-32"
            disabled={loading}
          />
          <Button onClick={handleAnalyze} disabled={loading || !notes.trim()} className="mt-3">
            {loading ? (
              <>
                <Loader className="w-4 h-4 mr-2 animate-spin" /> Analyzing...
              </>
            ) : (
              'Analyze Meeting'
            )}
          </Button>
        </CardContent>
      </Card>

      {analysis && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          {analysis.actionItems?.length > 0 && (
            <Card className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-900 dark:text-green-100">
                  <CheckCircle2 className="w-5 h-5" /> Action Items
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {analysis.actionItems.map((item, i) => (
                    <li key={i} className="text-sm text-green-800 dark:text-green-200">
                      <span className="font-medium">{item.task}</span>
                      {item.owner && <span className="ml-2 text-green-600 dark:text-green-400">→ {item.owner}</span>}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {analysis.decisions?.length > 0 && (
            <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
                  <Target className="w-5 h-5" /> Decisions Made
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1">
                  {analysis.decisions.map((decision, i) => (
                    <li key={i} className="text-sm text-blue-800 dark:text-blue-200">• {decision}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {analysis.risks?.length > 0 && (
            <Card className="bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-900 dark:text-amber-100">
                  <AlertCircle className="w-5 h-5" /> Risks/Issues
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1">
                  {analysis.risks.map((risk, i) => (
                    <li key={i} className="text-sm text-amber-800 dark:text-amber-200">• {risk}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <Button onClick={handleSave} className="w-full">Save Action Items as Tasks</Button>
        </motion.div>
      )}
    </motion.div>
  );
}