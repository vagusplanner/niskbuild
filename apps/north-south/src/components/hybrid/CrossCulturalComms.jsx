import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Globe, Sparkles, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import HybridToolShell from "./HybridToolShell";

export default function CrossCulturalComms() {
  const [country, setCountry] = useState("");
  const [situation, setSituation] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a cross-cultural communication expert. Generate a research brief for working with someone from ${country} in this situation: ${situation}.

Respond in JSON: { "cultural_overview": string, "communication_style": string, "dos": string[], "donts": string[], "relationship_notes": string, "hierarchy_notes": string, "trust_building": string, "key_phrases": string[], "things_to_research_with_consultant": string[] }`,
      response_json_schema: {
        type: "object",
        properties: {
          cultural_overview: { type: "string" },
          communication_style: { type: "string" },
          dos: { type: "array", items: { type: "string" } },
          donts: { type: "array", items: { type: "string" } },
          relationship_notes: { type: "string" },
          hierarchy_notes: { type: "string" },
          trust_building: { type: "string" },
          key_phrases: { type: "array", items: { type: "string" } },
          things_to_research_with_consultant: { type: "array", items: { type: "string" } },
        },
      },
    });
    setResult(res);
    setLoading(false);
  };

  return (
    <HybridToolShell icon={Globe} title="Cross-Cultural Comms" aiLabel="Research brief + cultural dos & don'ts" humanLabel="Live context, personal experience, relationship nuance">
      {!result ? (
        <div className="bg-card rounded-3xl border border-border p-8 space-y-5">
          <p className="font-inter text-sm text-muted-foreground">AI provides the research foundation — your consultant adds lived experience, personal relationships, and real-time cultural reading.</p>
          <div className="space-y-1.5">
            <label className="font-inter text-xs font-medium text-muted-foreground">Country / culture *</label>
            <Input value={country} onChange={e => setCountry(e.target.value)} placeholder="e.g. Japan, Saudi Arabia, Brazil" className="rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <label className="font-inter text-xs font-medium text-muted-foreground">Situation / context</label>
            <Textarea value={situation} onChange={e => setSituation(e.target.value)} placeholder="e.g. Negotiating a partnership deal, presenting to a local board..." rows={4} className="rounded-xl resize-none text-sm" />
          </div>
          <Button onClick={generate} disabled={!country.trim() || loading} className="w-full rounded-full" size="lg">
            {loading ? <span className="flex gap-2 items-center"><Sparkles className="w-4 h-4 animate-pulse" /> Researching...</span> : <span className="flex gap-2 items-center"><Sparkles className="w-4 h-4" /> Generate Cultural Brief</span>}
          </Button>
        </div>
      ) : (
        <div className="bg-card rounded-3xl border border-border p-8 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="font-cormorant text-2xl font-medium text-foreground">{country} — Cultural Brief</h3>
            <Button variant="outline" size="sm" className="rounded-full" onClick={() => setResult(null)}>New Brief</Button>
          </div>

          {result.cultural_overview && <div className="bg-primary/10 rounded-2xl p-5 border border-primary/20"><p className="font-inter text-sm text-foreground leading-relaxed">{result.cultural_overview}</p></div>}

          <div className="grid sm:grid-cols-2 gap-5">
            <div className="space-y-3">
              <div className="font-inter text-xs uppercase tracking-wider text-primary font-medium">Do</div>
              {result.dos?.map((d, i) => <div key={i} className="flex gap-2"><CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" /><span className="font-inter text-sm text-muted-foreground">{d}</span></div>)}
            </div>
            <div className="space-y-3">
              <div className="font-inter text-xs uppercase tracking-wider text-destructive font-medium">Don't</div>
              {result.donts?.map((d, i) => <div key={i} className="flex gap-2"><XCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" /><span className="font-inter text-sm text-muted-foreground">{d}</span></div>)}
            </div>
          </div>

          {[
            { label: "Communication Style", value: result.communication_style },
            { label: "Relationship & Trust", value: result.relationship_notes },
            { label: "Hierarchy & Status", value: result.hierarchy_notes },
            { label: "Building Trust", value: result.trust_building },
          ].filter(b => b.value).map((b, i) => (
            <div key={i} className="bg-secondary/40 rounded-xl p-4">
              <div className="font-inter text-xs uppercase tracking-wider text-muted-foreground font-medium mb-1">{b.label}</div>
              <p className="font-inter text-sm text-foreground">{b.value}</p>
            </div>
          ))}

          {result.things_to_research_with_consultant?.length > 0 && (
            <div className="bg-accent/10 rounded-2xl p-5 border border-accent/20 space-y-2">
              <div className="font-inter text-xs uppercase tracking-wider text-accent-foreground font-medium">Bring to Your Human Session</div>
              {result.things_to_research_with_consultant.map((t, i) => (
                <div key={i} className="flex gap-2"><span className="text-accent">→</span><span className="font-inter text-sm text-foreground">{t}</span></div>
              ))}
            </div>
          )}
        </div>
      )}
    </HybridToolShell>
  );
}