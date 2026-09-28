import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Brain, Sparkles, CheckCircle } from "lucide-react";

const questions = [
  { id: "role", q: "What is your current role?", options: ["CEO / C-Suite", "Senior Director / VP", "Manager / Team Lead", "Individual Contributor", "Entrepreneur / Founder"] },
  { id: "challenge", q: "What is your biggest communication challenge?", options: ["Speaking with authority in meetings", "Writing clear & compelling documents", "Presenting to senior stakeholders", "Communicating across cultures", "Managing difficult conversations"] },
  { id: "context", q: "Where do you communicate most?", options: ["Large presentations & keynotes", "Small boardroom meetings", "Written emails & reports", "Media & press", "1:1 conversations"] },
  { id: "style", q: "How would others describe your communication style?", options: ["Direct and concise", "Detailed and thorough", "Warm and relational", "Analytical and structured", "Charismatic and engaging"] },
  { id: "goal", q: "What outcome matters most to you?", options: ["More influence and buy-in", "Greater clarity and precision", "Stronger executive presence", "More confident public speaking", "Better cross-cultural communication"] },
];

export default function StyleAssessment() {
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const done = Object.keys(answers).length === questions.length;

  const submit = async () => {
    setLoading(true);
    const summary = questions.map(q => `${q.q}: ${answers[q.id]}`).join("\n");
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Based on this executive communication profile questionnaire, create a personalised communication style profile.

Answers:
${summary}

Respond in JSON: { "style_name": string (e.g. "The Strategic Influencer"), "style_description": string (2-3 sentences), "core_strengths": string[], "blind_spots": string[], "recommended_tools": string[], "daily_practice": string, "book_recommendation": string, "summary": string }`,
      response_json_schema: {
        type: "object",
        properties: {
          style_name: { type: "string" },
          style_description: { type: "string" },
          core_strengths: { type: "array", items: { type: "string" } },
          blind_spots: { type: "array", items: { type: "string" } },
          recommended_tools: { type: "array", items: { type: "string" } },
          daily_practice: { type: "string" },
          book_recommendation: { type: "string" },
          summary: { type: "string" },
        },
      },
    });
    setResult(res);
    setLoading(false);
  };

  if (result) return (
    <div className="bg-card rounded-3xl border border-border p-8 space-y-6 max-w-3xl mx-auto">
      <div className="text-center space-y-2 pb-4 border-b border-border">
        <div className="font-inter text-xs uppercase tracking-wider text-primary font-medium">Your Communication Style</div>
        <h2 className="font-cormorant text-4xl font-medium text-foreground">{result.style_name}</h2>
        <p className="font-inter text-sm text-muted-foreground max-w-lg mx-auto">{result.style_description}</p>
      </div>
      <div className="grid sm:grid-cols-2 gap-5">
        <div className="space-y-3">
          <div className="font-inter text-xs uppercase tracking-wider text-primary font-medium">Core Strengths</div>
          {result.core_strengths?.map((s, i) => (
            <div key={i} className="flex gap-2 items-start">
              <CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <span className="font-inter text-sm text-muted-foreground">{s}</span>
            </div>
          ))}
        </div>
        <div className="space-y-3">
          <div className="font-inter text-xs uppercase tracking-wider text-accent font-medium">Blind Spots to Watch</div>
          {result.blind_spots?.map((s, i) => (
            <div key={i} className="flex gap-2 items-start">
              <div className="w-1.5 h-1.5 rounded-full bg-accent mt-2 shrink-0" />
              <span className="font-inter text-sm text-muted-foreground">{s}</span>
            </div>
          ))}
        </div>
      </div>
      {result.daily_practice && (
        <div className="bg-primary/10 rounded-2xl p-5 border border-primary/20">
          <div className="font-inter text-xs uppercase tracking-wider text-primary font-medium mb-2">Your Daily Practice</div>
          <p className="font-inter text-sm text-foreground">{result.daily_practice}</p>
        </div>
      )}
      {result.recommended_tools?.length > 0 && (
        <div className="space-y-2">
          <div className="font-inter text-xs uppercase tracking-wider text-primary font-medium">Recommended AI Tools for You</div>
          <div className="flex flex-wrap gap-2">
            {result.recommended_tools.map((t, i) => (
              <span key={i} className="bg-secondary text-foreground text-xs font-inter px-3 py-1.5 rounded-full border border-border">{t}</span>
            ))}
          </div>
        </div>
      )}
      {result.book_recommendation && (
        <div className="font-inter text-sm text-muted-foreground">
          <span className="text-foreground font-medium">Recommended reading: </span>{result.book_recommendation}
        </div>
      )}
      <Button variant="outline" className="w-full rounded-full" onClick={() => { setResult(null); setAnswers({}); }}>Retake Assessment</Button>
    </div>
  );

  return (
    <div className="bg-card rounded-3xl border border-border p-8 space-y-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
          <Brain className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="font-cormorant text-2xl font-medium text-foreground">Communication Style Assessment</h2>
          <p className="font-inter text-sm text-muted-foreground">5 questions → your personalised profile</p>
        </div>
      </div>

      <div className="space-y-8">
        {questions.map((q, qi) => (
          <div key={q.id} className="space-y-3">
            <div className="font-inter text-sm font-medium text-foreground">{qi + 1}. {q.q}</div>
            <div className="grid sm:grid-cols-2 gap-2">
              {q.options.map(opt => (
                <button key={opt} onClick={() => setAnswers(prev => ({ ...prev, [q.id]: opt }))}
                  className={`text-left px-4 py-3 rounded-xl border text-sm font-inter transition-colors ${answers[q.id] === opt ? "bg-primary/10 border-primary text-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}>
                  {opt}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Button onClick={submit} disabled={!done || loading} className="w-full rounded-full" size="lg">
        {loading ? <span className="flex gap-2 items-center"><Sparkles className="w-4 h-4 animate-pulse" /> Building your profile...</span>
          : <span className="flex gap-2 items-center"><Sparkles className="w-4 h-4" /> Generate My Profile ({Object.keys(answers).length}/{questions.length})</span>}
      </Button>
    </div>
  );
}