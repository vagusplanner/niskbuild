import { useState } from "react";
import Navbar from "../components/Navbar";
import WritingAnalyser from "../components/aicoach/WritingAnalyser";
import EmailReview from "../components/aicoach/EmailReview";
import SpeechAnalyser from "../components/aicoach/SpeechAnalyser";
import StyleAssessment from "../components/aicoach/StyleAssessment";
import VocabularyBuilder from "../components/aicoach/VocabularyBuilder";
import BodyLanguageBrief from "../components/aicoach/BodyLanguageBrief";
import ProgressTracker from "../components/aicoach/ProgressTracker";
import ResourceQA from "../components/aicoach/ResourceQA";
import RolePlay from "../components/aicoach/RolePlay";
import CulturalBrief from "../components/aicoach/CulturalBrief";
import VideoAnalyser from "../components/aicoach/VideoAnalyser";
import MeetingContext from "../components/aicoach/MeetingContext";
import {
  FileText, Mail, Mic, Brain, BookOpen, Users,
  TrendingUp, MessageCircle, Globe, Sparkles, ChevronLeft, Video, Calendar
} from "lucide-react";

const tools = [
  { id: "writing",    icon: FileText,       label: "Writing Analyser",        desc: "Tone, clarity, vocabulary & structure feedback", component: WritingAnalyser },
  { id: "email",      icon: Mail,           label: "Email & Proposal Review",  desc: "Grammar, persuasion scoring & vocabulary elevation", component: EmailReview },
  { id: "speech",     icon: Mic,            label: "Speech Transcript",        desc: "Pacing, filler words & sentence rhythm analysis", component: SpeechAnalyser },
  { id: "style",      icon: Brain,          label: "Style Assessment",         desc: "Questionnaire → your personalised communication profile", component: StyleAssessment },
  { id: "vocab",      icon: BookOpen,       label: "Vocabulary Builder",       desc: "Daily word & phrase suggestions tailored to your role", component: VocabularyBuilder },
  { id: "body",       icon: Users,          label: "Body Language Pre-brief",  desc: "Scenario-based preparation guides for any meeting", component: BodyLanguageBrief },
  { id: "progress",   icon: TrendingUp,     label: "Progress Tracker",         desc: "Your score trends & growth across all sessions", component: ProgressTracker },
  { id: "resources",  icon: MessageCircle,  label: "Resource Library Q&A",     desc: "Ask the AI anything about communication & leadership", component: ResourceQA },
  { id: "roleplay",   icon: Sparkles,       label: "Role-Play Practice",       desc: "Simulated interview, board & media Q&A sessions", component: RolePlay },
  { id: "cultural",   icon: Globe,          label: "Cultural Briefings",       desc: "Country-specific communication guides on demand", component: CulturalBrief },
  { id: "video",      icon: Video,          label: "Video Analysis",            desc: "Upload a video for AI analysis of tone, clarity & body language", component: VideoAnalyser },
  { id: "meeting",    icon: Calendar,       label: "Meeting Context",            desc: "3-minute prep guide from your calendar — objectives, opening lines & tough questions", component: MeetingContext },
];

export default function AICoach() {
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
                <Sparkles className="w-3.5 h-3.5" /> AI Communication Coach — 12 Tools
              </div>
              <h1 className="font-cormorant text-5xl font-light text-foreground">
                Your personal coach,<br /><em>available 24/7</em>
              </h1>
              <p className="font-inter text-muted-foreground max-w-lg mx-auto">
                Powered by advanced AI trained on executive communication best practices. Select a tool to begin.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {tools.map(tool => (
                <button
                  key={tool.id}
                  onClick={() => setActiveTool(tool.id)}
                  className="group bg-card rounded-2xl p-7 border border-border hover:border-primary/50 hover:shadow-lg transition-all text-left"
                >
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <tool.icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-cormorant text-xl font-medium text-foreground mb-1">{tool.label}</h3>
                  <p className="font-inter text-sm text-muted-foreground leading-relaxed">{tool.desc}</p>
                </button>
              ))}
            </div>
          </>
        )}

        {activeTool && Tool && (
          <div>
            <button
              onClick={() => setActiveTool(null)}
              className="flex items-center gap-1.5 text-sm font-inter text-muted-foreground hover:text-foreground transition-colors mb-8"
            >
              <ChevronLeft className="w-4 h-4" /> Back to all tools
            </button>
            <Tool />
          </div>
        )}
      </div>
    </div>
  );
}