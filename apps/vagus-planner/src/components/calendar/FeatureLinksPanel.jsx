import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { 
  Moon, Heart, Plane, Trophy, MessageCircle, Activity, 
  BookOpen, Calendar, ArrowRight, Sparkles
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const FEATURE_LINKS = [
  {
    title: 'Islamic Features',
    description: 'Prayer times, Quran, Ramadan tracking',
    icon: Moon,
    page: 'Islamic',
    color: 'from-teal-500 to-cyan-600',
    bgColor: 'bg-teal-50',
    borderColor: 'border-teal-200',
    textColor: 'text-teal-700',
    iconColor: 'text-teal-600'
  },
  {
    title: 'Health & Wellness',
    description: 'Mood, exercise, nutrition, sleep tracking',
    icon: Activity,
    page: 'Health',
    color: 'from-rose-500 to-pink-600',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-200',
    textColor: 'text-rose-700',
    iconColor: 'text-rose-600'
  },
  {
    title: 'Holidays & Travel',
    description: 'Trip planning, budgets, itineraries',
    icon: Plane,
    page: 'Holidays',
    color: 'from-amber-500 to-orange-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    textColor: 'text-amber-700',
    iconColor: 'text-amber-600'
  },
  {
    title: 'Chat & Teams',
    description: 'Messages, collaborations, group chats',
    icon: MessageCircle,
    page: 'Chat',
    color: 'from-blue-500 to-indigo-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-700',
    iconColor: 'text-blue-600'
  },
  {
    title: 'Achievements',
    description: 'Challenges, leaderboards, badges',
    icon: Trophy,
    page: 'Gamification',
    color: 'from-purple-500 to-violet-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    textColor: 'text-purple-700',
    iconColor: 'text-purple-600'
  },
  {
    title: 'Profile & Goals',
    description: 'Personal goals and progress tracking',
    icon: Heart,
    page: 'Profile',
    color: 'from-pink-500 to-rose-600',
    bgColor: 'bg-pink-50',
    borderColor: 'border-pink-200',
    textColor: 'text-pink-700',
    iconColor: 'text-pink-600'
  }
];

export default function FeatureLinksPanel() {
  return (
    <Card className="bg-gradient-to-br from-slate-50 to-cyan-50/30 border-teal-100">
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-teal-600" />
          <h3 className="text-lg font-bold text-slate-800">
            Quick Access to All Features
          </h3>
          <Badge variant="outline" className="ml-auto bg-teal-50 text-teal-700 border-teal-300">
            Linked to Calendar
          </Badge>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {FEATURE_LINKS.map((feature, index) => {
            const Icon = feature.icon;
            
            return (
              <motion.div
                key={feature.page}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link to={createPageUrl(feature.page)}>
                  <motion.div
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    className={`${feature.bgColor} ${feature.borderColor} border-2 rounded-xl p-4 cursor-pointer transition-all hover:shadow-md group`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 bg-gradient-to-br ${feature.color} rounded-lg shadow-sm group-hover:shadow-md transition-shadow`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className={`font-semibold ${feature.textColor} mb-1 group-hover:underline`}>
                          {feature.title}
                        </h4>
                        <p className="text-xs text-slate-600">
                          {feature.description}
                        </p>
                      </div>
                      <ArrowRight className={`w-4 h-4 ${feature.iconColor} flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity`} />
                    </div>
                  </motion.div>
                </Link>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-4 p-3 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg border border-teal-200">
          <p className="text-xs text-slate-700">
            <Calendar className="w-4 h-4 inline mr-1 text-teal-600" />
            <span className="font-semibold">Calendar Integration:</span> All features sync automatically with your calendar events and schedules
          </p>
        </div>
      </CardContent>
    </Card>
  );
}