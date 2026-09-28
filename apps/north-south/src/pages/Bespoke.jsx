import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle, PresentationIcon, PenLine, Tv, Globe2, Crown,
  Users, Heart, RefreshCw, ArrowRight, Shield
} from "lucide-react";

const services = [
  {
    icon: AlertTriangle,
    title: "Crisis Communication",
    why: "Real-time judgment, stakeholder politics, and managing emotion under pressure — only a trusted human advisor can navigate this.",
    scenarios: ["Reputational threat management", "Board emergency communications", "Media crisis response"],
  },
  {
    icon: PresentationIcon,
    title: "Board & Investor Presentations",
    why: "High-stakes personal dynamics, live body language, and reading the room cannot be replicated by any tool.",
    scenarios: ["Series A–C investor decks", "Annual general meetings", "Board of Directors presentations"],
  },
  {
    icon: PenLine,
    title: "Speech Ghostwriting",
    why: "Capturing someone's authentic voice requires deep human understanding, listening, and years of craft — not an algorithm.",
    scenarios: ["Keynote addresses", "Award acceptance speeches", "Conference openings & closings"],
  },
  {
    icon: Tv,
    title: "Media & TV Appearance Coaching",
    why: "Camera presence, physical posture, broadcast instincts and real-time nerves require in-person, hands-on coaching.",
    scenarios: ["Live TV & studio broadcasts", "Podcast recordings", "Press conference preparation"],
  },
  {
    icon: Globe2,
    title: "Diplomatic & International Negotiations",
    why: "Cultural empathy, relationship trust, and reading unspoken signals demand lived experience across cultures.",
    scenarios: ["Multi-party international deals", "Government & diplomatic engagements", "Cross-border M&A communications"],
  },
  {
    icon: Crown,
    title: "C-Suite Leadership Presence",
    why: "Gravitas, authority, and true executive presence are developed through 1:1 trusted advisor relationships built over time.",
    scenarios: ["CEO communication coaching", "New executive onboarding presence", "Board-level stakeholder influence"],
  },
  {
    icon: Users,
    title: "Team & Corporate Workshops",
    why: "Group dynamics, live facilitation, and reading the energy of a room require human skill and adaptability.",
    scenarios: ["Executive team away-days", "Corporate communication training", "Leadership retreat facilitation"],
  },
  {
    icon: Heart,
    title: "Life Coaching (Deep Work)",
    why: "Trauma-informed support, emotional intelligence, and work with personal history demand human trust and safety.",
    scenarios: ["Career transition coaching", "Leadership identity work", "Burnout recovery & resilience"],
  },
  {
    icon: RefreshCw,
    title: "Personal Rebranding After Crisis",
    why: "Sensitivity, judgment, and the ability to rebuild trust require a human relationship — not a framework.",
    scenarios: ["Post-dismissal re-entry", "Public reputation rebuild", "Career pivot narrative strategy"],
  },
];

export default function Bespoke() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-6xl mx-auto px-6 py-28">

        {/* Header */}
        <div className="text-center mb-16 space-y-5">
          <div className="inline-flex items-center gap-2 bg-foreground/5 text-foreground rounded-full px-4 py-1.5 text-sm font-inter font-medium border border-border">
            <Shield className="w-3.5 h-3.5 text-primary" /> Fully Human — Bespoke Tier
          </div>
          <h1 className="font-cormorant text-5xl md:text-6xl font-light text-foreground leading-tight">
            Only a human can<br /><em className="text-primary">deliver this.</em>
          </h1>
          <p className="font-inter text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Some communication challenges require judgment, presence, trust, and lived experience. No AI tool — however sophisticated — can replace what happens in these engagements.
          </p>
          <div className="flex flex-wrap justify-center gap-4 pt-2">
            <Link to="/discovery">
              <Button size="lg" className="rounded-full px-8 gap-2">
                Book a Free Discovery Call <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link to="/book">
              <Button size="lg" variant="outline" className="rounded-full px-8">
                Request a Bespoke Engagement
              </Button>
            </Link>
          </div>
        </div>

        {/* Services Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-20">
          {services.map((service, i) => (
            <div key={i} className="bg-card rounded-3xl border border-border p-7 space-y-4 hover:shadow-lg hover:border-primary/30 transition-all group">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <service.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-cormorant text-xl font-medium text-foreground mb-2">{service.title}</h3>
                <p className="font-inter text-sm text-muted-foreground leading-relaxed">{service.why}</p>
              </div>
              <div className="space-y-1.5 pt-1">
                {service.scenarios.map((s, j) => (
                  <div key={j} className="flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-primary shrink-0" />
                    <span className="font-inter text-xs text-muted-foreground">{s}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Why human CTA */}
        <div className="bg-foreground rounded-3xl p-12 text-center space-y-6">
          <p className="font-inter text-xs tracking-widest uppercase text-background/40 font-medium">The Bespoke Difference</p>
          <h2 className="font-cormorant text-4xl md:text-5xl font-light text-background leading-tight">
            Two consultants.<br /><em>Fully in your corner.</em>
          </h2>
          <p className="font-inter text-background/70 max-w-lg mx-auto leading-relaxed">
            Bespoke engagements are tailored entirely to you — your voice, your context, your stakes. We begin with a discovery call to understand your world before proposing anything.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/discovery">
              <Button size="lg" className="rounded-full px-8 bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
                Start with a Free Discovery Call <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}