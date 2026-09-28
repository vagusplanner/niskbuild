import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Radio, Sparkles, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import HybridToolShell from "./HybridToolShell";

const mediaTypes = ["TV interview", "Radio interview", "Press conference", "Podcast", "Print interview", "Live broadcast"];

export default function MediaPrep() {
  const [topic, setTopic] = useState("");
  const [mediaType, setMediaType] = useState("");
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [practice, setPractice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [practiceLoading, setPracticeLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a media trainer with 20+ years at BBC, ITV, and international broadcasters. Generate a media prep pack for:
Topic/Story: ${topic}
Media type: ${mediaType}

Respond in JSON: { "briefing": string, "likely_questions": string[], "bridging_phrases": string[], "key_messages": string[], "things_to_avoid": string[], "timing_tips": string }`,
      response_json_schema: {
        type: "object",
        properties: {
          briefing: { type: "string" },
          likely_questions: { type: "array", items: { type: "string" } },
          bridging_phrases: { type: "array", items: { type: "string" } },
          key_messages: { type: "array", items: { type: "string" } },
          things_to_avoid: { type: "array", items: { type: "string" } },
          timing_tips: { type: "string" },
        },
      },
    });
    setResult(res);
    setLoading(false);
  };

  const scoreAnswer = async (question, answer) => {
    setPracticeLoading(true);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a media trainer. Score this answer to a ${mediaType} question:
Question: "${question}"
Answer: "${answer}"

Respond in JSON: { "score": number (1-10), "feedback": string, "stronger_version": string }`,
      response_json_schema: {
        type: "object",
        properties: { score: { type: "number" }, feedback: { type: "string" }, stronger_version: { type: "string" } },
      },
    });
    setPractice(prev => ({ ...prev, [question]: res }));
    setPracticeLoading(false);
  };

  return (
    <HybridToolShell icon={Radio} title="Media Prep" aiLabel="Sample questions, timing feedback" humanLabel="Live mock interview, real-time coaching">
      {!result ? (
        <div className="bg-card rounded-3xl border border-border p-8 space-y-5">
          <p className="font-inter text-sm text-muted-foreground">Get a full media prep pack with likely questions, bridging phrases and timing guidance before your consultant runs the live mock interview.</p>
          <div className="space-y-1.5">
            <label className="font-inter text-xs font-medium text-muted-foreground">Topic / story *</label>
            <Textarea value={topic} onChange={e => setTopic(e.target.value)} placeholder="What will you be interviewed about?" rows={4} className="rounded-xl resize-none font-inter text-sm" />
          </div>
          <div>
            <div className="font-inter text-xs font-medium text-muted-foreground mb-2">Media type</div>
            <div className="flex flex-wrap gap-2">
              {mediaTypes.map(m => (
                <button key={m} onClick={() => setMediaType(m)}
                  className={`px-3 py-1.5 rounded-full text-sm font-inter border transition-colors ${mediaType === m ? "bg-primary/10 border-primary text-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}>
                  {m}
                </button>
              ))}
            </div>
          </div>
          <Button onClick={generate} disabled={!topic.trim() || loading} className="w-full rounded-full" size="lg">
            {loading ? <span className="flex gap-2 items-center"><Sparkles className="w-4 h-4 animate-pulse" /> Preparing...</span> : <span className="flex gap-2 items-center"><Sparkles className="w-4 h-4" /> Generate Media Prep Pack</span>}
          </Button>
        </div>
      ) : (
        <div className="bg-card rounded-3xl border border-border p-8 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="font-cormorant text-2xl font-medium text-foreground">Media Prep Pack</h3>
            <Button variant="outline" size="sm" className="rounded-full" onClick={() => { setResult(null); setPractice(null); }}>New Prep</Button>
          </div>

          {result.briefing && <div className="bg-primary/10 rounded-2xl p-5 border border-primary/20"><p className="font-inter text-sm text-foreground leading-relaxed">{result.briefing}</p></div>}

          {result.key_messages?.length > 0 && (
            <div className="space-y-2">
              <div className="font-inter text-xs uppercase tracking-wider text-primary font-medium">Your 3 Key Messages</div>
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
                  <Button size="sm" variant="outline" className="rounded-full" disabled={!answers[q] || practiceLoading} onClick={() => scoreAnswer(q, answers[q])}>
                    Score My Answer
                  </Button>
                  {practice?.[q] && (
                    <div className="bg-secondary/40 rounded-xl p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center"><span className="font-cormorant text-sm font-medium text-primary">{practice[q].score}</span></div>
                        <span className="font-inter text-sm text-foreground">{practice[q].feedback}</span>
                      </div>
                      {practice[q].stronger_version && <p className="font-cormorant text-base italic text-primary border-l-2 border-primary pl-3">"{practice[q].stronger_version}"</p>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {result.bridging_phrases?.length > 0 && (
            <div className="space-y-2">
              <div className="font-inter text-xs uppercase tracking-wider text-muted-foreground font-medium">Bridging Phrases</div>
              <div className="flex flex-wrap gap-2">
                {result.bridging_phrases.map((p, i) => <span key={i} className="font-inter text-sm bg-secondary text-foreground px-3 py-1.5 rounded-full">"{p}"</span>)}
              </div>
            </div>
          )}

          {result.timing_tips && (
            <div className="flex items-start gap-3 bg-secondary/40 rounded-xl p-4">
              <Clock className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <p className="font-inter text-sm text-foreground">{result.timing_tips}</p>
            </div>
          )}
        </div>
      )}
    </HybridToolShell>
  );
}