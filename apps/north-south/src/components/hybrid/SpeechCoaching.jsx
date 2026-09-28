import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Mic, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import HybridToolShell from "./HybridToolShell";

export default function SpeechCoaching() {
  const [transcript, setTranscript] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const analyse = async () => {
    setLoading(true);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an expert speech coach and broadcast journalist. Analyse this speech transcript:

"${transcript}"

Respond in JSON: { "pacing_score": number (1-10), "pacing_notes": string, "filler_words": [{"word": string, "count": number}], "sentence_rhythm": string, "structure_feedback": string, "strengths": string[], "improvements": string[], "suggested_opening": string, "suggested_closing": string, "summary": string }`,
      response_json_schema: {
        type: "object",
        properties: {
          pacing_score: { type: "number" },
          pacing_notes: { type: "string" },
          filler_words: { type: "array", items: { type: "object" } },
          sentence_rhythm: { type: "string" },
          structure_feedback: { type: "string" },
          strengths: { type: "array", items: { type: "string" } },
          improvements: { type: "array", items: { type: "string" } },
          suggested_opening: { type: "string" },
          suggested_closing: { type: "string" },
          summary: { type: "string" },
        },
      },
    });
    setResult(res);
    setLoading(false);
  };

  return (
    <HybridToolShell icon={Mic} title="Speech Coaching" aiLabel="Transcript analysis, pacing scores" humanLabel="Final delivery feedback, nuance, emotion coaching">
      {!result ? (
        <div className="bg-card rounded-3xl border border-border p-8 space-y-5">
          <p className="font-inter text-sm text-muted-foreground">Paste your speech transcript or spoken notes for AI pacing and structure analysis.</p>
          <Textarea value={transcript} onChange={e => setTranscript(e.target.value)} placeholder="Paste speech transcript here..." rows={10} className="rounded-xl resize-none font-inter text-sm" />
          <Button onClick={analyse} disabled={!transcript.trim() || loading} className="w-full rounded-full" size="lg">
            {loading ? <span className="flex gap-2 items-center"><Sparkles className="w-4 h-4 animate-pulse" /> Analysing...</span> : <span className="flex gap-2 items-center"><Sparkles className="w-4 h-4" /> Analyse Speech</span>}
          </Button>
        </div>
      ) : (
        <div className="bg-card rounded-3xl border border-border p-8 space-y-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="font-cormorant text-2xl font-medium text-primary">{result.pacing_score}/10</span>
              </div>
              <div>
                <div className="font-inter text-xs text-muted-foreground uppercase tracking-wider">Pacing Score</div>
                <p className="font-cormorant text-lg text-foreground">{result.summary}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="rounded-full" onClick={() => setResult(null)}>New Analysis</Button>
          </div>

          {result.pacing_notes && <InfoBlock label="Pacing" value={result.pacing_notes} />}
          {result.sentence_rhythm && <InfoBlock label="Sentence Rhythm" value={result.sentence_rhythm} />}
          {result.structure_feedback && <InfoBlock label="Structure" value={result.structure_feedback} />}

          {result.filler_words?.length > 0 && (
            <div>
              <div className="font-inter text-xs uppercase tracking-wider text-destructive font-medium mb-2">Filler Words Detected</div>
              <div className="flex flex-wrap gap-2">
                {result.filler_words.map((f, i) => (
                  <span key={i} className="bg-destructive/10 text-destructive text-xs font-inter px-3 py-1.5 rounded-full">
                    "{f.word}" × {f.count}
                  </span>
                ))}
              </div>
            </div>
          )}

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

          {result.suggested_opening && (
            <div className="bg-primary/10 rounded-2xl p-5 border border-primary/20">
              <div className="font-inter text-xs uppercase tracking-wider text-primary font-medium mb-1">Suggested Opening</div>
              <p className="font-cormorant text-lg italic text-foreground">"{result.suggested_opening}"</p>
            </div>
          )}
        </div>
      )}
    </HybridToolShell>
  );
}

function InfoBlock({ label, value }) {
  return (
    <div className="bg-secondary/40 rounded-xl p-4">
      <div className="font-inter text-xs uppercase tracking-wider text-muted-foreground font-medium mb-1">{label}</div>
      <p className="font-inter text-sm text-foreground">{value}</p>
    </div>
  );
}