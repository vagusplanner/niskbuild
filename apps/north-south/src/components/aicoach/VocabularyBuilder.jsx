import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BookOpen, Sparkles, Copy } from "lucide-react";

const roles = ["CEO / Founder", "Board Director", "Sales Leader", "Marketing Executive", "Operations Director", "Financial Leader", "HR / People Leader", "Tech / CTO", "Legal / Compliance", "Diplomat / Public Sector"];

export default function VocabularyBuilder() {
  const [role, setRole] = useState("");
  const [customRole, setCustomRole] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(null);

  const generate = async () => {
    const targetRole = role === "other" ? customRole : role;
    setLoading(true);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an executive communication coach. Generate a daily vocabulary builder for a ${targetRole}.

Create 8 sophisticated word/phrase upgrades that will elevate their communication. Include words common in their field that they may be using weakly.

Respond in JSON: { "role_context": string, "words": [{ "common": string, "elevated": string, "example_sentence": string, "why": string }], "power_phrase": string, "daily_challenge": string }`,
      response_json_schema: {
        type: "object",
        properties: {
          role_context: { type: "string" },
          words: { type: "array", items: { type: "object" } },
          power_phrase: { type: "string" },
          daily_challenge: { type: "string" },
        },
      },
    });
    setResult(res);
    setLoading(false);
  };

  const copy = (text, i) => {
    navigator.clipboard.writeText(text);
    setCopied(i);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {!result ? (
        <div className="bg-card rounded-3xl border border-border p-8 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-cormorant text-2xl font-medium text-foreground">Vocabulary Builder</h2>
              <p className="font-inter text-sm text-muted-foreground">Daily word upgrades tailored to your role</p>
            </div>
          </div>
          <div>
            <div className="font-inter text-xs font-medium text-muted-foreground mb-3">Select your role</div>
            <div className="grid sm:grid-cols-2 gap-2">
              {roles.map(r => (
                <button key={r} onClick={() => setRole(r)}
                  className={`text-left px-4 py-2.5 rounded-xl border text-sm font-inter transition-colors ${role === r ? "bg-primary/10 border-primary text-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}>
                  {r}
                </button>
              ))}
              <button onClick={() => setRole("other")}
                className={`text-left px-4 py-2.5 rounded-xl border text-sm font-inter transition-colors ${role === "other" ? "bg-primary/10 border-primary text-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}>
                Other (specify)
              </button>
            </div>
          </div>
          {role === "other" && (
            <Input value={customRole} onChange={e => setCustomRole(e.target.value)} placeholder="Describe your role..." className="rounded-xl" />
          )}
          <Button onClick={generate} disabled={!role || (role === "other" && !customRole) || loading} className="w-full rounded-full" size="lg">
            {loading ? <span className="flex gap-2 items-center"><Sparkles className="w-4 h-4 animate-pulse" /> Building your vocabulary set...</span>
              : <span className="flex gap-2 items-center"><Sparkles className="w-4 h-4" /> Generate Today's Vocabulary</span>}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-card rounded-3xl border border-border p-8 space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="font-cormorant text-2xl font-medium text-foreground">Today's Vocabulary Set</h2>
                <p className="font-inter text-sm text-muted-foreground mt-1">{result.role_context}</p>
              </div>
              <Button variant="outline" size="sm" className="rounded-full" onClick={() => setResult(null)}>New Set</Button>
            </div>
            {result.power_phrase && (
              <div className="bg-primary/10 rounded-2xl p-5 border border-primary/20">
                <div className="font-inter text-xs uppercase tracking-wider text-primary font-medium mb-1">Today's Power Phrase</div>
                <p className="font-cormorant text-xl italic text-foreground">"{result.power_phrase}"</p>
              </div>
            )}
            <div className="space-y-3">
              {result.words?.map((w, i) => (
                <div key={i} className="bg-secondary/40 rounded-2xl p-5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-inter text-sm text-muted-foreground line-through">{w.common}</span>
                      <span className="text-primary">→</span>
                      <span className="font-inter text-sm font-medium text-foreground">{w.elevated}</span>
                    </div>
                    <button onClick={() => copy(w.elevated, i)} className="text-muted-foreground hover:text-primary transition-colors">
                      <Copy className="w-3.5 h-3.5" />
                      {copied === i && <span className="text-xs ml-1 text-primary">Copied!</span>}
                    </button>
                  </div>
                  <p className="font-inter text-xs text-muted-foreground italic">"{w.example_sentence}"</p>
                  <p className="font-inter text-xs text-primary">{w.why}</p>
                </div>
              ))}
            </div>
            {result.daily_challenge && (
              <div className="bg-secondary/60 rounded-2xl p-5">
                <div className="font-inter text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2">Today's Challenge</div>
                <p className="font-inter text-sm text-foreground">{result.daily_challenge}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}