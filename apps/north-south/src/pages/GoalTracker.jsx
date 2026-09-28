import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import Navbar from "../components/Navbar";
import GoalCard from "../components/goals/GoalCard";
import NewGoalModal from "../components/goals/NewGoalModal";
import CheckInModal from "../components/goals/CheckInModal";
import { Button } from "@/components/ui/button";
import { Target, Plus, Trophy, TrendingUp, Loader2 } from "lucide-react";

export default function GoalTracker() {
  const [goals, setGoals] = useState([]);
  const [checkIns, setCheckIns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [checkInGoal, setCheckInGoal] = useState(null);
  const [filter, setFilter] = useState("active");

  const load = async () => {
    setLoading(true);
    const [g, c] = await Promise.all([
      base44.entities.LeadershipGoal.list("-created_date", 50),
      base44.entities.GoalCheckIn.list("-created_date", 200),
    ]);
    setGoals(g);
    setCheckIns(c);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = goals.filter(g => filter === "all" ? true : g.status === filter);
  const achieved = goals.filter(g => g.status === "achieved").length;
  const active = goals.filter(g => g.status === "active").length;
  const avgProgress = goals.length
    ? Math.round(goals.filter(g => g.current_score && g.target_score)
        .reduce((acc, g) => acc + (g.current_score / g.target_score) * 100, 0) /
        Math.max(1, goals.filter(g => g.current_score && g.target_score).length))
    : 0;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-5xl mx-auto px-6 py-28">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div className="space-y-1">
            <p className="font-inter text-sm tracking-widest uppercase text-primary font-medium">Growth Tracker</p>
            <h1 className="font-cormorant text-4xl md:text-5xl font-light text-foreground">Leadership Goals</h1>
            <p className="font-inter text-sm text-muted-foreground">Define targets. Check in weekly. Build lasting habits.</p>
          </div>
          <Button className="rounded-full px-6 gap-2 shrink-0" onClick={() => setShowNew(true)}>
            <Plus className="w-4 h-4" /> New Goal
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: "Active Goals", value: active, icon: Target },
            { label: "Achieved", value: achieved, icon: Trophy },
            { label: "Avg Progress", value: `${avgProgress}%`, icon: TrendingUp },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="bg-card rounded-2xl border border-border p-5 flex items-center gap-4">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <div>
                <div className="font-cormorant text-2xl font-medium text-foreground">{value}</div>
                <div className="font-inter text-xs text-muted-foreground">{label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6">
          {["active", "achieved", "paused", "all"].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`font-inter text-sm px-4 py-1.5 rounded-full capitalize transition-colors ${filter === f ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-secondary/80"}`}>
              {f}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 space-y-4">
            <Target className="w-12 h-12 text-muted-foreground mx-auto" />
            <p className="font-cormorant text-2xl text-foreground">No goals yet</p>
            <p className="font-inter text-sm text-muted-foreground">Set your first leadership goal to start tracking progress.</p>
            <Button className="rounded-full px-8 mt-2" onClick={() => setShowNew(true)}>
              <Plus className="w-4 h-4 mr-2" /> Add Your First Goal
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(goal => (
              <GoalCard
                key={goal.id}
                goal={goal}
                checkIns={checkIns.filter(c => c.goal_id === goal.id)}
                onCheckIn={() => setCheckInGoal(goal)}
                onRefresh={load}
              />
            ))}
          </div>
        )}
      </div>

      {showNew && <NewGoalModal onClose={() => setShowNew(false)} onSaved={() => { setShowNew(false); load(); }} />}
      {checkInGoal && <CheckInModal goal={checkInGoal} onClose={() => setCheckInGoal(null)} onSaved={() => { setCheckInGoal(null); load(); }} />}
    </div>
  );
}