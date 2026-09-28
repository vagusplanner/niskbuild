import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { X } from "lucide-react";

export default function CheckInModal({ goal, onClose, onSaved }) {
  const [form, setForm] = useState({ score: "", reflection: "", wins: "", challenges: "", next_action: "" });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const weekLabel = (() => {
    const now = new Date();
    return `Week of ${now.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;
  })();

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    const score = Number(form.score);
    await Promise.all([
      base44.entities.GoalCheckIn.create({
        goal_id: goal.id,
        score,
        reflection: form.reflection,
        wins: form.wins,
        challenges: form.challenges,
        next_action: form.next_action,
        week_label: weekLabel,
      }),
      base44.entities.LeadershipGoal.update(goal.id, { current_score: score }),
    ]);
    onSaved();
  };

  const scores = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm px-4">
      <div className="bg-card rounded-3xl border border-border shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="font-cormorant text-2xl font-medium text-foreground">Weekly Check-in</h2>
            <p className="font-inter text-xs text-muted-foreground mt-0.5">{goal.title}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-secondary flex items-center justify-center">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-5">
          <div className="space-y-2">
            <label className="font-inter text-xs font-medium text-muted-foreground">This week's score (1–10) *</label>
            <div className="flex gap-2 flex-wrap">
              {scores.map(s => (
                <button key={s} type="button" onClick={() => set("score", s)}
                  className={`w-10 h-10 rounded-full font-inter text-sm font-medium transition-colors ${form.score === s ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-secondary/70"}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="font-inter text-xs font-medium text-muted-foreground">Reflection — how did this week go?</label>
            <Textarea value={form.reflection} onChange={e => set("reflection", e.target.value)} placeholder="Describe your overall communication experience this week..." rows={3} className="rounded-xl resize-none" />
          </div>

          <div className="space-y-1.5">
            <label className="font-inter text-xs font-medium text-muted-foreground">✓ Wins this week</label>
            <Textarea value={form.wins} onChange={e => set("wins", e.target.value)} placeholder="What went well? What did you nail?" rows={2} className="rounded-xl resize-none" />
          </div>

          <div className="space-y-1.5">
            <label className="font-inter text-xs font-medium text-muted-foreground">Challenges</label>
            <Textarea value={form.challenges} onChange={e => set("challenges", e.target.value)} placeholder="What was hard? What didn't go to plan?" rows={2} className="rounded-xl resize-none" />
          </div>

          <div className="space-y-1.5">
            <label className="font-inter text-xs font-medium text-muted-foreground">→ Next action</label>
            <Textarea value={form.next_action} onChange={e => set("next_action", e.target.value)} placeholder="One specific thing you'll do differently next week..." rows={2} className="rounded-xl resize-none" />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" className="flex-1 rounded-full" disabled={saving || !form.score}>
              {saving ? "Saving..." : "Submit Check-in"}
            </Button>
            <Button type="button" variant="outline" className="rounded-full px-6" onClick={onClose}>Cancel</Button>
          </div>
        </form>
      </div>
    </div>
  );
}