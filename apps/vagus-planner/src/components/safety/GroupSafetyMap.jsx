/**
 * GroupSafetyMap — real-time map of group member locations with safety indicators
 */
import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, AlertTriangle, Users, RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import L from 'leaflet';

// Custom icons for different safety statuses
const createIcon = (status) => {
  const colors = {
    safe: '#10b981',
    nearby: '#f59e0b',
    separated: '#ef4444',
    inactive: '#9ca3af'
  };
  return L.divIcon({
    html: `<div class="w-8 h-8 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white font-bold text-xs" style="background: ${colors[status]}">📍</div>`,
    iconSize: [32, 32],
    className: 'custom-icon'
  });
};

function SafetyIndicator({ status, distance }) {
  const config = {
    safe: { color: 'text-emerald-600', bg: 'bg-emerald-50', icon: '✓', label: 'Safe' },
    nearby: { color: 'text-amber-600', bg: 'bg-amber-50', icon: '⚠', label: 'Nearby' },
    separated: { color: 'text-red-600', bg: 'bg-red-50', icon: '!', label: 'Separated' },
    inactive: { color: 'text-slate-400', bg: 'bg-slate-50', icon: '○', label: 'Offline' }
  };
  const cfg = config[status] || config.inactive;
  return (
    <div className={`flex items-center gap-2 px-2 py-1 rounded ${cfg.bg}`}>
      <span className={cn('font-bold text-sm', cfg.color)}>{cfg.icon}</span>
      <span className="text-xs font-semibold text-slate-700">
        {cfg.label}
        {distance && ` · ${distance.toFixed(1)}km`}
      </span>
    </div>
  );
}

export default function GroupSafetyMap({
  groupChatId,
  tripId,
  contextType = 'group_chat',
  groupName = 'Group',
  autoRefresh = true
}) {
  const [refetchInterval, setRefetchInterval] = useState(autoRefresh ? 5000 : false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Fetch live locations
  const { data: liveLocations = [], isLoading, refetch } = useQuery({
    queryKey: ['liveLocations', groupChatId || tripId],
    queryFn: async () => {
      const query = contextType === 'trip'
        ? { trip_id: tripId, is_sharing: true }
        : { group_chat_id: groupChatId, is_sharing: true };
      const locations = await base44.entities.LiveLocation.list('-last_updated_at', 100);
      return locations.filter(l =>
        (contextType === 'trip' ? l.trip_id === tripId : l.group_chat_id === groupChatId) &&
        l.is_sharing
      );
    },
    refetchInterval
  });

  // Calculate center and bounds
  const center = liveLocations.length > 0
    ? [
      liveLocations.reduce((sum, l) => sum + l.latitude, 0) / liveLocations.length,
      liveLocations.reduce((sum, l) => sum + l.longitude, 0) / liveLocations.length
    ]
    : [21.4225, 39.8262]; // Kaaba default

  // Calculate distances between users
  const getDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  // Assign safety status
  const getSafetyStatus = (location) => {
    if (!location.is_sharing) return 'inactive';
    const minDist = Math.min(...liveLocations
      .filter(l => l.id !== location.id && l.is_sharing)
      .map(l => getDistance(location.latitude, location.longitude, l.latitude, l.longitude))
    );
    if (minDist < 0.1) return 'safe'; // within 100m
    if (minDist < 0.5) return 'nearby'; // within 500m
    return 'separated'; // > 500m
  };

  if (isLoading && liveLocations.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-slate-600" />
          <span className="font-bold text-slate-800 dark:text-slate-200">
            {liveLocations.length} member{liveLocations.length !== 1 ? 's' : ''} sharing
          </span>
        </div>
        <Button
          onClick={() => refetch()}
          size="sm"
          variant="outline"
          className="gap-1.5"
        >
          <RefreshCw className="w-3 h-3" />
          Refresh
        </Button>
      </div>

      {/* Map */}
      {liveLocations.length > 0 ? (
        <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-md" style={{ height: '400px' }}>
          <MapContainer center={center} zoom={16} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OpenStreetMap contributors'
            />
            {liveLocations.map(loc => {
              const status = getSafetyStatus(loc);
              const minDist = Math.min(...liveLocations
                .filter(l => l.id !== loc.id && l.is_sharing)
                .map(l => getDistance(loc.latitude, loc.longitude, l.latitude, l.longitude))
              );
              return (
                <React.Fragment key={loc.id}>
                  <Marker
                    position={[loc.latitude, loc.longitude]}
                    icon={createIcon(status)}
                    eventHandlers={{ click: () => setSelectedUser(loc) }}
                  >
                    <Popup>
                      <div className="space-y-2 text-sm">
                        <p className="font-bold">{loc.user_name}</p>
                        <SafetyIndicator status={status} distance={minDist} />
                        {loc.location_name && <p className="text-xs text-slate-600">📍 {loc.location_name}</p>}
                        <p className="text-xs text-slate-500">Battery: {loc.battery_level}%</p>
                        <p className="text-xs text-slate-400">
                          Updated: {new Date(loc.last_updated_at).toLocaleTimeString()}
                        </p>
                      </div>
                    </Popup>
                  </Marker>
                  {/* Accuracy circle */}
                  {loc.accuracy_meters && (
                    <Circle
                      center={[loc.latitude, loc.longitude]}
                      radius={loc.accuracy_meters}
                      pathOptions={{ color: '#38bdf8', opacity: 0.1, fillOpacity: 0.05 }}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </MapContainer>
        </div>
      ) : (
        <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
          <MapPin className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="font-semibold text-slate-700 dark:text-slate-300">No active locations</p>
          <p className="text-xs text-slate-500 mt-1">Group members need to enable location sharing</p>
        </div>
      )}

      {/* Member List */}
      {liveLocations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Member Locations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {liveLocations.map(loc => {
              const status = getSafetyStatus(loc);
              const minDist = Math.min(...liveLocations
                .filter(l => l.id !== loc.id && l.is_sharing)
                .map(l => getDistance(loc.latitude, loc.longitude, l.latitude, l.longitude))
              );
              return (
                <div
                  key={loc.id}
                  className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-100 dark:border-slate-700/50"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm">{loc.user_name}</p>
                    {loc.location_name && <p className="text-xs text-slate-500 truncate">📍 {loc.location_name}</p>}
                  </div>
                  <SafetyIndicator status={status} distance={minDist} />
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Safety Tips */}
      <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900 rounded-lg text-xs text-blue-700 dark:text-blue-300">
        <p className="font-semibold mb-1">💡 Safety Tips</p>
        <ul className="space-y-0.5">
          <li>• Distances update every 5-10 seconds</li>
          <li>• Green = within 100m · Amber = within 500m · Red = separated</li>
          <li>• Works best in open areas (Tawaf, Arafat, Mina)</li>
          <li>• Mobile networks may affect accuracy</li>
        </ul>
      </div>
    </div>
  );
}