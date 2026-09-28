import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { X, Target, CheckCircle } from "lucide-react";

const GOLD = "#B8952A";
const FOREST = "#2C3B2D";

const COMMITMENT_SUGGESTIONS = [
  "I will practise the pause technique in every meeting this week",
  "I will rewrite my top 3 emails using the framework I learned today",
  "I will record a 2-minute video of myself presenting and review my body language",
  "I will prepare 3 key messages before every important conversation",
  "I will ask one more question than usual before sharing my opinion",
  "I will use active listening techniques in my next cross-cultural conversation",
  "I will practise my opening statement for the upcoming presentation",
];

export default function CommitmentModal({ session, goals, onClose, onSaved }) {
  const [text, setText] = useState("");
  const [linkedGoalId, setLinkedGoalId] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const weekLabel = (() => {
    const d = new Date();
    const monday = new Date(d);
    monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return `Week of ${monday.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`;
  })();

  const handleSave = async () => {
    if (!text.trim()) return;
    setSaving(true);
    await base44.entities.Commitment.create({
      session_id: session?.id || "",
      commitment_text: text.trim(),
      goal_id: linkedGoalId || "",
      week_label: weekLabel,
      status: "pending",
      implemented: false,
      nudge_sent: false,
    });
    setDone(true);
    setSaving(false);
    setTimeout(() => { onSaved?.(); }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-card rounded-3xl border border-border shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="p-6 pb-4" style={{ background: FOREST }}>
          <div className="flex items-start justify-between">
            <div>
              <p className="font-inter text-xs tracking-widest uppercase mb-1" style={{ color: GOLD }}>
                Session Complete
              </p>
              <h2 className="font-cormorant text-2xl font-light text-white">Set Your Weekly Commitment</h2>
              <p className="font-inter text-xs mt-1" style={{ color: "rgba(255,255,255,0.55)" }}>
                What will you practise before your next session?
              </p>
            </div>
            <button onClick={onClose} className="text-white/40 hover:text-white/80 transition-colors ml-4">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {done ? (
          <div className="p-10 text-center space-y-3">
            <CheckCircle className="w-12 h-12 mx-auto" style={{ color: GOLD }} />
            <p className="font-cormorant text-2xl text-foreground">Commitment saved!</p>
            <p className="font-inter text-sm text-muted-foreground">
              We'll check in mid-week to see how you're getting on.
            </p>
          </div>
        ) : (
          <div className="p-6 space-y-5">
            {/* Suggestions */}
            <div>
              <p className="font-inter text-xs text-muted-foreground uppercase tracking-widest mb-2">Quick ideas</p>
              <div className="flex flex-wrap gap-2">
                {COMMITMENT_SUGGESTIONS.slice(0, 4).map((s, i) => (
                  <button key={i} onClick={() => setText(s)}
                    className="font-inter text-xs px-3 py-1.5 rounded-full border border-border bg-secondary/50 hover:border-primary/50 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors text-left">
                    {s.length > 55 ? s.slice(0, 55) + "…" : s}
                  </button>
                ))}
              </div>
            </div>

            {/* Text input */}
            <div>
              <label className="font-inter text-xs text-muted-foreground uppercase tracking-widest mb-1.5 block">
                My commitment this week
              </label>
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="I will…"
                rows={3}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 font-inter text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 resize-none"
                style={{ "--tw-ring-color": GOLD }}
              />
            </div>

            {/* Link to goal */}
            {goals && goals.length > 0 && (
              <div>
                <label className="font-inter text-xs text-muted-foreground uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                  <Target className="w-3 h-3" /> Link to a goal (optional)
                </label>
                <select
                  value={linkedGoalId}
                  onChange={e => setLinkedGoalId(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 font-inter text-sm text-foreground focus:outline-none">
                  <option value="">No linked goal</option>
                  {goals.filter(g => g.status === "active").map(g => (
                    <option key={g.id} value={g.id}>{g.title}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <Button variant="ghost" onClick={onClose} className="flex-1 rounded-full font-inter">
                Skip for now
              </Button>
              <Button onClick={handleSave} disabled={!text.trim() || saving}
                className="flex-1 rounded-full font-inter"
                style={{ backgroundColor: FOREST, color: "white" }}>
                {saving ? "Saving…" : "Save Commitment"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}