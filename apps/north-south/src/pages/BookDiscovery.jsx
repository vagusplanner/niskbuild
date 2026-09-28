import Navbar from "../components/Navbar";
import CalendlyEmbed from "../components/CalendlyEmbed";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { CheckCircle, Clock, Globe, Video, ArrowRight } from "lucide-react";

// ✏️  Replace with your actual Calendly URL, e.g. "https://calendly.com/yourname/discovery"
const CALENDLY_URL = "";

const perks = [
  { icon: Clock, text: "30-minute complimentary call" },
  { icon: Video, text: "Conducted via Zoom or Google Meet" },
  { icon: Globe, text: "Available across all major time zones" },
];

const whatToExpect = [
  "We'll discuss your communication goals and current challenges",
  "I'll assess which service tier fits your needs and budget",
  "You'll leave with 2–3 actionable insights, regardless of outcome",
  "No hard sell — just an honest, expert conversation",
];

export default function BookDiscovery() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-6xl mx-auto px-6 py-28">
        {/* Header */}
        <div className="text-center mb-14 space-y-4">
          <p className="font-inter text-sm tracking-widest uppercase text-primary font-medium">Free Discovery Call</p>
          <h1 className="font-cormorant text-5xl md:text-6xl font-light text-foreground">
            Let's talk about<br /><em>your communication</em>
          </h1>
          <p className="font-inter text-muted-foreground max-w-lg mx-auto">
            Book a free 30-minute discovery call. No obligations — just a genuine conversation 
            about where you are and where you want to be.
          </p>
        </div>

        <div className="grid md:grid-cols-5 gap-10 items-start">
          {/* Left info panel */}
          <div className="md:col-span-2 space-y-8">
            {/* Perks */}
            <div className="space-y-4">
              {perks.map(({ icon: Icon, text }, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <span className="font-inter text-sm text-foreground">{text}</span>
                </div>
              ))}
            </div>

            {/* What to expect */}
            <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
              <h3 className="font-cormorant text-xl font-medium text-foreground">What to expect</h3>
              <ul className="space-y-3">
                {whatToExpect.map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <span className="font-inter text-sm text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* CTA to full booking */}
            <div className="bg-secondary/60 rounded-2xl p-5 space-y-3">
              <p className="font-cormorant text-lg font-medium text-foreground">Ready to commit?</p>
              <p className="font-inter text-xs text-muted-foreground">
                If you already know which tier you need, skip the discovery call and book a full session directly.
              </p>
              <Link to="/book">
                <Button variant="outline" size="sm" className="rounded-full gap-1.5">
                  Book a Full Session <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Calendar embed */}
          <div className="md:col-span-3">
            <CalendlyEmbed calendlyUrl={CALENDLY_URL} />
          </div>
        </div>
      </div>
    </div>
  );
}