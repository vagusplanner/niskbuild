import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  AlertCircle, AlertTriangle, Info, Plane, 
  Cloud, Shield, RefreshCw, Loader2, X, ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';

export default function TravelAlertsPanel({ holiday }) {
  const queryClient = useQueryClient();

  const { data: alerts = [], isLoading, refetch } = useQuery({
    queryKey: ['travel-alerts', holiday?.id],
    queryFn: () => base44.entities.TravelAlert.filter({ 
      holiday_id: holiday.id,
      status: 'active'
    }),
    enabled: !!holiday?.id && (holiday?.status === 'booked' || holiday?.status === 'in_progress'),
    refetchInterval: 5 * 60 * 1000 // Refetch every 5 minutes
  });

  const dismissAlertMutation = useMutation({
    mutationFn: (alertId) => base44.entities.TravelAlert.update(alertId, { status: 'dismissed' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travel-alerts'] });
      toast.success('Alert dismissed');
    }
  });

  const getIcon = (type) => {
    switch (type) {
      case 'flight_delay':
      case 'cancellation':
      case 'gate_change':
        return Plane;
      case 'weather':
        return Cloud;
      case 'visa_change':
      case 'advisory':
      case 'security':
        return Shield;
      default:
        return Info;
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-amber-50 border-amber-200 text-amber-800';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  if (!holiday || (holiday.status !== 'booked' && holiday.status !== 'in_progress')) {
    return null;
  }

  return (
    <Card className="p-4 bg-white border-slate-200">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-slate-600" />
          <h3 className="font-semibold text-slate-800">Travel Alerts</h3>
          {alerts.length > 0 && (
            <Badge variant="destructive">{alerts.length}</Badge>
          )}
        </div>
        <Button
          onClick={() => refetch()}
          size="sm"
          variant="ghost"
          disabled={isLoading}
          className="h-8"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
        </Button>
      </div>

      <AnimatePresence mode="popLayout">
        {alerts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-4"
          >
            <Info className="w-8 h-8 text-green-400 mx-auto mb-2" />
            <p className="text-sm text-slate-600">No alerts - all clear!</p>
          </motion.div>
        ) : (
          <div className="space-y-2">
            {alerts.map((alert, idx) => {
              const Icon = getIcon(alert.type);
              
              return (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: idx * 0.1 }}
                  className={`p-3 rounded-lg border ${getSeverityColor(alert.severity)}`}
                >
                  <div className="flex items-start gap-3">
                    <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant="outline" 
                            className="text-xs border-current"
                          >
                            {alert.type.replace('_', ' ')}
                          </Badge>
                          {alert.severity === 'critical' && (
                            <Badge className="bg-red-600 text-white text-xs">
                              Urgent
                            </Badge>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={() => dismissAlertMutation.mutate(alert.id)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                      <h4 className="font-semibold text-sm mb-1">{alert.title}</h4>
                      <p className="text-sm mb-2">{alert.message}</p>
                      
                      {alert.suggested_actions?.length > 0 && (
                        <div className="mt-2 space-y-1">
                          <p className="text-xs font-semibold opacity-80">Suggested Actions:</p>
                          {alert.suggested_actions.map((action, i) => (
                            <div key={i} className="flex items-center justify-between text-xs p-2 bg-white/50 rounded">
                              <span>{action.action}</span>
                              {action.url && (
                                <a 
                                  href={action.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline flex items-center gap-1"
                                >
                                  View <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </AnimatePresence>
    </Card>
  );
}