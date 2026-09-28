import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import Navbar from "../components/Navbar";
import TrendChart from "../components/insights/TrendChart";
import CategoryBreakdown from "../components/insights/CategoryBreakdown";
import RadarChart from "../components/insights/RadarChart";
import SessionHistory from "../components/insights/SessionHistory";
import CorrelationChart from "../components/insights/CorrelationChart";
import MilestoneTimeline from "../components/insights/MilestoneTimeline";
import { TrendingUp, Zap, Target, Award, Loader2, ArrowUp, ArrowDown, BookMarked } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const GOLD = "#B8952A";

const sessionTypeMap = {
  verbal_communication: "Verbal Clarity",
  written_communication: "Written Tone",
  body_language: "Confidence",
  media_training: "Media Presence",
  speech_review: "Speech Quality",
  proposal_review: "Persuasion",
  life_coaching: "Life Coaching",
};

export default function PerformanceInsights() {
  const [sessions, setSessions] = useState([]);
  const [checkIns, setCheckIns] = useState([]);
  const [goals, setGoals] = useState([]);
  const [commitments, setCommitments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [s, c, g, com] = await Promise.all([
        base44.entities.CoachingSession.list("-created_date", 100),
        base44.entities.GoalCheckIn.list("-created_date", 100),
        base44.entities.LeadershipGoal.list("-created_date", 50),
        base44.entities.Commitment.list("-created_date", 100),
      ]);
      setSessions(s);
      setCheckIns(c);
      setGoals(g);
      setCommitments(com);
      setLoading(false);
    };
    load();
  }, []);

  const sessionScores = sessions.filter(s => s.score !== undefined && s.score !== null);

  // KPIs
  const avgSessionScore = sessionScores.length > 0
    ? (sessionScores.reduce((sum, s) => sum + s.score, 0) / sessionScores.length).toFixed(1)
    : null;

  const checkInScores = checkIns.filter(c => c.score);
  const avgCheckInScore = checkInScores.length > 0
    ? (checkInScores.reduce((sum, c) => sum + c.score, 0) / checkInScores.length).toFixed(1)
    : null;

  // Improvement: first vs last session score
  const oldestScore = sessionScores.length > 0 ? sessionScores[sessionScores.length - 1].score : null;
  const latestScore = sessionScores.length > 0 ? sessionScores[0].score : null;
  const improvement = oldestScore && latestScore ? ((latestScore - oldestScore) / oldestScore * 100).toFixed(0) : null;

  const goalsAchieved = goals.filter(g => g.status === "achieved").length;

  // Trend data (chronological, last 20)
  const trendData = sessionScores
    .map(s => ({
      date: new Date(s.created_date).toLocaleDateString("en-GB", { month: "short", day: "numeric" }),
      score: s.score,
      type: sessionTypeMap[s.session_type] || s.session_type,
    }))
    .reverse()
    .slice(-20);

  // Category breakdown for bar chart
  const categoryScores = {};
  sessionScores.forEach(s => {
    const cat = sessionTypeMap[s.session_type] || s.session_type;
    if (!categoryScores[cat]) categoryScores[cat] = [];
    categoryScores[cat].push(s.score);
  });
  const categoryData = Object.entries(categoryScores).map(([name, scores]) => ({
    name,
    average: parseFloat((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)),
    count: scores.length,
  }));

  // Radar chart data
  const radarData = categoryData.map(c => ({ category: c.name, score: c.average }));

  // Weekly check-in trend
  const weeklyData = checkInScores
    .map(c => ({
      date: c.week_label || new Date(c.created_date).toLocaleDateString("en-GB", { month: "short", day: "numeric" }),
      score: c.score,
    }))
    .reverse()
    .slice(-12);

  // Correlation data: group sessions, commitments done, and avg goal score by ISO week
  const correlationData = (() => {
    const weeks = {};
    const getWeek = (d) => {
      const date = new Date(d);
      const day = date.getDay() || 7;
      date.setDate(date.getDate() + 4 - day);
      const yearStart = new Date(date.getFullYear(), 0, 1);
      const wk = Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
      return `W${wk} ${date.getFullYear().toString().slice(2)}`;
    };
    sessions.forEach(s => {
      const w = getWeek(s.created_date);
      if (!weeks[w]) weeks[w] = { week: w, sessions: 0, commitments: 0, goal_scores: [] };
      weeks[w].sessions++;
    });
    commitments.filter(c => c.implemented).forEach(c => {
      const w = getWeek(c.created_date);
      if (!weeks[w]) weeks[w] = { week: w, sessions: 0, commitments: 0, goal_scores: [] };
      weeks[w].commitments++;
    });
    checkIns.forEach(c => {
      const w = getWeek(c.created_date);
      if (!weeks[w]) weeks[w] = { week: w, sessions: 0, commitments: 0, goal_scores: [] };
      weeks[w].goal_scores.push(c.score);
    });
    return Object.values(weeks)
      .sort((a, b) => a.week.localeCompare(b.week))
      .slice(-12)
      .map(w => ({
        week: w.week,
        sessions: w.sessions,
        commitments: w.commitments,
        goal_score: w.goal_scores.length
          ? parseFloat((w.goal_scores.reduce((a, b) => a + b, 0) / w.goal_scores.length).toFixed(1))
          : null,
      }));
  })();

  // Milestone stats
  const milestoneStats = {
    sessions: sessions.length,
    commitments: commitments.filter(c => c.implemented).length,
    goals: goals.length,
    goals_achieved: goals.filter(g => g.status === "achieved").length,
    max_score: sessionScores.length > 0 ? Math.max(...sessionScores.map(s => s.score)) : 0,
  };

  const hasData = sessionScores.length > 0 || checkInScores.length > 0;

  const kpis = [
    {
      label: "Avg AI Score",
      value: avgSessionScore ?? "—",
      sub: `${sessionScores.length} sessions`,
      icon: Zap,
    },
    {
      label: "Weekly Avg",
      value: avgCheckInScore ?? "—",
      sub: `${checkInScores.length} check-ins`,
      icon: Target,
    },
    {
      label: "Improvement",
      value: improvement !== null ? `${improvement > 0 ? "+" : ""}${improvement}%` : "—",
      sub: "first vs latest session",
      icon: improvement > 0 ? ArrowUp : ArrowDown,
      highlight: improvement > 0 ? "text-green-600" : improvement < 0 ? "text-red-500" : "",
    },
    {
      label: "Goals Achieved",
      value: goalsAchieved,
      sub: `of ${goals.length} goals`,
      icon: Award,
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: GOLD }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-7xl mx-auto px-6 py-28">
        {/* Header */}
        <div className="mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-1">
            <p className="font-inter text-xs tracking-widest uppercase font-medium" style={{ color: GOLD }}>Analytics</p>
            <h1 className="font-cormorant text-4xl md:text-5xl font-light text-foreground">Performance Insights</h1>
            <p className="font-inter text-sm text-muted-foreground">Your communication improvement, visualised over time.</p>
          </div>
          <Link to="/learning" className="shrink-0">
            <Button variant="outline" className="rounded-full gap-2">
              <BookMarked className="w-4 h-4" /> My Learning Paths
            </Button>
          </Link>
        </div>

        {!hasData ? (
          <div className="text-center py-24 space-y-4">
            <TrendingUp className="w-12 h-12 mx-auto text-muted-foreground" />
            <p className="font-cormorant text-2xl text-foreground">No data yet</p>
            <p className="font-inter text-sm text-muted-foreground">
              Use the AI Coach or log goal check-ins to start tracking your progress.
            </p>
          </div>
        ) : (
          <>
            {/* KPI cards */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {kpis.map(({ label, value, sub, icon: Icon, highlight }) => (
                <div key={label} className="bg-card rounded-2xl border border-border p-5">
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-inter text-xs text-muted-foreground uppercase tracking-widest">{label}</p>
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <div className={`font-cormorant text-3xl font-medium ${highlight || "text-foreground"}`}>{value}</div>
                  <p className="font-inter text-xs text-muted-foreground mt-1">{sub}</p>
                </div>
              ))}
            </div>

            {/* Charts row 1: Line trend + Radar */}
            <div className="grid lg:grid-cols-2 gap-6 mb-6">
              {trendData.length > 1 && <TrendChart data={trendData} />}
              {radarData.length > 0 && <RadarChart data={radarData} />}
            </div>

            {/* Charts row 2: Bar category + Weekly */}
            <div className="grid lg:grid-cols-2 gap-6 mb-6">
              {categoryData.length > 0 && <CategoryBreakdown data={categoryData} />}
              {weeklyData.length > 1 && (
                <TrendChart data={weeklyData} areaChart />
              )}
            </div>

            {/* Correlation chart + Milestones */}
            <div className="grid lg:grid-cols-2 gap-6 mb-6">
              {correlationData.length >= 2 && <CorrelationChart data={correlationData} />}
              <MilestoneTimeline stats={milestoneStats} />
            </div>

            {/* Session history table */}
            <SessionHistory sessions={sessions} />
          </>
        )}
      </div>
    </div>
  );
}