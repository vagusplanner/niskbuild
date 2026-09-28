import { Award, GraduationCap, Star, Shield } from "lucide-react";

const GOLD = "#B8952A";
const OLIVE = "#3D4A2F";
const CREAM = "#F5F0E0";
const FOREST = "#2C3B2D";

const accreditations = [
  {
    icon: GraduationCap,
    title: "MA Communication, Culture & Media",
    subtitle: "Coventry University, UK",
    desc: "Postgraduate master's degree specialising in international communication theory, media studies and cross-cultural discourse.",
  },
  {
    icon: Award,
    title: "20 Years International Practice",
    subtitle: "UK · France · 30+ Countries",
    desc: "Two decades of hands-on experience across media, government, automotive, banking and international organisations.",
  },
  {
    icon: Shield,
    title: "Government Reference Project",
    subtitle: "French Government Advisory",
    desc: "A corporate film project directed by Nishat was adopted as an official reference document by the French government and international organisations.",
  },
  {
    icon: Star,
    title: "BBC · ITV · Al Jazeera Alumni",
    subtitle: "Broadcast Professional",
    desc: "Former broadcast professional with credits across world-leading international media channels including BBC, ITV, Channel 4 & 5, National Geographic and Al Jazeera.",
  },
];

export default function AccreditationsSection() {
  return (
    <section className="py-20" style={{ backgroundColor: CREAM }}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-12 space-y-3">
          <p className="font-inter text-xs tracking-widest uppercase font-medium" style={{ color: GOLD }}>Credentials & Expertise</p>
          <h2 className="font-cormorant text-4xl font-light text-foreground">
            Qualified. Experienced. <em>Internationally recognised.</em>
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {accreditations.map((acc, i) => (
            <div key={i} className="rounded-2xl border border-border p-6 space-y-4 bg-card hover:shadow-lg transition-shadow text-center">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto"
                style={{ backgroundColor: GOLD + "15" }}>
                <acc.icon className="w-6 h-6" style={{ color: GOLD }} />
              </div>
              <div>
                <h4 className="font-cormorant text-lg font-medium text-foreground leading-tight">{acc.title}</h4>
                <p className="font-inter text-xs mt-1 font-medium" style={{ color: GOLD }}>{acc.subtitle}</p>
              </div>
              <p className="font-inter text-xs text-muted-foreground leading-relaxed">{acc.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}