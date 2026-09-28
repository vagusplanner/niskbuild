import { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Send, RotateCcw, ChevronRight, Mic, MicOff, TrendingUp, AlertCircle, CheckCircle } from "lucide-react";

const GOLD = "#B8952A";
const FOREST = "#2C3B2D";

const scenarios = [
  {
    id: "salary",
    label: "Salary Negotiation",
    emoji: "💼",
    persona: "a firm but fair HR Director conducting a salary review meeting",
    context: "The executive is negotiating a significant pay increase. The HR Director will probe justification, market data, and push back on demands.",
    tips: ["Lead with value delivered, not need", "Anchor high with a specific number", "Stay calm under pressure"],
  },
  {
    id: "board",
    label: "Board Q&A",
    emoji: "🏛️",
    persona: "a challenging board member asking tough questions about strategy and performance",
    context: "Presenting quarterly results to a sceptical board. The board member will probe assumptions, challenge numbers, and test strategic thinking.",
    tips: ["Lead with the headline, not the detail", "Own bad news directly", "Bridge to future outlook"],
  },
  {
    id: "media",
    label: "Media Interview",
    emoji: "🎙️",
    persona: "a sharp investigative journalist conducting a live press interview",
    context: "A high-stakes media interview. The journalist will probe, redirect, challenge, and try to put words in your mouth.",
    tips: ["Bridge back to your key messages", "Never repeat a negative", "Pause before answering"],
  },
  {
    id: "investor",
    label: "Investor Pitch",
    emoji: "📈",
    persona: "a sceptical venture capitalist evaluating your pitch",
    context: "Pitching for Series A investment. The investor is analytical, questions every assumption, and tests depth of knowledge.",
    tips: ["Know your numbers cold", "Acknowledge risks proactively", "Show passion, not desperation"],
  },
  {
    id: "crisis",
    label: "Crisis Press Briefing",
    emoji: "🚨",
    persona: "a hostile journalist at a crisis press conference",
    context: "Your organisation is facing a public crisis. The journalist will be aggressive, try to corner you, and seek admissions.",
    tips: ["Express empathy first", "Stick to verified facts only", "Commit to follow-up, not speculation"],
  },
  {
    id: "interview",
    label: "Executive Job Interview",
    emoji: "👔",
    persona: "a senior executive interviewer probing leadership capability and cultural fit",
    context: "Interviewing for a C-suite role. Questions will test leadership philosophy, judgment under pressure, and vision.",
    tips: ["Use the STAR structure", "Show self-awareness in failures", "Ask strategic questions at the end"],
  },
];

// Inline feedback chip shown after each user response
function FeedbackChip({ feedback }) {
  if (!feedback) return null;
  const icon = feedback.rating === "strong"
    ? <CheckCircle className="w-3 h-3 text-green-600" />
    : feedback.rating === "weak"
      ? <AlertCircle className="w-3 h-3 text-red-500" />
      : <TrendingUp className="w-3 h-3" style={{ color: GOLD }} />;

  const bg = feedback.rating === "strong"
    ? "bg-green-50 border-green-200 text-green-800"
    : feedback.rating === "weak"
      ? "bg-red-50 border-red-200 text-red-800"
      : "border-amber-200 text-amber-800";

  return (
    <div className={`flex items-start gap-2 mt-2 mx-2 px-3 py-2 rounded-xl border text-xs font-inter ${bg} max-w-[85%] ml-auto`}
      style={feedback.rating === "average" ? { backgroundColor: GOLD + "12" } : {}}>
      <span className="shrink-0 mt-0.5">{icon}</span>
      <span className="leading-relaxed">{feedback.tip}</span>
    </div>
  );
}

export default function RolePlay() {
  const [scenario, setScenario] = useState(null);
  const [messages, setMessages] = useState([]); // { role, content, feedback? }
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [fetchingFeedback, setFetchingFeedback] = useState(false);
  const [scores, setScores] = useState([]); // per-turn scores
  const [recording, setRecording] = useState(false);
  const bottomRef = useRef(null);
  const mediaRef = useRef(null);
  const chunksRef = useRef([]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  const startScenario = async (s) => {
    setScenario(s);
    setFeedback(null);
    setScores([]);
    setLoading(true);
    const opening = await base44.integrations.Core.InvokeLLM({
      prompt: `You are ${s.persona}. Context: ${s.context}\n\nOpen the conversation with a challenging first question or statement. Be direct, realistic, and stay in character. Keep it to 2-3 sentences maximum.`,
    });
    setMessages([{ role: "assistant", content: typeof opening === "string" ? opening : opening?.text || "" }]);
    setLoading(false);
  };

  // ── Live voice input ────────────────────────────────────────────────────────
  const startVoice = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
    chunksRef.current = [];
    recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    recorder.onstop = async () => {
      stream.getTracks().forEach(t => t.stop());
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      const file = new File([blob], "response.webm", { type: "audio/webm" });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const transcript = await base44.integrations.Core.TranscribeAudio({ audio_url: file_url });
      const text = typeof transcript === "string" ? transcript : "";
      if (text.trim()) setInput(text.trim());
    };
    mediaRef.current = recorder;
    recorder.start(250);
    setRecording(true);
  };

  const stopVoice = () => {
    mediaRef.current?.stop();
    setRecording(false);
  };

  // ── Send response + get AI reply + instant micro-feedback ──────────────────
  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");

    // Optimistically add user message (no feedback yet)
    const newMessages = [...messages, { role: "user", content: userMsg }];
    setMessages(newMessages);
    setLoading(true);

    const history = newMessages.map(m => `${m.role === "user" ? "Executive" : scenario.label}: ${m.content}`).join("\n");

    // Run AI reply + micro-feedback in parallel
    const [replyRes, microRes] = await Promise.all([
      base44.integrations.Core.InvokeLLM({
        prompt: `You are ${scenario.persona}. Context: ${scenario.context}\n\nConversation:\n${history}\n\nRespond in character. Be challenging, realistic, push back on weak answers, reward strong ones. 2-3 sentences only.`,
      }),
      base44.integrations.Core.InvokeLLM({
        prompt: `You are an executive communication coach watching this role-play live. The scenario is: "${scenario.label}". 

The executive just said: "${userMsg}"

Give instant micro-feedback on ONLY this one response. Be specific and brief (1 sentence max).
Respond in JSON: { "rating": "strong"|"average"|"weak", "tip": string, "score": number 1-10 }`,
        response_json_schema: {
          type: "object",
          properties: {
            rating: { type: "string" },
            tip: { type: "string" },
            score: { type: "number" },
          },
        },
      }),
    ]);

    const reply = typeof replyRes === "string" ? replyRes : replyRes?.text || "";
    setScores(prev => [...prev, microRes?.score || 5]);

    // Attach feedback to the user message
    setMessages(prev => [
      ...prev.slice(0, -1),
      { role: "user", content: userMsg, feedback: microRes },
      { role: "assistant", content: reply },
    ]);
    setLoading(false);
  };

  // ── Final comprehensive feedback ───────────────────────────────────────────
  const getFeedback = async () => {
    setFetchingFeedback(true);
    const history = messages.map(m => `${m.role === "user" ? "Executive" : scenario.label}: ${m.content}`).join("\n");
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an expert executive communication coach. Review this full role-play and provide coaching feedback on the Executive's performance.

Scenario: ${scenario.label}
Conversation:
${history}

Provide comprehensive, actionable feedback in JSON:
{
  "overall_score": number (1-10),
  "progression": "improving"|"consistent"|"declining" (how their responses evolved),
  "strengths": string[] (3 specific strengths with examples),
  "improvements": string[] (3 specific improvements with examples),
  "best_response": string (quote their single best line),
  "weakest_response": string (quote the line that most needed improvement),
  "sample_stronger_answer": string (rewrite of their weakest response),
  "key_technique": string (the #1 technique they should practise),
  "summary": string (2-3 sentence coaching summary)
}`,
      response_json_schema: {
        type: "object",
        properties: {
          overall_score: { type: "number" },
          progression: { type: "string" },
          strengths: { type: "array", items: { type: "string" } },
          improvements: { type: "array", items: { type: "string" } },
          best_response: { type: "string" },
          weakest_response: { type: "string" },
          sample_stronger_answer: { type: "string" },
          key_technique: { type: "string" },
          summary: { type: "string" },
        },
      },
    });

    // Save to CoachingSession
    try {
      await base44.entities.CoachingSession.create({
        title: `Role-Play: ${scenario.label}`,
        session_type: "verbal_communication",
        submitted_text: history.slice(0, 2000),
        ai_feedback: res.summary || "",
        score: res.overall_score,
        strengths: res.strengths || [],
        improvements: res.improvements || [],
        status: "reviewed",
      });
    } catch (_) {}

    setFeedback(res);
    setFetchingFeedback(false);
  };

  // ── Avg turn score bar ──────────────────────────────────────────────────────
  const avgTurnScore = scores.length > 0
    ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
    : null;

  // ── Scenario picker ─────────────────────────────────────────────────────────
  if (!scenario) return (
    <div className="bg-card rounded-3xl border border-border p-8 space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="font-cormorant text-2xl font-medium text-foreground">Role-Play Practice</h2>
          <p className="font-inter text-sm text-muted-foreground">Real-time AI coaching feedback on every response</p>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        {scenarios.map(s => (
          <button key={s.id} onClick={() => startScenario(s)}
            className="text-left p-5 rounded-2xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all group">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">{s.emoji}</span>
              <div className="font-cormorant text-lg font-medium text-foreground group-hover:text-primary">{s.label}</div>
            </div>
            <p className="font-inter text-xs text-muted-foreground leading-relaxed">{s.context.split(".")[0]}.</p>
            <div className="flex gap-1 mt-3 flex-wrap">
              {s.tips.slice(0, 2).map((tip, i) => (
                <span key={i} className="font-inter text-[10px] px-2 py-0.5 rounded-full border"
                  style={{ borderColor: GOLD + "40", color: GOLD, backgroundColor: GOLD + "10" }}>
                  {tip}
                </span>
              ))}
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  // ── Active role-play ────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="bg-card rounded-3xl border border-border overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border" style={{ background: FOREST }}>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg">{scenario.emoji}</span>
                <div className="font-cormorant text-xl font-medium text-white">{scenario.label}</div>
              </div>
              <div className="font-inter text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>
                {scenario.context.split(".")[0]}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {avgTurnScore && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                  style={{ backgroundColor: GOLD + "25" }}>
                  <TrendingUp className="w-3 h-3" style={{ color: GOLD }} />
                  <span className="font-inter text-xs font-medium" style={{ color: GOLD }}>
                    {avgTurnScore}/10 avg
                  </span>
                </div>
              )}
              <Button variant="ghost" size="sm" className="rounded-full gap-1.5 text-xs text-white/70 hover:text-white hover:bg-white/10"
                onClick={() => { setScenario(null); setMessages([]); setFeedback(null); setScores([]); }}>
                <RotateCcw className="w-3.5 h-3.5" /> Change
              </Button>
              {messages.filter(m => m.role === "user").length >= 3 && !feedback && (
                <Button size="sm" className="rounded-full gap-1.5 text-xs"
                  style={{ backgroundColor: GOLD, color: FOREST }}
                  onClick={getFeedback} disabled={fetchingFeedback}>
                  <Sparkles className="w-3.5 h-3.5" />
                  {fetchingFeedback ? "Analysing…" : "Full Feedback"}
                </Button>
              )}
            </div>
          </div>

          {/* Coaching tips strip */}
          <div className="flex gap-2 mt-3 flex-wrap">
            {scenario.tips.map((tip, i) => (
              <span key={i} className="font-inter text-[10px] px-2 py-0.5 rounded-full"
                style={{ backgroundColor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.55)" }}>
                💡 {tip}
              </span>
            ))}
          </div>
        </div>

        {/* Messages */}
        <div className="h-[400px] overflow-y-auto p-6 space-y-2">
          {messages.map((m, i) => (
            <div key={i}>
              <div className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] px-4 py-3 rounded-2xl font-inter text-sm leading-relaxed ${
                  m.role === "user"
                    ? "text-primary-foreground rounded-br-sm"
                    : "bg-secondary/60 text-foreground rounded-bl-sm"
                }`}
                  style={m.role === "user" ? { backgroundColor: FOREST } : {}}>
                  {m.role === "assistant" && (
                    <span className="text-[10px] font-medium opacity-60 block mb-1 uppercase tracking-wider">{scenario.emoji} {scenario.label}</span>
                  )}
                  {m.content}
                </div>
              </div>
              {m.role === "user" && m.feedback && <FeedbackChip feedback={m.feedback} />}
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-secondary/60 px-4 py-3 rounded-2xl flex gap-1">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input bar */}
        <div className="px-6 py-4 border-t border-border bg-secondary/20">
          <div className="flex gap-2">
            <button
              onClick={recording ? stopVoice : startVoice}
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors border border-border"
              style={{
                backgroundColor: recording ? "#DC2626" : "transparent",
                color: recording ? "white" : "inherit",
              }}
              title={recording ? "Stop recording" : "Voice input"}>
              {recording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && !loading && send()}
              placeholder={recording ? "Recording… press mic to stop" : "Type your response or use the mic…"}
              className="rounded-xl flex-1 font-inter"
              disabled={loading}
            />
            <Button onClick={send} disabled={!input.trim() || loading} size="icon" className="rounded-xl shrink-0"
              style={{ backgroundColor: FOREST }}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex items-center justify-between mt-2">
            <p className="font-inter text-xs text-muted-foreground">
              {messages.filter(m => m.role === "user").length < 3
                ? `${3 - messages.filter(m => m.role === "user").length} more response${3 - messages.filter(m => m.role === "user").length !== 1 ? "s" : ""} to unlock full feedback`
                : "Ready for full feedback — click the button above"}
            </p>
            {scores.length > 0 && (
              <div className="flex gap-1 items-center">
                {scores.map((s, i) => (
                  <div key={i} className="w-6 h-1.5 rounded-full" style={{
                    backgroundColor: s >= 7 ? "#16a34a" : s >= 5 ? GOLD : "#dc2626",
                    opacity: 0.7 + (i / scores.length) * 0.3,
                  }} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Final feedback panel */}
      {feedback && (
        <div className="bg-card rounded-3xl border border-border p-6 space-y-5">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <span className="font-cormorant text-2xl font-medium text-primary">{feedback.overall_score}</span>
            </div>
            <div className="flex-1">
              <div className="font-inter text-xs text-muted-foreground uppercase tracking-wider mb-1">
                Overall Score /10 · {feedback.progression === "improving" ? "📈 Improving" : feedback.progression === "declining" ? "📉 Declining" : "📊 Consistent"}
              </div>
              <p className="font-cormorant text-xl text-foreground">{feedback.summary}</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="font-inter text-xs uppercase tracking-wider text-primary font-medium">What Worked</div>
              {feedback.strengths?.map((s, i) => (
                <p key={i} className="font-inter text-sm text-muted-foreground flex gap-2 leading-relaxed">
                  <span className="text-primary shrink-0">•</span>{s}
                </p>
              ))}
            </div>
            <div className="space-y-2">
              <div className="font-inter text-xs uppercase tracking-wider font-medium" style={{ color: GOLD }}>To Elevate</div>
              {feedback.improvements?.map((s, i) => (
                <p key={i} className="font-inter text-sm text-muted-foreground flex gap-2 leading-relaxed">
                  <span style={{ color: GOLD }} className="shrink-0">•</span>{s}
                </p>
              ))}
            </div>
          </div>

          {feedback.best_response && (
            <div className="bg-green-50 rounded-2xl p-4 border border-green-200">
              <div className="font-inter text-xs uppercase tracking-wider text-green-700 font-medium mb-1">Your Best Line</div>
              <p className="font-cormorant text-lg italic text-green-900">"{feedback.best_response}"</p>
            </div>
          )}

          {feedback.weakest_response && (
            <div className="bg-secondary/60 rounded-2xl p-4">
              <div className="font-inter text-xs uppercase tracking-wider text-muted-foreground font-medium mb-1">Needed Strengthening</div>
              <p className="font-inter text-sm text-muted-foreground italic">"{feedback.weakest_response}"</p>
            </div>
          )}

          {feedback.sample_stronger_answer && (
            <div className="rounded-2xl p-4 border" style={{ backgroundColor: GOLD + "12", borderColor: GOLD + "30" }}>
              <div className="font-inter text-xs uppercase tracking-wider font-medium mb-1" style={{ color: GOLD }}>Stronger Version</div>
              <p className="font-inter text-sm text-foreground leading-relaxed">"{feedback.sample_stronger_answer}"</p>
            </div>
          )}

          {feedback.key_technique && (
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-primary/5 border border-primary/10">
              <ChevronRight className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div>
                <div className="font-inter text-xs uppercase tracking-wider text-primary font-medium mb-0.5">Key Technique to Practise</div>
                <p className="font-inter text-sm text-foreground">{feedback.key_technique}</p>
              </div>
            </div>
          )}

          <Button variant="outline" className="w-full rounded-full" onClick={() => { setScenario(null); setMessages([]); setFeedback(null); setScores([]); }}>
            <RotateCcw className="w-3.5 h-3.5 mr-2" /> Try Another Scenario
          </Button>
        </div>
      )}
    </div>
  );
}