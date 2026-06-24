import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Check, ChevronDown, Phone, Coffee, Wifi, WifiOff } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

const STATUSES = [
  { value: 'online',    label: 'Online',    icon: Wifi,    color: 'text-green-500',  dot: 'bg-green-500' },
  { value: 'away',      label: 'Away',      icon: Coffee,  color: 'text-amber-500',  dot: 'bg-amber-400' },
  { value: 'in_a_call', label: 'In a call', icon: Phone,   color: 'text-red-500',    dot: 'bg-red-500' },
  { value: 'offline',   label: 'Offline',   icon: WifiOff, color: 'text-slate-400',  dot: 'bg-slate-400' },
];

export default function StatusPicker({ currentUser, onStatusChange }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const currentStatus = currentUser?.status || 'online';
  const current = STATUSES.find(s => s.value === currentStatus) || STATUSES[0];

  const handleSelect = async (status) => {
    if (status === currentStatus) { setOpen(false); return; }
    setSaving(true);
    try {
      await base44.auth.updateMe({ status, status_updated_at: new Date().toISOString() });
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
      onStatusChange?.(status);
      toast.success(`Status set to ${STATUSES.find(s => s.value === status)?.label}`);
    } catch {
      toast.error('Failed to update status');
    } finally {
      setSaving(false);
      setOpen(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        disabled={saving}
        className="flex items-center gap-1.5 text-xs font-medium text-white/80 hover:text-white transition-colors"
      >
        <span className={cn('w-2 h-2 rounded-full', current.dot)} />
        <span>{current.label}</span>
        <ChevronDown className="w-3 h-3 opacity-60" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-6 left-0 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden w-44">
            {STATUSES.map(s => {
              const Icon = s.icon;
              return (
                <button
                  key={s.value}
                  onClick={() => handleSelect(s.value)}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors',
                    s.value === currentStatus && 'bg-teal-50 dark:bg-teal-950/30'
                  )}
                >
                  <span className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', s.dot)} />
                  <Icon className={cn('w-3.5 h-3.5', s.color)} />
                  <span className="text-slate-700 dark:text-slate-300">{s.label}</span>
                  {s.value === currentStatus && <Check className="w-3.5 h-3.5 text-teal-500 ml-auto" />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}