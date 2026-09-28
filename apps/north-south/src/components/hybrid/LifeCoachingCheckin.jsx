import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Heart, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import HybridToolShell from "./HybridToolShell";

const prompts = [
  "What did I achieve this week that I'm proud of?",
  "What challenge am I facing that I haven't addressed?",
  "Where did I feel most like myself this week?",
  "What is holding me back from the next level?",
  "What would I do differently if I had no fear of failure?",
  "What relationships need more of my attention?",
];

export default function LifeCoachingCheckin() {
  const [journal, setJournal] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const addPrompt = (p) => {
    setJournal(prev => prev ? `${prev}\n\n${p}\n` : `${p}\n`);
  };

  const analyse = async () => {
    setLoading(true);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a compassionate yet direct life coach for executives. Analyse this journal entry / check-in:

"${journal}"

Respond with warmth, honesty, and insight. JSON: { "reflection": string, "themes": string[], "strengths_shown": string[], "areas_to_explore": string[], "this_weeks_focus": string, "affirmation": string, "questions_for_deep_session": string[] }`,
      response_json_schema: {
        type: "object",
        properties: {
          reflection: { type: "string" },
          themes: { type: "array", items: { type: "string" } },
          strengths_shown: { type: "array", items: { type: "string" } },
          areas_to_explore: { type: "array", items: { type: "string" } },
          this_weeks_focus: { type: "string" },
          affirmation: { type: "string" },
          questions_for_deep_session: { type: "array", items: { type: "string" } },
        },
      },
    });
    setResult(res);
    setLoading(false);
  };

  return (
    <HybridToolShell icon={Heart} title="Life Coaching Check-ins" aiLabel="Weekly prompts, journal analysis" humanLabel="Monthly deep-dive sessions">
      {!result ? (
        <div className="bg-card rounded-3xl border border-border p-8 space-y-5">
          <p className="font-inter text-sm text-muted-foreground">Use the weekly prompts to journal, then get AI reflection and insight. Your consultant takes the deep patterns into your monthly deep-dive.</p>

          <div>
            <div className="font-inter text-xs font-medium text-muted-foreground mb-3">Weekly prompts — click to add to your journal</div>
            <div className="grid sm:grid-cols-2 gap-2">
              {prompts.map((p, i) => (
                <button key={i} onClick={() => addPrompt(p)}
                  className="text-left p-3 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 transition-all font-inter text-sm text-muted-foreground">
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="font-inter text-xs font-medium text-muted-foreground">Your journal entry *</label>
            <Textarea value={journal} onChange={e => setJournal(e.target.value)} placeholder="Write freely — reflect on your week, your feelings, your goals..." rows={8} className="rounded-xl resize-none font-inter text-sm" />
          </div>
          <Button onClick={analyse} disabled={!journal.trim() || loading} className="w-full rounded-full" size="lg">
            {loading ? <span className="flex gap-2 items-center"><Sparkles className="w-4 h-4 animate-pulse" /> Reflecting...</span> : <span className="flex gap-2 items-center"><Sparkles className="w-4 h-4" /> Get AI Reflection</span>}
          </Button>
        </div>
      ) : (
        <div className="bg-card rounded-3xl border border-border p-8 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="font-cormorant text-2xl font-medium text-foreground">Your Weekly Reflection</h3>
            <Button variant="outline" size="sm" className="rounded-full" onClick={() => { setResult(null); setJournal(""); }}>New Entry</Button>
          </div>

          {result.affirmation && (
            <div className="bg-primary/10 rounded-2xl p-5 border border-primary/20 text-center">
              <p className="font-cormorant text-xl italic text-foreground">"{result.affirmation}"</p>
            </div>
          )}

          {result.reflection && (
            <div className="bg-secondary/40 rounded-xl p-5">
              <p className="font-inter text-sm text-foreground leading-relaxed">{result.reflection}</p>
            </div>
          )}

          {result.this_weeks_focus && (
            <div className="bg-card border-2 border-primary/30 rounded-2xl p-5">
              <div className="font-inter text-xs uppercase tracking-wider text-primary font-medium mb-1">This Week's Focus</div>
              <p className="font-cormorant text-xl text-foreground">{result.this_weeks_focus}</p>
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-4">
            {result.strengths_shown?.length > 0 && (
              <div className="space-y-2">
                <div className="font-inter text-xs uppercase tracking-wider text-primary font-medium">Strengths Shown</div>
                {result.strengths_shown.map((s, i) => <p key={i} className="font-inter text-sm text-muted-foreground flex gap-2"><span className="text-primary">•</span>{s}</p>)}
              </div>
            )}
            {result.areas_to_explore?.length > 0 && (
              <div className="space-y-2">
                <div className="font-inter text-xs uppercase tracking-wider text-accent font-medium">Areas to Explore</div>
                {result.areas_to_explore.map((s, i) => <p key={i} className="font-inter text-sm text-muted-foreground flex gap-2"><span className="text-accent">•</span>{s}</p>)}
              </div>
            )}
          </div>

          {result.themes?.length > 0 && (
            <div className="space-y-2">
              <div className="font-inter text-xs uppercase tracking-wider text-muted-foreground font-medium">Themes This Week</div>
              <div className="flex flex-wrap gap-2">
                {result.themes.map((t, i) => <span key={i} className="bg-secondary text-muted-foreground font-inter text-sm px-3 py-1.5 rounded-full">{t}</span>)}
              </div>
            </div>
          )}

          {result.questions_for_deep_session?.length > 0 && (
            <div className="bg-accent/10 rounded-2xl p-5 border border-accent/20 space-y-2">
              <div className="font-inter text-xs uppercase tracking-wider text-accent-foreground font-medium">Bring to Your Monthly Deep-Dive</div>
              {result.questions_for_deep_session.map((q, i) => (
                <div key={i} className="flex gap-2"><span className="text-accent">→</span><span className="font-inter text-sm text-foreground">{q}</span></div>
              ))}
            </div>
          )}
        </div>
      )}
    </HybridToolShell>
  );
}