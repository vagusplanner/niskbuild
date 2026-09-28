import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { User, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import HybridToolShell from "./HybridToolShell";

const bioTypes = ["LinkedIn About section", "Executive bio", "Speaker bio", "Website bio", "Board profile"];

export default function PersonalBranding() {
  const [bio, setBio] = useState("");
  const [bioType, setBioType] = useState("LinkedIn About section");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const analyse = async () => {
    setLoading(true);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an expert personal branding strategist and executive communication coach. Analyse this ${bioType}:

"${bio}"

Respond in JSON: { "overall_score": number (1-10), "summary": string, "brand_clarity": string, "tone_analysis": string, "strengths": string[], "improvements": string[], "vocabulary_elevations": [{"original": string, "elevated": string}], "rewritten_version": string, "strategic_questions_for_consultant": string[] }`,
      response_json_schema: {
        type: "object",
        properties: {
          overall_score: { type: "number" },
          summary: { type: "string" },
          brand_clarity: { type: "string" },
          tone_analysis: { type: "string" },
          strengths: { type: "array", items: { type: "string" } },
          improvements: { type: "array", items: { type: "string" } },
          vocabulary_elevations: { type: "array", items: { type: "object" } },
          rewritten_version: { type: "string" },
          strategic_questions_for_consultant: { type: "array", items: { type: "string" } },
        },
      },
    });
    setResult(res);
    setLoading(false);
  };

  return (
    <HybridToolShell icon={User} title="Personal Branding" aiLabel="Analyse LinkedIn bio / bio text" humanLabel="Strategic narrative, positioning, story coaching">
      {!result ? (
        <div className="bg-card rounded-3xl border border-border p-8 space-y-5">
          <p className="font-inter text-sm text-muted-foreground">AI analyses your current bio for clarity, tone and vocabulary — then your consultant shapes your strategic narrative and unique positioning.</p>
          <div>
            <div className="font-inter text-xs font-medium text-muted-foreground mb-2">Bio type</div>
            <div className="flex flex-wrap gap-2">
              {bioTypes.map(t => (
                <button key={t} onClick={() => setBioType(t)}
                  className={`px-3 py-1.5 rounded-full text-sm font-inter border transition-colors ${bioType === t ? "bg-primary/10 border-primary text-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="font-inter text-xs font-medium text-muted-foreground">Paste your {bioType} *</label>
            <Textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Paste your bio text here..." rows={8} className="rounded-xl resize-none font-inter text-sm" />
          </div>
          <Button onClick={analyse} disabled={!bio.trim() || loading} className="w-full rounded-full" size="lg">
            {loading ? <span className="flex gap-2 items-center"><Sparkles className="w-4 h-4 animate-pulse" /> Analysing...</span> : <span className="flex gap-2 items-center"><Sparkles className="w-4 h-4" /> Analyse My Bio</span>}
          </Button>
        </div>
      ) : (
        <div className="bg-card rounded-3xl border border-border p-8 space-y-6">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <span className="font-cormorant text-xl font-medium text-primary">{result.overall_score}/10</span>
              </div>
              <div>
                <div className="font-inter text-xs text-muted-foreground uppercase tracking-wider">Brand Score</div>
                <p className="font-cormorant text-lg text-foreground">{result.summary}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="rounded-full shrink-0" onClick={() => setResult(null)}>New Analysis</Button>
          </div>

          {[{ label: "Brand Clarity", value: result.brand_clarity }, { label: "Tone", value: result.tone_analysis }].filter(b => b.value).map((b, i) => (
            <div key={i} className="bg-secondary/40 rounded-xl p-4">
              <div className="font-inter text-xs uppercase tracking-wider text-muted-foreground font-medium mb-1">{b.label}</div>
              <p className="font-inter text-sm text-foreground">{b.value}</p>
            </div>
          ))}

          <div className="grid sm:grid-cols-2 gap-4">
            {result.strengths?.length > 0 && (
              <div className="space-y-2">
                <div className="font-inter text-xs uppercase tracking-wider text-primary font-medium">Strengths</div>
                {result.strengths.map((s, i) => <p key={i} className="font-inter text-sm text-muted-foreground flex gap-2"><span className="text-primary">•</span>{s}</p>)}
              </div>
            )}
            {result.improvements?.length > 0 && (
              <div className="space-y-2">
                <div className="font-inter text-xs uppercase tracking-wider text-accent font-medium">To Improve</div>
                {result.improvements.map((s, i) => <p key={i} className="font-inter text-sm text-muted-foreground flex gap-2"><span className="text-accent">•</span>{s}</p>)}
              </div>
            )}
          </div>

          {result.vocabulary_elevations?.length > 0 && (
            <div className="space-y-2">
              <div className="font-inter text-xs uppercase tracking-wider text-primary font-medium">Vocabulary Elevations</div>
              {result.vocabulary_elevations.map((v, i) => (
                <div key={i} className="flex items-center gap-3 bg-secondary/40 rounded-xl px-4 py-2.5 text-sm font-inter">
                  <span className="text-muted-foreground line-through">{v.original}</span>
                  <span className="text-primary">→</span>
                  <span className="text-foreground font-medium">{v.elevated}</span>
                </div>
              ))}
            </div>
          )}

          {result.rewritten_version && (
            <div className="bg-primary/10 rounded-2xl p-5 border border-primary/20">
              <div className="font-inter text-xs uppercase tracking-wider text-primary font-medium mb-2">AI-Elevated Version</div>
              <p className="font-inter text-sm text-foreground leading-relaxed">{result.rewritten_version}</p>
            </div>
          )}

          {result.strategic_questions_for_consultant?.length > 0 && (
            <div className="bg-accent/10 rounded-2xl p-5 border border-accent/20 space-y-2">
              <div className="font-inter text-xs uppercase tracking-wider text-accent-foreground font-medium">Bring to Your Human Session</div>
              {result.strategic_questions_for_consultant.map((q, i) => (
                <div key={i} className="flex gap-2"><span className="text-accent">→</span><span className="font-inter text-sm text-foreground">{q}</span></div>
              ))}
            </div>
          )}
        </div>
      )}
    </HybridToolShell>
  );
}