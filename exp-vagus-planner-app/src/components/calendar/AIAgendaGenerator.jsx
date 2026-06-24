import React, { useState, useEffect } from 'react';
import { SDK } from '@/lib/custom-sdk.js';
import { useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Sparkles, Loader2, FileText, Clock, Target, Lightbulb, Users, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function AIAgendaGenerator({ meetingTitle, description, attendees, duration, onApplyAgenda }) {
  const [agenda, setAgenda] = useState(null);
  const [copied, setCopied] = useState(false);

  const generateMutation = useMutation({
    mutationFn: () => SDK.functions.invoke('generateMeetingAgenda', {
      meeting_title: meetingTitle,
      description: description,
      attendees: attendees || [],
      duration_minutes: duration || 30
    }),
    onSuccess: (response) => {
      setAgenda(response.data);
      toast.success('AI generated meeting agenda!');
    },
    onError: () => {
      toast.error('Failed to generate agenda');
    }
  });

  // Auto-generate when meeting title changes
  useEffect(() => {
    if (meetingTitle && meetingTitle.length > 5) {
      const timer = setTimeout(() => {
        generateMutation.mutate();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [meetingTitle]);

  const copyAgendaToClipboard = () => {
    const agendaText = formatAgendaAsText(agenda);
    navigator.clipboard.writeText(agendaText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Agenda copied to clipboard');
  };

  const formatAgendaAsText = (agendaData) => {
    let text = `Meeting Agenda: ${meetingTitle}\n\n`;
    
    agendaData.agenda?.forEach((item, idx) => {
      text += `${idx + 1}. ${item.title} (${item.duration_minutes} min)\n`;
      text += `   Objectives:\n`;
      item.objectives?.forEach(obj => text += `   - ${obj}\n`);
      text += `   Talking Points:\n`;
      item.talking_points?.forEach(point => text += `   - ${point}\n`);
      text += `\n`;
    });

    if (agendaData.preparation?.length > 0) {
      text += `\nPreparation Required:\n`;
      agendaData.preparation.forEach(prep => text += `- ${prep}\n`);
    }

    if (agendaData.outcomes?.length > 0) {
      text += `\nExpected Outcomes:\n`;
      agendaData.outcomes.forEach(outcome => text += `- ${outcome}\n`);
    }

    return text;
  };

  return (
    <Card className="border-purple-200">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            AI Agenda Generator
          </div>
          {agenda && (
            <Button
              size="sm"
              variant="ghost"
              onClick={copyAgendaToClipboard}
              className="h-7"
            >
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!agenda ? (
          <div className="space-y-3">
            {generateMutation.isPending ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
              </div>
            ) : (
              <Button
                onClick={() => generateMutation.mutate()}
                disabled={!meetingTitle}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-600"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Agenda
              </Button>
            )}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            {/* Agenda Items */}
            <div className="space-y-2">
              {agenda.agenda?.map((item, idx) => (
                <Card key={idx} className="bg-gradient-to-br from-purple-50 to-pink-50">
                  <CardContent className="p-3">
                    <div className="flex items-start gap-2 mb-2">
                      <div className="bg-purple-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                        {idx + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-semibold text-slate-800 text-sm">{item.title}</h4>
                          <Badge variant="outline" className="text-xs">
                            <Clock className="w-3 h-3 mr-1" />
                            {item.duration_minutes}m
                          </Badge>
                        </div>

                        {/* Objectives */}
                        {item.objectives?.length > 0 && (
                          <div className="mt-2">
                            <div className="flex items-center gap-1 text-xs font-medium text-slate-700 mb-1">
                              <Target className="w-3 h-3" />
                              Objectives
                            </div>
                            <ul className="text-xs text-slate-600 space-y-1 ml-4">
                              {item.objectives.map((obj, i) => (
                                <li key={i} className="list-disc">{obj}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Talking Points */}
                        {item.talking_points?.length > 0 && (
                          <div className="mt-2">
                            <div className="flex items-center gap-1 text-xs font-medium text-slate-700 mb-1">
                              <FileText className="w-3 h-3" />
                              Discussion Points
                            </div>
                            <ul className="text-xs text-slate-600 space-y-1 ml-4">
                              {item.talking_points.map((point, i) => (
                                <li key={i} className="list-disc">{point}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Preparation Items */}
            {agenda.preparation?.length > 0 && (
              <Card className="bg-amber-50 border-amber-200">
                <CardContent className="p-3">
                  <h4 className="text-sm font-semibold text-amber-900 mb-2 flex items-center gap-2">
                    <Lightbulb className="w-4 h-4" />
                    Preparation Required
                  </h4>
                  <ul className="text-xs text-amber-800 space-y-1">
                    {agenda.preparation.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-amber-600 flex-shrink-0">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Expected Outcomes */}
            {agenda.outcomes?.length > 0 && (
              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-3">
                  <h4 className="text-sm font-semibold text-green-900 mb-2 flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Expected Outcomes
                  </h4>
                  <ul className="text-xs text-green-800 space-y-1">
                    {agenda.outcomes.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-green-600 flex-shrink-0">✓</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Suggested Roles */}
            {agenda.roles && Object.keys(agenda.roles).length > 0 && (
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-3">
                  <h4 className="text-sm font-semibold text-blue-900 mb-2 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Suggested Roles
                  </h4>
                  <div className="grid grid-cols-3 gap-2 text-xs text-blue-800">
                    {Object.entries(agenda.roles).map(([role, description]) => (
                      <div key={role}>
                        <span className="font-medium capitalize">{role}:</span>
                        <span className="ml-1">{description}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex gap-2">
              <Button
                onClick={() => onApplyAgenda(agenda)}
                className="flex-1 bg-gradient-to-r from-purple-500 to-pink-600"
                size="sm"
              >
                Apply to Meeting
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => generateMutation.mutate()}
              >
                <Sparkles className="w-3 h-3" />
              </Button>
            </div>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}