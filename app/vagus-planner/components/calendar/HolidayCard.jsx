import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plane, Calendar, MapPin, DollarSign, Hotel, MoreVertical, Edit2, Trash2, ExternalLink, BookOpen, Route, AlertCircle, Package, Users, MessageSquare } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import TripFeedbackModal from '@/components/holiday/TripFeedbackModal';

const statusStyles = {
  planned: { bg: 'bg-slate-100', text: 'text-slate-700', label: 'Planned' },
  booked: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Booked' },
  completed: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Completed' },
  cancelled: { bg: 'bg-red-100', text: 'text-red-700', label: 'Cancelled' }
};

export default function HolidayCard({ holiday, onEdit, onDelete, onShare, onSelectTrip, index = 0 }) {
  const [showFeedback, setShowFeedback] = useState(false);
  const status = statusStyles[holiday.status] || statusStyles.planned;
  const duration = differenceInDays(new Date(holiday.end_date), new Date(holiday.start_date)) + 1;
  const daysUntil = differenceInDays(new Date(holiday.start_date), new Date());

  const { data: shares = [] } = useQuery({
    queryKey: ['holiday-shares', holiday.id],
    queryFn: () => base44.entities.HolidayShare.filter({ holiday_id: holiday.id, status: 'accepted' }),
    initialData: []
  });

  const { data: feedback = [] } = useQuery({
    queryKey: ['trip-feedback', holiday.id],
    queryFn: () => base44.entities.TripFeedback.filter({ holiday_id: holiday.id }),
    enabled: holiday.status === 'completed'
  });

  const hasFeedback = feedback.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-5 hover:shadow-lg transition-all"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-4 flex-1">
          <div className="p-3 bg-white rounded-xl shadow-sm">
            <Plane className="w-6 h-6 text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-slate-800 text-lg">{holiday.title}</h3>
              <Badge className={cn("text-xs", status.bg, status.text)}>
                {status.label}
              </Badge>
              {holiday.status === 'completed' && !hasFeedback && (
                <Button
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowFeedback(true);
                  }}
                  className="bg-purple-600 hover:bg-purple-700 h-6 text-xs px-2"
                >
                  <MessageSquare className="w-3 h-3 mr-1" />
                  Leave Feedback
                </Button>
              )}
            </div>

            {holiday.destination && (
              <p className="text-amber-700 flex items-center gap-1 mt-1">
                <MapPin className="w-4 h-4" />
                {holiday.destination}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-slate-600">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {format(new Date(holiday.start_date), 'MMM d')} - {format(new Date(holiday.end_date), 'MMM d, yyyy')}
              </span>
              <span className="font-medium text-amber-700">{duration} days</span>
            </div>

            {(holiday.budget || holiday.accommodation) && (
              <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-slate-500">
                {holiday.budget && (
                  <span className="flex items-center gap-1">
                    <DollarSign className="w-4 h-4" />
                    {holiday.budget.toLocaleString()}
                  </span>
                )}
                {holiday.accommodation && (
                  <span className="flex items-center gap-1">
                    <Hotel className="w-4 h-4" />
                    {holiday.accommodation}
                  </span>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 mt-3 flex-wrap">
              {shares.length > 0 && (
                <div className="inline-flex items-center gap-1 px-3 py-1 bg-teal-100 text-teal-700 rounded-full text-xs cursor-pointer hover:bg-teal-200" onClick={() => onSelectTrip?.(holiday)}>
                  <Users className="w-3 h-3" />
                  {shares.length} collaborator{shares.length !== 1 ? 's' : ''}
                </div>
              )}
              {shares.length > 0 && onSelectTrip && (
                <Button
                  onClick={() => onSelectTrip(holiday)}
                  size="sm"
                  className="bg-teal-600 hover:bg-teal-700 h-6 text-xs px-2"
                >
                  <MapPin className="w-3 h-3 mr-1" />
                  Safety Map
                </Button>
              )}
              {daysUntil > 0 && holiday.status !== 'completed' && holiday.status !== 'cancelled' && (
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white rounded-full text-sm">
                  <span className="text-slate-500">Starts in</span>
                  <span className="font-semibold text-amber-600">{daysUntil} days</span>
                </div>
              )}
              {holiday.is_multi_city && holiday.cities?.length > 0 && (
                <div className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs">
                  <Route className="w-3 h-3" />
                  Multi-City: {holiday.cities.length} stops
                </div>
              )}
              {holiday.visa_requirements?.required && (
                <div className="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs">
                  <AlertCircle className="w-3 h-3" />
                  Visa Required
                </div>
              )}
              {holiday.package_booking?.package_url && (
                <a
                  href={holiday.package_booking.package_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1 bg-purple-600 text-white rounded-full text-xs hover:bg-purple-700 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Package className="w-3 h-3" />
                  Package Deal
                </a>
              )}
              {holiday.destination && (
                <a
                  href={`https://www.booking.com/searchresults.html?ss=${encodeURIComponent(holiday.destination)}&checkin=${holiday.start_date}&checkout=${holiday.end_date}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded-full text-xs hover:bg-blue-700 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <BookOpen className="w-3 h-3" />
                  Find Hotels
                </a>
              )}
            </div>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-2 rounded-lg hover:bg-white/50 transition-colors">
              <MoreVertical className="w-5 h-5 text-slate-400" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(holiday)}>
              <Edit2 className="w-4 h-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onShare(holiday)}>
              <Users className="w-4 h-4 mr-2" />
              Share & Collaborate
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => onDelete(holiday.id)}
              className="text-red-600 focus:text-red-600"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <TripFeedbackModal
        holiday={holiday}
        open={showFeedback}
        onClose={() => setShowFeedback(false)}
      />
    </motion.div>
  );
}