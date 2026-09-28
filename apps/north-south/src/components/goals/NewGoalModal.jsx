import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from "lucide-react";

const categories = [
  { value: "verbal_communication", label: "Verbal Communication" },
  { value: "written_communication", label: "Written Communication" },
  { value: "body_language", label: "Body Language" },
  { value: "media_presence", label: "Media Presence" },
  { value: "executive_presence", label: "Executive Presence" },
  { value: "cross_cultural", label: "Cross-Cultural Communication" },
  { value: "life_balance", label: "Life Balance" },
];

export default function NewGoalModal({ onClose, onSaved }) {
  const [form, setForm] = useState({
    title: "", description: "", category: "", target_score: "", current_score: "", deadline: "", nudges_enabled: true
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    await base44.entities.LeadershipGoal.create({
      ...form,
      target_score: form.target_score ? Number(form.target_score) : undefined,
      current_score: form.current_score ? Number(form.current_score) : undefined,
      status: "active",
    });
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm px-4">
      <div className="bg-card rounded-3xl border border-border shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="font-cormorant text-2xl font-medium text-foreground">New Leadership Goal</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-secondary flex items-center justify-center">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-5">
          <div className="space-y-1.5">
            <label className="font-inter text-xs font-medium text-muted-foreground">Goal Title *</label>
            <Input value={form.title} onChange={e => set("title", e.target.value)} placeholder="e.g. Reduce filler words in presentations" required className="rounded-xl" />
          </div>

          <div className="space-y-1.5">
            <label className="font-inter text-xs font-medium text-muted-foreground">Category *</label>
            <Select value={form.category} onValueChange={v => set("category", v)}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder="Choose category" /></SelectTrigger>
              <SelectContent>
                {categories.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="font-inter text-xs font-medium text-muted-foreground">Description</label>
            <Textarea value={form.description} onChange={e => set("description", e.target.value)} placeholder="What does success look like?" rows={3} className="rounded-xl resize-none" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="font-inter text-xs font-medium text-muted-foreground">Current Score (1–10)</label>
              <Input type="number" min="1" max="10" value={form.current_score} onChange={e => set("current_score", e.target.value)} placeholder="e.g. 5" className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <label className="font-inter text-xs font-medium text-muted-foreground">Target Score (1–10)</label>
              <Input type="number" min="1" max="10" value={form.target_score} onChange={e => set("target_score", e.target.value)} placeholder="e.g. 9" className="rounded-xl" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="font-inter text-xs font-medium text-muted-foreground">Target Date</label>
            <Input type="date" value={form.deadline} onChange={e => set("deadline", e.target.value)} className="rounded-xl" />
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.nudges_enabled} onChange={e => set("nudges_enabled", e.target.checked)} className="rounded" />
            <div>
              <span className="font-inter text-sm text-foreground">Enable weekly nudges</span>
              <p className="font-inter text-xs text-muted-foreground">Receive email reminders to log your weekly check-in</p>
            </div>
          </label>

          <div className="flex gap-3 pt-2">
            <Button type="submit" className="flex-1 rounded-full" disabled={saving || !form.title || !form.category}>
              {saving ? "Saving..." : "Create Goal"}
            </Button>
            <Button type="button" variant="outline" className="rounded-full px-6" onClick={onClose}>Cancel</Button>
          </div>
        </form>
      </div>
    </div>
  );
}