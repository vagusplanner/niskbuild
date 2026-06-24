/**
 * MosqueMap — Full-page interactive Islamic institutions map
 * Features:
 * - Leaflet map with OSM tiles (no API key)
 * - Real GPS location detection
 * - Overpass API mosque fetching
 * - Service filters (Jumu'ah, youth, sisters, classes, etc.)
 * - Claim listing flow (saves to MosaqueDirectory entity)
 * - Custom/claimed listings with enriched data
 */
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SDK } from '@/lib/custom-sdk.js';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  MapPin, Navigation, Phone, ExternalLink, Star, Filter, X, Search,
  CheckCircle2, Clock, Users, BookOpen, Heart, Car, Accessibility,
  Utensils, Shield, Building2, Loader2, ChevronDown, ChevronUp,
  BadgeCheck, AlertCircle, Plus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import IslamicEditionGate from '@/components/auth/IslamicEditionGate';

// ── Service definitions ────────────────────────────────────────────────────────
const SERVICES = [
  { id: 'jumua',            label: "Jumu'ah",          icon: '🕌', description: 'Friday prayer' },
  { id: 'youth_programs',   label: 'Youth Programs',    icon: '⭐', description: 'Activities for young Muslims' },
  { id: 'sisters_circle',   label: "Sisters' Circle",   icon: '🤝', description: 'Women-only programs' },
  { id: 'quran_classes',    label: 'Quran Classes',     icon: '📖', description: 'Tajweed & memorization' },
  { id: 'arabic_classes',   label: 'Arabic Classes',    icon: '🔤', description: 'Arabic language learning' },
  { id: 'funeral_services', label: 'Funeral Services',  icon: '🌿', description: 'Janazah prayer & burial' },
  { id: 'wudu_facilities',  label: 'Wudu Facilities',   icon: '💧', description: 'Ablution areas' },
  { id: 'parking',          label: 'Parking',           icon: '🅿️', description: 'On-site parking' },
  { id: 'wheelchair',       label: 'Accessible',        icon: '♿', description: 'Wheelchair accessible' },
  { id: 'halal_food',       label: 'Halal Food',        icon: '🍽️', description: 'Food available on site' },
  { id: 'counselling',      label: 'Counselling',       icon: '💬', description: 'Islamic counselling services' },
  { id: 'convert_support',  label: 'Convert Support',   icon: '🌱', description: 'New Muslim support' },
];

const INSTITUTION_TYPES = [
  { id: 'all', label: 'All' },
  { id: 'mosque', label: 'Mosques' },
  { id: 'islamic_centre', label: 'Islamic Centres' },
  { id: 'madrasah', label: 'Madrasahs' },
  { id: 'community_hall', label: 'Community Halls' },
];

// ── Geo helpers ───────────────────────────────────────────────────────────────
function distM(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}
function formatDist(m) { return m < 1000 ? `${m}m` : `${(m / 1000).toFixed(1)}km`; }

// ── Claim Dialog ──────────────────────────────────────────────────────────────
function ClaimDialog({ mosque, user, onClose, onClaimed }) {
  const [form, setForm] = useState({
    description: mosque.description || '',
    phone: mosque.phone || '',
    website: mosque.website || '',
    email: '',
    address: mosque.address || '',
    prayer_times_note: '',
    services: mosque.services || [],
    institution_type: mosque.institution_type || 'mosque',
  });

  const queryClient = useQueryClient();

  const claimMutation = useMutation({
    mutationFn: async () => {
      // Check if already in directory
      const existing = await SDK.entities.MosaqueDirectory.filter({ osm_id: String(mosque.id) });
      const data = {
        osm_id: String(mosque.id),
        name: mosque.name,
        name_ar: mosque.nameAr || '',
        lat: mosque.lat,
        lng: mosque.lng,
        address: form.address,
        phone: form.phone,
        website: form.website,
        email: form.email,
        description: form.description,
        institution_type: form.institution_type,
        services: form.services,
        prayer_times_note: form.prayer_times_note,
        is_claimed: false,
        claim_pending: true,
        claimed_by_email: user?.email || '',
      };
      if (existing.length > 0) {
        return SDK.entities.MosaqueDirectory.update(existing[0].id, { ...data, claim_pending: true });
      }
      return SDK.entities.MosaqueDirectory.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mosqueDirectory'] });
      toast.success('Claim submitted! Our team will verify your listing within 48 hours.');
      onClaimed();
      onClose();
    }
  });

  const toggleService = (id) => {
    setForm(f => ({
      ...f,
      services: f.services.includes(id) ? f.services.filter(s => s !== id) : [...f.services, id]
    }));
  };

  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
      <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 flex items-start gap-2">
        <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700 dark:text-amber-300">
          Claiming this listing confirms you are an authorised representative. Your listing will be reviewed within 48 hours.
        </p>
      </div>

      <div>
        <Label>Institution Type</Label>
        <Select value={form.institution_type} onValueChange={v => setForm(f => ({ ...f, institution_type: v }))}>
          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="mosque">Mosque</SelectItem>
            <SelectItem value="islamic_centre">Islamic Centre</SelectItem>
            <SelectItem value="madrasah">Madrasah</SelectItem>
            <SelectItem value="community_hall">Community Hall</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Phone</Label>
          <Input className="mt-1" placeholder="+44 ..." value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
        </div>
        <div>
          <Label>Email</Label>
          <Input className="mt-1" placeholder="info@..." value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
        </div>
      </div>

      <div>
        <Label>Website</Label>
        <Input className="mt-1" placeholder="https://..." value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} />
      </div>

      <div>
        <Label>Address</Label>
        <Input className="mt-1" placeholder="Full address..." value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
      </div>

      <div>
        <Label>Description</Label>
        <Textarea className="mt-1" rows={3} placeholder="Tell the community about this institution..."
          value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
      </div>

      <div>
        <Label>Prayer Times / Notes</Label>
        <Textarea className="mt-1" rows={2} placeholder="e.g. Fajr: 5:15am · Jumu'ah: 1:15pm..."
          value={form.prayer_times_note} onChange={e => setForm(f => ({ ...f, prayer_times_note: e.target.value }))} />
      </div>

      <div>
        <Label className="mb-2 block">Services Offered</Label>
        <div className="flex flex-wrap gap-2">
          {SERVICES.map(s => (
            <button key={s.id} type="button" onClick={() => toggleService(s.id)}
              className={cn('flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all',
                form.services.includes(s.id)
                  ? 'bg-teal-500 text-white border-teal-500'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-teal-300 dark:hover:border-teal-700'
              )}>
              <span>{s.icon}</span> {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2 justify-end pt-2 sticky bottom-0 bg-white dark:bg-slate-900 pb-1">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={() => claimMutation.mutate()} disabled={claimMutation.isPending}
          className="bg-teal-600 hover:bg-teal-700 gap-1.5">
          {claimMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <BadgeCheck className="w-4 h-4" />}
          Submit Claim
        </Button>
      </div>
    </div>
  );
}

// ── Mosque Detail Panel ───────────────────────────────────────────────────────
function MosqueDetail({ mosque, user, onClose, directoryEntry }) {
  const [showClaim, setShowClaim] = useState(false);
  const queryClient = useQueryClient();

  const isClaimed = directoryEntry?.is_claimed || directoryEntry?.claim_pending;
  const isMyListing = directoryEntry?.claimed_by_email === user?.email;
  const merged = { ...mosque, ...directoryEntry };

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 28, stiffness: 300 }}
      className="absolute top-0 right-0 bottom-0 w-full sm:w-96 bg-white dark:bg-slate-900 shadow-2xl z-[200] flex flex-col border-l border-slate-200 dark:border-slate-700 overflow-hidden"
    >
      {/* Header */}
      <div className="relative p-5 flex-shrink-0" style={{background:'linear-gradient(135deg, #1B2A4A 0%, #0D4F6C 60%, #1D6FB8 100)'}}>
        <button onClick={onClose} className="absolute top-3 right-3 p-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors">
          <X className="w-4 h-4 text-white" />
        </button>
        <div className="text-2xl mb-1">🕌</div>
        <h2 className="font-black text-white text-lg leading-tight pr-8">{merged.name}</h2>
        {merged.name_ar && merged.name_ar !== merged.name && (
          <p className="text-teal-200 text-sm mt-0.5" dir="rtl">{merged.name_ar}</p>
        )}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {merged.dist !== undefined && (
            <Badge className="bg-white/20 text-white border-0 text-xs gap-1">
              <MapPin className="w-3 h-3" /> {formatDist(merged.dist)}
            </Badge>
          )}
          {directoryEntry?.is_claimed && (
            <Badge className="bg-amber-400 text-amber-900 border-0 text-xs gap-1">
              <BadgeCheck className="w-3 h-3" /> Verified
            </Badge>
          )}
          {directoryEntry?.claim_pending && !directoryEntry?.is_claimed && (
            <Badge className="bg-orange-100 text-orange-700 border-0 text-xs">Pending Review</Badge>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* Description */}
        {merged.description && (
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{merged.description}</p>
        )}

        {/* Services */}
        {merged.services?.length > 0 && (
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">Services</p>
            <div className="flex flex-wrap gap-1.5">
              {merged.services.map(sid => {
                const svc = SERVICES.find(s => s.id === sid);
                return svc ? (
                  <span key={sid} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800/40 text-xs text-teal-700 dark:text-teal-300 font-medium">
                    {svc.icon} {svc.label}
                  </span>
                ) : null;
              })}
            </div>
          </div>
        )}

        {/* Prayer times note */}
        {merged.prayer_times_note && (
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40">
            <p className="text-xs font-bold text-amber-700 dark:text-amber-300 mb-1 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> Prayer Times
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-400 whitespace-pre-line">{merged.prayer_times_note}</p>
          </div>
        )}

        {/* Contact */}
        <div className="space-y-2">
          {merged.address && (
            <div className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
              <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
              <span>{merged.address}</span>
            </div>
          )}
          {merged.phone && (
            <a href={`tel:${merged.phone}`} className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline">
              <Phone className="w-4 h-4" /> {merged.phone}
            </a>
          )}
          {merged.website && (
            <a href={merged.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-teal-600 dark:text-teal-400 hover:underline truncate">
              <ExternalLink className="w-4 h-4 flex-shrink-0" /> {merged.website}
            </a>
          )}
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2">
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${merged.lat},${merged.lng}`}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 h-9 px-4 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold transition-colors"
          >
            <Navigation className="w-4 h-4" /> Directions
          </a>
          <a
            href={`https://www.openstreetmap.org/?mlat=${merged.lat}&mlon=${merged.lng}&zoom=17`}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 h-9 px-4 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <MapPin className="w-4 h-4" /> View Map
          </a>
        </div>

        {/* Claim CTA */}
        {!isClaimed && !isMyListing && (
          <div className="p-4 rounded-xl border-2 border-dashed border-teal-300 dark:border-teal-700 bg-teal-50 dark:bg-teal-950/20">
            <p className="text-sm font-bold text-teal-800 dark:text-teal-200 mb-1 flex items-center gap-1.5">
              <Building2 className="w-4 h-4" /> Is this your organisation?
            </p>
            <p className="text-xs text-teal-600 dark:text-teal-400 mb-3">
              Claim this listing to add services, prayer times, and contact details.
            </p>
            <Button onClick={() => setShowClaim(true)} size="sm" className="w-full bg-teal-600 hover:bg-teal-700 gap-1.5">
              <BadgeCheck className="w-3.5 h-3.5" /> Claim This Listing
            </Button>
          </div>
        )}

        {isMyListing && directoryEntry?.claim_pending && (
          <div className="p-3 rounded-xl bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800/40 text-center">
            <p className="text-xs text-orange-700 dark:text-orange-300 font-semibold">⏳ Your claim is pending review</p>
          </div>
        )}
      </div>

      {/* Claim sub-dialog (inline) */}
      <AnimatePresence>
        {showClaim && (
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            className="absolute inset-0 bg-white dark:bg-slate-900 z-10 p-4 overflow-y-auto">
            <div className="flex items-center gap-2 mb-4">
              <button onClick={() => setShowClaim(false)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="w-4 h-4 text-slate-500" />
              </button>
              <h3 className="font-bold text-slate-900 dark:text-slate-100">Claim Listing</h3>
            </div>
            <ClaimDialog
              mosque={mosque}
              user={user}
              onClose={() => setShowClaim(false)}
              onClaimed={() => setShowClaim(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Filter Bar ────────────────────────────────────────────────────────────────
function FilterBar({ activeFilters, onToggle, activeType, onTypeChange, search, onSearch }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="space-y-2">
      {/* Search + expand */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input value={search} onChange={e => onSearch(e.target.value)}
            placeholder="Search mosques..." className="pl-9 h-9 text-sm" />
        </div>
        <button onClick={() => setExpanded(v => !v)}
          className={cn('flex items-center gap-1.5 px-3 h-9 rounded-lg border text-sm font-semibold transition-all',
            activeFilters.length > 0
              ? 'border-teal-500 bg-teal-500 text-white'
              : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-teal-300'
          )}>
          <Filter className="w-4 h-4" />
          {activeFilters.length > 0 ? activeFilters.length : ''}
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Type pills */}
      <div className="flex gap-1.5 overflow-x-auto pb-0.5 hide-scrollbar">
        {INSTITUTION_TYPES.map(t => (
          <button key={t.id} onClick={() => onTypeChange(t.id)}
            className={cn('flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold border transition-all',
              activeType === t.id
                ? 'bg-teal-600 text-white border-teal-600'
                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-teal-300'
            )}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Service chips */}
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="flex flex-wrap gap-1.5 pt-1">
              {SERVICES.map(s => (
                <button key={s.id} onClick={() => onToggle(s.id)}
                  className={cn('flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold border transition-all',
                    activeFilters.includes(s.id)
                      ? 'bg-teal-500 text-white border-teal-500'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-teal-300'
                  )}>
                  {s.icon} {s.label}
                </button>
              ))}
              {activeFilters.length > 0 && (
                <button onClick={() => activeFilters.forEach(f => onToggle(f))}
                  className="px-2.5 py-1 rounded-xl text-xs text-red-500 border border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950/20 font-semibold">
                  Clear all
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Mosque List Item ──────────────────────────────────────────────────────────
function MosqueListItem({ mosque, isSelected, onClick, directoryEntry }) {
  const isClaimed = directoryEntry?.is_claimed;
  const hasServices = directoryEntry?.services?.length > 0;

  return (
    <button onClick={onClick} className={cn(
      'w-full text-left p-3 rounded-xl border transition-all',
      isSelected
        ? 'border-teal-400 bg-teal-50 dark:bg-teal-950/30 shadow-sm'
        : 'border-slate-100 dark:border-slate-800 hover:border-teal-200 dark:hover:border-teal-800 bg-white dark:bg-slate-900/80'
    )}>
      <div className="flex items-start gap-3">
        <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-lg',
          isSelected ? 'bg-teal-100 dark:bg-teal-900/50' : 'bg-slate-100 dark:bg-slate-800'
        )}>
          🕌
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate">{mosque.name}</p>
            {isClaimed && <BadgeCheck className="w-3.5 h-3.5 text-teal-500 flex-shrink-0" />}
          </div>
          {mosque.dist !== undefined && (
            <p className="text-xs text-slate-400 mt-0.5">{formatDist(mosque.dist)} away</p>
          )}
          {hasServices && (
            <div className="flex gap-1 mt-1.5 flex-wrap">
              {directoryEntry.services.slice(0, 3).map(sid => {
                const svc = SERVICES.find(s => s.id === sid);
                return svc ? (
                  <span key={sid} className="text-[10px] px-1.5 py-0.5 rounded-md bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300">
                    {svc.icon} {svc.label}
                  </span>
                ) : null;
              })}
              {directoryEntry.services.length > 3 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500">
                  +{directoryEntry.services.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
function MosqueMapContent() {
  const [location, setLocation] = useState(null);
  const [mosques, setMosques] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [activeFilters, setActiveFilters] = useState([]);
  const [activeType, setActiveType] = useState('all');
  const [mapComponents, setMapComponents] = useState(null);
  const mapRef = useRef(null);

  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => SDK.auth.me() });
  const { data: settings = [] } = useQuery({ queryKey: ['userSettings'], queryFn: () => SDK.entities.UserSettings.list() });
  const { data: directoryEntries = [] } = useQuery({
    queryKey: ['mosqueDirectory'],
    queryFn: () => SDK.entities.MosaqueDirectory.list('-created_date', 200)
  });

  // Directory lookup by OSM id
  const directoryMap = useMemo(() => {
    const m = {};
    directoryEntries.forEach(e => { if (e.osm_id) m[e.osm_id] = e; });
    return m;
  }, [directoryEntries]);

  // Auto-use saved location
  useEffect(() => {
    const s = settings[0];
    if (s?.latitude && s?.longitude) {
      const loc = { lat: s.latitude, lng: s.longitude };
      setLocation(loc);
      fetchMosques(loc);
    }
  }, [settings]);

  // Lazy-load Leaflet
  useEffect(() => {
    if (location && !mapComponents) {
      Promise.all([import('react-leaflet'), import('leaflet')]).then(([rl, L]) => {
        delete L.default.Icon.Default.prototype._getIconUrl;
        L.default.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        });
        setMapComponents({ ...rl, L: L.default });
      });
    }
  }, [location]);

  const getLocation = () => {
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const loc = { lat: coords.latitude, lng: coords.longitude };
        setLocation(loc);
        fetchMosques(loc);
        setLoading(false);
      },
      () => { setLoading(false); toast.error('Could not access location'); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const fetchMosques = async ({ lat, lng }) => {
    setLoading(true);
    try {
      const query = `[out:json][timeout:30];
        (
          node["amenity"="place_of_worship"]["religion"="muslim"](around:5000,${lat},${lng});
          way["amenity"="place_of_worship"]["religion"="muslim"](around:5000,${lat},${lng});
          node["amenity"="community_centre"]["religion"="muslim"](around:5000,${lat},${lng});
        );
        out body center;`;

      const res = await fetch('https://overpass-api.de/api/interpreter', { method: 'POST', body: query });
      const data = await res.json();

      const items = (data.elements || [])
        .map(el => ({
          id: String(el.id),
          name: el.tags?.name || el.tags?.['name:en'] || 'Mosque',
          nameAr: el.tags?.['name:ar'] || '',
          lat: el.lat || el.center?.lat,
          lng: el.lon || el.center?.lon,
          phone: el.tags?.phone || el.tags?.['contact:phone'] || '',
          website: el.tags?.website || el.tags?.['contact:website'] || '',
          address: [el.tags?.['addr:housenumber'], el.tags?.['addr:street'], el.tags?.['addr:city']].filter(Boolean).join(', '),
          opening: el.tags?.opening_hours || '',
          institution_type: el.tags?.['amenity'] === 'community_centre' ? 'community_hall' : 'mosque',
        }))
        .filter(m => m.lat && m.lng)
        .map(m => ({ ...m, dist: distM(lat, lng, m.lat, m.lng) }))
        .sort((a, b) => a.dist - b.dist)
        .slice(0, 30);

      setMosques(items);
      if (items.length === 0) toast.info('No mosques found — try enabling location for a more accurate search');
    } catch (e) {
      toast.error('Could not load mosques. Please try again.');
      console.error(e);
    }
    setLoading(false);
  };

  const toggleFilter = (id) => {
    setActiveFilters(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
  };

  const filteredMosques = useMemo(() => {
    return mosques.filter(m => {
      const entry = directoryMap[m.id];

      // Search
      if (search && !m.name.toLowerCase().includes(search.toLowerCase())) return false;

      // Type filter
      if (activeType !== 'all') {
        const type = entry?.institution_type || m.institution_type || 'mosque';
        if (type !== activeType) return false;
      }

      // Service filters
      if (activeFilters.length > 0) {
        const services = entry?.services || [];
        if (!activeFilters.every(f => services.includes(f))) return false;
      }

      return true;
    });
  }, [mosques, search, activeFilters, activeType, directoryMap]);

  const selectedEntry = selected ? directoryMap[selected.id] : null;

  // Pan map to selected
  useEffect(() => {
    if (selected && mapRef.current) {
      mapRef.current.setView([selected.lat, selected.lng], 16, { animate: true });
    }
  }, [selected]);

  // Create a custom icon for selected mosque
  const getMarkerIcon = (mosque, L) => {
    if (!L) return undefined;
    const isSelected = selected?.id === mosque.id;
    const isClaimed = !!directoryMap[mosque.id]?.is_claimed;
    const color = isSelected ? '#0d9488' : isClaimed ? '#f59e0b' : '#64748b';
    return L.divIcon({
      html: `<div style="background:${color};width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)"><div style="transform:rotate(45deg);width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:13px">🕌</div></div>`,
      className: '',
      iconSize: [28, 28],
      iconAnchor: [14, 28],
      popupAnchor: [0, -30],
    });
  };

  return (
    <div className="flex flex-col h-screen lg:h-[calc(100vh-0px)] -mx-3 sm:-mx-4 lg:-mx-6 -mt-4 lg:-mt-0 overflow-hidden">
      {/* Top bar */}
      <div className="flex-shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-4 py-3 space-y-3 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-black text-xl text-slate-900 dark:text-slate-100 flex items-center gap-2">
              🕌 Islamic Institutions Map
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {location ? `${filteredMosques.length} institutions within 5km` : 'Enable location to find mosques near you'}
            </p>
          </div>
          <Button onClick={getLocation} disabled={loading} size="sm"
            style={{background:'#1D6FB8'}} className="hover:opacity-90 gap-1.5 text-xs">
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Navigation className="w-3.5 h-3.5" />}
            {location ? 'Refresh' : 'Use My Location'}
          </Button>
        </div>
        <FilterBar
          activeFilters={activeFilters}
          onToggle={toggleFilter}
          activeType={activeType}
          onTypeChange={setActiveType}
          search={search}
          onSearch={setSearch}
        />
      </div>

      {/* Body: map + list */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">

        {/* Map */}
        <div className="flex-1 relative">
          {!location ? (
            <div className="h-full flex items-center justify-center bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-950/20 dark:to-emerald-950/20">
              <div className="text-center space-y-4 px-6 max-w-sm">
                <div className="w-20 h-20 mx-auto rounded-3xl bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center text-4xl">
                  🗺️
                </div>
                <h2 className="font-black text-xl text-slate-800 dark:text-slate-100">Find Mosques Near You</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Discover mosques, Islamic centres, and community halls within 5km, with service filters and verified listings.
                </p>
                <Button onClick={getLocation} disabled={loading} className="gap-2 w-full" style={{background:'#1D6FB8'}}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
                  Enable Location Access
                </Button>
                <p className="text-xs text-slate-400">Your location is only used for finding nearby mosques</p>
              </div>
            </div>
          ) : mapComponents ? (
            <mapComponents.MapContainer
              center={[location.lat, location.lng]}
              zoom={14}
              style={{ height: '100%', width: '100%' }}
              scrollWheelZoom={true}
              ref={mapRef}
            >
              <mapComponents.TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {/* User location */}
              <mapComponents.Circle
                center={[location.lat, location.lng]}
                radius={60}
                pathOptions={{ color: '#0d9488', fillColor: '#0d9488', fillOpacity: 0.35, weight: 2 }}
              />
              <mapComponents.Circle
                center={[location.lat, location.lng]}
                radius={5000}
                pathOptions={{ color: '#0d9488', fillColor: 'transparent', weight: 1, dashArray: '5 5', opacity: 0.4 }}
              />
              {filteredMosques.map(m => (
                <mapComponents.Marker
                  key={m.id}
                  position={[m.lat, m.lng]}
                  icon={getMarkerIcon(m, mapComponents.L)}
                  eventHandlers={{ click: () => setSelected(m) }}
                >
                  <mapComponents.Popup>
                    <div className="text-sm">
                      <p className="font-bold">{m.name}</p>
                      <p className="text-gray-500 text-xs">{formatDist(m.dist)} away</p>
                      {directoryMap[m.id]?.is_claimed && (
                        <p className="text-teal-600 text-xs font-semibold">✓ Verified listing</p>
                      )}
                    </div>
                  </mapComponents.Popup>
                </mapComponents.Marker>
              ))}
            </mapComponents.MapContainer>
          ) : (
            <div className="h-full flex items-center justify-center bg-slate-100 dark:bg-slate-800">
              <Loader2 className="w-6 h-6 animate-spin text-[#1D6FB8]" />
            </div>
          )}

          {/* Map legend */}
          {location && (
            <div className="absolute bottom-4 left-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-2.5 shadow-md z-[100] text-xs space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-teal-500" />
                <span className="text-slate-600 dark:text-slate-400">Verified listing</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                <span className="text-slate-600 dark:text-slate-400">Claimed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-slate-400" />
                <span className="text-slate-600 dark:text-slate-400">Unclaimed</span>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar list */}
        <div className="lg:w-80 xl:w-96 flex-shrink-0 bg-white dark:bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden" style={{ maxHeight: '40vh', minHeight: '200px' }}>
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {loading && mosques.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-5 h-5 animate-spin text-[#1D6FB8] mr-2" />
                <span className="text-sm text-slate-500">Finding mosques...</span>
              </div>
            ) : filteredMosques.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-sm text-slate-400">No mosques match your filters</p>
                {activeFilters.length > 0 && (
                  <button onClick={() => setActiveFilters([])} className="text-xs text-teal-600 hover:underline mt-1">
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              filteredMosques.map(m => (
                <MosqueListItem
                  key={m.id}
                  mosque={m}
                  isSelected={selected?.id === m.id}
                  onClick={() => setSelected(selected?.id === m.id ? null : m)}
                  directoryEntry={directoryMap[m.id]}
                />
              ))
            )}
          </div>
        </div>

        {/* Detail panel (slide-in) */}
        <AnimatePresence>
          {selected && (
            <MosqueDetail
              mosque={selected}
              user={user}
              onClose={() => setSelected(null)}
              directoryEntry={selectedEntry}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function MosqueMap() {
  return (
    <IslamicEditionGate>
      <MosqueMapContent />
    </IslamicEditionGate>
  );
}