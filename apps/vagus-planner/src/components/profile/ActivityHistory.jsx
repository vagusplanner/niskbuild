import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Activity,
  Calendar,
  CheckSquare,
  Target,
  Settings,
  User,
  MessageSquare,
  FileText,
  Clock,
  Filter,
  Search,
  LogIn,
  LogOut,
  Trash2,
  Edit3,
  Plus
} from 'lucide-react';
import { format, isToday, isYesterday, formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

const ACTION_ICONS = {
  event_created: { icon: Plus, color: 'emerald', bg: 'bg-emerald-100', text: 'text-emerald-600' },
  event_updated: { icon: Edit3, color: 'blue', bg: 'bg-blue-100', text: 'text-blue-600' },
  event_deleted: { icon: Trash2, color: 'red', bg: 'bg-red-100', text: 'text-red-600' },
  task_created: { icon: Plus, color: 'amber', bg: 'bg-amber-100', text: 'text-amber-600' },
  task_updated: { icon: Edit3, color: 'orange', bg: 'bg-orange-100', text: 'text-orange-600' },
  task_completed: { icon: CheckSquare, color: 'green', bg: 'bg-green-100', text: 'text-green-600' },
  goal_created: { icon: Plus, color: 'purple', bg: 'bg-purple-100', text: 'text-purple-600' },
  goal_updated: { icon: Edit3, color: 'violet', bg: 'bg-violet-100', text: 'text-violet-600' },
  goal_completed: { icon: Target, color: 'indigo', bg: 'bg-indigo-100', text: 'text-indigo-600' },
  meeting_scheduled: { icon: Calendar, color: 'teal', bg: 'bg-teal-100', text: 'text-teal-600' },
  settings_changed: { icon: Settings, color: 'slate', bg: 'bg-slate-100', text: 'text-slate-600' },
  profile_updated: { icon: User, color: 'cyan', bg: 'bg-cyan-100', text: 'text-cyan-600' },
  message_sent: { icon: MessageSquare, color: 'blue', bg: 'bg-blue-100', text: 'text-blue-600' },
  file_uploaded: { icon: FileText, color: 'pink', bg: 'bg-pink-100', text: 'text-pink-600' },
  login: { icon: LogIn, color: 'green', bg: 'bg-green-100', text: 'text-green-600' },
  logout: { icon: LogOut, color: 'slate', bg: 'bg-slate-100', text: 'text-slate-600' }
};

export default function ActivityHistory() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ['activityLog'],
    queryFn: () => base44.entities.ActivityLog.list('-created_date', 200)
  });

  // Filter activities
  const filteredActivities = activities.filter(activity => {
    // Search filter
    if (searchQuery && !activity.description?.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !activity.entity_title?.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    // Type filter
    if (filterType !== 'all' && activity.action_type !== filterType) {
      return false;
    }

    // Date filter
    if (dateFilter !== 'all') {
      const activityDate = new Date(activity.created_date);
      const now = new Date();
      if (dateFilter === 'today' && !isToday(activityDate)) return false;
      if (dateFilter === 'yesterday' && !isYesterday(activityDate)) return false;
      if (dateFilter === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        if (activityDate < weekAgo) return false;
      }
      if (dateFilter === 'month') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        if (activityDate < monthAgo) return false;
      }
    }

    return true;
  });

  // Group activities by date
  const groupedActivities = filteredActivities.reduce((groups, activity) => {
    const date = new Date(activity.created_date);
    let dateKey;
    
    if (isToday(date)) {
      dateKey = 'Today';
    } else if (isYesterday(date)) {
      dateKey = 'Yesterday';
    } else {
      dateKey = format(date, 'MMM d, yyyy');
    }

    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(activity);
    return groups;
  }, {});

  const getActionConfig = (actionType) => {
    return ACTION_ICONS[actionType] || { icon: Activity, color: 'slate', bg: 'bg-slate-100', text: 'text-slate-600' };
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-teal-600" />
          Activity History
        </CardTitle>
        <CardDescription>
          Track all your actions and changes across the platform
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="space-y-3 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search activities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-2">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="event_created">Events</SelectItem>
                <SelectItem value="task_created">Tasks</SelectItem>
                <SelectItem value="goal_created">Goals</SelectItem>
                <SelectItem value="settings_changed">Settings</SelectItem>
                <SelectItem value="login">Login/Logout</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="All Time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="yesterday">Yesterday</SelectItem>
                <SelectItem value="week">Last 7 Days</SelectItem>
                <SelectItem value="month">Last 30 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Activity List */}
        <ScrollArea className="h-[600px] pr-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full" />
            </div>
          ) : Object.keys(groupedActivities).length > 0 ? (
            <div className="space-y-6">
              <AnimatePresence>
                {Object.entries(groupedActivities).map(([dateKey, dateActivities]) => (
                  <motion.div
                    key={dateKey}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-3"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <Clock className="w-4 h-4 text-slate-400" />
                      <h4 className="text-sm font-semibold text-slate-700">{dateKey}</h4>
                      <div className="flex-1 h-px bg-slate-200" />
                    </div>

                    <div className="space-y-2">
                      {dateActivities.map((activity, idx) => {
                        const config = getActionConfig(activity.action_type);
                        const Icon = config.icon;

                        return (
                          <motion.div
                            key={activity.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.03 }}
                            className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors group"
                          >
                            <div className={cn('w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0', config.bg)}>
                              <Icon className={cn('w-5 h-5', config.text)} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-800">
                                {activity.description}
                              </p>
                              {activity.entity_title && (
                                <p className="text-xs text-slate-600 mt-1">
                                  {activity.entity_type}: <span className="font-medium">{activity.entity_title}</span>
                                </p>
                              )}
                              <p className="text-xs text-slate-400 mt-1">
                                {formatDistanceToNow(new Date(activity.created_date), { addSuffix: true })}
                              </p>
                            </div>
                            <Badge variant="outline" className="text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                              {activity.action_type.replace(/_/g, ' ')}
                            </Badge>
                          </motion.div>
                        );
                      })}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <Activity className="w-16 h-16 mb-3 opacity-20" />
              <p className="text-sm">
                {searchQuery || filterType !== 'all' || dateFilter !== 'all'
                  ? 'No activities found matching your filters'
                  : 'No activity recorded yet'}
              </p>
            </div>
          )}
        </ScrollArea>

        {/* Stats */}
        {filteredActivities.length > 0 && (
          <div className="mt-6 pt-6 border-t grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-teal-600">{filteredActivities.length}</p>
              <p className="text-xs text-slate-500">Total Actions</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">
                {filteredActivities.filter(a => isToday(new Date(a.created_date))).length}
              </p>
              <p className="text-xs text-slate-500">Today</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">
                {Object.keys(groupedActivities).length}
              </p>
              <p className="text-xs text-slate-500">Active Days</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}