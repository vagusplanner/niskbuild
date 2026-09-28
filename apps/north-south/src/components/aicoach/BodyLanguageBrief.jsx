import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Users, Sparkles } from "lucide-react";
import FeedbackCard from "./FeedbackCard";

const scenarios = [
  "Board meeting / investor presentation",
  "Media interview / press conference",
  "Job interview / executive panel",
  "Difficult conversation / negotiation",
  "Keynote / large audience speech",
  "Virtual / video call meeting",
  "Networking event / reception",
];

export default function BodyLanguageBrief() {
  const [scenario, setScenario] = useState("");
  const [context, setContext] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a world-class body language and non-verbal communication expert with broadcast and executive coaching experience.

Prepare a comprehensive body language briefing for this situation:
Scenario: ${scenario}
Additional context: ${context || "None provided"}

Respond in JSON: { "summary": string, "strengths": string[], "improvements": string[], "entry_strategy": string, "power_positions": string[], "things_to_avoid": string[], "eye_contact_guide": string, "hands_and_posture": string, "cultural_note": string }`,
      response_json_schema: {
        type: "object",
        properties: {
          summary: { type: "string" },
          strengths: { type: "array", items: { type: "string" } },
          improvements: { type: "array", items: { type: "string" } },
          entry_strategy: { type: "string" },
          power_positions: { type: "array", items: { type: "string" } },
          things_to_avoid: { type: "array", items: { type: "string" } },
          eye_contact_guide: { type: "string" },
          hands_and_posture: { type: "string" },
          cultural_note: { type: "string" },
        },
      },
    });
    setResult(res);
    setLoading(false);
  };

  if (result) return (
    <FeedbackCard title="Body Language Briefing" result={{ ...result, strengths: result.power_positions, improvements: result.things_to_avoid }} onReset={() => { setResult(null); setScenario(""); setContext(""); }}>
      {result.entry_strategy && <BriefBlock label="Entry Strategy" value={result.entry_strategy} />}
      {result.eye_contact_guide && <BriefBlock label="Eye Contact" value={result.eye_contact_guide} />}
      {result.hands_and_posture && <BriefBlock label="Hands & Posture" value={result.hands_and_posture} />}
      {result.cultural_note && (
        <div className="bg-accent/10 rounded-2xl p-5 border border-accent/20">
          <div className="font-inter text-xs uppercase tracking-wider text-accent font-medium mb-2">Cultural Note</div>
          <p className="font-inter text-sm text-foreground">{result.cultural_note}</p>
        </div>
      )}
    </FeedbackCard>
  );

  return (
    <div className="bg-card rounded-3xl border border-border p-8 space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
          <Users className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="font-cormorant text-2xl font-medium text-foreground">Body Language Pre-Brief</h2>
          <p className="font-inter text-sm text-muted-foreground">Scenario-based preparation for any high-stakes meeting</p>
        </div>
      </div>
      <div>
        <div className="font-inter text-xs font-medium text-muted-foreground mb-3">Select your scenario</div>
        <div className="grid sm:grid-cols-2 gap-2">
          {scenarios.map(s => (
            <button key={s} onClick={() => setScenario(s)}
              className={`text-left px-4 py-2.5 rounded-xl border text-sm font-inter transition-colors ${scenario === s ? "bg-primary/10 border-primary text-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}>
              {s}
            </button>
          ))}
        </div>
      </div>
      <Textarea value={context} onChange={e => setContext(e.target.value)} placeholder="Optional: Add context (e.g. 'Meeting with a Japanese delegation', 'I tend to fidget when nervous')..." rows={4} className="rounded-xl resize-none font-inter text-sm" />
      <Button onClick={generate} disabled={!scenario || loading} className="w-full rounded-full" size="lg">
        {loading ? <span className="flex gap-2 items-center"><Sparkles className="w-4 h-4 animate-pulse" /> Preparing your briefing...</span>
          : <span className="flex gap-2 items-center"><Sparkles className="w-4 h-4" /> Generate Body Language Brief</span>}
      </Button>
    </div>
  );
}

function BriefBlock({ label, value }) {
  return (
    <div className="bg-secondary/40 rounded-xl p-4">
      <div className="font-inter text-xs uppercase tracking-wider text-muted-foreground font-medium mb-1">{label}</div>
      <p className="font-inter text-sm text-foreground">{value}</p>
    </div>
  );
}