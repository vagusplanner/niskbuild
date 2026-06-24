import React, { useState } from 'react';
import { SDK } from '@/lib/custom-sdk.js';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { History, RotateCcw, GitCompare, ChevronDown, ChevronUp, Clock, User, Tag, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import VersionDiffModal from './VersionDiffModal';

export default function VersionHistoryPanel({ entityType, entityId, onClose }) {
  const [expandedVersion, setExpandedVersion] = useState(null);
  const [comparingVersions, setComparingVersions] = useState(null);
  const queryClient = useQueryClient();

  const { data: versions = [], isLoading } = useQuery({
    queryKey: ['version-history', entityType, entityId],
    queryFn: () => SDK.entities.VersionHistory.filter(
      { entity_type: entityType, entity_id: entityId },
      '-version_number',
      50
    )
  });

  const restoreMutation = useMutation({
    mutationFn: (version_id) =>
      SDK.functions.invoke('restoreVersion', { version_id }),
    onSuccess: () => {
      toast.success('Version restored successfully');
      queryClient.invalidateQueries({ queryKey: ['version-history', entityType, entityId] });
      queryClient.invalidateQueries({ queryKey: [entityType.toLowerCase()] });
    },
    onError: (err) => toast.error('Failed to restore: ' + err.message)
  });

  const changeTypeColor = {
    create: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    update: 'bg-teal-100 text-teal-700 border-teal-200',
    restore: 'bg-purple-100 text-purple-700 border-purple-200'
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-teal-100/60 dark:border-teal-900/40">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-teal-600" />
          <h2 className="font-semibold text-slate-800 dark:text-slate-100">Version History</h2>
          <Badge variant="outline" className="text-xs">{versions.length} versions</Badge>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        )}
      </div>

      {versions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center px-4">
          <History className="w-10 h-10 text-slate-300 mb-3" />
          <p className="text-slate-500 text-sm">No version history yet.</p>
          <p className="text-slate-400 text-xs mt-1">Changes will appear here automatically.</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {versions.map((version, index) => {
            const isExpanded = expandedVersion === version.id;
            const isLatest = index === 0;
            const prevVersion = versions[index + 1];

            return (
              <div
                key={version.id}
                className={cn(
                  "rounded-2xl border transition-all duration-200",
                  isLatest
                    ? "border-teal-200/80 bg-gradient-to-r from-teal-50/80 to-emerald-50/60 dark:from-teal-950/40 dark:to-emerald-950/30 dark:border-teal-800/40"
                    : "border-slate-100 bg-white dark:bg-slate-900/50 dark:border-slate-800"
                )}
              >
                <div
                  className="flex items-start justify-between p-4 cursor-pointer"
                  onClick={() => setExpandedVersion(isExpanded ? null : version.id)}
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5",
                      isLatest ? "bg-teal-500 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                    )}>
                      {version.version_number}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm text-slate-800 dark:text-slate-100">
                          {version.change_summary || 'Updated'}
                        </span>
                        {isLatest && (
                          <Badge className="text-[10px] px-1.5 py-0 bg-teal-500 text-white border-0">Current</Badge>
                        )}
                        <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", changeTypeColor[version.change_type])}>
                          {version.change_type}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {format(new Date(version.created_date), 'MMM d, yyyy · h:mm a')}
                        </span>
                        {version.changed_by && (
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {version.changed_by.split('@')[0]}
                          </span>
                        )}
                      </div>
                      {version.changed_fields?.length > 0 && (
                        <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                          {version.changed_fields.slice(0, 4).map(f => (
                            <span key={f.field} className="inline-flex items-center gap-0.5 text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded-md">
                              <Tag className="w-2.5 h-2.5" />
                              {f.field}
                            </span>
                          ))}
                          {version.changed_fields.length > 4 && (
                            <span className="text-[10px] text-slate-400">+{version.changed_fields.length - 4} more</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                    {!isLatest && (
                      <>
                        {prevVersion && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs text-slate-500 hover:text-teal-700"
                            onClick={(e) => { e.stopPropagation(); setComparingVersions([version, versions[index - 1]]); }}
                          >
                            <GitCompare className="w-3 h-3 mr-1" />
                            Diff
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs text-slate-500 hover:text-purple-700"
                          onClick={(e) => { e.stopPropagation(); restoreMutation.mutate(version.id); }}
                          disabled={restoreMutation.isPending}
                        >
                          <RotateCcw className="w-3 h-3 mr-1" />
                          Restore
                        </Button>
                      </>
                    )}
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </div>
                </div>

                {isExpanded && version.changed_fields?.length > 0 && (
                  <div className="px-4 pb-4 border-t border-slate-100 dark:border-slate-800 mt-1 pt-3">
                    <p className="text-xs font-medium text-slate-500 mb-2">Changed fields:</p>
                    <div className="space-y-2">
                      {version.changed_fields.map(f => (
                        <div key={f.field} className="grid grid-cols-[80px_1fr_1fr] gap-2 text-xs">
                          <span className="font-medium text-slate-600 dark:text-slate-400 truncate">{f.field}</span>
                          <div className="bg-red-50 dark:bg-red-950/30 rounded px-2 py-1 text-red-700 dark:text-red-400 truncate">
                            {formatValue(f.old_value)}
                          </div>
                          <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded px-2 py-1 text-emerald-700 dark:text-emerald-400 truncate">
                            {formatValue(f.new_value)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {comparingVersions && (
        <VersionDiffModal
          versionA={comparingVersions[1]}
          versionB={comparingVersions[0]}
          onClose={() => setComparingVersions(null)}
        />
      )}
    </div>
  );
}

function formatValue(val) {
  if (val === null || val === undefined) return '—';
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  if (typeof val === 'object') return JSON.stringify(val).slice(0, 60);
  return String(val).slice(0, 80);
}