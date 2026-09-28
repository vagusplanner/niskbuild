import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Loader2, Bot } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "@/lib/LanguageContext";

const GOLD = "#B8952A";
const OLIVE = "#3D4A2F";
const CREAM = "#F5F0E0";
const FOREST = "#2C3B2D";

const KNOWLEDGE_BASE = `
You are the friendly, professional assistant for North South Consulting (NSC), led by Nishat Ismail-Kemih.

KEY FACTS:
- Nishat has 20+ years of experience in communication, media and executive coaching
- Based in UK and France, serving clients in 30+ countries
- MA in Communication, Culture & Media from Coventry University
- Clients include: BBC, Al Jazeera, National Geographic, ITV, HSBC, Canon, Kellogg's, Stellantis, Qatar Media Corp
- Worked with the French government as an official reference
- Languages: English, French, Arabic, Urdu

SERVICES:
- Verbal Communication Coaching
- Written Communication (emails, proposals, speeches)
- Media & Broadcast Training
- Body Language & Executive Presence
- Cross-Cultural Communication
- Diplomatic & Government Communications
- Multilingual Coaching (EN/FR/AR/Urdu)
- Life Coaching & Mindset Mastery
- Corporate Team Workshops

PRICING TIERS:
1. AI Self-Service: $34.99/month (or $249/year) — AI speech & writing analysis, goal tracking, video lessons, 24/7 access
2. Hybrid Coaching: Contact for pricing — AI tools + 2 live 1:1 sessions/month with a senior coach
3. Bespoke Retainer: Custom engagement — unlimited sessions with Nishat, speech ghostwriting, crisis communication, diplomatic advisory

HOW TO GET STARTED:
- Free 30-min Discovery Call: /discovery
- Take the personalised assessment: /onboarding
- Book a session directly: /book
- Sign in / register: use the Sign In button in the navbar

UNIQUE DIFFERENTIATORS:
- Former BBC/ITV/Al Jazeera broadcast professional
- Government-level diplomatic communication experience
- French government official reference project
- Trilingual coaching (EN/FR/AR)
- AI-powered coaching tools combined with human expertise

Always be warm, professional and concise. Answer in the language the user writes in (English, French, or Arabic). 
If asked something you don't know, invite them to book a free discovery call at /discovery.
`;

export default function FloatingAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasGreeted, setHasGreeted] = useState(false);
  const messagesEndRef = useRef(null);
  const { t, isRTL } = useLanguage();

  useEffect(() => {
    if (open && !hasGreeted) {
      setMessages([{ role: "assistant", content: t("assistantGreeting") }]);
      setHasGreeted(true);
    }
  }, [open]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);

    const history = messages.map(m => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`).join("\n");
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `${KNOWLEDGE_BASE}\n\nConversation history:\n${history}\n\nUser: ${userMsg}\n\nAssistant:`,
    });

    setMessages(prev => [...prev, { role: "assistant", content: res }]);
    setLoading(false);
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95"
        style={{ backgroundColor: OLIVE, border: `2px solid ${GOLD}` }}
      >
        {open
          ? <X className="w-5 h-5 text-white" />
          : <MessageCircle className="w-6 h-6 text-white" />
        }
        {!open && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-white font-inter font-bold"
            style={{ backgroundColor: GOLD, fontSize: "9px" }}>
            NSC
          </span>
        )}
      </button>

      {/* Chat window */}
      {open && (
        <div
          className="fixed bottom-24 right-6 z-50 w-80 md:w-96 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
          style={{ height: "500px", border: `1px solid ${GOLD}30`, backgroundColor: CREAM }}
          dir={isRTL ? "rtl" : "ltr"}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-4 shrink-0"
            style={{ backgroundColor: OLIVE, borderBottom: `1px solid ${GOLD}30` }}>
            <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
              style={{ backgroundColor: GOLD + "30" }}>
              <Bot className="w-4 h-4" style={{ color: GOLD }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-cormorant text-base font-medium text-white">NSC Assistant</p>
              <p className="font-inter text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>North South Consulting</p>
            </div>
            <div className="w-2 h-2 rounded-full bg-green-400 shrink-0" title="Online" />
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className="max-w-[80%] rounded-2xl px-4 py-2.5 font-inter text-sm leading-relaxed"
                  style={m.role === "user"
                    ? { backgroundColor: OLIVE, color: "white" }
                    : { backgroundColor: "white", color: FOREST, border: `1px solid ${GOLD}20` }
                  }
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl px-4 py-3 flex items-center gap-2"
                  style={{ backgroundColor: "white", border: `1px solid ${GOLD}20` }}>
                  <Loader2 className="w-3 h-3 animate-spin" style={{ color: GOLD }} />
                  <span className="font-inter text-xs" style={{ color: FOREST + "80" }}>Thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick suggestions */}
          {messages.length === 1 && (
            <div className="px-4 pb-2 flex flex-wrap gap-1.5">
              {["💰 Pricing", "📅 Book a call", "🌍 Services", "👤 About Nishat"].map(s => (
                <button key={s} onClick={() => { setInput(s.replace(/^[^\s]+\s/, "")); }}
                  className="font-inter text-xs px-3 py-1.5 rounded-full border transition-all hover:opacity-80"
                  style={{ backgroundColor: GOLD + "12", borderColor: GOLD + "30", color: FOREST }}>
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="px-4 py-3 border-t flex gap-2 shrink-0" style={{ borderColor: GOLD + "20" }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && send()}
              placeholder={t("assistantPlaceholder")}
              className="flex-1 rounded-xl px-3 py-2 font-inter text-sm outline-none border"
              style={{ backgroundColor: "white", borderColor: GOLD + "30", color: FOREST }}
            />
            <button onClick={send} disabled={!input.trim() || loading}
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all hover:opacity-80 disabled:opacity-40"
              style={{ backgroundColor: GOLD }}>
              <Send className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}