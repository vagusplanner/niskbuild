import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { CheckCircle, Circle, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

const GOLD = "#B8952A";

export default function CommitmentsPanel({ commitments, goals, onRefresh }) {
  const [updating, setUpdating] = useState(null);

  const pending = commitments.filter(c => !c.implemented).slice(0, 5);
  const done = commitments.filter(c => c.implemented).length;

  const toggle = async (commitment) => {
    setUpdating(commitment.id);
    const newVal = !commitment.implemented;
    await base44.entities.Commitment.update(commitment.id, {
      implemented: newVal,
      status: newVal ? "completed" : "in_progress",
    });
    // If linked to a goal, bump check-in score
    if (newVal && commitment.goal_id) {
      const goal = goals?.find(g => g.id === commitment.goal_id);
      if (goal) {
        const newScore = Math.min(10, (goal.current_score || 5) + 0.5);
        await base44.entities.LeadershipGoal.update(commitment.goal_id, { current_score: newScore });
        await base44.entities.GoalCheckIn.create({
          goal_id: commitment.goal_id,
          score: newScore,
          reflection: `Completed commitment: ${commitment.commitment_text}`,
          week_label: commitment.week_label || "This week",
        });
      }
    }
    onRefresh?.();
    setUpdating(null);
  };

  if (commitments.length === 0) return null;

  return (
    <div className="bg-card rounded-2xl border border-border p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-cormorant text-xl font-medium text-foreground">Weekly Commitments</h2>
          <p className="font-inter text-xs text-muted-foreground mt-0.5">
            {done} of {commitments.length} completed
          </p>
        </div>
        <Link to="/goals">
          <Button variant="ghost" size="sm" className="text-xs gap-1 rounded-full">
            Goals <ChevronRight className="w-3 h-3" />
          </Button>
        </Link>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 rounded-full bg-secondary mb-5 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${commitments.length ? (done / commitments.length) * 100 : 0}%`, background: GOLD }} />
      </div>

      <div className="space-y-2">
        {pending.map(c => (
          <div key={c.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-secondary/40 transition-colors group">
            <button onClick={() => toggle(c)} disabled={updating === c.id}
              className="mt-0.5 shrink-0 text-muted-foreground hover:text-primary transition-colors">
              {c.implemented
                ? <CheckCircle className="w-5 h-5" style={{ color: GOLD }} />
                : <Circle className="w-5 h-5" />}
            </button>
            <div className="min-w-0">
              <p className={`font-inter text-sm ${c.implemented ? "line-through text-muted-foreground" : "text-foreground"}`}>
                {c.commitment_text}
              </p>
              {c.week_label && (
                <p className="font-inter text-xs text-muted-foreground mt-0.5">{c.week_label}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}