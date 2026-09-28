import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import FooterSection from "../components/landing/FooterSection";
import { ArrowRight, TrendingUp, Globe, Mic, FileText } from "lucide-react";

const cases = [
  {
    icon: Mic,
    label: "Media Training",
    industry: "International Media",
    title: "From Hesitant Interviewee to Broadcast Confidence",
    client: "Senior Director, Al Jazeera English",
    challenge: "A senior director experienced recurring anxiety before live broadcast appearances — resulting in stilted delivery and an inability to handle difficult questioning. Despite deep editorial expertise, on-screen credibility was suffering and stakeholder confidence was declining.",
    approach: "Eight weeks of intensive 1:1 media coaching combining on-camera technique with rapid-fire Q&A simulations, breathing and vocal delivery exercises, and personal narrative development tailored to their broadcast persona.",
    results: [
      "Completed 14 live broadcast interviews with confident, composed delivery",
      "Audience trust ratings increased by 34% over the coaching period",
      "Invited to become a recurring expert commentator on flagship programming",
      "Renewed confidence translated directly into stronger internal leadership presence",
    ],
    image: "https://media.base44.com/images/public/69dbb919df7f322227ac67eb/72e754dc0_WhatsAppImage2026-04-26at005534.jpg",
    metric: "+34%",
    metricLabel: "Viewer trust",
  },
  {
    icon: Globe,
    label: "Cross-Cultural Communication",
    industry: "Automotive / Global Corporate",
    title: "Rewriting the Narrative for a Multinational Brand Launch",
    client: "VP Communications, Stellantis",
    challenge: "A senior VP had to present a major strategic realignment to audiences in France, the UAE and Japan. The same messaging was landing very differently across cultural contexts — in some instances causing confusion and damaging trust with key stakeholders.",
    approach: "A bespoke cultural communication audit, complete message re-engineering for each regional audience, and intensive role-play sessions simulating realistic boardroom reactions across all three markets.",
    results: [
      "Three regional presentations delivered successfully with no negative incident",
      "One corporate film produced during the engagement was later cited by the French government as a reference document",
      "Stakeholder alignment accelerated by six weeks ahead of schedule",
      "Personal communication score improved from 6.1 to 8.9 out of 10",
    ],
    image: "https://media.base44.com/images/public/69dbb919df7f322227ac67eb/c5faac0b3_generated_image.png",
    metric: "6→9",
    metricLabel: "Communication score",
  },
  {
    icon: FileText,
    label: "Written Communication",
    industry: "Banking & Finance",
    title: "Elevating Executive Writing Across an HSBC Leadership Team",
    client: "Director-level team, HSBC Global Communications",
    challenge: "A 12-person leadership team produced inconsistent written communications — ranging from overly technical to inappropriately casual. Internal surveys revealed low confidence in executive written output and stakeholders were requesting clearer correspondence.",
    approach: "A three-month structured programme combining individual writing assessments, fortnightly group workshops and AI-assisted feedback sessions between live coaching sessions. Each participant received a personalised improvement plan.",
    results: [
      "Team written communication clarity score rose by 41% across all assessed outputs",
      "Stakeholder response rates to executive correspondence improved measurably",
      "Two team members cited improved communication as a contributing factor in their promotions",
      "A custom tone-of-voice framework was created and adopted across the entire division",
    ],
    image: "https://media.base44.com/images/public/69dbb919df7f322227ac67eb/1e27eafd1_WhatsAppImage2026-04-26at0133121.jpg",
    metric: "+41%",
    metricLabel: "Clarity score",
  },
  {
    icon: TrendingUp,
    label: "Diplomatic Communication",
    industry: "Government & International Affairs",
    title: "Preparing a Ministerial Delegation for UN Negotiations",
    client: "Minister-level delegation, Francophone Africa",
    challenge: "A ministerial delegation faced high-stakes multilateral negotiations at the United Nations. Complex cultural dynamics, language nuances and strict diplomatic protocol created significant communication risk — with little margin for error at the international level.",
    approach: "Intensive pre-delegation preparation including diplomatic protocol briefings, negotiation language coaching in both English and French, and scenario-based simulations of difficult moments with international counterparts at the table.",
    results: [
      "Delegation secured all primary negotiation objectives at the first session",
      "The Minister received a personal commendation for engagement style from a senior UN representative",
      "The negotiation framework developed was subsequently adopted as a model by two other national delegations",
      "An ongoing advisory retainer was established following the success of the engagement",
    ],
    image: "https://media.base44.com/images/public/69dbb919df7f322227ac67eb/6a8857cb6_WhatsAppImage2026-04-26at005822.jpg",
    metric: "100%",
    metricLabel: "Objectives achieved",
  },
];

export default function CaseStudies() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-7xl mx-auto px-6 py-28">

        <div className="text-center mb-20 space-y-4">
          <p className="font-inter text-xs tracking-widest uppercase font-medium text-primary">Results & Impact</p>
          <h1 className="font-cormorant text-5xl md:text-6xl font-light text-foreground leading-tight">
            Transformations that<br /><em>speak for themselves</em>
          </h1>
          <p className="font-inter text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Real outcomes from real engagements — across media, government, international business and corporate teams.
            All cases anonymised to protect client confidentiality.
          </p>
        </div>

        <div className="space-y-16">
          {cases.map((c, i) => (
            <div key={i} className={`grid md:grid-cols-2 gap-12 items-center ${i % 2 === 1 ? "md:grid-flow-col-dense" : ""}`}>
              {/* Image */}
              <div className={`relative ${i % 2 === 1 ? "md:col-start-2" : ""}`}>
                <div className="rounded-3xl overflow-hidden shadow-xl aspect-[4/3]">
                  <img src={c.image} alt={c.title}
                    className="w-full h-full object-cover" style={{ objectPosition: "center 25%" }} />
                  <div className="absolute inset-0 bg-gradient-to-t from-foreground/50 to-transparent" />
                </div>
                {/* Metric badge */}
                <div className="absolute -bottom-5 -right-4 rounded-2xl p-5 shadow-xl text-center min-w-[110px]"
                  style={{ backgroundColor: "#705546" }}>
                  <div className="font-cormorant text-3xl font-medium text-white">{c.metric}</div>
                  <div className="font-inter text-xs text-white/70 mt-0.5">{c.metricLabel}</div>
                </div>
              </div>

              {/* Content */}
              <div className={`space-y-5 ${i % 2 === 1 ? "md:col-start-1" : ""}`}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: "#705546" + "15" }}>
                    <c.icon className="w-4 h-4" style={{ color: "#705546" }} />
                  </div>
                  <div>
                    <span className="font-inter text-xs font-medium text-primary">{c.label}</span>
                    <span className="font-inter text-xs text-muted-foreground mx-2">·</span>
                    <span className="font-inter text-xs text-muted-foreground">{c.industry}</span>
                  </div>
                </div>

                <h2 className="font-cormorant text-3xl font-light text-foreground leading-tight">{c.title}</h2>
                <p className="font-inter text-xs text-muted-foreground tracking-widest uppercase">{c.client}</p>

                <div className="space-y-3">
                  <div>
                    <p className="font-inter text-xs font-medium text-foreground mb-1 uppercase tracking-widest">The Challenge</p>
                    <p className="font-inter text-sm text-muted-foreground leading-relaxed">{c.challenge}</p>
                  </div>
                  <div>
                    <p className="font-inter text-xs font-medium text-foreground mb-1 uppercase tracking-widest">Our Approach</p>
                    <p className="font-inter text-sm text-muted-foreground leading-relaxed">{c.approach}</p>
                  </div>
                </div>

                <div className="rounded-2xl p-5 space-y-2" style={{ backgroundColor: "#705546" + "0D" }}>
                  <p className="font-inter text-xs font-medium uppercase tracking-widest text-primary">Results</p>
                  {c.results.map((r, j) => (
                    <div key={j} className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full mt-2 shrink-0" style={{ backgroundColor: "#705546" }} />
                      <p className="font-inter text-sm text-muted-foreground">{r}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-24 rounded-3xl p-12 text-center space-y-5" style={{ backgroundColor: "#373935" }}>
          <p className="font-inter text-xs tracking-widest uppercase font-medium" style={{ color: "#967462" }}>Your Story Next</p>
          <h2 className="font-cormorant text-4xl font-light text-white leading-tight">
            Every transformation<br /><em style={{ color: "#967462" }}>begins with one conversation.</em>
          </h2>
          <p className="font-inter text-white/60 max-w-lg mx-auto">Book a free 30-minute discovery call — no commitment, just clarity on how we can help you achieve results like these.</p>
          <Link to="/discovery">
            <button className="font-inter text-sm px-8 py-3 rounded-full transition-opacity hover:opacity-90 gap-2 inline-flex items-center"
              style={{ backgroundColor: "#705546", color: "white" }}>
              Book Free Discovery Call <ArrowRight className="w-4 h-4" />
            </button>
          </Link>
        </div>
      </div>
      <FooterSection />
    </div>
  );
}