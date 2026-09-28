import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate, Link } from "react-router-dom";
import {
  ArrowRight, ArrowLeft, Zap, Users, Crown, Loader2,
  CheckCircle, Target, TrendingUp, Mic, Globe, FileText,
  Brain, Shield, Star
} from "lucide-react";

const FOREST = "#2C3B2D";
const GOLD = "#B8952A";
const OLIVE = "#3D4A2F";
const CREAM = "#F5F0E0";

function recommendTier(answers) {
  const { urgency, budget, challenge, experience, role } = answers;
  const bespokeSignals = [
    budget === "enterprise",
    urgency === "immediate",
    role === "diplomat",
    challenge === "crisis" || challenge === "board",
    experience === "advanced",
  ].filter(Boolean).length;
  const aiSignals = [
    budget === "low",
    urgency === "flexible",
    experience === "beginner" || experience === "developing",
    role === "other",
  ].filter(Boolean).length;
  if (bespokeSignals >= 2) return "bespoke";
  if (aiSignals >= 2) return "ai";
  return "hybrid";
}

function buildRoadmap(answers) {
  const roadmap = [];

  roadmap.push({
    phase: "Month 1",
    title: "Assessment & Foundations",
    icon: Target,
    items: [
      "Deep-dive communication style assessment",
      "Identify your top 3 growth areas",
      "Set measurable milestones for 90 days",
    ],
  });

  const challengeMap = {
    verbal: { title: "Verbal Mastery & Presence", icon: Mic, items: ["Articulation & pacing drills", "Boardroom confidence exercises", "Recording & AI feedback loop"] },
    writing: { title: "Written Communication Excellence", icon: FileText, items: ["Email authority framework", "Proposal structure & persuasion", "Tone & vocabulary elevation"] },
    media: { title: "Broadcast & Media Confidence", icon: Star, items: ["On-camera technique sessions", "Rapid-fire Q&A simulations", "Soundbite & message crafting"] },
    board: { title: "Executive Presentation Power", icon: TrendingUp, items: ["Board narrative structure", "Data storytelling techniques", "Handling difficult questions"] },
    crosscultural: { title: "Cross-Cultural Intelligence", icon: Globe, items: ["Cultural communication audit", "Protocol & etiquette by region", "Bridging language nuance"] },
    crisis: { title: "Crisis & High-Stakes Communication", icon: Shield, items: ["Crisis messaging frameworks", "Media holding statements", "Stakeholder management scripts"] },
    presence: { title: "Executive Presence & Brand", icon: Star, items: ["Personal brand definition", "Body language command", "Room-reading & influence"] },
    confidence: { title: "Confidence & Mindset Mastery", icon: Brain, items: ["Imposter syndrome tools", "Reframing limiting beliefs", "Energy management for leaders"] },
  };
  const phase2 = challengeMap[answers.challenge] || { title: "Skill Building Sprint", icon: TrendingUp, items: ["Targeted skill exercises", "AI-assisted daily practice", "Weekly progress review"] };
  roadmap.push({ phase: "Month 2", ...phase2 });

  const goalMap = {
    influence: { title: "Influence & Senior Stakeholders", icon: Crown, items: ["Persuasion frameworks", "Senior stakeholder communication", "Negotiation language"] },
    promotion: { title: "Visibility & Career Elevation", icon: TrendingUp, items: ["Personal brand amplification", "Sponsor & advocate communication", "Interview & pitch mastery"] },
    media_ready: { title: "Media & Camera Mastery", icon: Mic, items: ["Live broadcast simulation", "Podcast guest technique", "Social media presence coaching"] },
    global: { title: "Global Stage Readiness", icon: Globe, items: ["International keynote technique", "Cross-border negotiation language", "UN/diplomatic protocol"] },
    authentic: { title: "Authentic Leadership Voice", icon: Brain, items: ["Values-based communication", "Signature storytelling", "Leading with vulnerability"] },
    team: { title: "Team Leadership Communication", icon: Users, items: ["Motivational communication style", "Feedback & difficult conversations", "Culture-building through language"] },
  };
  const phase3 = goalMap[answers.goal] || { title: "Integration & Mastery", icon: CheckCircle, items: ["Consolidate all learning", "Real-world application review", "90-day next chapter plan"] };
  roadmap.push({ phase: "Month 3", ...phase3 });

  return roadmap;
}

const tierDetails = {
  ai: {
    icon: Zap,
    name: "AI Self-Service",
    price: "$34.99/month",
    tagline: "Your always-on communication coach",
    description: "Based on your profile, our AI platform gives you 24/7 access to intelligent coaching tools — speech analysis, writing feedback, vocabulary building and progress tracking.",
    colour: GOLD,
    href: "/book?tier=ai_self_service",
    cta: "Start with AI Coach",
    features: ["AI speech & writing analysis", "Goal tracking dashboard", "On-demand video library", "Weekly nudges & check-ins"],
  },
  hybrid: {
    icon: Users,
    name: "Hybrid Coaching",
    price: "Contact for pricing",
    tagline: "AI power + human expertise",
    description: "Your goals suggest a blend of AI tools and live 1:1 sessions with a senior coach will deliver the fastest results.",
    colour: GOLD,
    href: "/discovery",
    cta: "Book a Free Discovery Call",
    features: ["Everything in AI Self-Service", "2 live sessions/month", "Personalised learning pathway", "Document & speech review"],
  },
  bespoke: {
    icon: Crown,
    name: "Bespoke Retainer",
    price: "Custom engagement",
    tagline: "White-glove executive partnership",
    description: "Given your seniority and specific challenges, a fully bespoke engagement with Nishat or a senior consultant is the right fit.",
    colour: GOLD,
    href: "/discovery",
    cta: "Request a Bespoke Proposal",
    features: ["Everything in Hybrid", "Unlimited 1:1 sessions", "Speech ghostwriting", "Corporate team workshops"],
  },
};

const PHASES = [
  { label: "Your Profile", steps: [1, 2] },
  { label: "Goals & Challenges", steps: [3, 4, 5] },
  { label: "Your Journey", steps: [6, 7] },
];

const questions = [
  {
    id: "role", phase: 1,
    question: "How would you describe your role?",
    subtitle: "This shapes every recommendation we make — from communication style to coaching pace.",
    options: [
      { value: "executive", label: "Executive / C-Suite Leader", emoji: "👔" },
      { value: "manager", label: "Senior Manager / Director", emoji: "📋" },
      { value: "entrepreneur", label: "Entrepreneur / Founder", emoji: "🚀" },
      { value: "diplomat", label: "Diplomat / Government Official", emoji: "🌐" },
      { value: "media", label: "Media / Communications Professional", emoji: "🎙️" },
      { value: "other", label: "Other Professional", emoji: "✨" },
    ],
  },
  {
    id: "industry", phase: 1,
    question: "What is your industry?",
    subtitle: "Industry context shapes how we tailor your communication coaching.",
    options: [
      { value: "finance", label: "Banking & Finance", emoji: "🏦" },
      { value: "media", label: "Media & Broadcasting", emoji: "📺" },
      { value: "government", label: "Government & Public Sector", emoji: "🏛️" },
      { value: "automotive", label: "Automotive & Manufacturing", emoji: "🚗" },
      { value: "tech", label: "Technology & Startups", emoji: "💻" },
      { value: "energy", label: "Energy & Petroleum", emoji: "⚡" },
      { value: "fmcg", label: "FMCG & Retail", emoji: "🛒" },
      { value: "other", label: "Other Industry", emoji: "🌍" },
    ],
  },
  {
    id: "challenge", phase: 2,
    question: "What is your biggest communication challenge?",
    subtitle: "Be honest — this is the most important question and drives your entire roadmap.",
    options: [
      { value: "verbal", label: "Speaking clearly & confidently in meetings", emoji: "🗣️" },
      { value: "writing", label: "Writing emails, proposals & reports", emoji: "✍️" },
      { value: "media", label: "Facing media, press or cameras", emoji: "📸" },
      { value: "board", label: "Presenting to boards or investors", emoji: "📊" },
      { value: "crosscultural", label: "Communicating across cultures", emoji: "🌍" },
      { value: "crisis", label: "Crisis or high-pressure communication", emoji: "🚨" },
      { value: "presence", label: "Executive presence & personal brand", emoji: "⭐" },
      { value: "confidence", label: "General confidence & mindset", emoji: "💪" },
    ],
  },
  {
    id: "goal", phase: 2,
    question: "What outcome matters most to you?",
    subtitle: "Pick the one that resonates most deeply — this anchors your 90-day roadmap.",
    options: [
      { value: "influence", label: "Influence & persuade at senior levels", emoji: "🎯" },
      { value: "promotion", label: "Get promoted or win new business", emoji: "📈" },
      { value: "media_ready", label: "Become media-ready & camera confident", emoji: "🎬" },
      { value: "global", label: "Communicate on a global stage", emoji: "🌐" },
      { value: "authentic", label: "Find my authentic leadership voice", emoji: "🪞" },
      { value: "team", label: "Inspire & lead my team more effectively", emoji: "👥" },
    ],
  },
  {
    id: "experience", phase: 2,
    question: "How would you rate your communication skills today?",
    subtitle: "This calibrates where your coaching begins — there's no wrong answer.",
    options: [
      { value: "beginner", label: "Just starting to focus on this", emoji: "🌱" },
      { value: "developing", label: "Some experience, want to improve", emoji: "📈" },
      { value: "proficient", label: "Quite strong, want the next level", emoji: "🎯" },
      { value: "advanced", label: "Already advanced — need elite refinement", emoji: "🏆" },
    ],
  },
  {
    id: "urgency", phase: 3,
    question: "How urgent is your need for coaching?",
    subtitle: "This determines the pace and intensity of your programme.",
    options: [
      { value: "immediate", label: "High-stakes event coming up soon", emoji: "🔥" },
      { value: "months", label: "Progress over the next few months", emoji: "📅" },
      { value: "ongoing", label: "Ongoing professional development", emoji: "🔄" },
      { value: "flexible", label: "Exploring at my own pace", emoji: "🌿" },
    ],
  },
  {
    id: "budget", phase: 3,
    question: "What investment level are you considering?",
    subtitle: "We have options at every level — there's no wrong answer.",
    options: [
      { value: "low", label: "Self-directed — under $50/month", emoji: "💡" },
      { value: "mid", label: "Structured coaching — a few hundred/month", emoji: "📚" },
      { value: "high", label: "Serious investment — I want the best", emoji: "💎" },
      { value: "enterprise", label: "Corporate / team-level engagement", emoji: "🏢" },
    ],
  },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [nameVal, setNameVal] = useState("");
  const [saving, setSaving] = useState(false);
  const [recommendation, setRecommendation] = useState(null);
  const [roadmap, setRoadmap] = useState(null);

  const TOTAL_QUESTIONS = 7;
  const progress = step > 0 && step <= TOTAL_QUESTIONS ? ((step - 1) / TOTAL_QUESTIONS) * 100 : step > TOTAL_QUESTIONS ? 100 : 0;

  const handleChoice = (value) => {
    const newAnswers = { ...answers, [questions[step - 1].id]: value };
    setAnswers(newAnswers);
    if (step < TOTAL_QUESTIONS) {
      setStep(step + 1);
    } else {
      setStep(8);
    }
  };

  const handleName = async () => {
    if (!nameVal.trim()) return;
    const newAnswers = { ...answers, name: nameVal.trim() };
    setAnswers(newAnswers);
    setSaving(true);
    const tier = recommendTier(newAnswers);
    const rm = buildRoadmap(newAnswers);
    setRecommendation(tier);
    setRoadmap(rm);
    try {
      await base44.auth.updateMe({
        onboarding_completed: true,
        preferred_name: nameVal.trim(),
        onboarding_role: newAnswers.role,
        onboarding_industry: newAnswers.industry,
        onboarding_challenge: newAnswers.challenge,
        onboarding_goal: newAnswers.goal,
        onboarding_experience: newAnswers.experience,
        onboarding_urgency: newAnswers.urgency,
        onboarding_budget: newAnswers.budget,
        recommended_tier: tier,
      });
    } catch(e) { /* non-blocking */ }
    setSaving(false);
    setStep(9);
  };

  const tier = recommendation ? tierDetails[recommendation] : null;
  const TierIcon = tier?.icon;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10 relative overflow-hidden"
      style={{ backgroundColor: OLIVE }}>

      <div className="absolute inset-0 opacity-[0.06]"
        style={{ backgroundImage: `radial-gradient(circle at 20% 30%, ${GOLD} 0%, transparent 55%), radial-gradient(circle at 80% 70%, ${FOREST} 0%, transparent 55%)` }} />

      {step > 0 && step < 9 && (
        <div className="fixed top-0 left-0 right-0 h-1 z-50" style={{ backgroundColor: "rgba(255,255,255,0.08)" }}>
          <div className="h-full transition-all duration-700 ease-out" style={{ width: `${progress}%`, backgroundColor: GOLD }} />
        </div>
      )}

      <div className="mb-8 flex items-center gap-3">
        <img src="https://media.base44.com/images/public/69dbb919df7f322227ac67eb/afb515277_NSC-logo-v5.png"
          alt="NSC" className="h-9 w-auto object-contain" />
        <div className="flex flex-col leading-none">
          <span className="font-cormorant text-lg font-semibold tracking-widest uppercase text-white">North South</span>
          <span className="font-inter text-xs tracking-[0.2em] uppercase" style={{ color: GOLD }}>Consulting</span>
        </div>
      </div>

      {step >= 1 && step <= 7 && (
        <div className="flex items-center gap-2 mb-6">
          {PHASES.map((ph, pi) => {
            const active = ph.steps.includes(step);
            const done = ph.steps[ph.steps.length - 1] < step;
            return (
              <div key={pi} className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-inter font-medium transition-all"
                    style={{
                      backgroundColor: done ? GOLD : active ? "rgba(184,149,42,0.3)" : "rgba(255,255,255,0.06)",
                      color: done || active ? "white" : "rgba(255,255,255,0.3)",
                      border: active ? `1.5px solid ${GOLD}` : "1.5px solid transparent",
                    }}>
                    {done ? "✓" : pi + 1}
                  </div>
                  <span className="font-inter text-xs hidden sm:block"
                    style={{ color: active ? "white" : "rgba(255,255,255,0.3)" }}>{ph.label}</span>
                </div>
                {pi < PHASES.length - 1 && (
                  <div className="w-8 h-px" style={{ backgroundColor: "rgba(255,255,255,0.12)" }} />
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="w-full max-w-2xl">
        <div className="rounded-3xl shadow-2xl overflow-hidden"
          style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>

          {/* WELCOME */}
          {step === 0 && (
            <div className="p-8 md:p-12 space-y-8">
              <div className="space-y-3">
                <p className="font-inter text-xs uppercase tracking-widest" style={{ color: GOLD }}>Personalised Coaching Assessment</p>
                <h1 className="font-cormorant text-4xl md:text-5xl font-light text-white leading-tight">
                  Find your perfect<br /><em style={{ color: GOLD }}>coaching match</em>
                </h1>
                <p className="font-inter text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.6)" }}>
                  Answer 7 questions across 3 phases. In under 3 minutes, we'll build your personalised 90-day coaching roadmap and recommend the right tier.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[{ num: "20+", label: "Years Experience" }, { num: "500+", label: "Leaders Coached" }, { num: "30+", label: "Countries" }].map(s => (
                  <div key={s.num} className="text-center p-4 rounded-2xl" style={{ backgroundColor: "rgba(255,255,255,0.05)" }}>
                    <div className="font-cormorant text-3xl font-medium" style={{ color: GOLD }}>{s.num}</div>
                    <div className="font-inter text-xs mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>{s.label}</div>
                  </div>
                ))}
              </div>
              <div className="space-y-3 rounded-2xl p-5" style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                {PHASES.map((ph, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium font-inter shrink-0"
                      style={{ backgroundColor: GOLD + "30", color: GOLD }}>{i + 1}</div>
                    <span className="font-inter text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>{ph.label}</span>
                  </div>
                ))}
              </div>
              <Button className="w-full rounded-full font-inter gap-2 text-base" onClick={() => setStep(1)}
                style={{ backgroundColor: GOLD, color: CREAM, height: "52px" }}>
                Begin My Assessment <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* QUESTIONS */}
          {step >= 1 && step <= 7 && (
            <div className="p-8 md:p-10">
              <p className="font-inter text-xs uppercase tracking-widest mb-5" style={{ color: "rgba(255,255,255,0.3)" }}>
                Question {step} of {TOTAL_QUESTIONS}
              </p>
              <h1 className="font-cormorant text-3xl md:text-4xl font-light text-white leading-tight mb-2">
                {questions[step - 1].question}
              </h1>
              <p className="font-inter text-sm mb-7" style={{ color: "rgba(255,255,255,0.5)" }}>
                {questions[step - 1].subtitle}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {questions[step - 1].options.map(opt => {
                  const qId = questions[step - 1].id;
                  const selected = answers[qId] === opt.value;
                  return (
                    <button key={opt.value} onClick={() => handleChoice(opt.value)}
                      className="flex items-center gap-3 p-4 rounded-2xl text-left transition-all hover:scale-[1.01] active:scale-100"
                      style={{
                        backgroundColor: selected ? GOLD + "25" : "rgba(255,255,255,0.04)",
                        border: selected ? `1.5px solid ${GOLD}` : "1.5px solid rgba(255,255,255,0.09)",
                      }}>
                      <span className="text-xl shrink-0">{opt.emoji}</span>
                      <span className="font-inter text-sm text-white leading-snug">{opt.label}</span>
                      {selected && <CheckCircle className="w-4 h-4 ml-auto shrink-0" style={{ color: GOLD }} />}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center justify-between mt-7">
                {step > 1 ? (
                  <button onClick={() => setStep(step - 1)}
                    className="flex items-center gap-1.5 font-inter text-xs transition-opacity hover:opacity-80"
                    style={{ color: "rgba(255,255,255,0.3)" }}>
                    <ArrowLeft className="w-3.5 h-3.5" /> Back
                  </button>
                ) : <div />}
                <button onClick={() => navigate("/dashboard")} className="font-inter text-xs transition-opacity hover:opacity-60"
                  style={{ color: "rgba(255,255,255,0.2)" }}>
                  Skip for now
                </button>
              </div>
            </div>
          )}

          {/* NAME */}
          {step === 8 && (
            <div className="p-8 md:p-10 space-y-6">
              <div>
                <p className="font-inter text-xs uppercase tracking-widest mb-3" style={{ color: GOLD }}>Almost there</p>
                <h1 className="font-cormorant text-4xl font-light text-white leading-tight mb-2">
                  What shall we<br /><em style={{ color: GOLD }}>call you?</em>
                </h1>
                <p className="font-inter text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
                  Your first name is enough. We'll personalise your entire roadmap from here.
                </p>
              </div>
              <Input
                value={nameVal}
                onChange={e => setNameVal(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleName()}
                placeholder="Your first name"
                className="h-14 rounded-2xl font-cormorant"
                style={{ backgroundColor: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)", color: "white", fontSize: "1.1rem" }}
                autoFocus
              />
              <Button className="w-full rounded-full h-12 font-inter gap-2" onClick={handleName}
                disabled={!nameVal.trim() || saving}
                style={{ backgroundColor: GOLD, color: CREAM }}>
                {saving
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Building your roadmap…</>
                  : <>Reveal My Coaching Roadmap <ArrowRight className="w-4 h-4" /></>}
              </Button>
              <button onClick={() => setStep(step - 1)}
                className="flex items-center gap-1.5 font-inter text-xs transition-opacity hover:opacity-80"
                style={{ color: "rgba(255,255,255,0.3)" }}>
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
            </div>
          )}

          {/* ROADMAP + RECOMMENDATION */}
          {step === 9 && tier && roadmap && (
            <div className="p-8 md:p-10 space-y-7">
              <div>
                <p className="font-inter text-xs uppercase tracking-widest mb-2" style={{ color: GOLD }}>Your Personalised Roadmap</p>
                <h1 className="font-cormorant text-3xl md:text-4xl font-light text-white leading-tight">
                  {nameVal ? `${nameVal}, here is` : "Here is"} your<br />
                  <em style={{ color: GOLD }}>90-day transformation plan</em>
                </h1>
              </div>

              <div className="space-y-3">
                {roadmap.map((phase, i) => {
                  const PhaseIcon = phase.icon;
                  return (
                    <div key={i} className="rounded-2xl p-5 space-y-3"
                      style={{ backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)" }}>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                          style={{ backgroundColor: GOLD + "25" }}>
                          <PhaseIcon className="w-4 h-4" style={{ color: GOLD }} />
                        </div>
                        <div>
                          <span className="font-inter text-xs uppercase tracking-widest" style={{ color: GOLD + "99" }}>{phase.phase}</span>
                          <p className="font-cormorant text-lg font-medium text-white">{phase.title}</p>
                        </div>
                      </div>
                      <ul className="space-y-1.5 ml-12">
                        {phase.items.map((item, j) => (
                          <li key={j} className="flex items-start gap-2">
                            <div className="w-1 h-1 rounded-full mt-2 shrink-0" style={{ backgroundColor: GOLD }} />
                            <span className="font-inter text-sm" style={{ color: "rgba(255,255,255,0.65)" }}>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>

              <div className="rounded-2xl p-6 space-y-4"
                style={{ backgroundColor: "rgba(184,149,42,0.1)", border: `2px solid ${GOLD}50` }}>
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: GOLD + "30" }}>
                    <TierIcon className="w-5 h-5" style={{ color: GOLD }} />
                  </div>
                  <div>
                    <p className="font-inter text-xs uppercase tracking-widest mb-0.5" style={{ color: GOLD }}>Recommended for you</p>
                    <h3 className="font-cormorant text-2xl font-medium text-white">{tier.name}</h3>
                    <p className="font-inter text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>{tier.price}</p>
                  </div>
                </div>
                <p className="font-inter text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.7)" }}>
                  {tier.description}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {tier.features.map((f, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <CheckCircle className="w-3.5 h-3.5 shrink-0" style={{ color: GOLD }} />
                      <span className="font-inter text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>{f}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Link to={tier.href}>
                  <Button className="w-full rounded-full h-11 font-inter gap-2"
                    style={{ backgroundColor: GOLD, color: CREAM }}>
                    {tier.cta} <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Button variant="ghost" className="w-full rounded-full h-11 font-inter"
                  onClick={() => navigate("/dashboard")}
                  style={{ color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.12)" }}>
                  Go to Dashboard
                </Button>
              </div>

              <div className="flex justify-between items-center pt-1">
                <Link to="/#pricing" className="font-inter text-xs underline" style={{ color: "rgba(255,255,255,0.25)" }}>
                  View all pricing options
                </Link>
                <button onClick={() => { setStep(0); setAnswers({}); setNameVal(""); }}
                  className="font-inter text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>
                  Start over
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}