import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Trophy, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const CATEGORY_COLORS = {
  personal:     'bg-teal-500',
  professional: 'bg-teal-700',
  health:       'bg-emerald-600',
  financial:    'bg-amber-500',
  learning:     'bg-sky-600',
  spiritual:    'bg-amber-600',
  relationships:'bg-teal-400',
  other:        'bg-slate-400',
};

export default function GoalsStrip({ filterCategory, filterLabel, limit = 3, linkTo = 'Wellness' }) {
  const { t } = useTranslation();
  const { data: goals = [] } = useQuery({
    queryKey: ['goals'],
    queryFn: () => base44.entities.Goal.list('-created_date', 30),
  });

  const active = goals
    .filter(g => g.status === 'in_progress')
    .filter(g => !filterCategory || g.category === filterCategory)
    .slice(0, limit);

  if (active.length === 0) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Trophy className="w-3.5 h-3.5 text-amber-500" />
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            {filterLabel || (filterCategory
              ? `${filterCategory.charAt(0).toUpperCase() + filterCategory.slice(1)} ${t('wellness.goals')}`
              : t('dashboard.goalProgress'))}
          </span>
        </div>
        <Link to={createPageUrl(linkTo)} className="text-xs text-teal-600 hover:underline flex items-center gap-0.5">
          {t('common.seeAll')} <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="space-y-2">
        {active.map(g => (
          <div key={g.id} className="flex items-center gap-3 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
            <div className={`w-2 h-8 rounded-full flex-shrink-0 ${CATEGORY_COLORS[g.category] || 'bg-slate-400'}`} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{g.title}</div>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full">
                  <div
                    className={`h-full rounded-full ${CATEGORY_COLORS[g.category] || 'bg-slate-400'}`}
                    style={{ width: `${g.progress || 0}%` }}
                  />
                </div>
                <span className="text-xs text-slate-400 flex-shrink-0">{g.progress || 0}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}