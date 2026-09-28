import { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Upload, Mic, Loader2, CheckCircle, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";

const GOLD = "#B8952A";
const FOREST = "#2C3B2D";

const ratingColor = (r) => {
  const s = (r || "").toLowerCase();
  if (s.includes("excellent") || s.includes("well") || s.includes("good") || s.includes("strong")) return "text-green-700 bg-green-50";
  if (s.includes("moderate") || s.includes("average") || s.includes("fair")) return "text-amber-700 bg-amber-50";
  return "text-red-700 bg-red-50";
};

function ScoreRing({ score }) {
  const pct = Math.round((score / 10) * 100);
  const r = 36, circ = 2 * Math.PI * r;
  const color = score >= 7.5 ? "#15803d" : score >= 5 ? "#b45309" : "#b91c1c";
  return (
    <div className="relative flex items-center justify-center w-24 h-24">
      <svg width="96" height="96" className="-rotate-90">
        <circle cx="48" cy="48" r={r} stroke="#e5e7eb" strokeWidth="8" fill="none" />
        <circle cx="48" cy="48" r={r} stroke={color} strokeWidth="8" fill="none"
          strokeDasharray={circ} strokeDashoffset={circ * (1 - pct / 100)} strokeLinecap="round" />
      </svg>
      <div className="absolute text-center">
        <div className="font-cormorant text-2xl font-semibold" style={{ color }}>{score}</div>
        <div className="font-inter text-[10px] text-muted-foreground">/10</div>
      </div>
    </div>
  );
}

function DimensionCard({ title, data }) {
  return (
    <div className="bg-card rounded-xl border border-border p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-cormorant text-base font-medium text-foreground">{title}</span>
        {data?.rating && (
          <span className={`font-inter text-xs px-2.5 py-0.5 rounded-full font-medium ${ratingColor(data.rating)}`}>
            {data.rating}
          </span>
        )}
      </div>
      <p className="font-inter text-xs text-muted-foreground leading-relaxed">{data?.feedback}</p>
    </div>
  );
}

export default function SpeechAnalyser() {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | uploading | analysing | done | error
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [showTranscript, setShowTranscript] = useState(false);
  const inputRef = useRef();

  const handleFile = (f) => {
    if (!f) return;
    const allowed = ["audio/ogg", "audio/mpeg", "audio/wav", "audio/webm", "audio/mp4", "audio/m4a", "audio/flac", "video/mp4"];
    if (!allowed.includes(f.type) && !f.name.match(/\.(ogg|mp3|wav|webm|m4a|mp4|flac)$/i)) {
      setError("Unsupported format. Please upload an mp3, wav, m4a, ogg, webm or flac file.");
      return;
    }
    if (f.size > 25 * 1024 * 1024) {
      setError("File too large. Maximum 25 MB.");
      return;
    }
    setFile(f);
    setError("");
    setResult(null);
    setStatus("idle");
  };

  const handleDrop = (e) => {
    e.preventDefault();
    handleFile(e.dataTransfer.files[0]);
  };

  const analyse = async () => {
    if (!file) return;
    setStatus("uploading");
    setError("");
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setStatus("analysing");
      const res = await base44.functions.invoke("analyseSpeech", { audio_url: file_url });
      setResult(res.data);
      setStatus("done");
    } catch (e) {
      setError(e?.response?.data?.error || e.message || "Something went wrong. Please try again.");
      setStatus("error");
    }
  };

  const reset = () => { setFile(null); setResult(null); setStatus("idle"); setError(""); setShowTranscript(false); };

  return (
    <div className="bg-card rounded-2xl border border-border p-6 space-y-5">
      <div>
        <h2 className="font-cormorant text-xl font-medium text-foreground flex items-center gap-2">
          <Mic className="w-4 h-4" style={{ color: GOLD }} /> Speech Analysis
        </h2>
        <p className="font-inter text-xs text-muted-foreground mt-1">
          Upload a practice recording and get instant AI feedback on pace, clarity and filler word usage.
        </p>
      </div>

      {status === "idle" || status === "error" ? (
        <>
          {/* Drop zone */}
          <div
            className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => inputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
          >
            <input ref={inputRef} type="file" accept=".mp3,.wav,.m4a,.ogg,.webm,.flac,.mp4" className="hidden"
              onChange={e => handleFile(e.target.files[0])} />
            <Upload className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
            {file ? (
              <p className="font-inter text-sm font-medium text-foreground">{file.name}</p>
            ) : (
              <>
                <p className="font-inter text-sm text-muted-foreground">Drop your audio file here, or <span className="underline" style={{ color: GOLD }}>browse</span></p>
                <p className="font-inter text-xs text-muted-foreground mt-1">MP3, WAV, M4A, OGG, WEBM, FLAC · Max 25 MB</p>
              </>
            )}
          </div>

          {error && (
            <div className="flex items-start gap-2 text-red-600 bg-red-50 rounded-xl p-3">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <p className="font-inter text-xs">{error}</p>
            </div>
          )}

          <Button onClick={analyse} disabled={!file} className="w-full rounded-full font-inter"
            style={{ backgroundColor: FOREST, color: "#F5F0E0" }}>
            Analyse Recording
          </Button>
        </>
      ) : status === "uploading" || status === "analysing" ? (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: GOLD }} />
          <p className="font-inter text-sm text-muted-foreground">
            {status === "uploading" ? "Uploading your recording…" : "Analysing your speech with AI…"}
          </p>
        </div>
      ) : status === "done" && result?.analysis ? (
        <div className="space-y-5">
          {/* Header row */}
          <div className="flex items-center gap-5 p-4 bg-secondary/40 rounded-xl">
            <ScoreRing score={result.analysis.overall_score} />
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                <span className="font-inter text-xs font-medium text-green-700">Analysis complete</span>
              </div>
              <p className="font-inter text-sm text-foreground leading-relaxed">{result.analysis.summary}</p>
            </div>
          </div>

          {/* Dimensions */}
          <div className="grid sm:grid-cols-3 gap-3">
            <DimensionCard title="Pace" data={result.analysis.pace} />
            <DimensionCard title="Clarity" data={result.analysis.clarity} />
            <div className="bg-card rounded-xl border border-border p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-cormorant text-base font-medium text-foreground">Filler Words</span>
                <span className="font-inter text-xs px-2.5 py-0.5 rounded-full font-medium bg-amber-50 text-amber-700">
                  {result.analysis.filler_words?.total_count ?? 0} total
                </span>
              </div>
              {result.analysis.filler_words?.breakdown?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {result.analysis.filler_words.breakdown.map((fw, i) => (
                    <span key={i} className="font-inter text-xs bg-secondary px-2 py-0.5 rounded-full text-muted-foreground">
                      "{fw.word}" ×{fw.count}
                    </span>
                  ))}
                </div>
              )}
              <p className="font-inter text-xs text-muted-foreground leading-relaxed">{result.analysis.filler_words?.feedback}</p>
            </div>
          </div>

          {/* Strengths & improvements */}
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="bg-green-50 rounded-xl border border-green-100 p-4 space-y-2">
              <p className="font-inter text-xs font-semibold text-green-800 uppercase tracking-wide">Strengths</p>
              <ul className="space-y-1.5">
                {(result.analysis.strengths || []).map((s, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-green-600" />
                    <span className="font-inter text-xs text-green-900">{s}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-amber-50 rounded-xl border border-amber-100 p-4 space-y-2">
              <p className="font-inter text-xs font-semibold text-amber-800 uppercase tracking-wide">Action Points</p>
              <ol className="space-y-1.5">
                {(result.analysis.improvements || []).map((s, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="font-inter text-xs font-bold text-amber-500 shrink-0">{i + 1}.</span>
                    <span className="font-inter text-xs text-amber-900">{s}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          {/* Transcript toggle */}
          <div className="rounded-xl border border-border overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-4 py-3 bg-secondary/30 hover:bg-secondary/50 transition-colors"
              onClick={() => setShowTranscript(!showTranscript)}
            >
              <span className="font-inter text-xs font-medium text-foreground">View Transcript</span>
              {showTranscript ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>
            {showTranscript && (
              <div className="px-4 py-3 bg-background">
                <p className="font-inter text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">{result.transcript}</p>
              </div>
            )}
          </div>

          <Button variant="outline" onClick={reset} size="sm" className="rounded-full font-inter w-full">
            Analyse Another Recording
          </Button>
        </div>
      ) : null}
    </div>
  );
}