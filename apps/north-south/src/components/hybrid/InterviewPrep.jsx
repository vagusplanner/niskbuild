import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Briefcase, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import HybridToolShell from "./HybridToolShell";

const interviewTypes = ["Executive / C-suite", "Board director", "Non-exec / advisory", "Investment / funding", "Media / PR", "Academic / research"];

export default function InterviewPrep() {
  const [role, setRole] = useState("");
  const [interviewType, setInterviewType] = useState("");
  const [background, setBackground] = useState("");
  const [answers, setAnswers] = useState({});
  const [scores, setScores] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [scoring, setScoring] = useState(null);

  const generate = async () => {
    setLoading(true);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an expert executive interview coach. Generate a comprehensive interview prep pack for:
Role/Position: ${role}
Interview type: ${interviewType}
Background context: ${background || "Not provided"}

Respond in JSON: { "briefing": string, "likely_questions": string[], "model_answers": [{"question": string, "model_answer": string}], "star_stories_to_prepare": string[], "questions_to_ask": string[], "key_messages": string[] }`,
      response_json_schema: {
        type: "object",
        properties: {
          briefing: { type: "string" },
          likely_questions: { type: "array", items: { type: "string" } },
          model_answers: { type: "array", items: { type: "object" } },
          star_stories_to_prepare: { type: "array", items: { type: "string" } },
          questions_to_ask: { type: "array", items: { type: "string" } },
          key_messages: { type: "array", items: { type: "string" } },
        },
      },
    });
    setResult(res);
    setLoading(false);
  };

  const scoreAnswer = async (question, answer) => {
    setScoring(question);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an executive interview coach. Score this answer:
Question: "${question}"
Answer: "${answer}"
Respond in JSON: { "score": number (1-10), "feedback": string, "stronger_version": string }`,
      response_json_schema: { type: "object", properties: { score: { type: "number" }, feedback: { type: "string" }, stronger_version: { type: "string" } } },
    });
    setScores(prev => ({ ...prev, [question]: res }));
    setScoring(null);
  };

  return (
    <HybridToolShell icon={Briefcase} title="Interview Prep" aiLabel="Question banks, model answers" humanLabel="Live rehearsal, reading the room, confidence work">
      {!result ? (
        <div className="bg-card rounded-3xl border border-border p-8 space-y-5">
          <p className="font-inter text-sm text-muted-foreground">AI builds your question bank and model answers. Your consultant runs the live rehearsal and builds your confidence under pressure.</p>
          <div className="space-y-1.5">
            <label className="font-inter text-xs font-medium text-muted-foreground">Role / position *</label>
            <Input value={role} onChange={e => setRole(e.target.value)} placeholder="e.g. Chief Executive, Board Director, Series A pitch" className="rounded-xl" />
          </div>
          <div>
            <div className="font-inter text-xs font-medium text-muted-foreground mb-2">Interview type</div>
            <div className="flex flex-wrap gap-2">
              {interviewTypes.map(t => (
                <button key={t} onClick={() => setInterviewType(t)}
                  className={`px-3 py-1.5 rounded-full text-sm font-inter border transition-colors ${interviewType === t ? "bg-primary/10 border-primary text-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="font-inter text-xs font-medium text-muted-foreground">Your background / context</label>
            <Textarea value={background} onChange={e => setBackground(e.target.value)} placeholder="Briefly describe your experience, the organisation, any context..." rows={4} className="rounded-xl resize-none text-sm" />
          </div>
          <Button onClick={generate} disabled={!role.trim() || loading} className="w-full rounded-full" size="lg">
            {loading ? <span className="flex gap-2 items-center"><Sparkles className="w-4 h-4 animate-pulse" /> Preparing...</span> : <span className="flex gap-2 items-center"><Sparkles className="w-4 h-4" /> Generate Interview Prep Pack</span>}
          </Button>
        </div>
      ) : (
        <div className="bg-card rounded-3xl border border-border p-8 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="font-cormorant text-2xl font-medium text-foreground">Interview Prep Pack</h3>
            <Button variant="outline" size="sm" className="rounded-full" onClick={() => { setResult(null); setAnswers({}); setScores({}); }}>New Prep</Button>
          </div>

          {result.briefing && <div className="bg-primary/10 rounded-2xl p-5 border border-primary/20"><p className="font-inter text-sm text-foreground leading-relaxed">{result.briefing}</p></div>}

          {result.key_messages?.length > 0 && (
            <div className="space-y-2">
              <div className="font-inter text-xs uppercase tracking-wider text-primary font-medium">Your Key Messages</div>
              {result.key_messages.map((m, i) => (
                <div key={i} className="flex gap-3 bg-secondary/40 rounded-xl px-4 py-3">
                  <span className="font-cormorant text-lg text-primary font-medium shrink-0">{i + 1}</span>
                  <span className="font-inter text-sm text-foreground">{m}</span>
                </div>
              ))}
            </div>
          )}

          {result.likely_questions?.length > 0 && (
            <div className="space-y-3">
              <div className="font-inter text-xs uppercase tracking-wider text-muted-foreground font-medium">Practise Your Answers</div>
              {result.likely_questions.map((q, i) => (
                <div key={i} className="border border-border rounded-xl p-4 space-y-3">
                  <p className="font-inter text-sm font-medium text-foreground">{q}</p>
                  <Textarea value={answers[q] || ""} onChange={e => setAnswers(prev => ({ ...prev, [q]: e.target.value }))} placeholder="Type your answer..." rows={3} className="rounded-xl resize-none text-sm" />
                  <Button size="sm" variant="outline" className="rounded-full" disabled={!answers[q] || scoring === q} onClick={() => scoreAnswer(q, answers[q])}>
                    {scoring === q ? "Scoring..." : "Score My Answer"}
                  </Button>
                  {scores[q] && (
                    <div className="bg-secondary/40 rounded-xl p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center"><span className="font-cormorant text-sm font-medium text-primary">{scores[q].score}</span></div>
                        <span className="font-inter text-sm text-foreground">{scores[q].feedback}</span>
                      </div>
                      {scores[q].stronger_version && <p className="font-cormorant text-base italic text-primary border-l-2 border-primary pl-3">"{scores[q].stronger_version}"</p>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {result.model_answers?.length > 0 && (
            <div className="space-y-3">
              <div className="font-inter text-xs uppercase tracking-wider text-muted-foreground font-medium">Model Answers</div>
              {result.model_answers.map((qa, i) => (
                <div key={i} className="border border-border rounded-xl p-4 space-y-2">
                  <p className="font-inter text-sm font-medium text-foreground">{qa.question}</p>
                  <p className="font-inter text-sm text-muted-foreground italic">"{qa.model_answer}"</p>
                </div>
              ))}
            </div>
          )}

          {result.star_stories_to_prepare?.length > 0 && (
            <div className="space-y-2">
              <div className="font-inter text-xs uppercase tracking-wider text-muted-foreground font-medium">STAR Stories to Prepare</div>
              {result.star_stories_to_prepare.map((s, i) => <div key={i} className="flex gap-2"><span className="text-primary">→</span><span className="font-inter text-sm text-muted-foreground">{s}</span></div>)}
            </div>
          )}

          {result.questions_to_ask?.length > 0 && (
            <div className="space-y-2">
              <div className="font-inter text-xs uppercase tracking-wider text-primary font-medium">Questions to Ask Them</div>
              {result.questions_to_ask.map((q, i) => <div key={i} className="flex gap-2"><span className="text-primary">?</span><span className="font-inter text-sm text-muted-foreground">{q}</span></div>)}
            </div>
          )}
        </div>
      )}
    </HybridToolShell>
  );
}