import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, CheckSquare, Clock, TrendingUp } from 'lucide-react';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import ProactiveSuggestionsPanel from '@/components/assistant/ProactiveSuggestionsPanel';

export default function QuickOverviewPanel({ events, tasks, recentActivity }) {
  const todayEvents = events?.filter(e => e.start_date && isToday(parseISO(e.start_date))) || [];
  const upcomingEvents = events?.filter(e => e.start_date && isTomorrow(parseISO(e.start_date))) || [];
  const pendingTasks = tasks?.filter(t => t.status !== 'completed') || [];
  
  return (
    <div className="space-y-6">
      {/* AI Suggestions */}
      <ProactiveSuggestionsPanel />
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Today's Events */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-teal-200 bg-gradient-to-br from-teal-50 to-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-teal-700">
              <Calendar className="w-4 h-4" />
              Today's Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-teal-600 mb-2">
              {todayEvents.length}
            </div>
            {todayEvents.length > 0 ? (
              <div className="space-y-1">
                {todayEvents.slice(0, 2).map(event => (
                  <div key={event.id} className="text-xs text-slate-600 truncate">
                    {event.start_time} - {event.title}
                  </div>
                ))}
                {todayEvents.length > 2 && (
                  <Link to={createPageUrl('Calendar')} className="text-xs text-teal-600 hover:underline">
                    +{todayEvents.length - 2} more
                  </Link>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-500">No events today</p>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Upcoming Events */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-blue-700">
              <Clock className="w-4 h-4" />
              Tomorrow
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600 mb-2">
              {upcomingEvents.length}
            </div>
            {upcomingEvents.length > 0 ? (
              <div className="space-y-1">
                {upcomingEvents.slice(0, 2).map(event => (
                  <div key={event.id} className="text-xs text-slate-600 truncate">
                    {event.start_time} - {event.title}
                  </div>
                ))}
                {upcomingEvents.length > 2 && (
                  <Link to={createPageUrl('Calendar')} className="text-xs text-blue-600 hover:underline">
                    +{upcomingEvents.length - 2} more
                  </Link>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-500">Nothing scheduled</p>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Pending Tasks */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-amber-700">
              <CheckSquare className="w-4 h-4" />
              Pending Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600 mb-2">
              {pendingTasks.length}
            </div>
            {pendingTasks.length > 0 ? (
              <div className="space-y-1">
                {pendingTasks.slice(0, 2).map(task => (
                  <div key={task.id} className="text-xs text-slate-600 truncate flex items-center gap-1">
                    <Badge variant="outline" className="text-xs px-1 py-0">
                      {task.priority || 'medium'}
                    </Badge>
                    {task.title}
                  </div>
                ))}
                {pendingTasks.length > 2 && (
                  <Link to={createPageUrl('Profile')} className="text-xs text-amber-600 hover:underline">
                    +{pendingTasks.length - 2} more
                  </Link>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-500">All caught up!</p>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Recent Activity */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-purple-700">
              <TrendingUp className="w-4 h-4" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600 mb-2">
              {recentActivity?.length || 0}
            </div>
            {recentActivity && recentActivity.length > 0 ? (
              <div className="space-y-1">
                {recentActivity.slice(0, 2).map((activity, idx) => (
                  <div key={idx} className="text-xs text-slate-600 truncate">
                    {activity.type}: {activity.description}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500">No recent activity</p>
            )}
          </CardContent>
        </Card>
      </motion.div>
      </div>
    </div>
  );
}