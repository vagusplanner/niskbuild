import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";

export default function FeedbackCard({ title, result, onReset, children }) {
  return (
    <div className="bg-card rounded-3xl border border-border p-8 space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="font-cormorant text-2xl font-medium text-foreground">{title}</h2>
        <Button variant="outline" size="sm" className="rounded-full gap-2" onClick={onReset}>
          <RotateCcw className="w-3.5 h-3.5" /> New Analysis
        </Button>
      </div>

      {result.score !== undefined && (
        <div className="bg-secondary/60 rounded-2xl p-5 flex items-center gap-5">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
            <span className="font-cormorant text-2xl font-medium text-primary">{result.score}</span>
          </div>
          <div>
            <div className="font-inter text-xs text-muted-foreground uppercase tracking-wider mb-1">Score /10</div>
            <div className="font-cormorant text-lg text-foreground">{result.summary}</div>
          </div>
        </div>
      )}

      {result.summary && result.score === undefined && (
        <div className="bg-secondary/60 rounded-2xl p-5">
          <p className="font-inter text-sm text-foreground">{result.summary}</p>
        </div>
      )}

      {(result.strengths?.length > 0 || result.improvements?.length > 0) && (
        <div className="grid md:grid-cols-2 gap-5">
          {result.strengths?.length > 0 && (
            <div className="space-y-3">
              <div className="font-inter text-xs uppercase tracking-wider text-primary font-medium">Strengths</div>
              <ul className="space-y-2">
                {result.strengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                    <span className="font-inter text-sm text-muted-foreground">{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {result.improvements?.length > 0 && (
            <div className="space-y-3">
              <div className="font-inter text-xs uppercase tracking-wider text-accent font-medium">Areas to Elevate</div>
              <ul className="space-y-2">
                {result.improvements.map((s, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent mt-2 shrink-0" />
                    <span className="font-inter text-sm text-muted-foreground">{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {children}
    </div>
  );
}