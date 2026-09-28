import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    q: "What makes North South Consulting different from other coaching platforms?",
    a: "We are the only platform combining two specialist consultants — one with 20+ years of international broadcast media experience (BBC, National Geographic, ITV, Channel 4, Qatar TV) and one executive communication specialist — with a proprietary AI coaching layer. You get broadcast-grade precision, human coaching wisdom, and always-on AI tools in one platform.",
  },
  {
    q: "Can I try the AI coaching tools before committing?",
    a: "Yes. The AI Coach hub is available to all registered users. You can explore writing analysis, speech feedback, vocabulary building, and more before choosing a paid tier. No credit card required to create an account.",
  },
  {
    q: "How quickly will I see results?",
    a: "Most clients notice measurable improvements in their written communication within the first two weeks. Verbal communication and presence coaching typically shows clear progression within 4–6 sessions. Our AI tools provide instant feedback from day one.",
  },
  {
    q: "Do I need to be a native English speaker?",
    a: "Absolutely not. Some of our most impactful work is with senior executives who operate in English as a second or third language. We specialise in helping non-native speakers develop nuance, authority, and authentic voice in professional English.",
  },
  {
    q: "What is the difference between Hybrid and Bespoke?",
    a: "Hybrid gives you structured monthly sessions (2 per month) combined with unlimited AI tool access — ideal for ongoing professional development. Bespoke is a fully custom retainer engagement for executives who need unlimited access, speech ghostwriting, crisis communication support, or corporate team workshops. Bespoke pricing is tailored to your specific brief.",
  },
  {
    q: "How are the live sessions conducted?",
    a: "All 1:1 sessions are conducted via video call (Google Meet or Zoom) and automatically added to your calendar with a meeting link. Sessions are available across major time zones, including evenings and weekends.",
  },
  {
    q: "Is there a contract or minimum commitment?",
    a: "No long-term contracts. Our subscription plans are month-to-month. We offer a 14-day money-back guarantee — if you're not satisfied in the first two weeks, we'll refund your subscription, no questions asked.",
  },
  {
    q: "Can my company purchase for a team?",
    a: "Yes. We offer corporate team pricing for organisations seeking group coaching, leadership team workshops, or bulk AI tool access. Contact us via the discovery call to discuss a tailored corporate package.",
  },
];

export default function FAQ() {
  const [open, setOpen] = useState(null);

  return (
    <section className="py-28 bg-secondary/30">
      <div className="max-w-3xl mx-auto px-6">
        <div className="text-center mb-14 space-y-4">
          <p className="font-inter text-sm tracking-widest uppercase text-primary font-medium">Common Questions</p>
          <h2 className="font-cormorant text-4xl md:text-5xl font-light text-foreground">
            Everything you need<br /><em>to know</em>
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div key={i} className="bg-card rounded-2xl border border-border overflow-hidden">
              <button
                className="w-full flex items-center justify-between p-6 text-left hover:bg-secondary/30 transition-colors"
                onClick={() => setOpen(open === i ? null : i)}
              >
                <span className="font-cormorant text-lg font-medium text-foreground pr-4">{faq.q}</span>
                <ChevronDown className={`w-4 h-4 text-primary shrink-0 transition-transform duration-200 ${open === i ? "rotate-180" : ""}`} />
              </button>
              {open === i && (
                <div className="px-6 pb-6">
                  <p className="font-inter text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}