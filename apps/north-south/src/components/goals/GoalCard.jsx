import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Target, TrendingUp, CheckCircle2, Pause, ChevronDown, ChevronUp, Bell, BellOff, Calendar } from "lucide-react";

const categoryLabels = {
  verbal_communication: "Verbal Communication",
  written_communication: "Written Communication",
  body_language: "Body Language",
  media_presence: "Media Presence",
  executive_presence: "Executive Presence",
  cross_cultural: "Cross-Cultural",
  life_balance: "Life Balance",
};

const statusColors = {
  active: "bg-blue-100 text-blue-700",
  achieved: "bg-green-100 text-green-700",
  paused: "bg-amber-100 text-amber-700",
};

export default function GoalCard({ goal, checkIns, onCheckIn, onRefresh }) {
  const [expanded, setExpanded] = useState(false);
  const [updating, setUpdating] = useState(false);

  const progress = goal.current_score && goal.target_score
    ? Math.min(100, Math.round((goal.current_score / goal.target_score) * 100))
    : 0;

  const recent = checkIns.slice(0, 5);

  const toggleNudges = async () => {
    setUpdating(true);
    await base44.entities.LeadershipGoal.update(goal.id, { nudges_enabled: !goal.nudges_enabled });
    onRefresh();
    setUpdating(false);
  };

  const markAchieved = async () => {
    setUpdating(true);
    await base44.entities.LeadershipGoal.update(goal.id, { status: goal.status === "achieved" ? "active" : "achieved" });
    onRefresh();
    setUpdating(false);
  };

  const togglePause = async () => {
    setUpdating(true);
    await base44.entities.LeadershipGoal.update(goal.id, { status: goal.status === "paused" ? "active" : "paused" });
    onRefresh();
    setUpdating(false);
  };

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      <div className="p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-cormorant text-xl font-medium text-foreground">{goal.title}</h3>
              <span className={`font-inter text-xs px-2.5 py-0.5 rounded-full ${statusColors[goal.status]}`}>{goal.status}</span>
            </div>
            <div className="font-inter text-xs text-muted-foreground">
              {categoryLabels[goal.category] || goal.category}
              {goal.deadline && <span> · Due {new Date(goal.deadline).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>}
            </div>
            {goal.description && <p className="font-inter text-sm text-muted-foreground pt-1">{goal.description}</p>}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {goal.status === "active" && (
              <Button size="sm" className="rounded-full gap-1" onClick={onCheckIn} disabled={updating}>
                <Target className="w-3.5 h-3.5" /> Check In
              </Button>
            )}
            <Button size="sm" variant="ghost" className="rounded-full p-2" onClick={toggleNudges} disabled={updating} title={goal.nudges_enabled ? "Disable nudges" : "Enable nudges"}>
              {goal.nudges_enabled ? <Bell className="w-4 h-4 text-primary" /> : <BellOff className="w-4 h-4 text-muted-foreground" />}
            </Button>
            <Button size="sm" variant="ghost" className="rounded-full p-2" onClick={markAchieved} disabled={updating} title="Mark as achieved">
              <CheckCircle2 className={`w-4 h-4 ${goal.status === "achieved" ? "text-green-600" : "text-muted-foreground"}`} />
            </Button>
            <Button size="sm" variant="ghost" className="rounded-full p-2" onClick={togglePause} disabled={updating} title="Pause goal">
              <Pause className={`w-4 h-4 ${goal.status === "paused" ? "text-amber-500" : "text-muted-foreground"}`} />
            </Button>
          </div>
        </div>

        {/* Progress bar */}
        {goal.target_score && (
          <div className="mt-4 space-y-1.5">
            <div className="flex justify-between font-inter text-xs text-muted-foreground">
              <span>Progress</span>
              <span>{goal.current_score || 0} / {goal.target_score}</span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Expand toggle */}
        {checkIns.length > 0 && (
          <button onClick={() => setExpanded(!expanded)}
            className="mt-4 flex items-center gap-1 font-inter text-xs text-muted-foreground hover:text-foreground transition-colors">
            <TrendingUp className="w-3.5 h-3.5" /> {checkIns.length} check-in{checkIns.length > 1 ? "s" : ""}
            {expanded ? <ChevronUp className="w-3.5 h-3.5 ml-1" /> : <ChevronDown className="w-3.5 h-3.5 ml-1" />}
          </button>
        )}
      </div>

      {/* Check-in history */}
      {expanded && (
        <div className="border-t border-border px-6 py-4 space-y-3 bg-secondary/20">
          <p className="font-inter text-xs font-medium text-muted-foreground uppercase tracking-widest">Check-in History</p>
          {recent.map(c => (
            <div key={c.id} className="flex gap-4 items-start">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="font-cormorant text-sm font-medium text-primary">{c.score}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-inter text-xs text-muted-foreground mb-0.5">{c.week_label || new Date(c.created_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</div>
                {c.reflection && <p className="font-inter text-sm text-foreground">{c.reflection}</p>}
                {c.wins && <p className="font-inter text-xs text-green-700 mt-0.5">✓ {c.wins}</p>}
                {c.next_action && <p className="font-inter text-xs text-primary mt-0.5">→ {c.next_action}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}