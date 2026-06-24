import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Cloud, Plane, MapPin, RefreshCw, Loader2 } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

export default function AITravelAlertsMonitor() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);

  const { data: activeTrips = [] } = useQuery({
    queryKey: ['active-trips'],
    queryFn: async () => {
      const all = await base44.entities.Holiday.list();
      return all.filter(h => h.status === 'booked' || h.status === 'in_progress');
    }
  });

  const checkAlerts = async () => {
    if (activeTrips.length === 0) return;
    
    setLoading(true);
    try {
      const alertPromises = activeTrips
        .filter(trip => trip && trip.destination)
        .map(async (trip) => {
          try {
            const response = await base44.integrations.Core.InvokeLLM({
              prompt: `Provide real-time travel alerts for: ${trip.destination}
              
Trip details:
- Destination: ${trip.destination}
- Start date: ${trip.start_date}
- End date: ${trip.end_date}

Check for:
1. Weather alerts (storms, extreme conditions)
2. Flight status (if applicable)
3. Local events affecting travel
4. Health/safety advisories
5. Transportation disruptions

Return current alerts with severity and recommendations.`,
              add_context_from_internet: true,
              response_json_schema: {
                type: "object",
                properties: {
                  alerts: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        type: { type: "string" },
                        severity: { type: "string" },
                        message: { type: "string" },
                        recommendation: { type: "string" }
                      }
                    }
                  }
                }
              }
            });

            return {
              trip: trip.destination,
              trip_id: trip.id,
              alerts: response?.alerts || []
            };
          } catch (error) {
            console.error(`Failed to fetch alerts for ${trip.destination}:`, error);
            return { trip: trip.destination, trip_id: trip.id, alerts: [] };
          }
        });

      const results = await Promise.all(alertPromises);
      setAlerts(results.flatMap(r => 
        (r.alerts || []).map(a => ({ ...a, trip: r.trip, trip_id: r.trip_id }))
      ));
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTrips.length > 0) {
      checkAlerts();
    }
  }, [activeTrips.length]);

  const getSeverityColor = (severity) => {
    const s = severity?.toLowerCase();
    if (s === 'high' || s === 'critical') return 'bg-red-100 text-red-700 border-red-200';
    if (s === 'medium' || s === 'moderate') return 'bg-amber-100 text-amber-700 border-amber-200';
    return 'bg-blue-100 text-blue-700 border-blue-200';
  };

  const getSeverityIcon = (severity) => {
    const s = severity?.toLowerCase();
    if (s === 'high' || s === 'critical') return <AlertTriangle className="w-5 h-5 text-red-600" />;
    if (s === 'medium' || s === 'moderate') return <Cloud className="w-5 h-5 text-amber-600" />;
    return <Plane className="w-5 h-5 text-blue-600" />;
  };

  if (activeTrips.length === 0) {
    return (
      <Card className="bg-slate-50 border-dashed">
        <CardContent className="p-6 text-center">
          <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600">No active trips to monitor</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600">
          Real-time alerts for {activeTrips.length} active trip{activeTrips.length !== 1 ? 's' : ''}
        </p>
        <Button 
          onClick={checkAlerts} 
          size="sm" 
          variant="outline"
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
        </Button>
      </div>

      {alerts.length === 0 ? (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-6 text-center">
            <p className="text-green-700 font-medium">✅ All clear! No alerts for your trips.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert, index) => (
            <Card key={index} className={getSeverityColor(alert.severity)}>
              <CardContent className="p-4">
                <div className="flex gap-3">
                  {getSeverityIcon(alert.severity)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="text-xs">
                        {alert.trip}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {alert.type}
                      </Badge>
                      <Badge className="text-xs">{alert.severity}</Badge>
                    </div>
                    <p className="font-medium text-sm mb-2">{alert.message}</p>
                    {alert.recommendation && (
                      <p className="text-xs opacity-80">
                        <span className="font-medium">Recommendation:</span> {alert.recommendation}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}