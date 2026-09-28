import { useState } from "react";
import Navbar from "../components/Navbar";
import SpeechCoaching from "../components/hybrid/SpeechCoaching";
import ProposalDraft from "../components/hybrid/ProposalDraft";
import MediaPrep from "../components/hybrid/MediaPrep";
import CrossCulturalComms from "../components/hybrid/CrossCulturalComms";
import PersonalBranding from "../components/hybrid/PersonalBranding";
import InterviewPrep from "../components/hybrid/InterviewPrep";
import LifeCoachingCheckin from "../components/hybrid/LifeCoachingCheckin";
import { Mic, FileText, Radio, Globe, User, Briefcase, Heart, ChevronLeft, Sparkles } from "lucide-react";

const tools = [
  { id: "speech",    icon: Mic,       label: "Speech Coaching",        aiDoes: "Transcript analysis, pacing scores",                   youDo: "Final delivery feedback, nuance, emotion coaching",    component: SpeechCoaching },
  { id: "proposal",  icon: FileText,  label: "Written Proposals",      aiDoes: "Draft structure, vocabulary elevation",                 youDo: "Finalise tone, strategic alignment",                   component: ProposalDraft },
  { id: "media",     icon: Radio,     label: "Media Prep",             aiDoes: "Sample questions, timing feedback",                     youDo: "Live mock interview, real-time coaching",              component: MediaPrep },
  { id: "cultural",  icon: Globe,     label: "Cross-Cultural Comms",   aiDoes: "Research brief + cultural dos & don'ts",               youDo: "Live context, personal experience, relationship nuance", component: CrossCulturalComms },
  { id: "branding",  icon: User,      label: "Personal Branding",      aiDoes: "Analyse LinkedIn bio / bio text",                       youDo: "Strategic narrative, positioning, story coaching",     component: PersonalBranding },
  { id: "interview", icon: Briefcase, label: "Interview Prep",         aiDoes: "Question banks, model answers",                         youDo: "Live rehearsal, reading the room, confidence work",    component: InterviewPrep },
  { id: "life",      icon: Heart,     label: "Life Coaching Check-ins", aiDoes: "Weekly prompts, journal analysis",                     youDo: "Monthly deep-dive sessions",                          component: LifeCoachingCheckin },
];

export default function Hybrid() {
  const [activeTool, setActiveTool] = useState(null);
  const Tool = activeTool ? tools.find(t => t.id === activeTool)?.component : null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-6xl mx-auto px-6 py-28">

        {!activeTool && (
          <>
            <div className="text-center mb-12 space-y-3">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-inter font-medium">
                <Sparkles className="w-3.5 h-3.5" /> Hybrid Coaching — AI + Human
              </div>
              <h1 className="font-cormorant text-5xl font-light text-foreground">
                The best of both worlds
              </h1>
              <p className="font-inter text-muted-foreground max-w-lg mx-auto">
                AI handles the analysis. Your consultant delivers the nuance. Together, it's the most powerful coaching model available.
              </p>
            </div>

            {/* Split table header */}
            <div className="hidden md:grid grid-cols-3 gap-4 mb-4 px-2">
              <div className="font-inter text-xs uppercase tracking-widest text-muted-foreground font-medium">Service</div>
              <div className="flex items-center gap-2 font-inter text-xs uppercase tracking-widest text-primary font-medium">
                <Sparkles className="w-3 h-3" /> AI does
              </div>
              <div className="font-inter text-xs uppercase tracking-widest text-accent-foreground font-medium">Your consultant does</div>
            </div>

            <div className="space-y-3">
              {tools.map(tool => (
                <button
                  key={tool.id}
                  onClick={() => setActiveTool(tool.id)}
                  className="w-full group bg-card rounded-2xl border border-border hover:border-primary/50 hover:shadow-md transition-all text-left p-5 md:grid md:grid-cols-3 md:gap-4 flex flex-col gap-2"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                      <tool.icon className="w-4 h-4 text-primary" />
                    </div>
                    <span className="font-cormorant text-lg font-medium text-foreground">{tool.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3 h-3 text-primary shrink-0" />
                    <span className="font-inter text-sm text-muted-foreground">{tool.aiDoes}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full border-2 border-accent shrink-0" />
                    <span className="font-inter text-sm text-muted-foreground">{tool.youDo}</span>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-10 bg-primary/10 rounded-3xl p-8 border border-primary/20 text-center space-y-4">
              <h2 className="font-cormorant text-3xl font-light text-foreground">Ready for the full hybrid experience?</h2>
              <p className="font-inter text-sm text-muted-foreground max-w-sm mx-auto">Use the AI tools for preparation, then book your human session for the coaching that only a specialist can provide.</p>
              <a href="/book" className="inline-block">
                <button className="bg-primary text-primary-foreground rounded-full px-8 py-2.5 font-inter text-sm font-medium hover:bg-primary/90 transition-colors">Book Your Hybrid Session</button>
              </a>
            </div>
          </>
        )}

        {activeTool && Tool && (
          <div>
            <button
              onClick={() => setActiveTool(null)}
              className="flex items-center gap-1.5 text-sm font-inter text-muted-foreground hover:text-foreground transition-colors mb-8"
            >
              <ChevronLeft className="w-4 h-4" /> Back to all services
            </button>
            <Tool />
          </div>
        )}
      </div>
    </div>
  );
}