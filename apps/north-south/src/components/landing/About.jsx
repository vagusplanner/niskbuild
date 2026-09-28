import { CheckCircle, Quote } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";

const GOLD = "#B8952A";
const OLIVE = "#3D4A2F";
const BROWN = "#705546";

const clients = [
  "Canon", "Stellantis", "Kellogg's", "Al Jazeera", "BBC",
  "National Geographic", "HSBC", "ITV", "Channel 4", "Channel 5",
  "Qatar Media Corporation", "Gulf Drilling International",
];

const sectors = [
  "Media Organisations", "International Automobile Brands",
  "Petroleum Companies", "Banking & Finance",
  "Food Retailers", "Government & Diplomatic Organisations",
];

const skills = [
  { num: "01", titleKey: "Communication Excellence", desc: "Verbal, written and interpersonal — across cultures, languages and industries." },
  { num: "02", titleKey: "Global Negotiations", desc: "Negotiated access with governments and key international political figures." },
  { num: "03", titleKey: "Media & Strategy", desc: "Advised on communicating with media, clients and social channels." },
  { num: "04", titleKey: "Cross-Cultural Adaptability", desc: "Consulted on international cultural differences across 30+ countries." },
];

export default function About() {
  const { t } = useLanguage();

  const credentials = [
    t("credentialYears"),
    t("credentialBased"),
    t("credentialMultilingual"),
    t("credentialGovernment"),
    t("credentialFilm"),
    t("credentialMA"),
  ];

  return (
    <section id="about" className="py-20 bg-background">
      <div className="max-w-7xl mx-auto px-6">

        {/* Header */}
        <div className="text-center mb-14 space-y-3">
          <p className="font-inter text-xs tracking-widest uppercase font-medium" style={{ color: BROWN }}>{t("aboutNishat")}</p>
          <h2 className="font-cormorant text-4xl md:text-5xl font-light text-foreground leading-tight">
            Communication & Media Consultant.<br /><em>English Coach. Global Advisor.</em>
          </h2>
        </div>

        {/* Bio — 2-column, ONE photo of Nishat */}
        <div className="grid md:grid-cols-2 gap-12 items-center mb-16">
          <div className="relative">
            <div className="rounded-3xl overflow-hidden shadow-xl aspect-[4/5]">
              <img
                src="https://media.base44.com/images/public/69dbb919df7f322227ac67eb/57fefa1b0_Gemini_Generated_Image_5jrqg75jrqg75jrq.png"
                alt="Nishat Ismail-Kemih"
                className="w-full h-full object-cover object-top"
              />
            </div>
            <div className="absolute -bottom-6 -left-3 rounded-2xl shadow-2xl p-5 max-w-[260px] border border-border/30"
              style={{ backgroundColor: OLIVE }}>
              <Quote className="w-4 h-4 mb-2" style={{ color: GOLD }} />
              <p className="font-cormorant text-sm font-light italic text-white leading-relaxed">
                "Raise your words not your voice. It is rain that grows flowers, not thunder."
              </p>
              <p className="font-inter text-xs mt-1.5" style={{ color: GOLD }}>— Rumi</p>
            </div>
          </div>

          <div className="space-y-5 pt-4">
            <div>
              <p className="font-inter text-xs tracking-widest uppercase font-medium mb-1.5" style={{ color: GOLD }}>
                {t("founderTitle")}
              </p>
              <h3 className="font-cormorant text-3xl font-medium text-foreground">Nishat Ismail-Kemih</h3>
              <p className="font-inter text-sm text-muted-foreground mt-1">Communication & Media Consultant · English Coach · UK</p>
            </div>

            <p className="font-inter text-muted-foreground leading-relaxed">{t("aboutBio")}</p>
            <p className="font-inter text-muted-foreground leading-relaxed">{t("aboutBio2")}</p>
            <p className="font-inter text-muted-foreground leading-relaxed">{t("aboutBio3")}</p>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              {credentials.map((h, j) => (
                <div key={j} className="flex items-start gap-2">
                  <CheckCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: GOLD }} />
                  <span className="font-inter text-xs text-muted-foreground">{h}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Skills — 4 cards, compact */}
        <div className="mb-14">
          <div className="text-center mb-8">
            <p className="font-inter text-xs tracking-widest uppercase font-medium mb-2" style={{ color: BROWN }}>{t("skillsTag")}</p>
            <h3 className="font-cormorant text-3xl font-light text-foreground">{t("skillsTitle")}</h3>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {skills.map((s, i) => (
              <div key={i} className="rounded-2xl border border-border p-5 space-y-2 bg-card hover:shadow-md transition-shadow">
                <span className="font-cormorant text-2xl font-light" style={{ color: "#967462" }}>{s.num}</span>
                <h4 className="font-cormorant text-lg font-medium text-foreground">{s.titleKey}</h4>
                <p className="font-inter text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Clients — compact */}
        <div className="rounded-3xl border border-border p-8 space-y-6" style={{ backgroundColor: "#f5f0eb" }}>
          <div className="text-center space-y-1">
            <p className="font-inter text-xs tracking-widest uppercase font-medium" style={{ color: GOLD }}>{t("clientsTag")}</p>
            <h3 className="font-cormorant text-2xl font-light text-foreground">{t("clientsTitle")}</h3>
          </div>

          <div className="flex flex-wrap justify-center gap-2.5">
            {clients.map(c => (
              <span key={c} className="font-cormorant text-sm font-medium px-3 py-1 rounded-full border"
                style={{ borderColor: GOLD + "60", color: OLIVE, backgroundColor: "white" }}>
                {c}
              </span>
            ))}
          </div>

          <div className="border-t pt-5" style={{ borderColor: BROWN + "20" }}>
            <p className="font-inter text-xs text-center text-muted-foreground tracking-widest uppercase mb-3">{t("sectorsLabel")}</p>
            <div className="flex flex-wrap justify-center gap-2">
              {sectors.map(s => (
                <span key={s} className="font-inter text-xs px-3 py-1 rounded-full bg-white border border-border text-muted-foreground">{s}</span>
              ))}
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}