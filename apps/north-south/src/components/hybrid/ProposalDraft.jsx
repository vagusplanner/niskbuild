import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { FileText, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import HybridToolShell from "./HybridToolShell";

export default function ProposalDraft() {
  const [brief, setBrief] = useState("");
  const [audience, setAudience] = useState("");
  const [goal, setGoal] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an expert executive communication coach and proposal writer. Draft a proposal structure based on:
Brief: ${brief}
Target audience: ${audience}
Goal: ${goal}

Respond in JSON: { "executive_summary": string, "sections": [{"title": string, "content": string}], "vocabulary_elevations": [{"original": string, "elevated": string}], "opening_statement": string, "closing_statement": string, "strategic_notes": string }`,
      response_json_schema: {
        type: "object",
        properties: {
          executive_summary: { type: "string" },
          sections: { type: "array", items: { type: "object" } },
          vocabulary_elevations: { type: "array", items: { type: "object" } },
          opening_statement: { type: "string" },
          closing_statement: { type: "string" },
          strategic_notes: { type: "string" },
        },
      },
    });
    setResult(res);
    setLoading(false);
  };

  return (
    <HybridToolShell icon={FileText} title="Written Proposals" aiLabel="Draft structure, vocabulary elevation" humanLabel="Finalise tone, strategic alignment">
      {!result ? (
        <div className="bg-card rounded-3xl border border-border p-8 space-y-5">
          <p className="font-inter text-sm text-muted-foreground">Provide your brief and AI will generate a structured, elevated proposal draft for your consultant to refine.</p>
          <div className="space-y-1.5">
            <label className="font-inter text-xs font-medium text-muted-foreground">What is the proposal about? *</label>
            <Textarea value={brief} onChange={e => setBrief(e.target.value)} placeholder="Describe the proposal topic, context and key points..." rows={5} className="rounded-xl resize-none font-inter text-sm" />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="font-inter text-xs font-medium text-muted-foreground">Target audience</label>
              <Input value={audience} onChange={e => setAudience(e.target.value)} placeholder="e.g. Board of Directors, investor group" className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <label className="font-inter text-xs font-medium text-muted-foreground">Desired outcome</label>
              <Input value={goal} onChange={e => setGoal(e.target.value)} placeholder="e.g. Secure funding, win the contract" className="rounded-xl" />
            </div>
          </div>
          <Button onClick={generate} disabled={!brief.trim() || loading} className="w-full rounded-full" size="lg">
            {loading ? <span className="flex gap-2 items-center"><Sparkles className="w-4 h-4 animate-pulse" /> Drafting...</span> : <span className="flex gap-2 items-center"><Sparkles className="w-4 h-4" /> Generate Proposal Draft</span>}
          </Button>
        </div>
      ) : (
        <div className="bg-card rounded-3xl border border-border p-8 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="font-cormorant text-2xl font-medium text-foreground">Proposal Draft</h3>
            <Button variant="outline" size="sm" className="rounded-full" onClick={() => setResult(null)}>New Draft</Button>
          </div>

          {result.executive_summary && (
            <div className="bg-primary/10 rounded-2xl p-5 border border-primary/20">
              <div className="font-inter text-xs uppercase tracking-wider text-primary font-medium mb-2">Executive Summary</div>
              <p className="font-inter text-sm text-foreground leading-relaxed">{result.executive_summary}</p>
            </div>
          )}

          {result.opening_statement && (
            <div className="bg-secondary/40 rounded-xl p-4">
              <div className="font-inter text-xs uppercase tracking-wider text-muted-foreground font-medium mb-1">Opening Statement</div>
              <p className="font-cormorant text-lg italic text-foreground">"{result.opening_statement}"</p>
            </div>
          )}

          {result.sections?.length > 0 && (
            <div className="space-y-3">
              <div className="font-inter text-xs uppercase tracking-wider text-muted-foreground font-medium">Proposal Sections</div>
              {result.sections.map((s, i) => (
                <div key={i} className="border border-border rounded-xl p-4 space-y-1">
                  <div className="font-inter text-sm font-medium text-foreground">{i + 1}. {s.title}</div>
                  <p className="font-inter text-sm text-muted-foreground leading-relaxed">{s.content}</p>
                </div>
              ))}
            </div>
          )}

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

          {result.strategic_notes && (
            <div className="bg-secondary/60 rounded-xl p-4">
              <div className="font-inter text-xs uppercase tracking-wider text-muted-foreground font-medium mb-1">Strategic Notes for Your Consultant</div>
              <p className="font-inter text-sm text-foreground">{result.strategic_notes}</p>
            </div>
          )}
        </div>
      )}
    </HybridToolShell>
  );
}