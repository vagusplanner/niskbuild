import { TrendingUp, TrendingDown, Minus } from "lucide-react";

const typeLabel = {
  verbal_communication: "Verbal",
  written_communication: "Written",
  body_language: "Body Language",
  media_training: "Media",
  speech_review: "Speech",
  proposal_review: "Proposal",
  life_coaching: "Life Coaching",
};

const typeColor = {
  verbal_communication: "bg-blue-50 text-blue-700",
  written_communication: "bg-purple-50 text-purple-700",
  body_language: "bg-green-50 text-green-700",
  media_training: "bg-amber-50 text-amber-700",
  speech_review: "bg-rose-50 text-rose-700",
  proposal_review: "bg-indigo-50 text-indigo-700",
  life_coaching: "bg-teal-50 text-teal-700",
};

function ScoreBadge({ score, prev }) {
  const color = score >= 7.5 ? "text-green-600" : score >= 5 ? "text-amber-600" : "text-red-600";
  const bg = score >= 7.5 ? "bg-green-50" : score >= 5 ? "bg-amber-50" : "bg-red-50";
  const diff = prev !== null && prev !== undefined ? score - prev : null;

  return (
    <div className="flex items-center gap-2">
      {diff !== null && (
        <span className={`text-xs font-inter ${diff > 0 ? "text-green-600" : diff < 0 ? "text-red-500" : "text-muted-foreground"}`}>
          {diff > 0 ? <TrendingUp className="w-3.5 h-3.5 inline" /> : diff < 0 ? <TrendingDown className="w-3.5 h-3.5 inline" /> : <Minus className="w-3.5 h-3.5 inline" />}
          {" "}{diff > 0 ? "+" : ""}{diff.toFixed(1)}
        </span>
      )}
      <span className={`w-10 h-10 rounded-full flex items-center justify-center font-cormorant text-lg font-semibold ${color} ${bg}`}>
        {score}
      </span>
    </div>
  );
}

export default function SessionHistory({ sessions }) {
  if (!sessions || sessions.length === 0) return null;

  const withScores = sessions.filter(s => s.score !== undefined).slice(0, 15);

  return (
    <div className="bg-card rounded-2xl border border-border p-6">
      <h2 className="font-cormorant text-xl font-medium text-foreground mb-1">Session History</h2>
      <p className="font-inter text-xs text-muted-foreground mb-5">Your last {withScores.length} scored coaching sessions</p>
      <div className="space-y-2">
        {withScores.map((s, i) => {
          const prev = withScores[i + 1]?.score ?? null;
          return (
            <div key={s.id} className="flex items-center justify-between p-3 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <span className={`text-[11px] font-inter px-2.5 py-0.5 rounded-full shrink-0 font-medium ${typeColor[s.session_type] || "bg-secondary text-muted-foreground"}`}>
                  {typeLabel[s.session_type] || s.session_type}
                </span>
                <span className="font-inter text-sm text-foreground truncate">{s.title}</span>
              </div>
              <div className="flex items-center gap-3 shrink-0 ml-3">
                <span className="font-inter text-xs text-muted-foreground hidden sm:block">
                  {new Date(s.created_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                </span>
                <ScoreBadge score={s.score} prev={prev} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}