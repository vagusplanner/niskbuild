import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  X, MapPin, Star, Phone, Globe, Navigation, Calendar, Search,
  Utensils, Clock, RefreshCw, ChevronRight, ExternalLink, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const CUISINE_FILTERS = ['All', 'Burger', 'Pizza', 'Biryani', 'Shawarma', 'BBQ', 'Seafood', 'Dessert'];

export default function HalalRestaurantFinder({ isOpen, onClose }) {
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [cuisineFilter, setCuisineFilter] = useState('All');
  const [selected, setSelected] = useState(null);
  const [addingToCalendar, setAddingToCalendar] = useState(false);
  const [diningDate, setDiningDate] = useState('');
  const [diningTime, setDiningTime] = useState('19:00');
  const queryClient = useQueryClient();

  useEffect(() => {
    if (isOpen && !location) detectLocation();
  }, [isOpen]);

  const detectLocation = () => {
    setLocationError(null);
    if (!navigator.geolocation) {
      setLocationError('Geolocation not supported by your browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setLocation(loc);
        fetchRestaurants(loc);
      },
      () => setLocationError('Could not detect your location. Please allow location access.')
    );
  };

  const fetchRestaurants = async (loc, query = '') => {
    setLoading(true);
    setRestaurants([]);
    setSelected(null);
    const res = await base44.functions.invoke('findHalalRestaurants', {
      lat: loc.lat,
      lng: loc.lng,
      query: query || ''
    });
    setRestaurants(res.data?.restaurants || []);
    setLoading(false);
  };

  const handleSearch = () => {
    if (!location) return;
    fetchRestaurants(location, searchQuery);
  };

  const handleAddToCalendar = async () => {
    if (!selected || !diningDate) {
      toast.error('Please select a date for your dining event.');
      return;
    }
    setAddingToCalendar(true);
    const start = new Date(`${diningDate}T${diningTime}:00`);
    const end = new Date(start.getTime() + 90 * 60000);
    await base44.entities.Event.create({
      title: `Dining at ${selected.name}`,
      description: `Halal restaurant visit.\n${selected.address || ''}\n${selected.phone || ''}\n${selected.website || ''}`,
      start_date: start.toISOString(),
      end_date: end.toISOString(),
      is_all_day: false,
      category: 'social',
      location: selected.address || selected.name,
      color: '#10b981',
      reminders: [{ minutes_before: 60, type: 'notification', sent: false }]
    });
    queryClient.invalidateQueries({ queryKey: ['events'] });
    toast.success(`"${selected.name}" added to your calendar!`);
    setAddingToCalendar(false);
    setSelected(null);
  };

  const filteredRestaurants = restaurants.filter(r => {
    const matchCuisine = cuisineFilter === 'All' || (r.cuisine || '').toLowerCase().includes(cuisineFilter.toLowerCase());
    return matchCuisine;
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-white dark:bg-slate-900 shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
                  <Utensils className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-800 dark:text-slate-100 text-base">Halal Restaurants</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Near your location</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/60 dark:hover:bg-slate-800 transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Search */}
            <div className="px-4 pt-4 pb-2 space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Search cuisine, restaurant name..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  className="flex-1 text-sm"
                />
                <Button size="sm" onClick={handleSearch} disabled={loading || !location} className="bg-emerald-600 hover:bg-emerald-700 text-white px-3">
                  <Search className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="outline" onClick={detectLocation} disabled={loading} className="px-3">
                  <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                </Button>
              </div>

              {/* Cuisine filters */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                {CUISINE_FILTERS.map(c => (
                  <button
                    key={c}
                    onClick={() => setCuisineFilter(c)}
                    className={cn(
                      "px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0",
                      cuisineFilter === c
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/30"
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Location error */}
            {locationError && (
              <div className="mx-4 mb-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{locationError}</span>
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-3">
              {loading && (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                  <p className="text-sm">Finding halal restaurants near you...</p>
                </div>
              )}

              {!loading && filteredRestaurants.length === 0 && location && (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
                  <Utensils className="w-10 h-10 text-slate-300" />
                  <p className="text-sm text-center">No restaurants found. Try a different search or cuisine filter.</p>
                </div>
              )}

              {!loading && !location && !locationError && (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
                  <MapPin className="w-10 h-10 text-slate-300" />
                  <p className="text-sm text-center">Detecting your location...</p>
                </div>
              )}

              {filteredRestaurants.map((r, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={cn(
                    "rounded-2xl border cursor-pointer transition-all overflow-hidden",
                    selected?.name === r.name
                      ? "border-emerald-400 shadow-lg shadow-emerald-100/50 dark:shadow-emerald-900/20"
                      : "border-slate-100 dark:border-slate-800 hover:border-emerald-200 dark:hover:border-emerald-800"
                  )}
                  onClick={() => setSelected(selected?.name === r.name ? null : r)}
                >
                  <div className="p-4 bg-white dark:bg-slate-800/60">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-sm truncate">{r.name}</h3>
                          <Badge className="bg-emerald-100 text-emerald-700 border-0 text-[10px] px-1.5 py-0 dark:bg-emerald-900/50 dark:text-emerald-300">Halal</Badge>
                        </div>
                        {r.cuisine && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{r.cuisine}</p>}
                        {r.address && (
                          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 flex items-start gap-1">
                            <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                            <span className="line-clamp-1">{r.address}</span>
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        {r.rating && (
                          <span className="flex items-center gap-1 text-amber-500 text-xs font-medium">
                            <Star className="w-3 h-3 fill-amber-400" /> {r.rating}
                          </span>
                        )}
                        {r.distance && <span className="text-xs text-slate-400">{r.distance}</span>}
                        {r.open_now !== undefined && (
                          <span className={cn("text-[10px] font-medium", r.open_now ? "text-emerald-600" : "text-red-500")}>
                            {r.open_now ? 'Open now' : 'Closed'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded details */}
                  <AnimatePresence>
                    {selected?.name === r.name && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-emerald-100 dark:border-emerald-900/30 bg-emerald-50/50 dark:bg-emerald-950/20 px-4 py-3 space-y-3"
                      >
                        {/* Info row */}
                        <div className="flex flex-wrap gap-3 text-xs text-slate-600 dark:text-slate-300">
                          {r.phone && (
                            <a href={`tel:${r.phone}`} className="flex items-center gap-1 hover:text-emerald-600">
                              <Phone className="w-3 h-3" /> {r.phone}
                            </a>
                          )}
                          {r.website && (
                            <a href={r.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-emerald-600">
                              <Globe className="w-3 h-3" /> Website
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                          {r.hours && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {r.hours}
                            </span>
                          )}
                        </div>

                        {/* Directions */}
                        {r.address && (
                          <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(r.address)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-2 text-xs text-white bg-slate-700 hover:bg-slate-800 px-3 py-2 rounded-lg transition-colors w-full justify-center"
                          >
                            <Navigation className="w-3 h-3" /> Get Directions
                          </a>
                        )}

                        {/* Add to Calendar */}
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> Book on Calendar
                          </p>
                          <div className="flex gap-2">
                            <input
                              type="date"
                              value={diningDate}
                              onChange={e => setDiningDate(e.target.value)}
                              min={new Date().toISOString().split('T')[0]}
                              className="flex-1 text-xs border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                            />
                            <input
                              type="time"
                              value={diningTime}
                              onChange={e => setDiningTime(e.target.value)}
                              className="w-24 text-xs border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                            />
                          </div>
                          <Button
                            size="sm"
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                            onClick={handleAddToCalendar}
                            disabled={addingToCalendar || !diningDate}
                          >
                            {addingToCalendar ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Calendar className="w-3 h-3 mr-1" />}
                            {addingToCalendar ? 'Adding...' : 'Add to Calendar'}
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}