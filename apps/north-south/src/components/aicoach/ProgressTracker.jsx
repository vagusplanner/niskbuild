import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { TrendingUp, Plus, Award } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const typeLabel = {
  verbal_communication: "Verbal",
  written_communication: "Written",
  body_language: "Body Language",
  media_training: "Media",
  speech_review: "Speech",
  proposal_review: "Proposal",
};

export default function ProgressTracker() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.CoachingSession.filter({ status: "reviewed" }, "-created_date", 50).then(s => {
      setSessions(s);
      setLoading(false);
    });
  }, []);

  const scored = sessions.filter(s => s.score !== undefined);
  const avgScore = scored.length ? (scored.reduce((a, b) => a + b.score, 0) / scored.length).toFixed(1) : null;
  const latest = scored[0]?.score;
  const trend = scored.length >= 2 ? (scored[0].score - scored[scored.length - 1].score).toFixed(1) : null;

  const chartData = scored.slice().reverse().map((s, i) => ({
    session: i + 1,
    score: s.score,
    label: typeLabel[s.session_type] || s.session_type,
  }));

  const byType = {};
  scored.forEach(s => {
    const t = typeLabel[s.session_type] || s.session_type;
    if (!byType[t]) byType[t] = [];
    byType[t].push(s.score);
  });

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-border border-t-primary rounded-full animate-spin" /></div>;

  if (sessions.length === 0) return (
    <div className="bg-card rounded-3xl border border-border p-10 text-center space-y-4 max-w-3xl mx-auto">
      <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
        <TrendingUp className="w-6 h-6 text-primary" />
      </div>
      <h2 className="font-cormorant text-2xl font-medium text-foreground">No sessions yet</h2>
      <p className="font-inter text-sm text-muted-foreground">Complete AI coaching sessions to see your progress tracked here.</p>
      <Link to="/ai-coach"><Button className="rounded-full px-8">Start a Session</Button></Link>
    </div>
  );

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="bg-card rounded-3xl border border-border p-8 space-y-6">
        <h2 className="font-cormorant text-2xl font-medium text-foreground flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" /> Your Progress
        </h2>

        <div className="grid grid-cols-3 gap-4">
          <StatBox label="Sessions Completed" value={sessions.length} />
          <StatBox label="Average Score" value={avgScore ? `${avgScore}/10` : "—"} />
          <StatBox label={trend > 0 ? "Improvement" : "Change"} value={trend ? `${trend > 0 ? "+" : ""}${trend}` : "—"} positive={trend > 0} />
        </div>

        {chartData.length > 1 && (
          <div>
            <div className="font-inter text-xs uppercase tracking-wider text-muted-foreground font-medium mb-4">Score Over Time</div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="session" tick={{ fontSize: 11, fontFamily: "var(--font-inter)" }} label={{ value: "Session", position: "insideBottom", offset: -2, fontSize: 11 }} />
                <YAxis domain={[0, 10]} tick={{ fontSize: 11, fontFamily: "var(--font-inter)" }} />
                <Tooltip contentStyle={{ fontFamily: "var(--font-inter)", fontSize: 12 }} formatter={(v) => [`${v}/10`, "Score"]} />
                <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: "hsl(var(--primary))", r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {Object.keys(byType).length > 0 && (
          <div>
            <div className="font-inter text-xs uppercase tracking-wider text-muted-foreground font-medium mb-3">By Tool</div>
            <div className="space-y-2">
              {Object.entries(byType).map(([type, scores]) => {
                const avg = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
                return (
                  <div key={type} className="flex items-center gap-3">
                    <div className="font-inter text-sm text-muted-foreground w-28 shrink-0">{type}</div>
                    <div className="flex-1 bg-secondary rounded-full h-2">
                      <div className="bg-primary rounded-full h-2 transition-all" style={{ width: `${(avg / 10) * 100}%` }} />
                    </div>
                    <div className="font-cormorant text-lg font-medium text-primary w-10 text-right">{avg}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="bg-card rounded-2xl border border-border p-6 space-y-3">
        <div className="font-inter text-xs uppercase tracking-wider text-muted-foreground font-medium">Recent Sessions</div>
        {sessions.slice(0, 8).map(s => (
          <div key={s.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
            <div>
              <div className="font-inter text-sm text-foreground">{s.title}</div>
              <div className="font-inter text-xs text-muted-foreground">{typeLabel[s.session_type] || s.session_type}</div>
            </div>
            {s.score !== undefined && (
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="font-cormorant text-sm font-medium text-primary">{s.score}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function StatBox({ label, value, positive }) {
  return (
    <div className="bg-secondary/40 rounded-2xl p-4 text-center">
      <div className={`font-cormorant text-3xl font-medium ${positive ? "text-primary" : "text-foreground"}`}>{value}</div>
      <div className="font-inter text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  );
}