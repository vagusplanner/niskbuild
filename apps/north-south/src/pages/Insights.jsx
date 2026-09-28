import { useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import FooterSection from "../components/landing/FooterSection";
import NewsletterSignup from "@/components/NewsletterSignup";
import { ArrowRight, Clock, TrendingUp, Globe, Mic, FileText } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";

const GOLD = "#B8952A";
const OLIVE = "#3D4A2F";
const BROWN = "#705546";

// Photo URLs
const NISHAT_DESK = "https://media.base44.com/images/public/69dbb919df7f322227ac67eb/9cd5c2f05_Gemini_Generated_Image_9k9k29k9k29k9k29.png";
const NISHAT_PODIUM = "https://media.base44.com/images/public/69dbb919df7f322227ac67eb/531005525_Gemini_Generated_Image_m23gf2m23gf2m23g.png";
const NISHAT_WALL = "https://media.base44.com/images/public/69dbb919df7f322227ac67eb/57fefa1b0_Gemini_Generated_Image_5jrqg75jrqg75jrq.png";
const NISHAT_WOOD = "https://media.base44.com/images/public/69dbb919df7f322227ac67eb/769915688_Gemini_Generated_Image_qpwd4aqpwd4aqpwd.png";

const articles = [
  {
    title: "Executive Presence: What It Really Means",
    excerpt: "True executive presence is about the energy you carry into a room, the clarity of your thinking and the authority with which you speak. Here's how to develop it intentionally.",
    category: "Executive Presence",
    readTime: "6 min",
    image: NISHAT_DESK,
    featured: true,
  },
  {
    title: "How Non-Native English Speakers Can Command Any Room",
    excerpt: "Your accent is not your weakness — it's your signature. The world's most compelling communicators speak with intention and authenticity.",
    category: "Language & Communication",
    readTime: "5 min",
    image: NISHAT_WALL,
  },
  {
    title: "Body Language in Virtual Meetings",
    excerpt: "The camera has changed the rules of non-verbal communication. Here are the most common mistakes leaders make on video calls — and how to fix them.",
    category: "Body Language",
    readTime: "7 min",
    image: NISHAT_PODIUM,
  },
  {
    title: "How To Prepare For a Media Interview",
    excerpt: "Having worked with BBC, National Geographic and Al Jazeera, the executives who perform best share one thing — preparation, not just confidence.",
    category: "Media Training",
    readTime: "9 min",
    image: NISHAT_WOOD,
  },
];

const cases = [
  {
    icon: Mic,
    label: "Media Training",
    title: "From Hesitant Interviewee to Broadcast Confidence",
    client: "Senior Director, Al Jazeera English",
    result: "+34% viewer trust. 14 live broadcasts delivered with confidence.",
    metric: "+34%",
    metricLabel: "Viewer trust",
    image: NISHAT_PODIUM,
  },
  {
    icon: FileText,
    label: "Written Communication",
    title: "Elevating Executive Writing Across an HSBC Team",
    client: "Director-level team, HSBC Global Communications",
    result: "Team written clarity score rose 41%. Two members promoted, citing communication improvement.",
    metric: "+41%",
    metricLabel: "Clarity score",
    image: NISHAT_WALL,
  },
  {
    icon: TrendingUp,
    label: "Diplomatic Communication",
    title: "Preparing a Ministerial Delegation for UN Negotiations",
    client: "Minister-level delegation, Francophone Africa",
    result: "All primary objectives achieved at first session. The Minister received personal commendation from UN.",
    metric: "100%",
    metricLabel: "Objectives achieved",
    image: NISHAT_DESK,
  },
];

const categories = ["All", "Articles", "Case Studies"];

export default function Insights() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("All");

  const showArticles = activeTab === "All" || activeTab === "Articles";
  const showCases = activeTab === "All" || activeTab === "Case Studies";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-6xl mx-auto px-6 py-28">

        {/* Header */}
        <div className="text-center mb-14 space-y-4">
          <p className="font-inter text-xs tracking-widest uppercase font-medium" style={{ color: BROWN }}>
            {t("insightsTag") || "Insights & Results"}
          </p>
          <h1 className="font-cormorant text-5xl md:text-6xl font-light text-foreground leading-tight">
            {t("insightsTitle") || "Knowledge. Proof."}<br />
            <em style={{ color: GOLD }}>{t("insightsSubtitle") || "Transformation."}</em>
          </h1>
          <p className="font-inter text-muted-foreground max-w-xl mx-auto leading-relaxed">
            {t("insightsDesc") || "Practical insights from 20 years of coaching, and real results from real engagements."}
          </p>
        </div>

        {/* Tab filter */}
        <div className="flex gap-2 justify-center mb-12">
          {categories.map(c => (
            <button key={c} onClick={() => setActiveTab(c)}
              className="font-inter text-sm px-5 py-2 rounded-full transition-all"
              style={activeTab === c
                ? { backgroundColor: BROWN, color: "white" }
                : { backgroundColor: "hsl(var(--secondary))", color: "hsl(var(--muted-foreground))" }}>
              {t(`tab${c.replace(" ", "")}`) || c}
            </button>
          ))}
        </div>

        {/* Articles */}
        {showArticles && (
          <div className="mb-16">
            {activeTab !== "All" || <h2 className="font-cormorant text-3xl font-light text-foreground mb-8">
              {t("articlesTitle") || "Articles & Insights"}
            </h2>}

            {/* Featured article */}
            <div className="rounded-3xl overflow-hidden border border-border mb-8 grid md:grid-cols-2 group cursor-pointer hover:shadow-xl transition-shadow">
              <div className="relative h-64 md:h-auto overflow-hidden">
                <img src={articles[0].image} alt={articles[0].title}
                  className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700" />
              </div>
              <div className="p-8 md:p-12 flex flex-col justify-center space-y-4" style={{ backgroundColor: "#373935" }}>
                <span className="font-inter text-xs px-3 py-1 rounded-full w-fit" style={{ backgroundColor: BROWN, color: "white" }}>
                  {t("featuredLabel") || "Featured"}
                </span>
                <h3 className="font-cormorant text-3xl font-light text-white leading-tight">{articles[0].title}</h3>
                <p className="font-inter text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.6)" }}>{articles[0].excerpt}</p>
                <div className="flex items-center gap-2 font-inter text-sm font-medium" style={{ color: GOLD }}>
                  {t("readArticle") || "Read article"} <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Other articles grid */}
            <div className="grid sm:grid-cols-3 gap-5">
              {articles.slice(1).map((post, i) => (
                <article key={i} className="group bg-card rounded-2xl border border-border overflow-hidden hover:shadow-lg transition-all cursor-pointer">
                  <div className="relative h-48 overflow-hidden">
                    <img src={post.image} alt={post.title}
                      className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700" />
                  </div>
                  <div className="p-5 space-y-3">
                    <span className="font-inter text-xs px-2.5 py-1 rounded-full inline-block" style={{ backgroundColor: BROWN + "15", color: BROWN }}>
                      {post.category}
                    </span>
                    <h3 className="font-cormorant text-lg font-medium text-foreground leading-tight">{post.title}</h3>
                    <p className="font-inter text-xs text-muted-foreground leading-relaxed line-clamp-2">{post.excerpt}</p>
                    <div className="flex items-center gap-1 font-inter text-xs font-medium text-primary">
                      {t("readMore") || "Read more"} <ArrowRight className="w-3 h-3" />
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}

        {/* Case Studies */}
        {showCases && (
          <div>
            {activeTab !== "All" || <h2 className="font-cormorant text-3xl font-light text-foreground mb-8">
              {t("caseStudiesTitle") || "Client Transformations"}
            </h2>}

            <div className="space-y-8">
              {cases.map((c, i) => (
                <div key={i} className={`grid md:grid-cols-2 gap-8 items-center ${i % 2 === 1 ? "md:grid-flow-col-dense" : ""}`}>
                  <div className={`relative ${i % 2 === 1 ? "md:col-start-2" : ""}`}>
                    <div className="rounded-3xl overflow-hidden shadow-lg aspect-[4/3]">
                      <img src={c.image} alt={c.title} className="w-full h-full object-cover object-top" />
                      <div className="absolute inset-0 bg-gradient-to-t from-foreground/40 to-transparent" />
                    </div>
                    <div className="absolute -bottom-4 -right-3 rounded-2xl p-4 shadow-xl text-center min-w-[100px]"
                      style={{ backgroundColor: BROWN }}>
                      <div className="font-cormorant text-2xl font-medium text-white">{c.metric}</div>
                      <div className="font-inter text-xs text-white/70">{c.metricLabel}</div>
                    </div>
                  </div>

                  <div className={`space-y-4 ${i % 2 === 1 ? "md:col-start-1" : ""}`}>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: BROWN + "15" }}>
                        <c.icon className="w-4 h-4" style={{ color: BROWN }} />
                      </div>
                      <span className="font-inter text-xs font-medium text-primary">{c.label}</span>
                    </div>
                    <h3 className="font-cormorant text-2xl font-light text-foreground leading-tight">{c.title}</h3>
                    <p className="font-inter text-xs text-muted-foreground tracking-widest uppercase">{c.client}</p>
                    <p className="font-inter text-sm text-muted-foreground leading-relaxed">{c.result}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Newsletter */}
        <div className="mt-16 rounded-3xl p-10" style={{ backgroundColor: "#373935" }}>
          <NewsletterSignup source="insights" dark />
        </div>

        {/* CTA */}
        <div className="mt-8 rounded-3xl p-10 text-center space-y-5" style={{ backgroundColor: "#373935" }}>
          <h2 className="font-cormorant text-4xl font-light text-white leading-tight">
            {t("ctaTitle") || "Turn insight into action."}<br />
            <em style={{ color: GOLD }}>{t("insightsCtaSub") || "Your transformation starts here."}</em>
          </h2>
          <p className="font-inter text-white/60 max-w-lg mx-auto">
            {t("ctaDesc") || "Book a free discovery call and take the first step towards extraordinary communication."}
          </p>
          <Link to="/discovery">
            <button className="font-inter text-sm px-8 py-3 rounded-full mt-2 transition-opacity hover:opacity-90 inline-flex items-center gap-2"
              style={{ backgroundColor: BROWN, color: "white" }}>
              {t("freeDiscoveryCall") || "Free Discovery Call"} <ArrowRight className="w-4 h-4" />
            </button>
          </Link>
        </div>
      </div>
      <FooterSection />
    </div>
  );
}