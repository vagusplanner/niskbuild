import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { X, Sparkles, Loader2 } from "lucide-react";

const GOLD = "#B8952A";
const FOREST = "#2C3B2D";

const categoryMap = {
  verbal_communication: "Verbal Clarity",
  written_communication: "Written Tone",
  body_language: "Confidence & Presence",
  media_presence: "Media Presence",
  executive_presence: "Executive Presence",
  cross_cultural: "Cross-Cultural Communication",
  life_balance: "Life Balance",
};

const toolOptions = [
  { id: "speech",    label: "Speech Transcript" },
  { id: "writing",   label: "Writing Analyser" },
  { id: "email",     label: "Email & Proposal Review" },
  { id: "roleplay",  label: "Role-Play Practice" },
  { id: "style",     label: "Style Assessment" },
  { id: "vocab",     label: "Vocabulary Builder" },
  { id: "body",      label: "Body Language Pre-brief" },
  { id: "resources", label: "Resource Library Q&A" },
  { id: "cultural",  label: "Cultural Briefings" },
  { id: "video",     label: "Video Analysis" },
];

export default function GeneratePathModal({ goals, sessions, onClose, onSaved }) {
  const [selectedGoalId, setSelectedGoalId] = useState(goals[0]?.id || "");
  const [weeks, setWeeks] = useState(4);
  const [generating, setGenerating] = useState(false);

  const selectedGoal = goals.find(g => g.id === selectedGoalId);

  // Get average session score for this goal's category
  const categoryAvg = (() => {
    if (!selectedGoal) return null;
    const cat = selectedGoal.category;
    const relevant = sessions.filter(s => s.session_type === cat && s.score != null);
    if (relevant.length === 0) return null;
    return (relevant.reduce((a, s) => a + s.score, 0) / relevant.length).toFixed(1);
  })();

  const generate = async () => {
    if (!selectedGoal) return;
    setGenerating(true);

    const catLabel = categoryMap[selectedGoal.category] || selectedGoal.category;
    const scoreContext = categoryAvg
      ? `Their recent average score in this category is ${categoryAvg}/10.`
      : "They have no prior sessions in this category yet.";
    const gapContext = selectedGoal.current_score && selectedGoal.target_score
      ? `Current self-assessed score: ${selectedGoal.current_score}/10. Target: ${selectedGoal.target_score}/10.`
      : "";

    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a world-class executive communication coach building a personalised ${weeks}-week learning path.

Goal: "${selectedGoal.title}"
Category: ${catLabel}
${gapContext}
${scoreContext}
${selectedGoal.description ? `Goal description: ${selectedGoal.description}` : ""}

Create a structured ${weeks}-week learning curriculum with exactly ${weeks * 2} lessons (2 per week). Each lesson must use one of these AI Coach tools: ${toolOptions.map(t => t.label).join(", ")}.

For each lesson provide:
- week: number (1 to ${weeks})
- title: short punchy lesson title (max 8 words)
- objective: what the learner will achieve (1 sentence)
- tool: the tool label to use (exact match from list above)
- tool_id: the tool id (one of: speech, writing, email, roleplay, style, vocab, body, resources, cultural, video)
- exercise: a concrete, specific practice task (1-2 sentences)
- duration_mins: estimated time (15, 20, 25, or 30)

Make the path progressive — week 1 builds foundations, later weeks tackle advanced scenarios. Tailor every lesson specifically to the goal.

Respond with JSON:
{
  "path_title": string,
  "focus_area": string (2-4 word theme),
  "lessons": [ { "week": number, "title": string, "objective": string, "tool": string, "tool_id": string, "exercise": string, "duration_mins": number } ]
}`,
      response_json_schema: {
        type: "object",
        properties: {
          path_title: { type: "string" },
          focus_area: { type: "string" },
          lessons: {
            type: "array",
            items: {
              type: "object",
              properties: {
                week: { type: "number" },
                title: { type: "string" },
                objective: { type: "string" },
                tool: { type: "string" },
                tool_id: { type: "string" },
                exercise: { type: "string" },
                duration_mins: { type: "number" },
              },
            },
          },
        },
      },
    });

    // Stamp each lesson with an id and completed=false
    const lessons = (res.lessons || []).map((l, i) => ({ ...l, id: `lesson-${i}`, completed: false }));

    await base44.entities.LearningPath.create({
      title: res.path_title || `${catLabel} Path`,
      goal_id: selectedGoal.id,
      goal_title: selectedGoal.title,
      category: selectedGoal.category,
      focus_area: res.focus_area || catLabel,
      current_score: selectedGoal.current_score || (categoryAvg ? parseFloat(categoryAvg) : null),
      target_score: selectedGoal.target_score || null,
      lessons,
      status: "active",
      progress_pct: 0,
    });

    setGenerating(false);
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-card rounded-3xl border border-border w-full max-w-md p-7 space-y-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-cormorant text-2xl font-medium text-foreground">Generate Learning Path</h2>
            <p className="font-inter text-sm text-muted-foreground mt-0.5">AI-personalised lessons based on your goal & performance</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Goal selector */}
        <div className="space-y-2">
          <label className="font-inter text-xs uppercase tracking-wider text-muted-foreground font-medium">Leadership Goal</label>
          <select
            value={selectedGoalId}
            onChange={e => setSelectedGoalId(e.target.value)}
            className="w-full rounded-xl border border-border bg-background px-4 py-3 font-inter text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {goals.map(g => (
              <option key={g.id} value={g.id}>{g.title}</option>
            ))}
          </select>
          {selectedGoal && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-inter text-xs px-2.5 py-1 rounded-full border"
                style={{ borderColor: GOLD + "40", color: GOLD, backgroundColor: GOLD + "10" }}>
                {categoryMap[selectedGoal.category] || selectedGoal.category}
              </span>
              {categoryAvg && (
                <span className="font-inter text-xs text-muted-foreground">
                  Avg AI score in this category: <strong className="text-foreground">{categoryAvg}/10</strong>
                </span>
              )}
              {selectedGoal.current_score && selectedGoal.target_score && (
                <span className="font-inter text-xs text-muted-foreground">
                  Score gap: {selectedGoal.current_score} → {selectedGoal.target_score}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Duration selector */}
        <div className="space-y-2">
          <label className="font-inter text-xs uppercase tracking-wider text-muted-foreground font-medium">Path Duration</label>
          <div className="flex gap-2">
            {[2, 4, 6, 8].map(w => (
              <button
                key={w}
                onClick={() => setWeeks(w)}
                className="flex-1 py-2.5 rounded-xl border font-inter text-sm font-medium transition-all"
                style={{
                  backgroundColor: weeks === w ? FOREST : "transparent",
                  color: weeks === w ? "white" : "inherit",
                  borderColor: weeks === w ? FOREST : "hsl(var(--border))",
                }}
              >
                {w}w
              </button>
            ))}
          </div>
          <p className="font-inter text-xs text-muted-foreground">{weeks * 2} lessons · ~{weeks * 2 * 20} min total</p>
        </div>

        <Button
          onClick={generate}
          disabled={generating || !selectedGoalId}
          className="w-full rounded-full gap-2"
          size="lg"
        >
          {generating
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating your path…</>
            : <><Sparkles className="w-4 h-4" /> Generate Path</>
          }
        </Button>
      </div>
    </div>
  );
}