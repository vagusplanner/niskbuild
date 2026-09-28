import { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, Send, Sparkles } from "lucide-react";

const SYSTEM_CONTEXT = `You are an expert executive communication coach with 20+ years in international media and broadcasting, including BBC, National Geographic, ITV, Channel 4 & 5, and Qatar TV. You have a Masters in Communication, Culture and Media. You specialise in:
- Executive verbal and written communication
- Body language and non-verbal communication  
- Media training and press appearances
- Cross-cultural communication
- Speech writing and vocabulary elevation
- Life coaching for executives

Answer questions with authority, drawing on broadcast journalism, executive coaching, and cross-cultural communication expertise. Be concise yet insightful. Use examples from real media/corporate contexts. Always be empowering and practical.`;

const SUGGESTED = [
  "How do I project more authority in meetings?",
  "What are the best techniques to eliminate filler words?",
  "How should I adapt my communication style for different cultures?",
  "What makes a great executive email?",
  "How can I improve my presence on video calls?",
  "What's the most important body language rule for negotiations?",
];

export default function ResourceQA() {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hello! I'm your AI communication coach, drawing on 20+ years of international media and executive coaching expertise. Ask me anything about communication, leadership presence, or media skills." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (text) => {
    const q = text || input.trim();
    if (!q) return;
    setInput("");
    const newMessages = [...messages, { role: "user", content: q }];
    setMessages(newMessages);
    setLoading(true);

    const history = newMessages.map(m => `${m.role === "user" ? "User" : "Coach"}: ${m.content}`).join("\n");
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `${SYSTEM_CONTEXT}\n\nConversation so far:\n${history}\n\nRespond as the Coach concisely and practically (2-4 paragraphs max):`,
    });
    setMessages(prev => [...prev, { role: "assistant", content: res }]);
    setLoading(false);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="bg-card rounded-3xl border border-border overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border">
          <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center">
            <MessageCircle className="w-4 h-4 text-primary" />
          </div>
          <div>
            <div className="font-cormorant text-xl font-medium text-foreground">Resource Library Q&A</div>
            <div className="font-inter text-xs text-muted-foreground">Ask anything about communication & leadership</div>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="font-inter text-xs text-muted-foreground">Online</span>
          </div>
        </div>

        <div className="h-[420px] overflow-y-auto p-6 space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] px-4 py-3 rounded-2xl font-inter text-sm leading-relaxed ${m.role === "user" ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-secondary/60 text-foreground rounded-bl-sm"}`}>
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-secondary/60 px-4 py-3 rounded-2xl rounded-bl-sm flex gap-1">
                {[0, 1, 2].map(i => <div key={i} className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="px-6 py-4 border-t border-border">
          <div className="flex gap-2">
            <Input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()} placeholder="Ask about communication, presence, media skills..." className="rounded-xl flex-1" />
            <Button onClick={() => send()} disabled={!input.trim() || loading} size="icon" className="rounded-xl shrink-0">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="font-inter text-xs text-muted-foreground px-1">Suggested questions:</div>
        <div className="flex flex-wrap gap-2">
          {SUGGESTED.map((s, i) => (
            <button key={i} onClick={() => send(s)} className="text-xs font-inter bg-secondary hover:bg-secondary/80 text-muted-foreground px-3 py-1.5 rounded-full border border-border transition-colors">
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}