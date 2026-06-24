import React, { useState, useEffect, useCallback, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Loader2, Calendar, CheckSquare, Target, User, Plane,
  Users, Repeat, BookOpen, Heart, X, Filter, ChevronDown, ChevronUp,
  Sparkles, Clock, MapPin, Tag, AlertCircle
} from 'lucide-react';
import { createPageUrl } from '@/utils';
import { useNavigate } from 'react-router-dom';
import { format, isAfter, isBefore, parseISO } from 'date-fns';

// ── Constants ──────────────────────────────────────────────────────────────────

const ICON_MAP = {
  event: Calendar, task: CheckSquare, goal: Target,
  contact: User, holiday: Plane, meeting: Users,
  habit: Repeat, quran_verse: BookOpen, hadith: BookOpen, prayer: Heart
};

const CATEGORY_COLORS = {
  events:       'bg-blue-100   text-blue-800   dark:bg-blue-900/40   dark:text-blue-200',
  tasks:        'bg-cyan-100   text-cyan-800   dark:bg-cyan-900/40   dark:text-cyan-200',
  goals:        'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200',
  holidays:     'bg-sky-100    text-sky-800    dark:bg-sky-900/40    dark:text-sky-200',
  meetings:     'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/40 dark:text-fuchsia-200',
  habits:       'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
  quran_verses: 'bg-amber-100  text-amber-800  dark:bg-amber-900/40  dark:text-amber-200',
  hadiths:      'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200',
  prayers:      'bg-rose-100   text-rose-800   dark:bg-rose-900/40   dark:text-rose-200',
};

const CATEGORY_LABELS = {
  events: 'Calendar Events', tasks: 'Tasks', goals: 'Goals',
  holidays: 'Travel & Holidays', meetings: 'Meetings', habits: 'Habits',
  quran_verses: 'Quran Verses', hadiths: 'Hadiths', prayers: 'Prayer Logs',
};

const ENTITY_TYPES = [
  { value: 'all',    label: 'All' },
  { value: 'events', label: 'Events' },
  { value: 'tasks',  label: 'Tasks' },
  { value: 'goals',  label: 'Goals' },
  { value: 'meetings', label: 'Meetings' },
  { value: 'holidays', label: 'Travel' },
  { value: 'habits',  label: 'Habits' },
  { value: 'prayers', label: 'Prayers' },
];

const STATUS_OPTIONS = {
  tasks:    ['todo', 'in_progress', 'completed', 'blocked'],
  goals:    ['not_started', 'in_progress', 'completed', 'on_hold'],
  meetings: ['pending', 'confirmed', 'cancelled', 'completed'],
  holidays: ['planned', 'booked', 'in_progress', 'completed', 'cancelled'],
};

const CATEGORY_OPTIONS = {
  events: ['work', 'personal', 'health', 'prayer', 'holiday', 'family', 'social', 'other'],
  tasks:  ['work', 'personal', 'health', 'shopping', 'learning', 'home', 'other'],
  goals:  ['personal', 'professional', 'health', 'financial', 'learning', 'spiritual', 'relationships', 'other'],
};

// ── Sub-components ─────────────────────────────────────────────────────────────

function FilterChip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all border ${
        active
          ? 'text-white border-[#1D6FB8] shadow-sm'
          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-[#29ABE2] hover:text-[#1D6FB8]'
      }`}
      style={active ? {background:'#1D6FB8'} : {}}
    >
      {children}
    </button>
  );
}

function ResultItem({ item, onResultClick }) {
  const Icon = ICON_MAP[item.type] || Search;

  const { primary, secondary, meta } = getDisplayInfo(item);

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => onResultClick(item)}
      className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors group"
    >
      <div className="mt-0.5 p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 group-hover:bg-teal-100 dark:group-hover:bg-teal-900/40 transition-colors">
        <Icon className="w-3.5 h-3.5 text-slate-400 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-slate-900 dark:text-slate-100 truncate">{primary}</p>
        {secondary && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{secondary}</p>}
      </div>
      {meta && (
        <span className="text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap mt-0.5 shrink-0">{meta}</span>
      )}
    </motion.div>
  );
}

function getDisplayInfo(item) {
  switch (item.type) {
    case 'event':
      return {
        primary: item.title,
        secondary: [item.location, item.category].filter(Boolean).join(' · '),
        meta: item.start_date ? format(parseISO(item.start_date), 'MMM d') : null,
      };
    case 'task':
      return {
        primary: item.title,
        secondary: item.description?.substring(0, 60) || `${item.priority} priority`,
        meta: item.status?.replace('_', ' '),
      };
    case 'goal':
      return {
        primary: item.title,
        secondary: item.description?.substring(0, 60) || item.category,
        meta: `${item.progress ?? 0}%`,
      };
    case 'holiday':
      return {
        primary: item.title,
        secondary: item.destination,
        meta: item.status,
      };
    case 'meeting':
      return {
        primary: item.title,
        secondary: item.description?.substring(0, 60),
        meta: item.confirmed_date ? format(parseISO(item.confirmed_date), 'MMM d') : item.status,
      };
    case 'habit':
      return {
        primary: item.name || item.title,
        secondary: [item.frequency, item.category].filter(Boolean).join(' · '),
        meta: null,
      };
    case 'quran_verse':
      return {
        primary: `${item.surah_name} — Verse ${item.verse_number ?? ''}`,
        secondary: item.translation?.substring(0, 80),
        meta: null,
      };
    case 'hadith':
      return {
        primary: 'Hadith',
        secondary: (item.hadith_text || item.translation)?.substring(0, 80),
        meta: null,
      };
    case 'prayer':
      return {
        primary: item.prayer_name || item.title,
        secondary: item.notes,
        meta: item.date ? format(parseISO(item.date), 'MMM d') : null,
      };
    default:
      return { primary: item.title || 'Untitled', secondary: null, meta: null };
  }
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function GlobalSearch({ isOpen, onOpenChange }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [aiInsight, setAiInsight] = useState(null);

  // Filters
  const [activeType, setActiveType] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [participantFilter, setParticipantFilter] = useState('');

  const navigate = useNavigate();
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 80);
    } else {
      setQuery('');
      setResults(null);
      setAiInsight(null);
      setActiveType('all');
      setDateFrom('');
      setDateTo('');
      setSelectedStatus('');
      setSelectedCategory('');
      setParticipantFilter('');
      setShowFilters(false);
    }
  }, [isOpen]);

  // Keyboard close
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onOpenChange(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onOpenChange]);

  const doSearch = useCallback(async (q) => {
    if (!q || q.trim().length < 2) { setResults(null); setAiInsight(null); return; }
    setIsSearching(true);
    try {
      const payload = {
        query: q.trim(),
        filters: {
          type: activeType !== 'all' ? activeType : undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          status: selectedStatus || undefined,
          category: selectedCategory || undefined,
          participant: participantFilter.trim() || undefined,
        }
      };
      const res = await base44.functions.invoke('globalSearch', payload);
      setResults(res.data.results || {});
    } catch (err) {
      console.error('Search error', err);
      setResults({});
    } finally {
      setIsSearching(false);
    }
    // AI insight (non-blocking)
    base44.integrations.Core.InvokeLLM({
      prompt: `User searched for: "${q}". Provide one helpful, brief (≤20 word) tip relevant to this search. Return JSON: {"insight": "tip text"}`,
      response_json_schema: { type: 'object', properties: { insight: { type: 'string' } } }
    }).then(r => setAiInsight(r?.insight || null)).catch(() => {});
  }, [activeType, dateFrom, dateTo, selectedStatus, selectedCategory, participantFilter]);

  // Debounced search on query or filter change
  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (query.trim().length >= 2) {
      debounceRef.current = setTimeout(() => doSearch(query), 320);
    } else {
      setResults(null);
      setAiInsight(null);
    }
    return () => clearTimeout(debounceRef.current);
  }, [query, doSearch]);

  const handleResultClick = (item) => {
    onOpenChange(false);
    const routes = {
      event: 'Calendar', task: 'Profile', goal: 'Profile',
      holiday: 'Travel', meeting: 'Connect', habit: 'Wellness',
      quran_verse: 'Islam', hadith: 'Islam', prayer: 'Islam',
    };
    navigate(createPageUrl(routes[item.type] || 'Dashboard'));
  };

  // Apply client-side date filter (belt-and-suspenders)
  const filteredResults = React.useMemo(() => {
    if (!results) return null;
    const out = {};
    const from = dateFrom ? parseISO(dateFrom) : null;
    const to = dateTo ? parseISO(dateTo) : null;
    for (const [cat, items] of Object.entries(results)) {
      if (!Array.isArray(items)) continue;
      if (activeType !== 'all' && cat !== activeType) continue;
      out[cat] = items.filter(item => {
        const dateStr = item.start_date || item.confirmed_date || item.date || item.due_date;
        if ((from || to) && dateStr) {
          const d = parseISO(dateStr);
          if (from && isBefore(d, from)) return false;
          if (to && isAfter(d, to)) return false;
        }
        if (participantFilter && item.attendees) {
          const pf = participantFilter.toLowerCase();
          if (!item.attendees.some(a => a.toLowerCase().includes(pf))) return false;
        }
        return true;
      });
    }
    return out;
  }, [results, activeType, dateFrom, dateTo, participantFilter]);

  const totalCount = filteredResults
    ? Object.values(filteredResults).reduce((s, a) => s + (Array.isArray(a) ? a.length : 0), 0)
    : 0;

  const activeFilterCount = [
    activeType !== 'all', dateFrom, dateTo, selectedStatus, selectedCategory, participantFilter
  ].filter(Boolean).length;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => onOpenChange(false)}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[500]"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: -16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: -16 }}
        transition={{ duration: 0.18, ease: [0.25, 0.46, 0.45, 0.94] }}
        onClick={e => e.stopPropagation()}
        className="fixed top-[5vh] sm:top-[8vh] left-4 right-4 sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-2xl max-h-[88vh] sm:max-h-[84vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl shadow-black/20 z-[500] flex flex-col overflow-hidden border border-slate-200/60 dark:border-slate-700/60 mx-auto"
      >
        {/* ── Header / Search bar ── */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                ref={inputRef}
                placeholder="Search events, tasks, goals, contacts, travel…"
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="pl-9 pr-10 h-11 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl text-sm"
              />
              {isSearching
                ? <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-[#1D6FB8]" />
                : query && <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                    <X className="w-4 h-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" />
                  </button>
              }
            </div>
            <button
              onClick={() => setShowFilters(f => !f)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium transition-all ${
                showFilters || activeFilterCount > 0
                  ? 'border-[#1D6FB8] text-[#1D6FB8]'
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              Filters
              {activeFilterCount > 0 && (
                <span className="ml-0.5 text-white rounded-full text-xs w-4 h-4 flex items-center justify-center" style={{background:'#1D6FB8'}}>
                  {activeFilterCount}
                </span>
              )}
              {showFilters ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            <button onClick={() => onOpenChange(false)} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          {/* ── Filter panel ── */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="pt-4 space-y-3">
                  {/* Type */}
                  <div>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide flex items-center gap-1">
                      <Tag className="w-3 h-3" /> Type
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {ENTITY_TYPES.map(t => (
                        <FilterChip key={t.value} active={activeType === t.value} onClick={() => setActiveType(t.value)}>
                          {t.label}
                        </FilterChip>
                      ))}
                    </div>
                  </div>

                  {/* Date range */}
                  <div>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Date Range
                    </p>
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        value={dateFrom}
                        onChange={e => setDateFrom(e.target.value)}
                        className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                        placeholder="From"
                      />
                      <span className="text-slate-400 text-xs">to</span>
                      <input
                        type="date"
                        value={dateTo}
                        onChange={e => setDateTo(e.target.value)}
                        className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                        placeholder="To"
                      />
                    </div>
                  </div>

                  {/* Status + Category */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Status
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        <FilterChip active={!selectedStatus} onClick={() => setSelectedStatus('')}>Any</FilterChip>
                        {[...new Set(Object.values(STATUS_OPTIONS).flat())].map(s => (
                          <FilterChip key={s} active={selectedStatus === s} onClick={() => setSelectedStatus(selectedStatus === s ? '' : s)}>
                            {s.replace('_', ' ')}
                          </FilterChip>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide flex items-center gap-1">
                        <Tag className="w-3 h-3" /> Category
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        <FilterChip active={!selectedCategory} onClick={() => setSelectedCategory('')}>Any</FilterChip>
                        {[...new Set(Object.values(CATEGORY_OPTIONS).flat())].map(c => (
                          <FilterChip key={c} active={selectedCategory === c} onClick={() => setSelectedCategory(selectedCategory === c ? '' : c)}>
                            {c}
                          </FilterChip>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Participant */}
                  <div>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide flex items-center gap-1">
                      <Users className="w-3 h-3" /> Participant / Attendee
                    </p>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                      <input
                        type="text"
                        value={participantFilter}
                        onChange={e => setParticipantFilter(e.target.value)}
                        placeholder="Filter by email or name…"
                        className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 placeholder-slate-400"
                      />
                    </div>
                  </div>

                  {activeFilterCount > 0 && (
                    <button
                      onClick={() => { setActiveType('all'); setDateFrom(''); setDateTo(''); setSelectedStatus(''); setSelectedCategory(''); setParticipantFilter(''); }}
                      className="text-xs text-rose-500 hover:text-rose-700 dark:hover:text-rose-300 font-medium"
                    >
                      Clear all filters
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Results area ── */}
        <div className="flex-1 overflow-y-auto">
          {!query || query.trim().length < 2 ? (
            <EmptyState />
          ) : isSearching ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-[#1D6FB8]" />
            </div>
          ) : filteredResults && totalCount === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 dark:text-slate-500">
              <Search className="w-10 h-10 mb-3 opacity-25" />
              <p className="text-sm font-medium">No results for "{query}"</p>
              <p className="text-xs mt-1">Try adjusting your filters or search term</p>
            </div>
          ) : filteredResults ? (
            <div className="p-4 space-y-5">
              {/* AI insight */}
              {aiInsight && (
                <div className="flex items-start gap-2.5 p-3 rounded-xl border" style={{background:'rgba(29,111,184,0.08)', borderColor:'rgba(41,171,226,0.3)'}}>
                  <Sparkles className="w-4 h-4 shrink-0 mt-0.5" style={{color:'#1D6FB8'}} />
                  <p className="text-xs leading-relaxed" style={{color:'#1B2A4A'}}>{aiInsight}</p>
                </div>
              )}

              {/* Summary count */}
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {totalCount} result{totalCount !== 1 ? 's' : ''} found
                {activeFilterCount > 0 && ` (${activeFilterCount} filter${activeFilterCount > 1 ? 's' : ''} active)`}
              </p>

              {/* Groups */}
              {Object.entries(filteredResults).map(([cat, items]) =>
                Array.isArray(items) && items.length > 0 && (
                  <div key={cat}>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={`text-xs ${CATEGORY_COLORS[cat]}`}>
                        {CATEGORY_LABELS[cat] || cat}
                      </Badge>
                      <span className="text-xs text-slate-400">({items.length})</span>
                    </div>
                    <div className="space-y-0.5">
                      {items.map(item => (
                        <ResultItem key={item.id} item={item} onResultClick={handleResultClick} />
                      ))}
                    </div>
                  </div>
                )
              )}
            </div>
          ) : null}
        </div>

        {/* ── Footer hint ── */}
        <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <p className="text-xs text-slate-400 dark:text-slate-500">Press <kbd className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-xs font-mono">Esc</kbd> to close</p>
          <p className="text-xs text-slate-400 dark:text-slate-500">Searching events, tasks, goals, travel & more</p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function EmptyState() {
  const suggestions = [
    { icon: Calendar, text: 'team meeting', label: 'Find events' },
    { icon: CheckSquare, text: 'urgent tasks', label: 'Search tasks' },
    { icon: Plane, text: 'Dubai', label: 'Find trips' },
    { icon: BookOpen, text: 'Al-Fatiha', label: 'Quran verses' },
  ];
  return (
    <div className="p-6">
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-4">Try searching for…</p>
      <div className="grid grid-cols-2 gap-2">
        {suggestions.map(({ icon: Icon, text, label }) => (
          <div key={text} className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <Icon className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
            <div>
              <p className="text-xs font-medium text-slate-700 dark:text-slate-300">"{text}"</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">{label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}