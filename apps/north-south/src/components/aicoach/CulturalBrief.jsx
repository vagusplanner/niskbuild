import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Globe, Sparkles, CheckCircle, XCircle } from "lucide-react";

const countries = [
  "Japan", "China", "Saudi Arabia", "UAE", "Germany", "France", "United States",
  "United Kingdom", "India", "Brazil", "Nigeria", "South Korea", "Russia", "Italy", "Netherlands",
];

const contexts = ["Business meeting", "Negotiation", "Presentation", "Social dinner", "Media interview", "Board meeting"];

export default function CulturalBrief() {
  const [country, setCountry] = useState("");
  const [context, setContext] = useState("");
  const [customCountry, setCustomCountry] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    const target = country === "other" ? customCountry : country;
    setLoading(true);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a cross-cultural communication expert with deep knowledge of international business etiquette. Create a comprehensive briefing for communicating with someone from ${target} in a ${context} context.

Respond in JSON: { "country": string, "communication_style": string, "dos": string[], "donts": string[], "greeting_protocol": string, "meeting_etiquette": string, "hierarchy_notes": string, "time_and_punctuality": string, "business_card_notes": string, "gift_giving": string, "language_tips": string[], "summary": string }`,
      response_json_schema: {
        type: "object",
        properties: {
          country: { type: "string" },
          communication_style: { type: "string" },
          dos: { type: "array", items: { type: "string" } },
          donts: { type: "array", items: { type: "string" } },
          greeting_protocol: { type: "string" },
          meeting_etiquette: { type: "string" },
          hierarchy_notes: { type: "string" },
          time_and_punctuality: { type: "string" },
          business_card_notes: { type: "string" },
          gift_giving: { type: "string" },
          language_tips: { type: "array", items: { type: "string" } },
          summary: { type: "string" },
        },
      },
    });
    setResult(res);
    setLoading(false);
  };

  if (result) return (
    <div className="bg-card rounded-3xl border border-border p-8 space-y-6 max-w-3xl mx-auto">
      <div className="flex justify-between items-start">
        <div>
          <p className="font-inter text-xs uppercase tracking-wider text-primary font-medium">{context}</p>
          <h2 className="font-cormorant text-3xl font-medium text-foreground">{result.country} Communication Guide</h2>
          <p className="font-inter text-sm text-muted-foreground mt-2">{result.communication_style}</p>
        </div>
        <Button variant="outline" size="sm" className="rounded-full shrink-0" onClick={() => { setResult(null); setCountry(""); setContext(""); }}>New Briefing</Button>
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        <div className="space-y-3">
          <div className="font-inter text-xs uppercase tracking-wider text-primary font-medium flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5" /> Do</div>
          {result.dos?.map((d, i) => (
            <div key={i} className="flex gap-2 items-start">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
              <span className="font-inter text-sm text-muted-foreground">{d}</span>
            </div>
          ))}
        </div>
        <div className="space-y-3">
          <div className="font-inter text-xs uppercase tracking-wider text-destructive font-medium flex items-center gap-1.5"><XCircle className="w-3.5 h-3.5" /> Don't</div>
          {result.donts?.map((d, i) => (
            <div key={i} className="flex gap-2 items-start">
              <XCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
              <span className="font-inter text-sm text-muted-foreground">{d}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {[
          { label: "Greeting Protocol", value: result.greeting_protocol },
          { label: "Meeting Etiquette", value: result.meeting_etiquette },
          { label: "Hierarchy & Status", value: result.hierarchy_notes },
          { label: "Time & Punctuality", value: result.time_and_punctuality },
          { label: "Business Cards", value: result.business_card_notes },
          { label: "Gift Giving", value: result.gift_giving },
        ].filter(b => b.value).map((b, i) => (
          <div key={i} className="bg-secondary/40 rounded-xl p-4">
            <div className="font-inter text-xs uppercase tracking-wider text-muted-foreground font-medium mb-1">{b.label}</div>
            <p className="font-inter text-sm text-foreground">{b.value}</p>
          </div>
        ))}
      </div>

      {result.language_tips?.length > 0 && (
        <div className="space-y-3">
          <div className="font-inter text-xs uppercase tracking-wider text-primary font-medium">Language Tips</div>
          {result.language_tips.map((t, i) => (
            <div key={i} className="flex gap-2 items-start">
              <Globe className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <span className="font-inter text-sm text-muted-foreground">{t}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="bg-card rounded-3xl border border-border p-8 space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
          <Globe className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="font-cormorant text-2xl font-medium text-foreground">Cultural Briefings</h2>
          <p className="font-inter text-sm text-muted-foreground">Country-specific communication guides on demand</p>
        </div>
      </div>

      <div>
        <div className="font-inter text-xs font-medium text-muted-foreground mb-3">Select country</div>
        <div className="flex flex-wrap gap-2">
          {countries.map(c => (
            <button key={c} onClick={() => setCountry(c)}
              className={`px-4 py-2 rounded-full text-sm font-inter border transition-colors ${country === c ? "bg-primary/10 border-primary text-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}>
              {c}
            </button>
          ))}
          <button onClick={() => setCountry("other")}
            className={`px-4 py-2 rounded-full text-sm font-inter border transition-colors ${country === "other" ? "bg-primary/10 border-primary text-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}>
            Other...
          </button>
        </div>
        {country === "other" && (
          <input value={customCountry} onChange={e => setCustomCountry(e.target.value)} placeholder="Enter country name" className="mt-3 w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm font-inter focus:outline-none focus:ring-1 focus:ring-ring" />
        )}
      </div>

      <div>
        <div className="font-inter text-xs font-medium text-muted-foreground mb-3">Context</div>
        <div className="flex flex-wrap gap-2">
          {contexts.map(c => (
            <button key={c} onClick={() => setContext(c)}
              className={`px-4 py-2 rounded-full text-sm font-inter border transition-colors ${context === c ? "bg-primary/10 border-primary text-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}>
              {c}
            </button>
          ))}
        </div>
      </div>

      <Button onClick={generate} disabled={!country || (country === "other" && !customCountry) || !context || loading} className="w-full rounded-full" size="lg">
        {loading ? <span className="flex gap-2 items-center"><Sparkles className="w-4 h-4 animate-pulse" /> Preparing briefing...</span>
          : <span className="flex gap-2 items-center"><Sparkles className="w-4 h-4" /> Generate Cultural Briefing</span>}
      </Button>
    </div>
  );
}