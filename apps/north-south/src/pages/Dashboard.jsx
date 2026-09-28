import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { Button } from "@/components/ui/button";
import { Sparkles, Calendar, BookOpen, ArrowRight, TrendingUp, Clock } from "lucide-react";
import SpeechAnalyser from "@/components/dashboard/SpeechAnalyser";
import GamificationBar from "@/components/dashboard/GamificationBar";
import CommitmentModal from "@/components/dashboard/CommitmentModal";
import CommitmentsPanel from "@/components/dashboard/CommitmentsPanel";
import CalendarPrepPanel from "@/components/dashboard/CalendarPrepPanel";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [allSessions, setAllSessions] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [goals, setGoals] = useState([]);
  const [commitments, setCommitments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCommitmentModal, setShowCommitmentModal] = useState(false);
  const [commitmentSession, setCommitmentSession] = useState(null);

  const load = async () => {
    try {
      const me = await base44.auth.me();
      setUser(me);
      const [s, allS, b, g, c] = await Promise.all([
        base44.entities.CoachingSession.list("-created_date", 5),
        base44.entities.CoachingSession.list("-created_date", 200),
        base44.entities.Booking.list("-created_date", 5),
        base44.entities.LeadershipGoal.list("-created_date", 50),
        base44.entities.Commitment.list("-created_date", 20),
      ]);
      setSessions(s);
      setAllSessions(allS);
      setBookings(b);
      setGoals(g);
      setCommitments(c);
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const sessionTypeLabel = {
    verbal_communication: "Verbal Communication",
    written_communication: "Written Communication",
    body_language: "Body Language",
    media_training: "Media Training",
    life_coaching: "Life Coaching",
    speech_review: "Speech Review",
    proposal_review: "Proposal Review",
  };

  const statusColor = {
    pending: "bg-amber-100 text-amber-700",
    confirmed: "bg-blue-100 text-blue-700",
    completed: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
  };

  const handleSessionComplete = (session) => {
    setCommitmentSession(session);
    setShowCommitmentModal(true);
  };

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-border border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-6xl mx-auto px-6 py-28">
        <div className="mb-8 space-y-1">
          <p className="font-inter text-sm text-muted-foreground">Welcome back,</p>
          <h1 className="font-cormorant text-4xl md:text-5xl font-light text-foreground">
            {user?.full_name || "Executive"}
          </h1>
        </div>

        {/* Gamification: Streak + Level + Badges */}
        <GamificationBar sessions={allSessions} />

        {/* Quick actions */}
        <div className="grid sm:grid-cols-3 gap-4 mb-8">
          {[
            { icon: Sparkles, label: "AI Coach", desc: "Analyse writing or speech", href: "/ai-coach", cta: "Open Coach" },
            { icon: Calendar, label: "Book Session", desc: "Schedule with your coach", href: "/book", cta: "Book Now" },
            { icon: BookOpen, label: "Resources", desc: "Frameworks & templates", href: "/resources", cta: "Browse" },
          ].map(({ icon: Icon, label, desc, href, cta }) => (
            <Link key={label} to={href} className="group bg-card rounded-2xl p-6 border border-border hover:border-primary/40 hover:shadow-md transition-all">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <div className="font-cormorant text-lg font-medium text-foreground">{label}</div>
              <div className="font-inter text-xs text-muted-foreground mt-1 mb-4">{desc}</div>
              <div className="flex items-center gap-1 text-primary text-xs font-inter font-medium">
                {cta} <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </Link>
          ))}
        </div>

        {/* Speech Analysis */}
        <div className="mb-8">
          <SpeechAnalyser />
        </div>

        {/* Calendar prep suggestions */}
        <div className="mb-8">
          <CalendarPrepPanel />
        </div>

        {/* Weekly Commitments */}
        {commitments.length > 0 && (
          <div className="mb-8">
            <CommitmentsPanel
              commitments={commitments}
              goals={goals}
              onRefresh={load}
            />
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-8">
          {/* Bookings */}
          <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-cormorant text-xl font-medium text-foreground flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" /> Upcoming Bookings
              </h2>
              <Link to="/book">
                <Button variant="ghost" size="sm" className="text-xs rounded-full">+ New</Button>
              </Link>
            </div>

            {bookings.length === 0 ? (
              <div className="text-center py-8">
                <p className="font-inter text-sm text-muted-foreground">No bookings yet.</p>
                <Link to="/book">
                  <Button size="sm" className="mt-3 rounded-full">Book a Session</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {bookings.map(b => (
                  <div key={b.id} className="flex items-center justify-between p-3 bg-secondary/40 rounded-xl">
                    <div>
                      <div className="font-inter text-sm font-medium text-foreground">{b.session_type}</div>
                      <div className="font-inter text-xs text-muted-foreground mt-0.5">
                        {b.preferred_date ? new Date(b.preferred_date).toLocaleDateString() : "Date TBC"} · {b.service_tier?.replace("_", " ")}
                      </div>
                    </div>
                    <span className={`text-xs font-inter px-2.5 py-1 rounded-full ${statusColor[b.status] || "bg-secondary text-muted-foreground"}`}>
                      {b.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sessions */}
          <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-cormorant text-xl font-medium text-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" /> Recent AI Sessions
              </h2>
              <Link to="/ai-coach">
                <Button variant="ghost" size="sm" className="text-xs rounded-full">+ New</Button>
              </Link>
            </div>

            {sessions.length === 0 ? (
              <div className="text-center py-8">
                <p className="font-inter text-sm text-muted-foreground">No sessions yet.</p>
                <Link to="/ai-coach">
                  <Button size="sm" className="mt-3 rounded-full">Try AI Coach</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {sessions.map(s => (
                  <div key={s.id} className="flex items-center justify-between p-3 bg-secondary/40 rounded-xl group">
                    <div>
                      <div className="font-inter text-sm font-medium text-foreground">{s.title}</div>
                      <div className="font-inter text-xs text-muted-foreground mt-0.5">
                        {sessionTypeLabel[s.session_type] || s.session_type}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {s.score !== undefined && (
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="font-cormorant text-sm font-medium text-primary">{s.score}</span>
                        </div>
                      )}
                      {s.status === "submitted" && (
                        <Button size="sm" variant="ghost"
                          className="text-xs rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleSessionComplete(s)}>
                          + Commit
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showCommitmentModal && (
        <CommitmentModal
          session={commitmentSession}
          goals={goals}
          onClose={() => setShowCommitmentModal(false)}
          onSaved={() => { setShowCommitmentModal(false); load(); }}
        />
      )}
    </div>
  );
}