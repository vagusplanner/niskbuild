import { Flame, Star, Zap } from "lucide-react";

const GOLD = "#B8952A";
const FOREST = "#2C3B2D";

// Levels config: total sessions needed to reach each level
const LEVELS = [
  { level: 1, label: "Emerging Voice",     min: 0  },
  { level: 2, label: "Clear Communicator", min: 5  },
  { level: 3, label: "Confident Speaker",  min: 12 },
  { level: 4, label: "Executive Presence", min: 25 },
  { level: 5, label: "Master Influencer",  min: 50 },
];

function getLevel(totalSessions) {
  let current = LEVELS[0];
  for (const l of LEVELS) {
    if (totalSessions >= l.min) current = l;
  }
  const idx = LEVELS.indexOf(current);
  const next = LEVELS[idx + 1] || null;
  const progress = next
    ? Math.min(100, Math.round(((totalSessions - current.min) / (next.min - current.min)) * 100))
    : 100;
  return { current, next, progress, totalSessions };
}

// Badges: each requires N sessions in a specific category
const BADGE_DEFS = [
  { id: "verbal_5",    label: "Verbal Clarity",    category: "verbal_communication",  threshold: 5,  icon: "🗣️" },
  { id: "verbal_15",   label: "Verbal Master",      category: "verbal_communication",  threshold: 15, icon: "🎙️" },
  { id: "media_5",     label: "Media Ready",        category: "media_training",        threshold: 5,  icon: "📺" },
  { id: "body_5",      label: "Presence Pro",       category: "body_language",         threshold: 5,  icon: "🌟" },
  { id: "writing_5",   label: "Written Authority",  category: "written_communication", threshold: 5,  icon: "✍️" },
  { id: "exec_10",     label: "Executive Presence", category: null,                    threshold: 10, icon: "👑", allCategories: true },
  { id: "streak_7",    label: "7-Day Streak",       category: null,                    threshold: 7,  icon: "🔥", streakBased: true },
  { id: "streak_30",   label: "30-Day Streak",      category: null,                    threshold: 30, icon: "💎", streakBased: true },
];

function computeBadges(sessions, streak) {
  const counts = {};
  for (const s of sessions) {
    counts[s.session_type] = (counts[s.session_type] || 0) + 1;
  }
  return BADGE_DEFS.map(b => {
    let earned = false;
    if (b.streakBased) {
      earned = streak >= b.threshold;
    } else if (b.allCategories) {
      earned = sessions.length >= b.threshold;
    } else {
      earned = (counts[b.category] || 0) >= b.threshold;
    }
    return { ...b, earned };
  });
}

function computeStreak(sessions) {
  if (!sessions.length) return 0;
  // Group sessions by calendar date
  const dates = new Set(sessions.map(s =>
    new Date(s.created_date).toISOString().slice(0, 10)
  ));
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    if (dates.has(key)) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }
  return streak;
}

export default function GamificationBar({ sessions }) {
  const streak = computeStreak(sessions);
  const { current, next, progress } = getLevel(sessions.length);
  const badges = computeBadges(sessions, streak);
  const earnedBadges = badges.filter(b => b.earned);
  const nextBadge = badges.find(b => !b.earned);

  return (
    <div className="space-y-4 mb-8">
      {/* Streak + Level row */}
      <div className="grid sm:grid-cols-2 gap-4">
        {/* Streak */}
        <div className="bg-card rounded-2xl border border-border p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-2xl"
            style={{ background: streak > 0 ? "#FEF3C7" : "hsl(var(--secondary))" }}>
            <Flame className={`w-6 h-6 ${streak > 0 ? "text-orange-500" : "text-muted-foreground"}`} />
          </div>
          <div className="min-w-0">
            <p className="font-inter text-xs text-muted-foreground uppercase tracking-widest mb-0.5">Learning Streak</p>
            <p className="font-cormorant text-2xl font-medium text-foreground">
              {streak} {streak === 1 ? "day" : "days"}
            </p>
            <p className="font-inter text-xs text-muted-foreground">
              {streak === 0 ? "Start a session today to begin your streak" : streak >= 7 ? "Outstanding consistency! 🔥" : "Keep it going!"}
            </p>
          </div>
        </div>

        {/* Level progress */}
        <div className="bg-card rounded-2xl border border-border p-5">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="font-inter text-xs text-muted-foreground uppercase tracking-widest mb-0.5">Coaching Level</p>
              <p className="font-cormorant text-lg font-medium text-foreground">{current.label}</p>
            </div>
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0"
              style={{ background: GOLD + "20" }}>
              <Zap className="w-5 h-5" style={{ color: GOLD }} />
            </div>
          </div>
          <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${progress}%`, background: GOLD }} />
          </div>
          <p className="font-inter text-xs text-muted-foreground mt-1.5">
            {next
              ? `${sessions.length} sessions · ${next.min - sessions.length} more to reach "${next.label}"`
              : `Level ${current.level} — Maximum level reached!`}
          </p>
        </div>
      </div>

      {/* Mastery Badges */}
      <div className="bg-card rounded-2xl border border-border p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="font-inter text-xs text-muted-foreground uppercase tracking-widest mb-0.5">Mastery Badges</p>
            <p className="font-cormorant text-lg font-medium text-foreground">
              {earnedBadges.length} / {badges.length} earned
            </p>
          </div>
          <Star className="w-4 h-4" style={{ color: GOLD }} />
        </div>
        <div className="flex flex-wrap gap-2">
          {badges.map(b => (
            <div key={b.id}
              title={b.earned ? `Earned: ${b.label}` : `${b.label} — ${b.streakBased ? `${b.threshold}-day streak` : `${b.threshold} sessions${b.category ? ` in ${b.category.replace(/_/g," ")}` : ""}`}`}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-inter font-medium transition-all ${b.earned
                ? "border-amber-300 bg-amber-50 text-amber-700"
                : "border-border bg-secondary/50 text-muted-foreground opacity-50"}`}>
              <span>{b.icon}</span>
              <span>{b.label}</span>
            </div>
          ))}
        </div>
        {nextBadge && (
          <p className="font-inter text-xs text-muted-foreground mt-3">
            Next: <span className="font-medium text-foreground">{nextBadge.icon} {nextBadge.label}</span>
            {nextBadge.streakBased
              ? ` — maintain a ${nextBadge.threshold}-day streak`
              : nextBadge.allCategories
                ? ` — complete ${nextBadge.threshold} total sessions`
                : ` — complete ${nextBadge.threshold} ${nextBadge.category?.replace(/_/g, " ")} sessions`}
          </p>
        )}
      </div>
    </div>
  );
}