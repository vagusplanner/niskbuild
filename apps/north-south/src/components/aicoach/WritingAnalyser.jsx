import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, RotateCcw, FileText } from "lucide-react";
import FeedbackCard from "./FeedbackCard";

export default function WritingAnalyser() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const analyse = async () => {
    setLoading(true);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an expert executive communication coach with 20+ years in international media. Analyse this text and provide detailed feedback.

Text: "${input}"

Respond in JSON with: { "score": number (1-10), "tone": string, "clarity": string, "strengths": string[], "improvements": string[], "vocabulary_suggestions": [{"original": string, "elevated": string}], "rewritten_paragraph": string, "summary": string }`,
      response_json_schema: {
        type: "object",
        properties: {
          score: { type: "number" },
          tone: { type: "string" },
          clarity: { type: "string" },
          strengths: { type: "array", items: { type: "string" } },
          improvements: { type: "array", items: { type: "string" } },
          vocabulary_suggestions: { type: "array", items: { type: "object" } },
          rewritten_paragraph: { type: "string" },
          summary: { type: "string" },
        },
      },
    });
    setResult(res);
    setLoading(false);
  };

  if (result) return (
    <FeedbackCard title="Writing Analysis Report" result={result} onReset={() => setResult(null)}>
      {result.tone && <InfoRow label="Tone" value={result.tone} />}
      {result.clarity && <InfoRow label="Clarity" value={result.clarity} />}
      {result.vocabulary_suggestions?.length > 0 && (
        <div className="space-y-3">
          <div className="font-inter text-xs uppercase tracking-wider text-primary font-medium">Vocabulary Elevations</div>
          <div className="space-y-2">
            {result.vocabulary_suggestions.map((v, i) => (
              <div key={i} className="flex items-center gap-3 bg-secondary/40 rounded-xl px-4 py-2.5 text-sm font-inter">
                <span className="text-muted-foreground line-through">{v.original}</span>
                <span className="text-primary">→</span>
                <span className="text-foreground font-medium">{v.elevated}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {result.rewritten_paragraph && (
        <div className="bg-primary/10 rounded-2xl p-5 border border-primary/20">
          <div className="font-inter text-xs uppercase tracking-wider text-primary font-medium mb-2">Elevated Rewrite</div>
          <p className="font-cormorant text-lg italic text-foreground">"{result.rewritten_paragraph}"</p>
        </div>
      )}
    </FeedbackCard>
  );

  return (
    <ToolShell
      icon={FileText}
      title="Writing Analyser"
      desc="Paste any text — proposal, email, speech — for AI feedback on tone, clarity, vocabulary and structure."
      input={input} setInput={setInput}
      placeholder="Paste your text here..."
      loading={loading} onSubmit={analyse}
      cta="Analyse Writing"
    />
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-start gap-3 bg-secondary/40 rounded-xl px-4 py-3">
      <span className="font-inter text-xs text-muted-foreground w-20 shrink-0 pt-0.5 uppercase tracking-wide">{label}</span>
      <span className="font-inter text-sm text-foreground">{value}</span>
    </div>
  );
}

function ToolShell({ icon: Icon, title, desc, input, setInput, placeholder, loading, onSubmit, cta, rows = 10 }) {
  return (
    <div className="bg-card rounded-3xl border border-border p-8 space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="font-cormorant text-2xl font-medium text-foreground">{title}</h2>
          <p className="font-inter text-sm text-muted-foreground">{desc}</p>
        </div>
      </div>
      <Textarea value={input} onChange={e => setInput(e.target.value)} placeholder={placeholder} rows={rows} className="rounded-xl resize-none font-inter text-sm" />
      <Button onClick={onSubmit} disabled={!input.trim() || loading} className="w-full rounded-full" size="lg">
        {loading ? <span className="flex items-center gap-2"><Sparkles className="w-4 h-4 animate-pulse" /> Analysing...</span>
          : <span className="flex items-center gap-2"><Sparkles className="w-4 h-4" /> {cta}</span>}
      </Button>
    </div>
  );
}