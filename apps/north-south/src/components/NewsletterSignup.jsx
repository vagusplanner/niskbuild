import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Mail, ArrowRight, CheckCircle } from "lucide-react";

const GOLD = "#B8952A";
const FOREST = "#2C3B2D";
const CREAM = "#F5F0E0";

export default function NewsletterSignup({ source = "footer", dark = false }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | success | error | exists
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;
    setStatus("loading");
    try {
      const res = await base44.functions.invoke("newsletterSubscribe", { email, name, source });
      const msg = res?.data?.message;
      if (msg === "already_subscribed") {
        setStatus("exists");
      } else {
        setStatus("success");
      }
    } catch (err) {
      setErrorMsg(err?.response?.data?.error || "Something went wrong. Please try again.");
      setStatus("error");
    }
  };

  const textColor = dark ? "text-white" : "text-foreground";
  const mutedColor = dark ? "rgba(255,255,255,0.55)" : "hsl(var(--muted-foreground))";
  const inputBg = dark ? "rgba(255,255,255,0.07)" : "white";
  const inputBorder = dark ? "rgba(255,255,255,0.15)" : "hsl(var(--border))";

  if (status === "success" || status === "exists") {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <CheckCircle className="w-8 h-8" style={{ color: GOLD }} />
        <p className={`font-cormorant text-xl font-light ${textColor}`}>
          {status === "exists" ? "You're already on the list." : "Welcome aboard."}
        </p>
        <p className="font-inter text-sm" style={{ color: mutedColor }}>
          {status === "exists"
            ? "You'll keep receiving insights from NSC."
            : "Expect coaching insights and thought leadership from Nishat — straight to your inbox."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Mail className="w-4 h-4" style={{ color: GOLD }} />
        <span className="font-inter text-xs tracking-widest uppercase font-medium" style={{ color: GOLD }}>
          Newsletter
        </span>
      </div>
      <p className={`font-cormorant text-2xl font-light leading-snug ${textColor}`}>
        Insights, straight to your inbox.
      </p>
      <p className="font-inter text-sm leading-relaxed" style={{ color: mutedColor }}>
        Articles on executive communication, cross-cultural leadership and coaching — from Nishat Ismail-Kemih.
      </p>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          placeholder="Your name (optional)"
          value={name}
          onChange={e => setName(e.target.value)}
          className="w-full rounded-xl px-4 py-2.5 font-inter text-sm outline-none border"
          style={{ backgroundColor: inputBg, borderColor: inputBorder, color: dark ? "white" : "inherit" }}
        />
        <div className="flex gap-2">
          <input
            type="email"
            placeholder="Your email address"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="flex-1 rounded-xl px-4 py-2.5 font-inter text-sm outline-none border"
            style={{ backgroundColor: inputBg, borderColor: inputBorder, color: dark ? "white" : "inherit" }}
          />
          <button
            type="submit"
            disabled={status === "loading" || !email}
            className="rounded-xl px-5 py-2.5 font-inter text-sm font-medium flex items-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: GOLD, color: FOREST }}
          >
            {status === "loading" ? "..." : <><span>Subscribe</span><ArrowRight className="w-3.5 h-3.5" /></>}
          </button>
        </div>
        {status === "error" && (
          <p className="font-inter text-xs text-red-400">{errorMsg}</p>
        )}
      </form>
    </div>
  );
}