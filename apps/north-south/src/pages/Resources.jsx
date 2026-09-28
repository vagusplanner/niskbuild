import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import Navbar from "../components/Navbar";
import { Button } from "@/components/ui/button";
import { FileText, Video, BookOpen, Download, Lock, CheckCircle, Filter } from "lucide-react";

const GOLD = "#B8952A";
const FOREST = "#2C3B2D";

// All resources with tags matching coaching session types / development areas
const ALL_RESOURCES = [
  // Executive Presence
  {
    category: "Executive Presence",
    tag: "executive_presence",
    type: "Guide",
    icon: BookOpen,
    title: "The Executive Presence Playbook",
    desc: "A comprehensive guide to projecting authority, composure, and credibility in any room.",
    tier: "any",
  },
  {
    category: "Executive Presence",
    tag: "executive_presence",
    type: "Template",
    icon: FileText,
    title: "Executive Email Framework",
    desc: "A 5-part structure for high-impact C-suite correspondence.",
    tier: "any",
  },
  {
    category: "Executive Presence",
    tag: "executive_presence",
    type: "Template",
    icon: FileText,
    title: "Board Proposal Template",
    desc: "Elevate your proposals with this narrative-first structure.",
    tier: "hybrid",
  },
  // Verbal Communication
  {
    category: "Verbal Communication",
    tag: "verbal_communication",
    type: "Guide",
    icon: BookOpen,
    title: "The Power of Pause",
    desc: "How strategic silence elevates verbal authority in meetings and presentations.",
    tier: "any",
  },
  {
    category: "Verbal Communication",
    tag: "verbal_communication",
    type: "Template",
    icon: FileText,
    title: "Speech Scaffold",
    desc: "Opening, body, and close — the broadcast journalist's method.",
    tier: "any",
  },
  {
    category: "Verbal Communication",
    tag: "verbal_communication",
    type: "Video",
    icon: Video,
    title: "Vocal Warm-Up Masterclass",
    desc: "A 10-minute daily vocal warm-up used by broadcast professionals.",
    tier: "hybrid",
  },
  // Media Training
  {
    category: "Media Training",
    tag: "media_training",
    type: "Video",
    icon: Video,
    title: "The TV Interview Formula",
    desc: "Broadcast-tested techniques for any media appearance or press conference.",
    tier: "any",
  },
  {
    category: "Media Training",
    tag: "media_training",
    type: "Guide",
    icon: BookOpen,
    title: "Crisis Communication Cheatsheet",
    desc: "How to stay calm, on-message, and credible under media pressure.",
    tier: "hybrid",
  },
  {
    category: "Media Training",
    tag: "media_training",
    type: "Template",
    icon: FileText,
    title: "Key Message Matrix",
    desc: "Structure your 3 core messages for any media interview or press release.",
    tier: "bespoke",
  },
  // Body Language
  {
    category: "Body Language",
    tag: "body_language",
    type: "Video",
    icon: Video,
    title: "Reading a Room: Body Language Fundamentals",
    desc: "A 12-minute masterclass on non-verbal intelligence and presence.",
    tier: "any",
  },
  {
    category: "Body Language",
    tag: "body_language",
    type: "Guide",
    icon: BookOpen,
    title: "The Confidence Posture Guide",
    desc: "Evidence-backed postures and gestures that project authority and warmth.",
    tier: "any",
  },
  // Cross-Cultural
  {
    category: "Cross-Cultural",
    tag: "cross_cultural",
    type: "Guide",
    icon: BookOpen,
    title: "Cross-Cultural Communication Cheatsheet",
    desc: "Key dos and don'ts for 20 major business cultures.",
    tier: "any",
  },
  {
    category: "Cross-Cultural",
    tag: "cross_cultural",
    type: "Video",
    icon: Video,
    title: "Non-Native Speaker Confidence",
    desc: "How to command authority and nuance in your second language.",
    tier: "any",
  },
  {
    category: "Cross-Cultural",
    tag: "cross_cultural",
    type: "Guide",
    icon: BookOpen,
    title: "International Negotiation Playbook",
    desc: "Strategies for negotiating across cultures, hierarchies, and time zones.",
    tier: "bespoke",
  },
  // Written Communication
  {
    category: "Written Communication",
    tag: "written_communication",
    type: "Guide",
    icon: BookOpen,
    title: "Vocabulary Elevation Glossary",
    desc: "100 word upgrades for common corporate language — instantly more persuasive.",
    tier: "any",
  },
  {
    category: "Written Communication",
    tag: "written_communication",
    type: "Template",
    icon: FileText,
    title: "Stakeholder Update Template",
    desc: "A clear, concise format for executive briefings and progress updates.",
    tier: "hybrid",
  },
];

const AREA_FILTERS = [
  { label: "All Areas", value: "all" },
  { label: "Executive Presence", value: "executive_presence" },
  { label: "Verbal Communication", value: "verbal_communication" },
  { label: "Media Training", value: "media_training" },
  { label: "Body Language", value: "body_language" },
  { label: "Cross-Cultural", value: "cross_cultural" },
  { label: "Written Communication", value: "written_communication" },
];

const TYPE_FILTERS = [
  { label: "All Types", value: "all" },
  { label: "Guides", value: "Guide" },
  { label: "Templates", value: "Template" },
  { label: "Videos", value: "Video" },
];

const tierLabel = { any: null, hybrid: "Hybrid+", bespoke: "Bespoke" };
const tierBg = { hybrid: "bg-amber-100 text-amber-700", bespoke: "bg-purple-100 text-purple-700" };

// Derive user's top session areas to suggest relevant resources
function getTopAreas(sessions) {
  const counts = {};
  sessions.forEach(s => {
    const t = s.session_type;
    if (t) counts[t] = (counts[t] || 0) + 1;
  });
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([k]) => k);
}

const typeIcon = { Guide: BookOpen, Template: FileText, Video: Video };
const typeBg = { Guide: "bg-blue-50 text-blue-700", Template: "bg-green-50 text-green-700", Video: "bg-rose-50 text-rose-700" };

export default function Resources() {
  const [areaFilter, setAreaFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sessions, setSessions] = useState([]);
  const [userTier, setUserTier] = useState("any"); // "any" | "hybrid" | "bespoke"

  useEffect(() => {
    const load = async () => {
      try {
        const s = await base44.entities.CoachingSession.list("-created_date", 50);
        setSessions(s);
        // Infer tier from bookings
        const bookings = await base44.entities.Booking.list("-created_date", 10);
        if (bookings.some(b => b.service_tier === "bespoke" && b.status !== "cancelled")) {
          setUserTier("bespoke");
        } else if (bookings.some(b => b.service_tier === "hybrid" && b.status !== "cancelled")) {
          setUserTier("hybrid");
        }
      } catch (e) {}
    };
    load();
  }, []);

  const topAreas = getTopAreas(sessions);
  const suggestedTag = topAreas[0] || null;

  const canAccess = (resource) => {
    if (resource.tier === "any") return true;
    if (resource.tier === "hybrid") return userTier === "hybrid" || userTier === "bespoke";
    if (resource.tier === "bespoke") return userTier === "bespoke";
    return false;
  };

  const filtered = ALL_RESOURCES.filter(r => {
    const matchArea = areaFilter === "all" || r.tag === areaFilter;
    const matchType = typeFilter === "all" || r.type === typeFilter;
    return matchArea && matchType;
  });

  const suggested = suggestedTag ? ALL_RESOURCES.filter(r => r.tag === suggestedTag && canAccess(r)).slice(0, 3) : [];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-6xl mx-auto px-6 py-28">
        {/* Header */}
        <div className="mb-10 space-y-2">
          <p className="font-inter text-xs tracking-widest uppercase font-medium" style={{ color: GOLD }}>Knowledge Base</p>
          <h1 className="font-cormorant text-4xl md:text-5xl font-light text-foreground">Resource Library</h1>
          <p className="font-inter text-sm text-muted-foreground max-w-xl">
            Frameworks, templates, and guides curated from 20+ years of executive coaching experience — filtered to your development areas.
          </p>
        </div>

        {/* Suggested for you */}
        {suggested.length > 0 && (
          <div className="mb-10 p-6 rounded-2xl border border-border bg-card">
            <p className="font-inter text-xs tracking-widest uppercase font-medium mb-4" style={{ color: GOLD }}>
              Suggested for You · Based on Your Sessions
            </p>
            <div className="grid sm:grid-cols-3 gap-4">
              {suggested.map((r, i) => {
                const RIcon = typeIcon[r.type] || FileText;
                return (
                  <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-secondary/40 hover:bg-secondary/70 transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center shrink-0">
                      <RIcon className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-inter text-sm font-medium text-foreground leading-tight">{r.title}</p>
                      <p className="font-inter text-xs text-muted-foreground mt-0.5">{r.type}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-8">
          <div className="flex items-center gap-1.5 mr-2">
            <Filter className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="font-inter text-xs text-muted-foreground">Filter:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {AREA_FILTERS.map(f => (
              <button key={f.value} onClick={() => setAreaFilter(f.value)}
                className={`font-inter text-xs px-3.5 py-1.5 rounded-full border transition-colors ${areaFilter === f.value ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:border-primary/50"}`}>
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 ml-auto">
            {TYPE_FILTERS.map(f => (
              <button key={f.value} onClick={() => setTypeFilter(f.value)}
                className={`font-inter text-xs px-3.5 py-1.5 rounded-full border transition-colors ${typeFilter === f.value ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:border-primary/50"}`}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Resource grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((r, i) => {
            const RIcon = typeIcon[r.type] || FileText;
            const accessible = canAccess(r);
            const tl = tierLabel[r.tier];
            return (
              <div key={i} className={`relative bg-card rounded-2xl border p-6 flex flex-col gap-3 transition-all ${accessible ? "border-border hover:border-primary/40 hover:shadow-md" : "border-border opacity-75"}`}>
                {/* Type badge */}
                <div className="flex items-center justify-between">
                  <span className={`font-inter text-xs px-2.5 py-0.5 rounded-full font-medium ${typeBg[r.type] || "bg-secondary text-muted-foreground"}`}>
                    {r.type}
                  </span>
                  {tl && (
                    <span className={`font-inter text-xs px-2.5 py-0.5 rounded-full font-medium ${tierBg[r.tier]}`}>
                      {tl}
                    </span>
                  )}
                </div>

                <div>
                  <p className="font-inter text-[10px] tracking-widest uppercase text-muted-foreground mb-1">{r.category}</p>
                  <h3 className="font-cormorant text-lg font-medium text-foreground leading-tight">{r.title}</h3>
                  <p className="font-inter text-xs text-muted-foreground leading-relaxed mt-1.5">{r.desc}</p>
                </div>

                <div className="mt-auto pt-2">
                  {accessible ? (
                    <Button variant="ghost" size="sm" className="text-xs gap-1.5 p-0 h-auto font-inter font-medium"
                      style={{ color: GOLD }}>
                      <Download className="w-3 h-3" /> Access Resource
                    </Button>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="font-inter text-xs text-muted-foreground">Requires {tl} plan</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16 text-muted-foreground space-y-2">
            <p className="font-cormorant text-2xl">No resources match your filters</p>
            <p className="font-inter text-sm">Try adjusting the area or type filter above.</p>
          </div>
        )}

        {/* Upgrade CTA */}
        <div className="mt-14 rounded-3xl p-10 text-center space-y-4 border border-border" style={{ backgroundColor: FOREST }}>
          <CheckCircle className="w-8 h-8 mx-auto" style={{ color: GOLD }} />
          <h2 className="font-cormorant text-3xl font-light text-white">Unlock All Resources</h2>
          <p className="font-inter text-sm max-w-sm mx-auto" style={{ color: "#cdc5b4" }}>
            Hybrid and Bespoke clients receive access to every template, guide, and video — plus custom frameworks tailored to their goals.
          </p>
          <Button className="rounded-full px-8 mt-2 font-inter" style={{ backgroundColor: GOLD, color: FOREST }}>
            Upgrade Your Plan
          </Button>
        </div>
      </div>
    </div>
  );
}