"use client";

interface PlanPanelProps {
  plan: string;
  onClose: () => void;
  onBuildFromPlan: () => void;
  isBuilding: boolean;
}

export default function PlanPanel({ plan, onClose, onBuildFromPlan, isBuilding }: PlanPanelProps) {
  return (
    <div className="shrink-0 border-b border-nisk bg-nisk-card max-h-64 flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 border-b border-nisk shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider text-[var(--accent-cyan)] font-semibold">
            Plan Mode
          </span>
          <span className="text-[10px] text-nisk-muted">0 credits used</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBuildFromPlan}
            disabled={isBuilding}
            className="btn-primary px-3 py-1.5 text-xs rounded-lg disabled:opacity-50"
          >
            {isBuilding ? 'Building...' : 'Build from plan →'}
          </button>
          <button type="button" onClick={onClose} className="btn-ghost text-xs px-2 py-1">
            Close
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3 text-sm text-gray-300 whitespace-pre-wrap font-mono leading-relaxed">
        {plan}
      </div>
    </div>
  );
}
