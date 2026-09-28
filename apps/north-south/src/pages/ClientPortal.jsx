import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import AuthGuard from "../components/AuthGuard";
import { Button } from "@/components/ui/button";
import {
  Play, Lock, CheckCircle, Clock, Calendar, TrendingUp,
  Star, BookOpen, Target, ArrowRight, Award, Zap, Users, Crown
} from "lucide-react";

const GOLD = "#B8952A";
const OLIVE = "#3D4A2F";
const FOREST = "#2C3B2D";
const CREAM = "#F5F0E0";

// Masterclass video library — gated content
const masterclasses = [
  {
    id: 1,
    title: "Command Any Room: Executive Presence Masterclass",
    duration: "38 min",
    tier: "all",
    thumbnail: "https://media.base44.com/images/public/69dbb919df7f322227ac67eb/f99f8a34c_Gemini_Generated_Image_qpwd4aqpwd4aqpwd.png",
    description: "Learn the 5 pillars of executive presence that separate good leaders from unforgettable ones.",
    instructor: "Nishat Ismail-Kemih",
    topics: ["Body language authority", "Vocal tone mastery", "Eye contact command", "Spatial awareness"],
  },
  {
    id: 2,
    title: "The Art of the Executive Email",
    duration: "22 min",
    tier: "all",
    thumbnail: "https://media.base44.com/images/public/69dbb919df7f322227ac67eb/16b785c57_Gemini_Generated_Image_z4qu7rz4qu7rz4qu.png",
    description: "Write emails that get read, respected, and acted upon — every time.",
    instructor: "Nishat Ismail-Kemih",
    topics: ["Subject line formula", "Opening authority", "Action close technique", "Tone calibration"],
  },
  {
    id: 3,
    title: "Media Interview Masterclass: From Nervous to Broadcast-Ready",
    duration: "45 min",
    tier: "hybrid_bespoke",
    thumbnail: "https://media.base44.com/images/public/69dbb919df7f322227ac67eb/3f58a0b78_IMG_27452.png",
    description: "Exclusive broadcast training used with BBC, Al Jazeera and ITV executives.",
    instructor: "Nishat Ismail-Kemih",
    topics: ["Camera presence", "Bridging techniques", "Soundbite construction", "Handling hostile questions"],
  },
  {
    id: 4,
    title: "Cross-Cultural Intelligence: Navigating 20+ Business Cultures",
    duration: "51 min",
    tier: "hybrid_bespoke",
    thumbnail: "https://media.base44.com/images/public/69dbb919df7f322227ac67eb/b05726640_Gemini_Generated_Image_xlyc38xlyc38xlyc.png",
    description: "Deep-dive into communication protocols across Middle East, Europe, Asia and Americas.",
    instructor: "Nishat Ismail-Kemih",
    topics: ["High vs low context cultures", "Decision-making styles", "Silence & directness", "Negotiation dynamics"],
  },
  {
    id: 5,
    title: "Diplomatic Communication: The UN Method",
    duration: "33 min",
    tier: "bespoke",
    thumbnail: "https://media.base44.com/images/public/69dbb919df7f322227ac67eb/6a8857cb6_WhatsAppImage2026-04-26at005822.jpg",
    description: "How world leaders structure persuasion — and how you can apply the same frameworks.",
    instructor: "Nishat Ismail-Kemih",
    topics: ["Diplomatic framing", "Strategic ambiguity", "Multilateral stakeholders", "Protocol & precedence"],
  },
  {
    id: 6,
    title: "Overcoming Imposter Syndrome: The Confidence Reset",
    duration: "29 min",
    tier: "all",
    thumbnail: "https://media.base44.com/images/public/69dbb919df7f322227ac67eb/1dd5ec035_WhatsAppImage2026-04-26at005822.jpg",
    description: "Practical neuroscience-backed techniques to eliminate self-doubt in high-stakes situations.",
    instructor: "Nishat Ismail-Kemih",
    topics: ["Confidence anchoring", "Pre-performance rituals", "Inner narrative rewiring", "Power posing science"],
  },
];

const milestones = [
  { label: "Assessment completed", done: true },
  { label: "First AI session", done: true },
  { label: "Communication score baseline set", done: true },
  { label: "First live coaching session", done: false },
  { label: "30-day check-in", done: false },
  { label: "90-day transformation review", done: false },
];

const tierAccess = {
  ai_self_service: ["all"],
  hybrid: ["all", "hybrid_bespoke"],
  bespoke: ["all", "hybrid_bespoke", "bespoke"],
};

function VideoCard({ video, userTier }) {
  const [playing, setPlaying] = useState(false);
  const accessible = (tierAccess[userTier] || ["all"]).includes(video.tier);

  return (
    <div className="group bg-card rounded-2xl border border-border overflow-hidden hover:shadow-lg transition-all">
      {/* Thumbnail */}
      <div className="relative h-44 overflow-hidden">
        <img src={video.thumbnail} alt={video.title}
          className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 ${!accessible ? "filter grayscale opacity-60" : ""}`} />
        <div className="absolute inset-0 flex items-center justify-center"
          style={{ background: "linear-gradient(to bottom, transparent 40%, rgba(44,59,45,0.7))" }}>
          {accessible ? (
            <button
              onClick={() => setPlaying(true)}
              className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110 active:scale-95"
              style={{ backgroundColor: GOLD }}>
              <Play className="w-5 h-5 text-white ml-0.5" />
            </button>
          ) : (
            <div className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
              <Lock className="w-5 h-5 text-white" />
            </div>
          )}
        </div>
        <div className="absolute bottom-3 right-3">
          <span className="font-inter text-xs px-2.5 py-1 rounded-full text-white"
            style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
            {video.duration}
          </span>
        </div>
        {!accessible && (
          <div className="absolute top-3 left-3">
            <span className="font-inter text-xs px-2.5 py-1 rounded-full text-white"
              style={{ backgroundColor: GOLD }}>
              Upgrade to unlock
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5 space-y-3">
        <h3 className="font-cormorant text-lg font-medium text-foreground leading-tight">{video.title}</h3>
        <p className="font-inter text-xs text-muted-foreground leading-relaxed">{video.description}</p>
        <div className="flex flex-wrap gap-1.5">
          {video.topics.slice(0, 3).map((t, i) => (
            <span key={i} className="font-inter text-xs px-2 py-0.5 rounded-full"
              style={{ backgroundColor: GOLD + "15", color: FOREST }}>
              {t}
            </span>
          ))}
        </div>
        <div className="flex items-center justify-between pt-1">
          <span className="font-inter text-xs text-muted-foreground">{video.instructor}</span>
          {accessible ? (
            <button onClick={() => setPlaying(true)}
              className="flex items-center gap-1 font-inter text-xs font-medium"
              style={{ color: GOLD }}>
              Watch now <ArrowRight className="w-3 h-3" />
            </button>
          ) : (
            <Link to="/discovery" className="flex items-center gap-1 font-inter text-xs font-medium"
              style={{ color: GOLD }}>
              Upgrade <ArrowRight className="w-3 h-3" />
            </Link>
          )}
        </div>
      </div>

      {/* Simple player modal */}
      {playing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6"
          style={{ backgroundColor: "rgba(0,0,0,0.85)" }}
          onClick={() => setPlaying(false)}>
          <div className="bg-card rounded-3xl p-8 max-w-lg w-full text-center space-y-4 shadow-2xl"
            onClick={e => e.stopPropagation()}>
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
              style={{ backgroundColor: GOLD + "20" }}>
              <Play className="w-7 h-7" style={{ color: GOLD }} />
            </div>
            <h3 className="font-cormorant text-2xl font-medium text-foreground">{video.title}</h3>
            <p className="font-inter text-sm text-muted-foreground">
              This masterclass video is available exclusively to active NSC members. Your coach will share the secure viewing link during your next session, or via your registered email.
            </p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => setPlaying(false)} variant="outline" className="rounded-full px-6 font-inter">
                Close
              </Button>
              <Link to="/my-bookings">
                <Button className="rounded-full px-6 font-inter" style={{ backgroundColor: GOLD, color: CREAM }}>
                  My Sessions
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ClientPortal() {
  const [user, setUser] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    const load = async () => {
      try {
        const me = await base44.auth.me();
        setUser(me);
        const [b, s, g] = await Promise.all([
          base44.entities.Booking.list("-created_date", 10),
          base44.entities.CoachingSession.list("-created_date", 5),
          base44.entities.LeadershipGoal.list("-created_date", 5),
        ]);
        setBookings(b);
        setSessions(s);
        setGoals(g);
      } catch (e) {}
      setLoading(false);
    };
    load();
  }, []);

  const userTier = user?.recommended_tier === "bespoke" ? "bespoke"
    : user?.recommended_tier === "hybrid" ? "hybrid"
    : "ai_self_service";

  const tierLabel = { bespoke: "Bespoke Retainer", hybrid: "Hybrid Coaching", ai_self_service: "AI Self-Service" };
  const tierIcon = { bespoke: Crown, hybrid: Users, ai_self_service: Zap };
  const TierIcon = tierIcon[userTier] || Zap;

  const upcomingBookings = bookings.filter(b => b.status === "pending" || b.status === "confirmed");
  const avgScore = sessions.length > 0
    ? Math.round(sessions.filter(s => s.score).reduce((a, c) => a + c.score, 0) / sessions.filter(s => s.score).length)
    : null;
  const doneCount = milestones.filter(m => m.done).length;

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "sessions", label: "Sessions" },
    { id: "masterclasses", label: "Masterclasses" },
    { id: "goals", label: "Goals" },
  ];

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: OLIVE }}>
      <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin" />
    </div>
  );

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="max-w-7xl mx-auto px-6 py-28">

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
            <div>
              <p className="font-inter text-xs tracking-widest uppercase font-medium mb-1" style={{ color: GOLD }}>Client Portal</p>
              <h1 className="font-cormorant text-4xl md:text-5xl font-light text-foreground">
                Welcome back, <em style={{ color: GOLD }}>{user?.full_name?.split(" ")[0] || "Executive"}</em>
              </h1>
            </div>
            <div className="flex items-center gap-3 rounded-2xl px-5 py-3 border"
              style={{ backgroundColor: OLIVE + "10", borderColor: GOLD + "30" }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: GOLD + "20" }}>
                <TierIcon className="w-4 h-4" style={{ color: GOLD }} />
              </div>
              <div>
                <p className="font-inter text-xs text-muted-foreground">Your plan</p>
                <p className="font-cormorant text-base font-medium text-foreground">{tierLabel[userTier]}</p>
              </div>
              <Link to="/discovery">
                <Button size="sm" variant="ghost" className="rounded-full font-inter text-xs ml-2"
                  style={{ color: GOLD }}>Upgrade</Button>
              </Link>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-8 border-b" style={{ borderColor: GOLD + "20" }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className="font-inter text-sm px-5 py-3 transition-all relative"
                style={{ color: activeTab === t.id ? FOREST : FOREST + "60" }}>
                {t.label}
                {activeTab === t.id && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" style={{ backgroundColor: GOLD }} />
                )}
              </button>
            ))}
          </div>

          {/* OVERVIEW TAB */}
          {activeTab === "overview" && (
            <div className="space-y-8">
              {/* Stats row */}
              <div className="grid sm:grid-cols-4 gap-4">
                {[
                  { label: "Sessions Completed", value: sessions.length || "0", IconComp: CheckCircle, color: "#16a34a" },
                  { label: "Upcoming Bookings", value: upcomingBookings.length || "0", IconComp: Calendar, color: GOLD },
                  { label: "Communication Score", value: avgScore ? `${avgScore}/10` : "—", IconComp: Star, color: GOLD },
                  { label: "Goals Active", value: goals.filter(g => g.status === "active").length || "0", IconComp: Target, color: FOREST },
                ].map(({ label, value, IconComp, color }) => (
                  <div key={label} className="bg-card rounded-2xl border border-border p-5 space-y-2">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: color + "15" }}>
                      <IconComp className="w-4 h-4" style={{ color }} />
                    </div>
                    <div className="font-cormorant text-3xl font-medium text-foreground">{value}</div>
                    <div className="font-inter text-xs text-muted-foreground">{label}</div>
                  </div>
                ))}
              </div>

              {/* Engagement progress */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-card rounded-2xl border border-border p-6 space-y-5">
                  <h2 className="font-cormorant text-xl font-medium text-foreground flex items-center gap-2">
                    <Award className="w-5 h-5" style={{ color: GOLD }} />
                    Your Coaching Journey
                  </h2>
                  <div className="space-y-3">
                    {milestones.map((m, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                          style={{ backgroundColor: m.done ? "#16a34a15" : GOLD + "10" }}>
                          {m.done
                            ? <CheckCircle className="w-3.5 h-3.5" style={{ color: "#16a34a" }} />
                            : <Clock className="w-3.5 h-3.5" style={{ color: GOLD }} />}
                        </div>
                        <span className={`font-inter text-sm ${m.done ? "text-foreground" : "text-muted-foreground"}`}>{m.label}</span>
                        {m.done && <span className="ml-auto font-inter text-xs" style={{ color: "#16a34a" }}>Done</span>}
                      </div>
                    ))}
                  </div>
                  <div className="pt-2">
                    <div className="flex justify-between font-inter text-xs text-muted-foreground mb-1.5">
                      <span>Journey progress</span><span>{doneCount}/{milestones.length}</span>
                    </div>
                    <div className="h-2 rounded-full bg-secondary overflow-hidden">
                      <div className="h-full rounded-full transition-all"
                        style={{ width: `${(doneCount / milestones.length) * 100}%`, backgroundColor: GOLD }} />
                    </div>
                  </div>
                </div>

                {/* Upcoming sessions */}
                <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="font-cormorant text-xl font-medium text-foreground flex items-center gap-2">
                      <Calendar className="w-5 h-5" style={{ color: GOLD }} />
                      Upcoming Sessions
                    </h2>
                    <Link to="/book">
                      <Button size="sm" variant="ghost" className="rounded-full font-inter text-xs"
                        style={{ color: GOLD }}>+ Book</Button>
                    </Link>
                  </div>
                  {upcomingBookings.length === 0 ? (
                    <div className="text-center py-8 space-y-3">
                      <p className="font-inter text-sm text-muted-foreground">No upcoming sessions.</p>
                      <Link to="/book">
                        <Button size="sm" className="rounded-full font-inter" style={{ backgroundColor: GOLD, color: CREAM }}>
                          Book a Session
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {upcomingBookings.slice(0, 4).map(b => (
                        <div key={b.id} className="flex items-center justify-between p-3 rounded-xl"
                          style={{ backgroundColor: OLIVE + "08" }}>
                          <div>
                            <p className="font-inter text-sm font-medium text-foreground">{b.session_type}</p>
                            <p className="font-inter text-xs text-muted-foreground mt-0.5">
                              {b.preferred_date ? new Date(b.preferred_date).toLocaleDateString("en-GB", { day: "numeric", month: "long" }) : "Date TBC"}
                              {b.preferred_time && ` · ${b.preferred_time}`}
                            </p>
                          </div>
                          <span className="font-inter text-xs px-2.5 py-1 rounded-full"
                            style={{ backgroundColor: b.status === "confirmed" ? "#dbeafe" : GOLD + "20", color: b.status === "confirmed" ? "#1d4ed8" : FOREST }}>
                            {b.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Quick nav */}
              <div className="grid sm:grid-cols-3 gap-4">
                {[
                  { IconComp: Zap, label: "AI Coach", desc: "Practise between sessions", href: "/ai-coach" },
                  { IconComp: TrendingUp, label: "Performance Insights", desc: "Track your progress scores", href: "/insights" },
                  { IconComp: BookOpen, label: "Resource Library", desc: "Templates & frameworks", href: "/resources" },
                ].map(({ IconComp, label, desc, href }) => (
                  <Link key={href} to={href}
                    className="group bg-card rounded-2xl border border-border p-5 hover:shadow-md transition-all"
                    style={{ borderColor: "hsl(var(--border))" }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = GOLD + "50"}
                    onMouseLeave={e => e.currentTarget.style.borderColor = ""}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
                      style={{ backgroundColor: GOLD + "15" }}>
                      <IconComp className="w-4 h-4" style={{ color: GOLD }} />
                    </div>
                    <p className="font-cormorant text-lg font-medium text-foreground">{label}</p>
                    <p className="font-inter text-xs text-muted-foreground mt-1">{desc}</p>
                    <div className="flex items-center gap-1 mt-3 font-inter text-xs font-medium" style={{ color: GOLD }}>
                      Open <ArrowRight className="w-3 h-3" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* SESSIONS TAB */}
          {activeTab === "sessions" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-6">
                <p className="font-inter text-sm text-muted-foreground">{bookings.length} booking{bookings.length !== 1 ? "s" : ""} in total</p>
                <Link to="/book">
                  <Button className="rounded-full font-inter" style={{ backgroundColor: GOLD, color: CREAM }}>
                    + Book New Session
                  </Button>
                </Link>
              </div>
              {bookings.length === 0 ? (
                <div className="text-center py-20">
                  <p className="font-inter text-muted-foreground">No sessions booked yet.</p>
                  <Link to="/book"><Button className="mt-4 rounded-full" style={{ backgroundColor: GOLD, color: CREAM }}>Book Now</Button></Link>
                </div>
              ) : (
                bookings.map(b => (
                  <div key={b.id} className="bg-card rounded-2xl border border-border p-5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: GOLD + "15" }}>
                        <Calendar className="w-5 h-5" style={{ color: GOLD }} />
                      </div>
                      <div>
                        <p className="font-inter text-sm font-medium text-foreground">{b.session_type}</p>
                        <p className="font-inter text-xs text-muted-foreground mt-0.5">
                          {b.preferred_date ? new Date(b.preferred_date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "long", year: "numeric" }) : "Date TBC"}
                          {b.preferred_time && ` · ${b.preferred_time}`}
                        </p>
                        <p className="font-inter text-xs text-muted-foreground">{b.service_tier?.replace(/_/g, " ")}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {b.meet_link && (
                        <a href={b.meet_link} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" className="rounded-full font-inter" style={{ backgroundColor: OLIVE, color: CREAM }}>
                            Join Meet
                          </Button>
                        </a>
                      )}
                      <span className="font-inter text-xs px-3 py-1.5 rounded-full capitalize"
                        style={{
                          backgroundColor: b.status === "confirmed" ? "#dbeafe" : b.status === "completed" ? "#dcfce7" : b.status === "cancelled" ? "#fee2e2" : GOLD + "20",
                          color: b.status === "confirmed" ? "#1d4ed8" : b.status === "completed" ? "#16a34a" : b.status === "cancelled" ? "#dc2626" : FOREST,
                        }}>
                        {b.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* MASTERCLASSES TAB */}
          {activeTab === "masterclasses" && (
            <div className="space-y-6">
              <div className="rounded-2xl p-5 flex items-start gap-4 border"
                style={{ backgroundColor: OLIVE + "08", borderColor: GOLD + "30" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: GOLD + "20" }}>
                  <Play className="w-4 h-4" style={{ color: GOLD }} />
                </div>
                <div>
                  <p className="font-cormorant text-lg font-medium text-foreground">Exclusive Masterclass Library</p>
                  <p className="font-inter text-sm text-muted-foreground mt-0.5">
                    Recorded sessions from Nishat and senior coaches — available any time, anywhere. Some content is gated to Hybrid and Bespoke plans.
                  </p>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {masterclasses.map(v => (
                  <VideoCard key={v.id} video={v} userTier={userTier} />
                ))}
              </div>
              {userTier === "ai_self_service" && (
                <div className="rounded-2xl p-8 text-center space-y-3 border"
                  style={{ backgroundColor: OLIVE, borderColor: GOLD + "30" }}>
                  <Lock className="w-8 h-8 mx-auto" style={{ color: GOLD }} />
                  <h3 className="font-cormorant text-2xl font-light text-white">Unlock all 6 masterclasses</h3>
                  <p className="font-inter text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
                    Upgrade to Hybrid or Bespoke to access the full library including Media Training and Cross-Cultural Intelligence.
                  </p>
                  <Link to="/discovery">
                    <Button className="rounded-full font-inter mt-2" style={{ backgroundColor: GOLD, color: CREAM }}>
                      Book Discovery Call
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* GOALS TAB */}
          {activeTab === "goals" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-6">
                <p className="font-inter text-sm text-muted-foreground">{goals.length} goal{goals.length !== 1 ? "s" : ""} set</p>
                <Link to="/goals">
                  <Button className="rounded-full font-inter" style={{ backgroundColor: GOLD, color: CREAM }}>
                    + Add Goal
                  </Button>
                </Link>
              </div>
              {goals.length === 0 ? (
                <div className="text-center py-20">
                  <p className="font-inter text-muted-foreground">No leadership goals set yet.</p>
                  <Link to="/goals"><Button className="mt-4 rounded-full" style={{ backgroundColor: GOLD, color: CREAM }}>Set Your First Goal</Button></Link>
                </div>
              ) : (
                goals.map(g => (
                  <div key={g.id} className="bg-card rounded-2xl border border-border p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-inter text-xs px-2.5 py-0.5 rounded-full capitalize"
                            style={{ backgroundColor: GOLD + "15", color: FOREST }}>
                            {g.category?.replace(/_/g, " ")}
                          </span>
                          <span className="font-inter text-xs px-2.5 py-0.5 rounded-full capitalize"
                            style={{
                              backgroundColor: g.status === "achieved" ? "#dcfce7" : g.status === "paused" ? "#f3f4f6" : OLIVE + "15",
                              color: g.status === "achieved" ? "#16a34a" : g.status === "paused" ? "#6b7280" : FOREST,
                            }}>
                            {g.status}
                          </span>
                        </div>
                        <h3 className="font-cormorant text-xl font-medium text-foreground">{g.title}</h3>
                        {g.description && <p className="font-inter text-sm text-muted-foreground mt-1">{g.description}</p>}
                      </div>
                      {g.current_score && (
                        <div className="text-center shrink-0">
                          <div className="font-cormorant text-3xl font-medium" style={{ color: GOLD }}>{g.current_score}</div>
                          <div className="font-inter text-xs text-muted-foreground">/ {g.target_score || 10}</div>
                        </div>
                      )}
                    </div>
                    {g.current_score && g.target_score && (
                      <div className="mt-4">
                        <div className="h-2 rounded-full bg-secondary overflow-hidden">
                          <div className="h-full rounded-full"
                            style={{ width: `${Math.min((g.current_score / g.target_score) * 100, 100)}%`, backgroundColor: GOLD }} />
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}