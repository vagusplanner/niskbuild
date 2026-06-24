import React, { useState } from 'react';
import { SDK } from '@/lib/custom-sdk.js';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { History, Search, Filter, Clock, User, Tag, ChevronRight, RotateCcw, GitCompare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import VersionHistoryPanel from '@/components/versioning/VersionHistoryPanel';

const ENTITY_TYPES = ['Event', 'Task', 'Goal', 'Holiday'];

const changeTypeColors = {
  create: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  update: 'bg-teal-100 text-teal-700 border-teal-200',
  restore: 'bg-purple-100 text-purple-700 border-purple-200'
};

const entityColors = {
  Event: 'bg-blue-100 text-blue-700',
  Task: 'bg-amber-100 text-amber-700',
  Goal: 'bg-emerald-100 text-emerald-700',
  Holiday: 'bg-rose-100 text-rose-700'
};

export default function VersionHistoryPage() {
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState('all');
  const [changeTypeFilter, setChangeTypeFilter] = useState('all');
  const [selectedEntity, setSelectedEntity] = useState(null);

  const { data: versions = [], isLoading } = useQuery({
    queryKey: ['all-version-history'],
    queryFn: () => SDK.entities.VersionHistory.list('-created_date', 200)
  });

  const filtered = versions.filter(v => {
    const matchSearch = !search ||
      v.entity_title?.toLowerCase().includes(search.toLowerCase()) ||
      v.change_summary?.toLowerCase().includes(search.toLowerCase()) ||
      v.changed_by?.toLowerCase().includes(search.toLowerCase());
    const matchEntity = entityFilter === 'all' || v.entity_type === entityFilter;
    const matchType = changeTypeFilter === 'all' || v.change_type === changeTypeFilter;
    return matchSearch && matchEntity && matchType;
  });

  // Group by date
  const grouped = filtered.reduce((acc, v) => {
    const day = format(new Date(v.created_date), 'yyyy-MM-dd');
    if (!acc[day]) acc[day] = [];
    acc[day].push(v);
    return acc;
  }, {});

  const sortedDays = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-teal-300/30">
            <History className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Version History</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Track all changes across your data</p>
          </div>
        </div>
        <Badge variant="outline" className="text-sm">{filtered.length} entries</Badge>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search by title, change, or user..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={entityFilter} onValueChange={setEntityFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Entity type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {ENTITY_TYPES.map(t => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={changeTypeFilter} onValueChange={setChangeTypeFilter}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder="Change type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Changes</SelectItem>
            <SelectItem value="create">Created</SelectItem>
            <SelectItem value="update">Updated</SelectItem>
            <SelectItem value="restore">Restored</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Timeline */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : sortedDays.length === 0 ? (
        <div className="text-center py-20">
          <History className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No version history found.</p>
          <p className="text-slate-400 text-sm mt-1">Changes to Events, Tasks, Goals, and Holidays will appear here automatically.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {sortedDays.map(day => (
            <div key={day}>
              <div className="flex items-center gap-3 mb-4">
                <div className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                  {format(new Date(day), 'EEEE, MMMM d, yyyy')}
                </div>
                <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800" />
                <Badge variant="outline" className="text-xs">{grouped[day].length}</Badge>
              </div>

              <div className="space-y-2">
                {grouped[day].map(version => (
                  <div
                    key={version.id}
                    className="flex items-start gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:border-teal-200 dark:hover:border-teal-800 hover:shadow-sm transition-all cursor-pointer group"
                    onClick={() => setSelectedEntity({ entityType: version.entity_type, entityId: version.entity_id })}
                  >
                    {/* Version number badge */}
                    <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-500 flex-shrink-0 mt-0.5">
                      {version.version_number}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-slate-800 dark:text-slate-100 text-sm">
                          {version.entity_title || version.entity_id}
                        </span>
                        <Badge className={cn("text-[10px] px-1.5 py-0 border-0", entityColors[version.entity_type])}>
                          {version.entity_type}
                        </Badge>
                        <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", changeTypeColors[version.change_type])}>
                          {version.change_type}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{version.change_summary}</p>

                      <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {format(new Date(version.created_date), 'h:mm a')}
                        </span>
                        {version.changed_by && (
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {version.changed_by.split('@')[0]}
                          </span>
                        )}
                        {version.changed_fields?.length > 0 && (
                          <span className="flex items-center gap-1">
                            <Tag className="w-3 h-3" />
                            {version.changed_fields.length} field{version.changed_fields.length > 1 ? 's' : ''} changed
                          </span>
                        )}
                      </div>
                    </div>

                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-teal-500 transition-colors flex-shrink-0 mt-1" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail panel */}
      <Sheet open={!!selectedEntity} onOpenChange={(open) => !open && setSelectedEntity(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col">
          {selectedEntity && (
            <VersionHistoryPanel
              entityType={selectedEntity.entityType}
              entityId={selectedEntity.entityId}
              onClose={() => setSelectedEntity(null)}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}