import { CheckCircle, Circle, Trophy, Target, Zap } from "lucide-react";

const GOLD = "#B8952A";
const FOREST = "#2C3B2D";

const milestoneTypes = [
  { key: "first_session",     label: "First AI Session",          icon: Zap,         threshold: 1,  field: "sessions" },
  { key: "five_sessions",     label: "5 Sessions Completed",      icon: Zap,         threshold: 5,  field: "sessions" },
  { key: "twenty_sessions",   label: "20 Sessions",               icon: Zap,         threshold: 20, field: "sessions" },
  { key: "first_commitment",  label: "First Commitment Set",      icon: Target,      threshold: 1,  field: "commitments" },
  { key: "five_commitments",  label: "5 Commitments Completed",   icon: Target,      threshold: 5,  field: "commitments" },
  { key: "first_goal",        label: "First Goal Created",        icon: Trophy,      threshold: 1,  field: "goals" },
  { key: "goal_achieved",     label: "Goal Achieved",             icon: Trophy,      threshold: 1,  field: "goals_achieved" },
  { key: "score_7",           label: "Scored 7+ in a Session",    icon: CheckCircle, threshold: 7,  field: "max_score" },
  { key: "score_9",           label: "Scored 9+ in a Session",    icon: CheckCircle, threshold: 9,  field: "max_score" },
];

export default function MilestoneTimeline({ stats }) {
  const { sessions = 0, commitments = 0, goals = 0, goals_achieved = 0, max_score = 0 } = stats;
  const fieldMap = { sessions, commitments, goals, goals_achieved, max_score };

  const earned = milestoneTypes.filter(m => fieldMap[m.field] >= m.threshold);
  const upcoming = milestoneTypes.filter(m => fieldMap[m.field] < m.threshold);
  const pct = Math.round((earned.length / milestoneTypes.length) * 100);

  return (
    <div className="bg-card rounded-2xl border border-border p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-cormorant text-xl font-medium text-foreground">Milestone Completion</h2>
          <p className="font-inter text-xs text-muted-foreground">{earned.length} of {milestoneTypes.length} milestones reached</p>
        </div>
        <div className="text-right">
          <div className="font-cormorant text-3xl font-medium text-foreground">{pct}%</div>
          <div className="font-inter text-xs text-muted-foreground">complete</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: `linear-gradient(to right, ${FOREST}, ${GOLD})` }} />
      </div>

      {/* Earned */}
      {earned.length > 0 && (
        <div className="space-y-2">
          <p className="font-inter text-xs uppercase tracking-widest text-muted-foreground">Achieved</p>
          <div className="flex flex-wrap gap-2">
            {earned.map(m => {
              const Icon = m.icon;
              return (
                <div key={m.key}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-inter font-medium"
                  style={{ borderColor: GOLD + "40", backgroundColor: GOLD + "12", color: FOREST }}>
                  <Icon className="w-3 h-3" style={{ color: GOLD }} />
                  {m.label}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Next milestone */}
      {upcoming.length > 0 && (
        <div className="flex items-start gap-3 p-3 rounded-xl bg-secondary/40 border border-border">
          <Circle className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
          <div>
            <p className="font-inter text-xs font-medium text-foreground">Next: {upcoming[0].label}</p>
            <p className="font-inter text-xs text-muted-foreground mt-0.5">
              {upcoming[0].field === "max_score"
                ? `Current best: ${fieldMap[upcoming[0].field]}/10 — aim for ${upcoming[0].threshold}`
                : `${fieldMap[upcoming[0].field]} of ${upcoming[0].threshold} ${upcoming[0].field.replace("_", " ")}`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}