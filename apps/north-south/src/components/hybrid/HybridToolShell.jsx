import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function HybridToolShell({ icon: Icon, title, aiLabel, humanLabel, children }) {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="font-cormorant text-2xl font-medium text-foreground">{title}</h2>
          <div className="flex flex-wrap items-center gap-3 mt-0.5">
            <span className="flex items-center gap-1 font-inter text-xs text-primary"><Sparkles className="w-3 h-3" /> AI: {aiLabel}</span>
            <span className="text-muted-foreground text-xs">·</span>
            <span className="font-inter text-xs text-muted-foreground">You: {humanLabel}</span>
          </div>
        </div>
      </div>

      {/* AI Tool Area */}
      {children}

      {/* Human CTA */}
      <div className="bg-card border border-border rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="font-inter text-xs uppercase tracking-wider text-accent-foreground font-medium mb-1">Human coaching session</div>
          <p className="font-cormorant text-lg text-foreground">Ready for the nuance only a specialist provides?</p>
          <p className="font-inter text-xs text-muted-foreground mt-1">{humanLabel}</p>
        </div>
        <Link to="/book" className="shrink-0">
          <Button className="rounded-full px-6 whitespace-nowrap">Book Your Session</Button>
        </Link>
      </div>
    </div>
  );
}