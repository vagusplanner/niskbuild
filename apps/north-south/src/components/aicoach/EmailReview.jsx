import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Sparkles, Mail, RotateCcw } from "lucide-react";
import FeedbackCard from "./FeedbackCard";

export default function EmailReview() {
  const [input, setInput] = useState("");
  const [type, setType] = useState("email");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const analyse = async () => {
    setLoading(true);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an executive communication coach. Review this ${type} and provide:
1. Overall persuasion score (1-10)
2. Grammar issues found
3. Strengths in persuasion and tone
4. Specific improvements needed
5. Vocabulary elevations (original → elevated)
6. An improved version of the opening paragraph

${type}: "${input}"

Respond in JSON: { "score": number, "grammar_issues": string[], "strengths": string[], "improvements": string[], "vocabulary_suggestions": [{"original": string, "elevated": string}], "improved_opening": string, "summary": string }`,
      response_json_schema: {
        type: "object",
        properties: {
          score: { type: "number" },
          grammar_issues: { type: "array", items: { type: "string" } },
          strengths: { type: "array", items: { type: "string" } },
          improvements: { type: "array", items: { type: "string" } },
          vocabulary_suggestions: { type: "array", items: { type: "object" } },
          improved_opening: { type: "string" },
          summary: { type: "string" },
        },
      },
    });
    setResult(res);
    setLoading(false);
  };

  if (result) return (
    <FeedbackCard title="Email & Proposal Report" result={result} onReset={() => setResult(null)}>
      {result.grammar_issues?.length > 0 && (
        <div className="space-y-2">
          <div className="font-inter text-xs uppercase tracking-wider text-destructive font-medium">Grammar Issues</div>
          <ul className="space-y-1">
            {result.grammar_issues.map((g, i) => (
              <li key={i} className="font-inter text-sm text-muted-foreground flex gap-2">
                <span className="text-destructive">•</span> {g}
              </li>
            ))}
          </ul>
        </div>
      )}
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
      {result.improved_opening && (
        <div className="bg-primary/10 rounded-2xl p-5 border border-primary/20">
          <div className="font-inter text-xs uppercase tracking-wider text-primary font-medium mb-2">Improved Opening</div>
          <p className="font-cormorant text-lg italic text-foreground">"{result.improved_opening}"</p>
        </div>
      )}
    </FeedbackCard>
  );

  return (
    <div className="bg-card rounded-3xl border border-border p-8 space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
          <Mail className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="font-cormorant text-2xl font-medium text-foreground">Email & Proposal Review</h2>
          <p className="font-inter text-sm text-muted-foreground">Grammar, persuasion scoring & vocabulary elevation</p>
        </div>
      </div>
      <div className="flex gap-2">
        {["email", "proposal", "report"].map(t => (
          <button key={t} onClick={() => setType(t)}
            className={`px-4 py-1.5 rounded-full text-xs font-inter font-medium transition-colors border ${type === t ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      <Textarea value={input} onChange={e => setInput(e.target.value)} placeholder={`Paste your ${type} here...`} rows={10} className="rounded-xl resize-none font-inter text-sm" />
      <Button onClick={analyse} disabled={!input.trim() || loading} className="w-full rounded-full" size="lg">
        {loading ? <span className="flex gap-2 items-center"><Sparkles className="w-4 h-4 animate-pulse" /> Reviewing...</span>
          : <span className="flex gap-2 items-center"><Sparkles className="w-4 h-4" /> Review {type.charAt(0).toUpperCase() + type.slice(1)}</span>}
      </Button>
    </div>
  );
}