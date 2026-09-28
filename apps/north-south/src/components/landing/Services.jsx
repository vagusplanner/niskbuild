import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Mic, FileText, Video, MessageSquare, Globe, Brain,
  TrendingUp, Users, Shield, Heart, Briefcase, Lightbulb
} from "lucide-react";

const categories = [
  {
    heading: "Communication Mastery",
    desc: "The foundation of every great leader — how you speak, write, and present yourself to the world.",
    color: "#3D4A2F",
    services: [
      { icon: Mic, title: "Verbal Communication", desc: "Command the room with precise articulation, persuasive delivery and executive tone. From boardroom to keynote." },
      { icon: FileText, title: "Written Communication", desc: "Proposals, speeches, executive emails and reports elevated to influence, persuade and impress." },
      { icon: Video, title: "Media & Broadcast Training", desc: "Camera presence, live TV, press conferences, podcast and public appearances — coached by former broadcast professionals." },
      { icon: MessageSquare, title: "Body Language & Presence", desc: "Decode and command non-verbal signals. Project authority, confidence and trustworthiness in any room." },
    ],
  },
  {
    heading: "Leadership & Business Development",
    desc: "Inspired by the best in executive coaching — develop the mindset and strategic edge of exceptional leaders.",
    color: "#B8952A",
    services: [
      { icon: TrendingUp, title: "Peak Performance Coaching", desc: "Break through limitations, remove blocks and consistently operate at your highest level — personally and professionally." },
      { icon: Briefcase, title: "Business Communication Strategy", desc: "Align your internal and external messaging, lead high-stakes negotiations and communicate vision that inspires action." },
      { icon: Users, title: "Team & Organisational Culture", desc: "Build psychologically safe, high-performance teams with coaching in trust, feedback and cross-functional communication." },
      { icon: Lightbulb, title: "Strategic Storytelling", desc: "Craft narratives that move people — for pitches, board presentations, media and change management." },
    ],
  },
  {
    heading: "International & Cross-Cultural",
    desc: "Navigate the world's complexity with confidence — our specialist area grounded in 30+ countries of lived experience.",
    color: "#2C3B2D",
    services: [
      { icon: Globe, title: "Cross-Cultural Communication", desc: "Bridge cultural gaps with diplomacy and intelligence. Understand what's said — and what isn't — in any international context." },
      { icon: Shield, title: "Diplomatic & Government Communications", desc: "Liaised with international governments and government agencies, diplomatic missions, government ministers and international organisations." },
      { icon: MessageSquare, title: "Multilingual Coaching", desc: "Executive coaching in English, French, Arabic and Urdu. Non-native English speaker specialist — nuance, authority and authentic voice." },
      { icon: Video, title: "International Media Relations", desc: "Navigate global press, manage reputation across jurisdictions and perform with confidence on international platforms." },
    ],
  },
  {
    heading: "Personal Transformation & Life Coaching",
    desc: "Holistic development for the whole person — because great communicators start from within.",
    color: "#B8952A",
    services: [
      { icon: Heart, title: "Executive Life Coaching", desc: "Work-life integration, identity, purpose and resilience for leaders navigating high-pressure roles and personal transitions." },
      { icon: Brain, title: "Mindset & Confidence Mastery", desc: "Overcome imposter syndrome, fear of public speaking and self-limiting beliefs that hold brilliant people back." },
      { icon: TrendingUp, title: "Career Transition Coaching", desc: "Navigate leadership transitions, re-entry after career breaks, or pivots into new sectors — with clarity and confidence." },
      { icon: Lightbulb, title: "Personal Branding & Identity", desc: "Define and express your authentic leadership brand — online, offline and in every room you enter." },
    ],
  },
];

export default function Services() {
  return (
    <section id="services" className="py-28" style={{ backgroundColor: "#F5F0E0" }}>
      <div className="max-w-7xl mx-auto px-6">
        {/* Services hero image */}
        <div className="rounded-3xl overflow-hidden mb-16 shadow-xl relative h-72 md:h-96">
          <img
            src="https://media.base44.com/images/public/69dbb919df7f322227ac67eb/f99f8a34c_Gemini_Generated_Image_qpwd4aqpwd4aqpwd.png"
            alt="Executive coaching services"
            className="w-full h-full object-cover"
            style={{ objectPosition: "center 30%" }}
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6"
            style={{ background: "linear-gradient(to bottom, rgba(44,59,45,0.55), rgba(44,59,45,0.75))" }}>
            <p className="font-inter text-xs tracking-widest uppercase font-medium mb-3" style={{ color: "#B8952A" }}>What We Offer</p>
            <h2 className="font-cormorant text-4xl md:text-5xl font-light text-white leading-tight">
              Comprehensive coaching<br /><em style={{ color: "#B8952A" }}>for every dimension of leadership</em>
            </h2>
            <p className="font-inter text-white/70 max-w-2xl mx-auto leading-relaxed mt-4 text-sm">
              From verbal mastery to cross-cultural diplomacy, from media training to personal transformation — our services cover the full spectrum of executive communication and leadership development.
            </p>
          </div>
        </div>

        {categories.map((cat, ci) => (
          <div key={ci} className="mb-16">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-1 h-10 rounded-full" style={{ backgroundColor: cat.color }} />
              <div>
                <h3 className="font-cormorant text-2xl font-medium text-foreground">{cat.heading}</h3>
                <p className="font-inter text-sm text-muted-foreground">{cat.desc}</p>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {cat.services.map((s, si) => (
                <div key={si} className="group bg-card rounded-2xl p-6 border border-border hover:shadow-lg transition-all duration-300"
                  style={{ borderColor: "hsl(var(--border))" }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = cat.color + "60"}
                  onMouseLeave={e => e.currentTarget.style.borderColor = ""}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-colors"
                    style={{ backgroundColor: cat.color + "18" }}>
                    <s.icon className="w-4.5 h-4.5" style={{ color: cat.color }} />
                  </div>
                  <h4 className="font-cormorant text-lg font-medium text-foreground mb-2">{s.title}</h4>
                  <p className="font-inter text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* CTA */}
        <div className="rounded-3xl p-12 text-center space-y-5 mt-8" style={{ backgroundColor: "#3D4A2F" }}>
          <p className="font-inter text-xs tracking-widest uppercase font-medium" style={{ color: "#B8952A" }}>Ready to begin?</p>
          <h3 className="font-cormorant text-4xl font-light text-white leading-tight">
            Every transformation starts<br /><em>with a conversation.</em>
          </h3>
          <p className="font-inter text-white/60 max-w-lg mx-auto">
            Book a free 30-minute discovery call with Nishat or one of our senior coaches. No commitment — just clarity.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/discovery">
              <Button size="lg" className="rounded-full px-8" style={{ backgroundColor: "#B8952A", color: "#F5F0E0" }}>
                Free Discovery Call
              </Button>
            </Link>
            <Link to="/book">
              <Button size="lg" variant="outline" className="rounded-full px-8 border-white/20 text-white hover:bg-white/10">
                Book a Session
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}