import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, AlertCircle, CheckCircle, Zap, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

export default function DailyBriefingCard({ data, isLoading, expanded = false }) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  if (!data || !data.success) {
    return (
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="p-6">
          <p className="text-amber-700 text-center">Unable to generate briefing</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              <CardTitle>Daily Briefing</CardTitle>
            </div>
            <Badge variant="outline" className="bg-white">
              {data.date}
            </Badge>
          </div>
          <CardDescription>{data.greeting}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Day Overview */}
          <div className="bg-white/60 rounded-lg p-4">
            <p className="text-sm text-slate-700">{data.day_overview}</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            <div className="bg-white rounded-lg p-3 text-center">
              <p className="text-xs text-slate-500">Overdue</p>
              <p className="text-lg font-bold text-red-600">{data.stats?.overdue_tasks || 0}</p>
            </div>
            <div className="bg-white rounded-lg p-3 text-center">
              <p className="text-xs text-slate-500">Today</p>
              <p className="text-lg font-bold text-blue-600">{data.stats?.today_tasks || 0}</p>
            </div>
            <div className="bg-white rounded-lg p-3 text-center">
              <p className="text-xs text-slate-500">Events</p>
              <p className="text-lg font-bold text-purple-600">{data.stats?.today_events || 0}</p>
            </div>
            <div className="bg-white rounded-lg p-3 text-center">
              <p className="text-xs text-slate-500">Prayers</p>
              <p className="text-lg font-bold text-teal-600">{data.stats?.prayers_completed || 0}/5</p>
            </div>
          </div>

          {/* Top Priorities */}
          {data.top_priorities?.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                Top Priorities
              </h4>
              {data.top_priorities.slice(0, expanded ? undefined : 3).map((priority, idx) => (
                <div key={idx} className="bg-white rounded-lg p-3 space-y-1">
                  <div className="flex items-start justify-between">
                    <p className="font-medium text-sm">{priority.title}</p>
                    {priority.suggested_time && (
                      <Badge variant="outline" className="text-xs">
                        <Clock className="w-3 h-3 mr-1" />
                        {priority.suggested_time}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-600">{priority.reason}</p>
                </div>
              ))}
            </div>
          )}

          {/* Conflicts */}
          {data.conflicts?.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-semibold text-sm flex items-center gap-2 text-red-600">
                <AlertCircle className="w-4 h-4" />
                Potential Conflicts
              </h4>
              {data.conflicts.map((conflict, idx) => (
                <div key={idx} className="bg-red-50 border border-red-200 rounded-lg p-2 text-xs text-red-700">
                  {conflict}
                </div>
              ))}
            </div>
          )}

          {/* Quick Wins */}
          {expanded && data.quick_wins?.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-semibold text-sm flex items-center gap-2 text-green-600">
                <CheckCircle className="w-4 h-4" />
                Quick Wins
              </h4>
              <ul className="space-y-1">
                {data.quick_wins.map((win, idx) => (
                  <li key={idx} className="text-xs text-slate-600 flex items-start gap-2">
                    <span className="text-green-500">•</span>
                    {win}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Islamic Reminders */}
          {data.islamic_reminders?.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-semibold text-sm flex items-center gap-2 text-purple-600">
                🕌 Islamic Reminders
              </h4>
              {data.islamic_reminders.slice(0, expanded ? undefined : 2).map((reminder, idx) => (
                <div key={idx} className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-3">
                  <p className="font-medium text-sm text-purple-900">{reminder.title}</p>
                  <p className="text-xs text-purple-700 mt-1">{reminder.message}</p>
                </div>
              ))}
            </div>
          )}

          {/* Key Notifications */}
          {data.key_notifications?.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-semibold text-sm flex items-center gap-2 text-blue-600">
                🔔 Important Notifications
              </h4>
              {data.key_notifications.slice(0, expanded ? undefined : 2).map((notif, idx) => (
                <div key={idx} className="bg-blue-50 border border-blue-200 rounded-lg p-2">
                  <p className="text-xs text-blue-700">{notif.message}</p>
                  {notif.priority && (
                    <Badge variant="outline" className="mt-1 text-xs">{notif.priority}</Badge>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Energy Tips */}
          {expanded && data.energy_tips?.length > 0 && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
              <h4 className="font-semibold text-sm text-purple-900 mb-2">⚡ Energy Management</h4>
              <ul className="space-y-1">
                {data.energy_tips.map((tip, idx) => (
                  <li key={idx} className="text-xs text-purple-700">• {tip}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Evening Prep */}
          {expanded && data.evening_prep?.length > 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
              <h4 className="font-semibold text-sm text-slate-900 mb-2">🌙 Evening Prep</h4>
              <ul className="space-y-1">
                {data.evening_prep.map((item, idx) => (
                  <li key={idx} className="text-xs text-slate-700">• {item}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}