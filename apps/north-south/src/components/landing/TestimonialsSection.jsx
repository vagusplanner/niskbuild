import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    name: "Marcus Delacroix",
    title: "CEO, European Investment Group",
    quote: "Nishat has an extraordinary ability to see exactly where your communication is costing you — and fix it. My investor presentations went from technically sound to genuinely captivating. Her media training transformed how I am perceived internationally.",
    tier: "Bespoke",
    country: "🇫🇷 France",
  },
  {
    name: "Yuki Tanaka",
    title: "COO, Asia Pacific Technology",
    quote: "As a non-native English speaker leading multinational teams, I struggled with nuance in high-stakes negotiations. This coaching gave me vocabulary, presence and cross-cultural intelligence I never knew I was missing.",
    tier: "Hybrid",
    country: "🇯🇵 Japan",
  },
  {
    name: "Isabelle Fontaine",
    title: "Chief Communications Officer",
    quote: "The AI writing coach alone is worth the subscription — it flagged patterns in my emails I'd never noticed. Combined with Nishat's personal coaching, my entire team has noticed the transformation in my leadership communication.",
    tier: "AI Self-Service",
    country: "🇧🇪 Belgium",
  },
  {
    name: "James Okonkwo",
    title: "Director General, International Affairs",
    quote: "Understanding body language dynamics during diplomatic meetings was a revelation. Nishat's broadcast background means she sees what others miss. I now read rooms in ways I simply couldn't before.",
    tier: "Bespoke",
    country: "🇳🇬 Nigeria",
  },
  {
    name: "Sara Al-Rashid",
    title: "VP Communications, Gulf Regional Authority",
    quote: "Coaching in Arabic and English, understanding both worlds — I've never experienced anything like it. Nishat's ability to bridge cultures while elevating my English executive presence was game-changing.",
    tier: "Hybrid",
    country: "🇦🇪 UAE",
  },
  {
    name: "Pierre-Henri Moreau",
    title: "Managing Director, Francophone Africa",
    quote: "The cross-cultural communication coaching prepared me perfectly for expanding into new markets. I can now navigate complex stakeholder environments with confidence — in boardrooms, media, and diplomatic settings.",
    tier: "Bespoke",
    country: "🇨🇩 DRC",
  },
];

export default function TestimonialsSection() {
  return (
    <section className="py-28" style={{ backgroundColor: "#3D4A2F" }}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16 space-y-4">
          <p className="font-inter text-xs tracking-widest uppercase font-medium" style={{ color: "#B8952A" }}>Client Voices</p>
          <h2 className="font-cormorant text-4xl md:text-5xl font-light text-white">
            Transformations from<br /><em style={{ color: "#B8952A" }}>every corner of the world</em>
          </h2>
          <p className="font-inter max-w-lg mx-auto" style={{ color: "rgba(255,255,255,0.5)" }}>
            Our clients lead across industries, cultures, and continents. Their words speak to results.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {testimonials.map((t, i) => (
            <div key={i} className="rounded-2xl p-7 border flex flex-col gap-4"
              style={{ backgroundColor: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)" }}>
              <div className="flex gap-0.5">
                {[...Array(5)].map((_, j) => <Star key={j} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />)}
              </div>
              <p className="font-cormorant text-xl font-light leading-relaxed italic flex-1"
                style={{ color: "rgba(255,255,255,0.9)" }}>
                "{t.quote}"
              </p>
              <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
                <div>
                  <div className="font-inter text-sm font-medium text-white">{t.name}</div>
                  <div className="font-inter text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>{t.title}</div>
                  <div className="font-inter text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>{t.country}</div>
                </div>
                <div className="text-xs font-inter px-3 py-1 rounded-full"
                  style={{ backgroundColor: "#B8952A30", color: "#B8952A" }}>
                  {t.tier}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}