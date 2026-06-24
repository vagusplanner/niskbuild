import React from 'react';
import { X, GitCompare, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function VersionDiffModal({ versionA, versionB, onClose }) {
  // versionA = older, versionB = newer
  const snapshotA = versionA?.snapshot || {};
  const snapshotB = versionB?.snapshot || {};

  const skipFields = new Set(['id', 'created_date', 'updated_date', 'created_by']);
  const allKeys = [...new Set([...Object.keys(snapshotA), ...Object.keys(snapshotB)])]
    .filter(k => !skipFields.has(k));

  const changedKeys = allKeys.filter(k => JSON.stringify(snapshotA[k]) !== JSON.stringify(snapshotB[k]));
  const unchangedKeys = allKeys.filter(k => JSON.stringify(snapshotA[k]) === JSON.stringify(snapshotB[k]));

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ duration: 0.2 }}
          className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-teal-50/80 to-emerald-50/60 dark:from-teal-950/40 dark:to-emerald-950/30">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-teal-500/15 flex items-center justify-center">
                <GitCompare className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-800 dark:text-slate-100">Version Comparison</h2>
                <p className="text-xs text-slate-500">
                  v{versionA?.version_number} → v{versionB?.version_number}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/60 dark:hover:bg-slate-800 transition-colors">
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>

          {/* Version labels */}
          <div className="grid grid-cols-[140px_1fr_1fr] gap-3 px-5 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-xs font-medium">
            <div className="text-slate-400">Field</div>
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <div className="w-2 h-2 rounded-full bg-red-400" />
              v{versionA?.version_number} · {versionA?.created_date ? format(new Date(versionA.created_date), 'MMM d, h:mm a') : ''}
            </div>
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              v{versionB?.version_number} · {versionB?.created_date ? format(new Date(versionB.created_date), 'MMM d, h:mm a') : ''}
            </div>
          </div>

          {/* Diff rows */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-50 dark:divide-slate-800">
            {changedKeys.length === 0 && (
              <div className="text-center py-10 text-slate-400 text-sm">No differences found.</div>
            )}

            {changedKeys.length > 0 && (
              <>
                <div className="px-5 py-2 bg-amber-50/60 dark:bg-amber-950/20">
                  <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                    {changedKeys.length} changed field{changedKeys.length > 1 ? 's' : ''}
                  </span>
                </div>
                {changedKeys.map(key => (
                  <DiffRow
                    key={key}
                    fieldName={key}
                    oldValue={snapshotA[key]}
                    newValue={snapshotB[key]}
                    changed
                  />
                ))}
              </>
            )}

            {unchangedKeys.length > 0 && (
              <>
                <div className="px-5 py-2 bg-slate-50/80 dark:bg-slate-800/40">
                  <span className="text-xs font-semibold text-slate-400">
                    {unchangedKeys.length} unchanged field{unchangedKeys.length > 1 ? 's' : ''}
                  </span>
                </div>
                {unchangedKeys.map(key => (
                  <DiffRow
                    key={key}
                    fieldName={key}
                    oldValue={snapshotA[key]}
                    newValue={snapshotB[key]}
                    changed={false}
                  />
                ))}
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function DiffRow({ fieldName, oldValue, newValue, changed }) {
  const label = fieldName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div className={cn(
      "grid grid-cols-[140px_1fr_1fr] gap-3 px-5 py-3 text-sm",
      changed ? "bg-amber-50/30 dark:bg-amber-950/10" : ""
    )}>
      <div className="font-medium text-slate-600 dark:text-slate-400 text-xs pt-0.5 truncate">{label}</div>
      <div className={cn(
        "rounded-lg px-3 py-2 text-xs break-words",
        changed
          ? "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border border-red-100 dark:border-red-900/40"
          : "bg-slate-50 dark:bg-slate-800/50 text-slate-500"
      )}>
        {formatValue(oldValue)}
      </div>
      <div className={cn(
        "rounded-lg px-3 py-2 text-xs break-words",
        changed
          ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40"
          : "bg-slate-50 dark:bg-slate-800/50 text-slate-500"
      )}>
        {formatValue(newValue)}
      </div>
    </div>
  );
}

function formatValue(val) {
  if (val === null || val === undefined) return '—';
  if (typeof val === 'boolean') return val ? '✓ Yes' : '✗ No';
  if (Array.isArray(val)) {
    if (val.length === 0) return '(empty)';
    return val.map(v => typeof v === 'object' ? JSON.stringify(v) : String(v)).join(', ');
  }
  if (typeof val === 'object') return JSON.stringify(val, null, 2);
  return String(val);
}