import { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import {
  Sparkles, Mic, MicOff, Upload, FileAudio, X,
  Radio, StopCircle, RotateCcw, Activity
} from "lucide-react";
import FeedbackCard from "./FeedbackCard";

const GOLD = "#B8952A";
const FOREST = "#2C3B2D";

// ── Sentiment bar helper ──────────────────────────────────────────────────────
function SentimentBar({ label, value, color }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between font-inter text-xs text-muted-foreground">
        <span>{label}</span>
        <span className="font-medium text-foreground">{value}%</span>
      </div>
      <div className="h-2 rounded-full bg-secondary overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${value}%`, background: color }} />
      </div>
    </div>
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

// ── Recording timer ───────────────────────────────────────────────────────────
function useTimer(active) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!active) { setSeconds(0); return; }
    const id = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [active]);
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

// ── Main component ────────────────────────────────────────────────────────────
export default function SpeechAnalyser() {
  const [mode, setMode] = useState("record"); // "record" | "upload" | "text"
  const [recording, setRecording] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [pastedText, setPastedText] = useState("");
  const [transcript, setTranscript] = useState("");
  const [loadingStep, setLoadingStep] = useState(""); // "" | "transcribing" | "analysing"
  const [result, setResult] = useState(null);
  const fileRef = useRef();
  const mediaRef = useRef(null);
  const chunksRef = useRef([]);
  const timer = useTimer(recording);

  // ── Live recording ──────────────────────────────────────────────────────────
  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
    chunksRef.current = [];
    recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      const file = new File([blob], `recording-${Date.now()}.webm`, { type: "audio/webm" });
      setUploadedFile(file);
      stream.getTracks().forEach(t => t.stop());
    };
    mediaRef.current = recorder;
    recorder.start(250);
    setRecording(true);
  };

  const stopRecording = () => {
    mediaRef.current?.stop();
    setRecording(false);
  };

  // ── Transcribe (upload or recorded blob) ──────────────────────────────────
  const transcribeFile = async (file) => {
    setLoadingStep("transcribing");
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const text = await base44.integrations.Core.TranscribeAudio({ audio_url: file_url });
    return typeof text === "string" ? text : (text?.text || JSON.stringify(text));
  };

  // ── Full analysis pipeline ─────────────────────────────────────────────────
  const analyse = async () => {
    let text = "";

    if (mode === "text") {
      text = pastedText;
    } else if (mode === "record" || mode === "upload") {
      if (!uploadedFile) return;
      text = await transcribeFile(uploadedFile);
      setTranscript(text);
    }

    if (!text.trim()) { setLoadingStep(""); return; }

    setLoadingStep("analysing");

    // Pass 1 — speech quality (pacing, fillers, tone)
    const speechRes = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an expert speech coach with broadcast experience. Analyse this speech transcript for delivery quality.

Transcript: "${text}"

Evaluate: pacing, filler words (um, uh, like, you know, basically, actually, literally), tone and vocal authority, clarity, openings/closings, sentence rhythm.

Respond in JSON: { "score": number (1-10), "tone_assessment": string, "vocal_authority": string, "filler_words": [{"word": string, "count": number}], "pacing_notes": string, "strengths": string[], "improvements": string[], "rewritten_opening": string, "rewritten_closing": string, "summary": string }`,
      response_json_schema: {
        type: "object",
        properties: {
          score: { type: "number" },
          tone_assessment: { type: "string" },
          vocal_authority: { type: "string" },
          filler_words: { type: "array", items: { type: "object" } },
          pacing_notes: { type: "string" },
          strengths: { type: "array", items: { type: "string" } },
          improvements: { type: "array", items: { type: "string" } },
          rewritten_opening: { type: "string" },
          rewritten_closing: { type: "string" },
          summary: { type: "string" },
        },
      },
    });

    // Pass 2 — sentiment & clarity deep-dive
    const sentRes = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a communication psychologist. Analyse this spoken text for emotional sentiment and linguistic clarity.

Text: "${text}"

Return JSON with:
- sentiment_label: one of "Confident", "Anxious", "Authoritative", "Hesitant", "Enthusiastic", "Neutral"
- sentiment_scores: { confidence: 0-100, positivity: 0-100, energy: 0-100, authority: 0-100 }
- clarity_score: number 1-10
- clarity_notes: string explaining what drives the score
- emotional_tone: string (2-3 sentences describing the emotional texture)
- key_phrases: string[] (3-5 most impactful phrases from the text)
- word_count: number
- avg_sentence_length: number
- readability: "Simple" | "Moderate" | "Complex"`,
      response_json_schema: {
        type: "object",
        properties: {
          sentiment_label: { type: "string" },
          sentiment_scores: { type: "object" },
          clarity_score: { type: "number" },
          clarity_notes: { type: "string" },
          emotional_tone: { type: "string" },
          key_phrases: { type: "array", items: { type: "string" } },
          word_count: { type: "number" },
          avg_sentence_length: { type: "number" },
          readability: { type: "string" },
        },
      },
    });

    const combined = { ...speechRes, ...sentRes, transcript: text };

    // Save to CoachingSession
    try {
      await base44.entities.CoachingSession.create({
        title: uploadedFile ? `Voice Recording: ${uploadedFile.name}` : "Speech Analysis",
        session_type: "verbal_communication",
        submitted_text: text.slice(0, 2000),
        ai_feedback: speechRes.summary || "",
        score: speechRes.score,
        strengths: speechRes.strengths || [],
        improvements: speechRes.improvements || [],
        status: "reviewed",
      });
    } catch (_) {}

    setResult(combined);
    setLoadingStep("");
  };

  const reset = () => {
    setResult(null);
    setTranscript("");
    setUploadedFile(null);
    setPastedText("");
    setLoadingStep("");
    setRecording(false);
  };

  const sentColors = { confidence: "#2C3B2D", positivity: "#B8952A", energy: "#E07B39", authority: "#4A6741" };
  const isLoading = loadingStep !== "";

  // ── Result view ─────────────────────────────────────────────────────────────
  if (result) return (
    <FeedbackCard title="Voice & Speech Analysis Report" result={result} onReset={reset}>

      {/* Transcript panel */}
      {result.transcript && (
        <div className="bg-secondary/30 rounded-2xl p-5 border border-border">
          <div className="font-inter text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2 flex items-center gap-1.5">
            <Radio className="w-3 h-3" /> Transcript
          </div>
          <p className="font-inter text-sm text-foreground leading-relaxed italic">"{result.transcript}"</p>
        </div>
      )}

      {/* Sentiment + Clarity row */}
      <div className="grid sm:grid-cols-2 gap-5">
        {/* Sentiment */}
        <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="font-inter text-xs uppercase tracking-wider text-muted-foreground font-medium">Sentiment</div>
            <span className="font-inter text-xs font-semibold px-3 py-1 rounded-full border"
              style={{ borderColor: GOLD + "50", color: GOLD, backgroundColor: GOLD + "15" }}>
              {result.sentiment_label}
            </span>
          </div>
          {result.sentiment_scores && Object.entries(result.sentiment_scores).map(([k, v]) => (
            <SentimentBar key={k} label={k.charAt(0).toUpperCase() + k.slice(1)} value={v} color={sentColors[k] || GOLD} />
          ))}
        </div>

        {/* Clarity */}
        <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="font-inter text-xs uppercase tracking-wider text-muted-foreground font-medium">Clarity</div>
            <div className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5" style={{ color: GOLD }} />
              <span className="font-cormorant text-xl font-medium text-foreground">{result.clarity_score}/10</span>
            </div>
          </div>
          <p className="font-inter text-sm text-muted-foreground leading-relaxed">{result.clarity_notes}</p>
          <div className="grid grid-cols-3 gap-2 pt-1">
            {[
              { label: "Words", value: result.word_count },
              { label: "Avg Sent.", value: result.avg_sentence_length ? `${result.avg_sentence_length}w` : "—" },
              { label: "Level", value: result.readability },
            ].map(({ label, value }) => (
              <div key={label} className="bg-secondary/40 rounded-xl p-2.5 text-center">
                <div className="font-cormorant text-base font-medium text-foreground">{value ?? "—"}</div>
                <div className="font-inter text-[10px] text-muted-foreground">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Emotional tone */}
      {result.emotional_tone && (
        <div className="bg-primary/5 rounded-2xl p-5 border border-primary/10">
          <div className="font-inter text-xs uppercase tracking-wider text-primary font-medium mb-2">Emotional Texture</div>
          <p className="font-inter text-sm text-foreground leading-relaxed">{result.emotional_tone}</p>
        </div>
      )}

      {/* Key phrases */}
      {result.key_phrases?.length > 0 && (
        <div className="space-y-2">
          <div className="font-inter text-xs uppercase tracking-wider text-muted-foreground font-medium">Key Phrases</div>
          <div className="flex flex-wrap gap-2">
            {result.key_phrases.map((p, i) => (
              <span key={i} className="font-inter text-xs px-3 py-1.5 rounded-full border"
                style={{ borderColor: GOLD + "40", color: FOREST, backgroundColor: GOLD + "12" }}>
                "{p}"
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Delivery metrics */}
      <div className="grid sm:grid-cols-2 gap-4">
        {result.pacing_notes && <InfoBlock label="Pacing" value={result.pacing_notes} />}
        {result.tone_assessment && <InfoBlock label="Tone" value={result.tone_assessment} />}
        {result.vocal_authority && <InfoBlock label="Vocal Authority" value={result.vocal_authority} />}
      </div>

      {/* Filler words */}
      {result.filler_words?.length > 0 && (
        <div className="space-y-2">
          <div className="font-inter text-xs uppercase tracking-wider text-destructive font-medium">Filler Words Detected</div>
          <div className="flex flex-wrap gap-2">
            {result.filler_words.map((f, i) => (
              <span key={i} className="bg-destructive/10 text-destructive text-xs font-inter px-3 py-1.5 rounded-full border border-destructive/20">
                "{f.word}" × {f.count}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Rewrites */}
      {result.rewritten_opening && (
        <div className="bg-primary/10 rounded-2xl p-5 border border-primary/20">
          <div className="font-inter text-xs uppercase tracking-wider text-primary font-medium mb-2">Elevated Opening</div>
          <p className="font-cormorant text-lg italic text-foreground">"{result.rewritten_opening}"</p>
        </div>
      )}
      {result.rewritten_closing && (
        <div className="bg-primary/10 rounded-2xl p-5 border border-primary/20">
          <div className="font-inter text-xs uppercase tracking-wider text-primary font-medium mb-2">Elevated Closing</div>
          <p className="font-cormorant text-lg italic text-foreground">"{result.rewritten_closing}"</p>
        </div>
      )}

      <p className="font-inter text-xs text-muted-foreground text-center">✓ Report saved to your Performance Dashboard</p>
    </FeedbackCard>
  );

  // ── Input view ──────────────────────────────────────────────────────────────
  return (
    <div className="bg-card rounded-3xl border border-border p-8 space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
          <Mic className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="font-cormorant text-2xl font-medium text-foreground">Voice & Speech Analysis</h2>
          <p className="font-inter text-sm text-muted-foreground">Record live · Upload audio · Paste transcript</p>
        </div>
      </div>

      {/* Mode tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-secondary/50">
        {[
          { id: "record", label: "Record Live", icon: Mic },
          { id: "upload", label: "Upload File", icon: Upload },
          { id: "text",   label: "Paste Text",  icon: Radio },
        ].map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => { setMode(id); setUploadedFile(null); setPastedText(""); }}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg font-inter text-sm transition-all"
            style={{
              backgroundColor: mode === id ? "white" : "transparent",
              color: mode === id ? FOREST : "#888",
              boxShadow: mode === id ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
            }}>
            <Icon className="w-3.5 h-3.5" /> {label}
          </button>
        ))}
      </div>

      {/* Record mode */}
      {mode === "record" && (
        <div className="space-y-4">
          <div className="flex flex-col items-center gap-4 py-6">
            {!recording && !uploadedFile && (
              <>
                <button onClick={startRecording}
                  className="w-20 h-20 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-lg"
                  style={{ background: FOREST }}>
                  <Mic className="w-8 h-8 text-white" />
                </button>
                <p className="font-inter text-sm text-muted-foreground">Tap to start recording</p>
              </>
            )}
            {recording && (
              <>
                <button onClick={stopRecording}
                  className="w-20 h-20 rounded-full flex items-center justify-center transition-all hover:scale-105 shadow-lg animate-pulse"
                  style={{ background: "#DC2626" }}>
                  <StopCircle className="w-8 h-8 text-white" />
                </button>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="font-inter text-sm font-medium text-foreground">{timer}</span>
                  <span className="font-inter text-xs text-muted-foreground">recording…</span>
                </div>
              </>
            )}
            {!recording && uploadedFile && (
              <div className="w-full flex items-center gap-4 p-4 rounded-2xl border border-border bg-secondary/30">
                <FileAudio className="w-8 h-8 shrink-0" style={{ color: GOLD }} />
                <div className="flex-1 min-w-0">
                  <p className="font-inter text-sm font-medium text-foreground truncate">{uploadedFile.name}</p>
                  <p className="font-inter text-xs text-muted-foreground">
                    {(uploadedFile.size / 1024).toFixed(0)} KB · ready to analyse
                  </p>
                </div>
                <button onClick={() => setUploadedFile(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Upload mode */}
      {mode === "upload" && (
        <div>
          <input ref={fileRef} type="file" accept="audio/*,video/*" className="hidden" onChange={e => setUploadedFile(e.target.files[0])} />
          {!uploadedFile ? (
            <button onClick={() => fileRef.current.click()}
              className="w-full border-2 border-dashed rounded-2xl p-10 text-center transition-colors hover:border-primary/50"
              style={{ borderColor: GOLD + "40" }}>
              <Upload className="w-8 h-8 mx-auto mb-3" style={{ color: GOLD }} />
              <p className="font-cormorant text-xl text-foreground mb-1">Upload Audio or Video</p>
              <p className="font-inter text-xs text-muted-foreground">MP3, MP4, WAV, M4A, OGG, WebM · max 25MB</p>
            </button>
          ) : (
            <div className="flex items-center gap-4 p-4 rounded-2xl border border-border bg-secondary/30">
              <FileAudio className="w-8 h-8 shrink-0" style={{ color: GOLD }} />
              <div className="flex-1 min-w-0">
                <p className="font-inter text-sm font-medium text-foreground truncate">{uploadedFile.name}</p>
                <p className="font-inter text-xs text-muted-foreground">{(uploadedFile.size / 1024 / 1024).toFixed(1)} MB</p>
              </div>
              <button onClick={() => setUploadedFile(null)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Text / transcript mode */}
      {mode === "text" && (
        <textarea
          value={pastedText}
          onChange={e => setPastedText(e.target.value)}
          placeholder="Paste your speech transcript here for sentiment and clarity analysis…"
          rows={10}
          className="w-full rounded-xl border border-border bg-background px-4 py-3 font-inter text-sm text-foreground placeholder:text-muted-foreground focus:outline-none resize-none"
        />
      )}

      {/* Loading state steps */}
      {isLoading && (
        <div className="flex items-center justify-center gap-3 py-2 text-muted-foreground">
          <Sparkles className="w-4 h-4 animate-pulse" style={{ color: GOLD }} />
          <span className="font-inter text-sm">
            {loadingStep === "transcribing" ? "Transcribing your audio…" : "Analysing speech, sentiment & clarity…"}
          </span>
        </div>
      )}

      {/* Transcript preview (before full result) */}
      {transcript && !result && (
        <div className="bg-secondary/30 rounded-2xl p-4 border border-border">
          <div className="font-inter text-xs uppercase tracking-wider text-muted-foreground mb-1.5">Transcript Preview</div>
          <p className="font-inter text-sm text-foreground leading-relaxed italic">"{transcript.slice(0, 300)}{transcript.length > 300 ? "…" : ""}"</p>
        </div>
      )}

      <Button
        onClick={analyse}
        disabled={isLoading || (mode === "text" ? !pastedText.trim() : !uploadedFile)}
        className="w-full rounded-full"
        size="lg">
        {isLoading
          ? <span className="flex gap-2 items-center"><Sparkles className="w-4 h-4 animate-pulse" />
              {loadingStep === "transcribing" ? "Transcribing…" : "Analysing…"}
            </span>
          : <span className="flex gap-2 items-center"><Sparkles className="w-4 h-4" />
              {mode === "text" ? "Analyse Transcript" : "Transcribe & Analyse"}
            </span>}
      </Button>
    </div>
  );
}