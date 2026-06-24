import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Plane, 
  Hotel, 
  AlertTriangle, 
  FileText, 
  Package, 
  DollarSign, 
  Heart,
  RefreshCw,
  Loader2,
  ExternalLink,
  ChevronRight,
  Calendar,
  MapPin
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { format } from 'date-fns';

const ALERT_ICONS = {
  flight: Plane,
  hotel: Hotel,
  visa: FileText,
  advisory: AlertTriangle,
  packing: Package,
  financial: DollarSign,
  health: Heart
};

const PRIORITY_COLORS = {
  urgent: 'bg-red-100 text-red-700 border-red-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  low: 'bg-blue-100 text-blue-700 border-blue-200'
};

export default function ProactiveTravelAlertsPanel() {
  const [expandedTrip, setExpandedTrip] = useState(null);
  const queryClient = useQueryClient();

  const { data: alertsData, isLoading, refetch } = useQuery({
    queryKey: ['travelAlerts'],
    queryFn: async () => {
      const { data } = await base44.functions.invoke('proactiveTravelAssistant', {});
      return data;
    },
    refetchInterval: 1000 * 60 * 60 * 6, // Refresh every 6 hours
    staleTime: 1000 * 60 * 60 * 3 // Consider stale after 3 hours
  });

  const refreshMutation = useMutation({
    mutationFn: async () => {
      const { data } = await base44.functions.invoke('proactiveTravelAssistant', {});
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travelAlerts'] });
      toast.success('Travel alerts refreshed!');
    },
    onError: () => {
      toast.error('Failed to refresh alerts');
    }
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const alerts = alertsData?.alerts || [];

  if (alerts.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Plane className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-600 dark:text-slate-400">
            No upcoming trips found. Plan your next adventure!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Proactive Travel Alerts</h2>
        <Button
          onClick={() => refreshMutation.mutate()}
          disabled={refreshMutation.isPending}
          variant="outline"
          size="sm"
        >
          {refreshMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
        </Button>
      </div>

      <div className="space-y-4">
        {alerts.map((alert, idx) => {
          const isExpanded = expandedTrip === alert.trip_id;
          const allAlerts = [
            ...(alert.insights.flight_alerts || []).map(a => ({ ...a, category: 'flight' })),
            ...(alert.insights.hotel_alerts || []).map(a => ({ ...a, category: 'hotel' })),
            ...(alert.insights.visa_alerts || []).map(a => ({ ...a, category: 'visa' })),
            ...(alert.insights.travel_advisories || []).map(a => ({ ...a, category: 'advisory' })),
          ];

          const urgentCount = allAlerts.filter(a => a.priority === 'urgent').length;
          const highCount = allAlerts.filter(a => a.priority === 'high').length;

          return (
            <motion.div
              key={alert.trip_id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <Card className="overflow-hidden">
                <CardHeader className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors" onClick={() => setExpandedTrip(isExpanded ? null : alert.trip_id)}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="w-4 h-4 text-teal-600" />
                        <CardTitle className="text-lg">{alert.trip_title}</CardTitle>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {format(new Date(alert.start_date), 'MMM d, yyyy')}
                        </div>
                        <Badge variant="outline">
                          {alert.days_until_trip} days away
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {urgentCount > 0 && (
                        <Badge className="bg-red-100 text-red-700 border-red-200">
                          {urgentCount} urgent
                        </Badge>
                      )}
                      {highCount > 0 && (
                        <Badge className="bg-orange-100 text-orange-700 border-orange-200">
                          {highCount} high
                        </Badge>
                      )}
                      <ChevronRight className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    </div>
                  </div>
                </CardHeader>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                    >
                      <CardContent className="space-y-4 pt-0">
                        {/* Flight Alerts */}
                        {alert.insights.flight_alerts && alert.insights.flight_alerts.length > 0 && (
                          <div>
                            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                              <Plane className="w-4 h-4 text-blue-600" />
                              Flight Alerts
                            </h4>
                            <div className="space-y-2">
                              {alert.insights.flight_alerts.map((fa, i) => (
                                <Card key={i} className={`p-3 ${PRIORITY_COLORS[fa.priority]}`}>
                                  <p className="text-sm font-medium mb-1">{fa.message}</p>
                                  <p className="text-xs">{fa.action}</p>
                                </Card>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Hotel Alerts */}
                        {alert.insights.hotel_alerts && alert.insights.hotel_alerts.length > 0 && (
                          <div>
                            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                              <Hotel className="w-4 h-4 text-purple-600" />
                              Hotel Recommendations
                            </h4>
                            <div className="space-y-2">
                              {alert.insights.hotel_alerts.map((ha, i) => (
                                <Card key={i} className={`p-3 ${PRIORITY_COLORS[ha.priority]}`}>
                                  <p className="text-sm font-medium mb-1">{ha.message}</p>
                                  <p className="text-xs">{ha.action}</p>
                                </Card>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Visa Alerts */}
                        {alert.insights.visa_alerts && alert.insights.visa_alerts.length > 0 && (
                          <div>
                            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                              <FileText className="w-4 h-4 text-red-600" />
                              Visa Requirements
                            </h4>
                            <div className="space-y-2">
                              {alert.insights.visa_alerts.map((va, i) => (
                                <Card key={i} className={`p-3 ${PRIORITY_COLORS[va.priority]}`}>
                                  <p className="text-sm font-medium mb-1">{va.message}</p>
                                  <p className="text-xs mb-2">{va.action}</p>
                                  {va.deadline && (
                                    <Badge variant="outline" className="text-xs">
                                      Deadline: {format(new Date(va.deadline), 'MMM d, yyyy')}
                                    </Badge>
                                  )}
                                </Card>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Travel Advisories */}
                        {alert.insights.travel_advisories && alert.insights.travel_advisories.length > 0 && (
                          <div>
                            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                              <AlertTriangle className="w-4 h-4 text-orange-600" />
                              Travel Advisories
                            </h4>
                            <div className="space-y-2">
                              {alert.insights.travel_advisories.map((ta, i) => (
                                <Card key={i} className={`p-3 ${PRIORITY_COLORS[ta.priority]}`}>
                                  <p className="text-sm font-medium mb-1">{ta.message}</p>
                                  {ta.source && (
                                    <p className="text-xs text-slate-500">Source: {ta.source}</p>
                                  )}
                                </Card>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Financial Tips */}
                        {alert.insights.financial_tips && alert.insights.financial_tips.length > 0 && (
                          <div>
                            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                              <DollarSign className="w-4 h-4 text-green-600" />
                              Financial Tips
                            </h4>
                            <div className="space-y-2">
                              {alert.insights.financial_tips.map((ft, i) => (
                                <Card key={i} className="p-3 bg-green-50 border-green-200">
                                  <p className="text-sm">{ft.message}</p>
                                  {ft.potential_savings > 0 && (
                                    <p className="text-xs text-green-700 mt-1">
                                      Potential savings: ${ft.potential_savings}
                                    </p>
                                  )}
                                </Card>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Health Requirements */}
                        {alert.insights.health_requirements && alert.insights.health_requirements.length > 0 && (
                          <div>
                            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                              <Heart className="w-4 h-4 text-pink-600" />
                              Health Requirements
                            </h4>
                            <div className="space-y-2">
                              {alert.insights.health_requirements.map((hr, i) => (
                                <Card key={i} className={`p-3 ${PRIORITY_COLORS[hr.priority]}`}>
                                  <p className="text-sm font-medium mb-1">{hr.message}</p>
                                  {hr.deadline && (
                                    <Badge variant="outline" className="text-xs">
                                      Complete by: {format(new Date(hr.deadline), 'MMM d, yyyy')}
                                    </Badge>
                                  )}
                                </Card>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Packing Reminders */}
                        {alert.insights.packing_reminders && alert.insights.packing_reminders.length > 0 && (
                          <div>
                            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                              <Package className="w-4 h-4 text-indigo-600" />
                              Packing Reminders
                            </h4>
                            <div className="space-y-2">
                              {alert.insights.packing_reminders.map((pr, i) => (
                                <p key={i} className="text-sm text-slate-600 dark:text-slate-400">
                                  • {pr.message}
                                </p>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}