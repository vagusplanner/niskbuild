import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, ChevronDown, ChevronUp, ExternalLink, Trash2, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

const GOLD = "#B8952A";
const FOREST = "#2C3B2D";

const toolRoutes = {
  writing: "/ai-coach",
  speech: "/ai-coach",
  roleplay: "/ai-coach",
  email: "/ai-coach",
  style: "/ai-coach",
  vocab: "/ai-coach",
  body: "/ai-coach",
  resources: "/ai-coach",
  cultural: "/ai-coach",
  video: "/ai-coach",
  goals: "/goals",
  insights: "/insights",
};

export default function LearningPathCard({ path, onRefresh }) {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const completedCount = (path.lessons || []).filter(l => l.completed).length;
  const total = (path.lessons || []).length;
  const pct = total > 0 ? Math.round((completedCount / total) * 100) : 0;

  const toggleLesson = async (lessonId) => {
    const updated = (path.lessons || []).map(l =>
      l.id === lessonId ? { ...l, completed: !l.completed } : l
    );
    const done = updated.filter(l => l.completed).length;
    const newPct = total > 0 ? Math.round((done / total) * 100) : 0;
    await base44.entities.LearningPath.update(path.id, {
      lessons: updated,
      progress_pct: newPct,
      status: newPct === 100 ? "completed" : "active",
    });
    onRefresh();
  };

  const deletePath = async () => {
    setDeleting(true);
    await base44.entities.LearningPath.delete(path.id);
    onRefresh();
  };

  const statusColor = path.status === "completed"
    ? "bg-green-100 text-green-700 border-green-200"
    : path.status === "paused"
      ? "bg-amber-100 text-amber-700 border-amber-200"
      : "bg-primary/10 text-primary border-primary/20";

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      {/* Header */}
      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={`font-inter text-xs px-2.5 py-0.5 rounded-full border capitalize ${statusColor}`}>
                {path.status}
              </span>
              <span className="font-inter text-xs text-muted-foreground">{path.category?.replace(/_/g, " ")}</span>
            </div>
            <h3 className="font-cormorant text-xl font-medium text-foreground">{path.title}</h3>
            {path.goal_title && (
              <p className="font-inter text-xs text-muted-foreground mt-0.5">Goal: {path.goal_title}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {deleting
              ? <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              : <button onClick={deletePath} className="text-muted-foreground hover:text-destructive transition-colors p-1">
                  <Trash2 className="w-4 h-4" />
                </button>
            }
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4 space-y-1.5">
          <div className="flex justify-between font-inter text-xs text-muted-foreground">
            <span>{completedCount}/{total} lessons complete</span>
            <span className="font-medium text-foreground">{pct}%</span>
          </div>
          <div className="h-2 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${pct}%`, background: pct === 100 ? "#16a34a" : GOLD }}
            />
          </div>
          {path.current_score && path.target_score && (
            <p className="font-inter text-xs text-muted-foreground">
              Score: {path.current_score} → {path.target_score} (target)
            </p>
          )}
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-4 flex items-center gap-1.5 font-inter text-sm text-primary hover:opacity-80 transition-opacity"
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          {expanded ? "Hide lessons" : `View ${total} lessons`}
        </button>
      </div>

      {/* Lesson list */}
      {expanded && (
        <div className="border-t border-border divide-y divide-border">
          {(path.lessons || []).map((lesson) => (
            <div key={lesson.id} className={`flex gap-4 px-6 py-4 transition-colors ${lesson.completed ? "bg-green-50/50" : "hover:bg-secondary/30"}`}>
              <button
                onClick={() => toggleLesson(lesson.id)}
                className="mt-0.5 shrink-0 transition-colors"
                title={lesson.completed ? "Mark incomplete" : "Mark complete"}
              >
                {lesson.completed
                  ? <CheckCircle2 className="w-5 h-5 text-green-600" />
                  : <Circle className="w-5 h-5 text-muted-foreground hover:text-primary" />
                }
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className="font-inter text-xs text-muted-foreground">Week {lesson.week}</span>
                      {lesson.duration_mins && (
                        <span className="font-inter text-xs text-muted-foreground">· {lesson.duration_mins} min</span>
                      )}
                      {lesson.tool && (
                        <span className="font-inter text-[10px] px-2 py-0.5 rounded-full border"
                          style={{ borderColor: GOLD + "40", color: GOLD, backgroundColor: GOLD + "10" }}>
                          {lesson.tool}
                        </span>
                      )}
                    </div>
                    <p className={`font-inter text-sm font-medium ${lesson.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
                      {lesson.title}
                    </p>
                    <p className="font-inter text-xs text-muted-foreground mt-0.5 leading-relaxed">{lesson.objective}</p>
                    {lesson.exercise && (
                      <p className="font-inter text-xs mt-1.5 italic text-foreground/70 leading-relaxed">
                        Exercise: {lesson.exercise}
                      </p>
                    )}
                  </div>
                  {lesson.tool_id && toolRoutes[lesson.tool_id] && (
                    <Link to={toolRoutes[lesson.tool_id]} className="shrink-0">
                      <Button size="sm" variant="ghost" className="rounded-full text-xs gap-1 h-7 px-2.5">
                        Open <ExternalLink className="w-3 h-3" />
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}