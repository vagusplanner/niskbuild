import { useEffect } from "react";
import { Calendar, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CalendlyEmbed({ calendlyUrl }) {
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://assets.calendly.com/assets/external/widget.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  if (!calendlyUrl) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-6 bg-card rounded-3xl border border-border">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
          <Calendar className="w-7 h-7 text-primary" />
        </div>
        <div className="text-center space-y-2 max-w-sm">
          <h3 className="font-cormorant text-2xl font-medium text-foreground">Connect Your Calendar</h3>
          <p className="font-inter text-sm text-muted-foreground">
            To enable live booking, add your Calendly URL in the component settings. 
            Your clients will be able to see your real availability and book instantly.
          </p>
        </div>
        <a href="https://calendly.com" target="_blank" rel="noopener noreferrer">
          <Button variant="outline" className="rounded-full gap-2">
            <ExternalLink className="w-4 h-4" /> Set up Calendly (free)
          </Button>
        </a>
        <p className="font-inter text-xs text-muted-foreground text-center max-w-xs">
          Once you have a Calendly account, paste your booking URL (e.g. calendly.com/yourname) 
          into the <code className="bg-secondary px-1 rounded">calendlyUrl</code> prop.
        </p>
      </div>
    );
  }

  return (
    <div
      className="calendly-inline-widget w-full rounded-3xl overflow-hidden border border-border"
      data-url={`${calendlyUrl}?hide_gdpr_banner=1&primary_color=c0724a`}
      style={{ minWidth: "320px", height: "700px" }}
    />
  );
}