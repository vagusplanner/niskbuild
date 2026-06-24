import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
  Calendar, 
  CheckSquare, 
  Clock, 
  TrendingUp,
  Plus,
  ChevronRight,
  Sparkles,
  Moon,
  Sun,
  Activity
} from 'lucide-react';
import { format, isToday, isTomorrow } from 'date-fns';
import { motion } from 'framer-motion';
import IslamicGreetingBanner from '@/components/dashboard/IslamicGreetingBanner';

export default function MobileDashboard() {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: events = [] } = useQuery({
    queryKey: ['upcomingEvents'],
    queryFn: async () => {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 2);
      
      return base44.entities.Event.filter({
        start_date: { $gte: today.toISOString(), $lt: tomorrow.toISOString() }
      });
    }
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['pendingTasks'],
    queryFn: () => base44.entities.Task.filter({ status: { $in: ['todo', 'in_progress'] } })
  });

  const { data: settings = [] } = useQuery({
    queryKey: ['userSettings'],
    queryFn: () => base44.entities.UserSettings.list()
  });

  const userSettings = settings?.[0] || {};
  const greeting = "As-salamu ʿalaykum (peace be upon you)";

  const todayEvents = events.filter(e => isToday(new Date(e.start_date)));
  const tomorrowEvents = events.filter(e => isTomorrow(new Date(e.start_date)));
  const urgentTasks = tasks.filter(t => t.priority === 'urgent' || t.priority === 'high');

  return (
    <div className="space-y-4 pb-safe">
      <IslamicGreetingBanner />
      {/* Greeting Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-teal-500 to-cyan-600 rounded-2xl p-6 text-white shadow-lg"
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-teal-100 text-xs sm:text-sm font-medium">{greeting}</p>
            <h1 className="text-2xl sm:text-3xl font-bold mt-1">{user?.full_name ? user.full_name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ').split(' ')[0] : 'Welcome'}</h1>
            <p className="text-teal-100 text-xs sm:text-sm mt-2">{format(new Date(), 'EEEE, MMMM d')}</p>
            <p className="text-teal-200 text-[10px] sm:text-xs mt-1">
              {(() => {
                const today = new Date();
                const islamicDate = today.toLocaleDateString('en-US-u-ca-islamic', { day: 'numeric', month: 'long', year: 'numeric' });
                return islamicDate;
              })()}
            </p>
          </div>
          <div className="bg-white/20 p-2 sm:p-3 rounded-xl">
            {new Date().getHours() < 18 ? (
              <Sun className="w-5 h-5 sm:w-6 sm:h-6" />
            ) : (
              <Moon className="w-5 h-5 sm:w-6 sm:h-6" />
            )}
          </div>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <h2 className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-3 px-1">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3">
          <Link to={createPageUrl('Calendar')}>
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800 hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500 rounded-lg">
                    <Calendar className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">New Event</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">Add to calendar</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to={createPageUrl('Profile')}>
            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800 hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500 rounded-lg">
                    <CheckSquare className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">New Task</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">Quick add</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to={createPageUrl('Islam')}>
            <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900 border-emerald-200 dark:border-emerald-800 hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500 rounded-lg">
                    <Moon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">Prayer Times</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">Today's schedule</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to={createPageUrl('Wellness')}>
            <Card className="bg-gradient-to-br from-rose-50 to-rose-100 dark:from-rose-950 dark:to-rose-900 border-rose-200 dark:border-rose-800 hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-rose-500 rounded-lg">
                    <Activity className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">Wellness</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">Track health</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </motion.div>

      {/* Today's Events */}
      {todayEvents.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-sm font-semibold text-slate-600 dark:text-slate-400">Today's Events</h2>
            <Link to={createPageUrl('Calendar')}>
              <Button variant="ghost" size="sm" className="text-xs">
                View All <ChevronRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </div>
          <div className="space-y-2">
            {todayEvents.slice(0, 3).map((event) => (
              <Card key={event.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <div className="w-2 h-2 rounded-full bg-teal-500 mt-2"></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">{event.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          {format(new Date(event.start_date), 'h:mm a')}
                        </p>
                        {event.category && (
                          <Badge variant="outline" className="text-xs">
                            {event.category}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>
      )}

      {/* Urgent Tasks */}
      {urgentTasks.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-sm font-semibold text-slate-600 dark:text-slate-400">Priority Tasks</h2>
            <Link to={createPageUrl('Profile')}>
              <Button variant="ghost" size="sm" className="text-xs">
                View All <ChevronRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </div>
          <div className="space-y-2">
            {urgentTasks.slice(0, 3).map((task) => (
              <Card key={task.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      <div className="w-4 h-4 rounded border-2 border-red-500"></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">{task.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="destructive" className="text-xs">
                          {task.priority}
                        </Badge>
                        {task.due_date && (
                          <p className="text-xs text-slate-600 dark:text-slate-400">
                            Due {format(new Date(task.due_date), 'MMM d')}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>
      )}

      {/* AI Insights */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 border-purple-200 dark:border-purple-800">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-purple-500 rounded-lg">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-slate-900 dark:text-slate-100 mb-1">AI Insight</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  You have {todayEvents.length} events today and {tasks.length} pending tasks. 
                  Stay focused on your priorities!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}