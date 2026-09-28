import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import Navbar from "../components/Navbar";
import LearningPathCard from "../components/learning/LearningPathCard";
import GeneratePathModal from "../components/learning/GeneratePathModal";
import { Button } from "@/components/ui/button";
import { Sparkles, BookMarked, Plus, Loader2, Target } from "lucide-react";
import { Link } from "react-router-dom";

const GOLD = "#B8952A";

export default function LearningPaths() {
  const [paths, setPaths] = useState([]);
  const [goals, setGoals] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState("all");

  const load = async () => {
    const [p, g, s] = await Promise.all([
      base44.entities.LearningPath.list("-created_date", 50),
      base44.entities.LeadershipGoal.filter({ status: "active" }, "-created_date", 50),
      base44.entities.CoachingSession.list("-created_date", 100),
    ]);
    setPaths(p);
    setGoals(g);
    setSessions(s);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = paths.filter(p => filter === "all" ? true : p.status === filter);

  const totalLessons = paths.reduce((a, p) => a + (p.lessons?.length || 0), 0);
  const completedLessons = paths.reduce((a, p) => a + (p.lessons?.filter(l => l.completed).length || 0), 0);
  const activePaths = paths.filter(p => p.status === "active").length;
  const completedPaths = paths.filter(p => p.status === "completed").length;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-5xl mx-auto px-6 py-28">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div className="space-y-1">
            <p className="font-inter text-xs tracking-widest uppercase font-medium" style={{ color: GOLD }}>AI-Personalised</p>
            <h1 className="font-cormorant text-4xl md:text-5xl font-light text-foreground">Learning Paths</h1>
            <p className="font-inter text-sm text-muted-foreground">
              Structured lesson sequences generated from your goals and performance data.
            </p>
          </div>
          {goals.length > 0 && (
            <Button onClick={() => setShowModal(true)} className="rounded-full px-6 gap-2 shrink-0">
              <Plus className="w-4 h-4" /> New Path
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: GOLD }} />
          </div>
        ) : goals.length === 0 ? (
          // No goals state
          <div className="text-center py-24 space-y-4 bg-card rounded-3xl border border-border">
            <Target className="w-12 h-12 mx-auto text-muted-foreground" />
            <p className="font-cormorant text-2xl text-foreground">No leadership goals yet</p>
            <p className="font-inter text-sm text-muted-foreground max-w-sm mx-auto">
              Learning Paths are generated from your goals. Set at least one goal to get started.
            </p>
            <Link to="/goals">
              <Button className="rounded-full px-8 mt-2 gap-2">
                <Target className="w-4 h-4" /> Set a Goal
              </Button>
            </Link>
          </div>
        ) : (
          <>
            {/* Stats bar */}
            {paths.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                {[
                  { label: "Active Paths", value: activePaths, icon: BookMarked },
                  { label: "Completed", value: completedPaths, icon: Sparkles },
                  { label: "Lessons Done", value: completedLessons, icon: Sparkles },
                  { label: "Total Lessons", value: totalLessons, icon: BookMarked },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="bg-card rounded-2xl border border-border p-5 flex items-center gap-3">
                    <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <div className="font-cormorant text-2xl font-medium text-foreground">{value}</div>
                      <div className="font-inter text-xs text-muted-foreground">{label}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Filter tabs */}
            {paths.length > 0 && (
              <div className="flex gap-2 mb-6">
                {["all", "active", "completed", "paused"].map(f => (
                  <button key={f} onClick={() => setFilter(f)}
                    className={`font-inter text-sm px-4 py-1.5 rounded-full capitalize transition-colors ${filter === f ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-secondary/80"}`}>
                    {f}
                  </button>
                ))}
              </div>
            )}

            {/* Empty state for no paths yet */}
            {paths.length === 0 ? (
              <div className="text-center py-20 space-y-5 bg-card rounded-3xl border border-border p-10">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto">
                  <Sparkles className="w-7 h-7 text-primary" />
                </div>
                <div>
                  <p className="font-cormorant text-2xl text-foreground mb-1">No learning paths yet</p>
                  <p className="font-inter text-sm text-muted-foreground max-w-sm mx-auto">
                    Generate your first AI-personalised path. The AI will analyse your goals and past performance to build a tailored curriculum.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
                  <Button onClick={() => setShowModal(true)} className="rounded-full px-8 gap-2">
                    <Sparkles className="w-4 h-4" /> Generate My First Path
                  </Button>
                  <Link to="/insights">
                    <Button variant="outline" className="rounded-full px-6">View Performance Data</Button>
                  </Link>
                </div>
                {sessions.length > 0 && (
                  <p className="font-inter text-xs text-muted-foreground">
                    Using data from {sessions.length} AI coaching sessions
                  </p>
                )}
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-center font-inter text-sm text-muted-foreground py-12">No {filter} paths.</p>
            ) : (
              <div className="space-y-5">
                {filtered.map(path => (
                  <LearningPathCard key={path.id} path={path} onRefresh={load} />
                ))}
              </div>
            )}

            {/* Generate more CTA */}
            {paths.length > 0 && (
              <div className="mt-8 flex justify-center">
                <Button onClick={() => setShowModal(true)} variant="outline" className="rounded-full px-8 gap-2">
                  <Plus className="w-4 h-4" /> Generate Another Path
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {showModal && (
        <GeneratePathModal
          goals={goals}
          sessions={sessions}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load(); }}
        />
      )}
    </div>
  );
}