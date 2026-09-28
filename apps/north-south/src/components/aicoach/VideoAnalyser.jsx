import { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Upload, Video, Loader2, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";

const ScoreBar = ({ label, score, max = 10 }) => (
  <div className="space-y-1.5">
    <div className="flex justify-between font-inter text-sm">
      <span className="text-foreground">{label}</span>
      <span className="font-medium text-primary">{score}/{max}</span>
    </div>
    <div className="h-2 bg-secondary rounded-full overflow-hidden">
      <div
        className="h-full bg-primary rounded-full transition-all duration-700"
        style={{ width: `${(score / max) * 100}%` }}
      />
    </div>
  </div>
);

export default function VideoAnalyser() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [analysing, setAnalysing] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);
  const inputRef = useRef();

  const handleFile = (f) => {
    if (!f) return;
    if (!f.type.startsWith("video/")) {
      setError("Please upload a video file (MP4, MOV, WebM, etc.)");
      return;
    }
    if (f.size > 200 * 1024 * 1024) {
      setError("File size must be under 200MB.");
      return;
    }
    setError(null);
    setFile(f);
    setReport(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    handleFile(e.dataTransfer.files[0]);
  };

  const analyse = async () => {
    setUploading(true);
    setError(null);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setUploading(false);
    setAnalysing(true);

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an executive communication coach with 20+ years of experience in broadcast media and corporate training.

A client has submitted a video for analysis. Analyse the following dimensions from the video content and generate a comprehensive coaching report:

1. VERBAL CLARITY — articulation, pace, filler words, sentence structure
2. TONE — warmth, authority, confidence, emotional register
3. BODY LANGUAGE — posture, gestures, eye contact, facial expression, physical presence
4. OVERALL PRESENCE — executive presence, engagement, credibility

For each dimension, give:
- A score out of 10
- 2-3 specific strengths observed
- 2-3 specific, actionable improvement suggestions

Also provide:
- An "overall_score" (average across 4 dimensions)
- A "headline" (one powerful coaching insight, max 15 words)
- A "priority_action" (the single most impactful thing to work on next)

Be constructive, specific, and encouraging. Reference real observable behaviours.`,
      file_urls: [file_url],
      model: "claude_sonnet_4_6",
      response_json_schema: {
        type: "object",
        properties: {
          headline: { type: "string" },
          overall_score: { type: "number" },
          priority_action: { type: "string" },
          verbal_clarity: {
            type: "object",
            properties: {
              score: { type: "number" },
              strengths: { type: "array", items: { type: "string" } },
              improvements: { type: "array", items: { type: "string" } }
            }
          },
          tone: {
            type: "object",
            properties: {
              score: { type: "number" },
              strengths: { type: "array", items: { type: "string" } },
              improvements: { type: "array", items: { type: "string" } }
            }
          },
          body_language: {
            type: "object",
            properties: {
              score: { type: "number" },
              strengths: { type: "array", items: { type: "string" } },
              improvements: { type: "array", items: { type: "string" } }
            }
          },
          overall_presence: {
            type: "object",
            properties: {
              score: { type: "number" },
              strengths: { type: "array", items: { type: "string" } },
              improvements: { type: "array", items: { type: "string" } }
            }
          }
        }
      }
    });

    setReport(result);
    setAnalysing(false);

    // Save as a coaching session
    await base44.entities.CoachingSession.create({
      title: `Video Analysis — ${file.name}`,
      session_type: "verbal_communication",
      score: result.overall_score,
      strengths: [
        ...(result.verbal_clarity?.strengths || []),
        ...(result.tone?.strengths || []),
      ],
      improvements: [
        ...(result.verbal_clarity?.improvements || []),
        ...(result.body_language?.improvements || []),
      ],
      ai_feedback: result.priority_action,
      status: "reviewed",
    });
  };

  const reset = () => {
    setFile(null);
    setReport(null);
    setError(null);
  };

  const dimensions = report ? [
    { key: "verbal_clarity", label: "Verbal Clarity" },
    { key: "tone", label: "Tone & Voice" },
    { key: "body_language", label: "Body Language" },
    { key: "overall_presence", label: "Executive Presence" },
  ] : [];

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div>
        <h2 className="font-cormorant text-3xl font-light text-foreground mb-1">Video Analysis</h2>
        <p className="font-inter text-sm text-muted-foreground">
          Upload a video of yourself presenting, speaking, or in a meeting. Our AI coach will analyse your verbal clarity, tone, and body language.
        </p>
      </div>

      {/* Upload zone */}
      {!report && (
        <div
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => !file && inputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-10 text-center transition-colors cursor-pointer ${file ? "border-primary/60 bg-primary/5" : "border-border hover:border-primary/40 hover:bg-secondary/30"}`}
        >
          <input ref={inputRef} type="file" accept="video/*" className="hidden" onChange={e => handleFile(e.target.files[0])} />

          {!file ? (
            <div className="space-y-3">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto">
                <Upload className="w-7 h-7 text-primary" />
              </div>
              <div>
                <p className="font-inter text-base font-medium text-foreground">Drop your video here</p>
                <p className="font-inter text-sm text-muted-foreground mt-1">or click to browse · MP4, MOV, WebM · Max 200MB</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto">
                <Video className="w-7 h-7 text-primary" />
              </div>
              <div>
                <p className="font-inter text-base font-medium text-foreground">{file.name}</p>
                <p className="font-inter text-sm text-muted-foreground">{(file.size / (1024 * 1024)).toFixed(1)} MB</p>
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-destructive font-inter text-sm bg-destructive/10 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {file && !report && (
        <div className="flex gap-3">
          <Button className="rounded-full flex-1" size="lg" onClick={analyse} disabled={uploading || analysing}>
            {uploading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Uploading video…</> :
             analysing ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Analysing with AI…</> :
             "Analyse Video"}
          </Button>
          <Button variant="outline" className="rounded-full" onClick={reset}>Clear</Button>
        </div>
      )}

      {(uploading || analysing) && (
        <div className="text-center font-inter text-sm text-muted-foreground py-4 space-y-1">
          <p>{uploading ? "Uploading your video securely…" : "AI is analysing verbal clarity, tone, and body language…"}</p>
          <p className="text-xs">This may take 30–60 seconds</p>
        </div>
      )}

      {/* Report */}
      {report && (
        <div className="space-y-6">
          {/* Headline */}
          <div className="bg-foreground rounded-2xl p-7 text-background space-y-2">
            <div className="font-inter text-xs tracking-widest uppercase text-background/50">Coaching Insight</div>
            <p className="font-cormorant text-2xl font-light leading-snug">"{report.headline}"</p>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-12 h-12 rounded-full bg-primary/80 flex items-center justify-center">
                <span className="font-cormorant text-xl font-medium text-white">{report.overall_score}</span>
              </div>
              <div>
                <p className="font-inter text-xs text-background/50">Overall Score</p>
                <p className="font-inter text-sm font-medium text-background">out of 10</p>
              </div>
            </div>
          </div>

          {/* Priority Action */}
          <div className="bg-primary/10 border border-primary/30 rounded-2xl p-5">
            <p className="font-inter text-xs font-medium text-primary uppercase tracking-widest mb-1">Priority Action</p>
            <p className="font-inter text-sm text-foreground">{report.priority_action}</p>
          </div>

          {/* Score bars */}
          <div className="bg-card rounded-2xl border border-border p-6 space-y-5">
            <h3 className="font-cormorant text-xl font-medium text-foreground">Scores by Dimension</h3>
            {dimensions.map(d => report[d.key] && (
              <ScoreBar key={d.key} label={d.label} score={report[d.key].score} />
            ))}
          </div>

          {/* Dimension details */}
          <div className="grid sm:grid-cols-2 gap-4">
            {dimensions.map(d => {
              const dim = report[d.key];
              if (!dim) return null;
              return (
                <div key={d.key} className="bg-card rounded-2xl border border-border p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-cormorant text-lg font-medium text-foreground">{d.label}</h4>
                    <span className="font-cormorant text-2xl font-medium text-primary">{dim.score}</span>
                  </div>
                  {dim.strengths?.length > 0 && (
                    <div>
                      <p className="font-inter text-xs font-medium text-green-700 uppercase tracking-widest mb-1.5">Strengths</p>
                      <ul className="space-y-1">
                        {dim.strengths.map((s, i) => <li key={i} className="font-inter text-xs text-muted-foreground flex gap-2"><span className="text-green-600 mt-0.5">✓</span>{s}</li>)}
                      </ul>
                    </div>
                  )}
                  {dim.improvements?.length > 0 && (
                    <div>
                      <p className="font-inter text-xs font-medium text-primary uppercase tracking-widest mb-1.5">Improve</p>
                      <ul className="space-y-1">
                        {dim.improvements.map((s, i) => <li key={i} className="font-inter text-xs text-muted-foreground flex gap-2"><span className="text-primary mt-0.5">→</span>{s}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex gap-3">
            <Button className="rounded-full flex-1" variant="outline" onClick={reset}>
              <RefreshCw className="w-4 h-4 mr-2" /> Analyse Another Video
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}