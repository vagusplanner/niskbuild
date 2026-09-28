import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Globe, Star } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";

const FOREST = "#2C3B2D";
const GOLD = "#B8952A";
const OLIVE = "#3D4A2F";
const CREAM = "#F5F0E0";

export default function Hero() {
  const { t } = useLanguage();

  const stats = [
    { value: "17+", label: t("countriesServed") },
    { value: "287+", label: t("executivesCoached") },
    { value: "20+", label: "Years Experience" },
  ];

  return (
    <section className="relative min-h-screen flex items-center pt-20 overflow-hidden" style={{ backgroundColor: CREAM }}>
      <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at top right, ${GOLD}18 0%, transparent 60%), radial-gradient(ellipse at bottom left, ${OLIVE}12 0%, transparent 60%)` }} />

      <div className="relative max-w-7xl mx-auto px-6 py-20 grid md:grid-cols-2 gap-12 items-center">
        {/* Text */}
        <div className="space-y-8">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-inter font-medium tracking-widest uppercase border"
              style={{ borderColor: GOLD + "50", color: GOLD, backgroundColor: GOLD + "10" }}>
              <Globe className="w-3.5 h-3.5" /> {t("heroTag")}
            </div>
            <h1 className="font-cormorant text-5xl md:text-6xl lg:text-7xl font-light leading-[1.08]" style={{ color: FOREST }}>
              {t("heroTitle1")}<br />
              {t("heroTitle2")}<br />
              <em className="font-normal" style={{ color: GOLD }}>{t("heroTitle3")}</em>
            </h1>
          </div>

          <p className="font-inter text-base leading-relaxed max-w-lg" style={{ color: FOREST + "99" }}>
            {t("heroDesc")}
          </p>

          <div className="flex flex-wrap gap-4">
            <Link to="/onboarding">
              <Button size="lg" className="rounded-full px-8 gap-2 text-base font-inter"
                style={{ backgroundColor: GOLD, color: CREAM }}>
                {t("getToKnowYouBtn")} <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link to="/discovery">
              <Button size="lg" variant="outline" className="rounded-full px-8 text-base font-inter"
                style={{ borderColor: GOLD + "60", color: FOREST }}>
                {t("freeDiscovery")}
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-8 pt-2">
            {stats.map((s, i) => (
              <div key={i} className={i > 0 ? "border-l pl-8" : ""} style={{ borderColor: GOLD + "30" }}>
                <div className="font-cormorant text-3xl font-medium" style={{ color: FOREST }}>{s.value}</div>
                <div className="font-inter text-xs" style={{ color: FOREST + "70" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Image — Nishat */}
        <div className="relative">
          <div className="relative rounded-3xl overflow-hidden shadow-2xl" style={{ border: `1px solid ${GOLD}30` }}>
            <img
              src="https://media.base44.com/images/public/69dbb919df7f322227ac67eb/28028d02a_Gemini_Generated_Image_xlyc38xlyc38xlyc.png"
              alt="Nishat Ismail-Kemih"
              className="w-full h-[540px] object-cover object-top"
            />
            <div className="absolute inset-0" style={{ background: `linear-gradient(to top, ${FOREST}66 0%, transparent 60%)` }} />
            <div className="absolute bottom-6 left-6 right-6">
              <div className="backdrop-blur-sm rounded-2xl p-4 border" style={{ backgroundColor: CREAM + "E8", borderColor: GOLD + "30" }}>
                <p className="font-cormorant text-xl font-medium" style={{ color: FOREST }}>Nishat Ismail-Kemih</p>
                <p className="font-inter text-xs" style={{ color: FOREST + "80" }}>Communication & Media Consultant · English Coach</p>
              </div>
            </div>
          </div>

          {/* Floating badge */}
          <div className="absolute -top-4 -right-4 rounded-2xl shadow-xl p-4 border max-w-[160px]"
            style={{ backgroundColor: OLIVE, borderColor: GOLD + "40" }}>
            <div className="flex gap-0.5 mb-1">
              {[...Array(5)].map((_, i) => <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />)}
            </div>
            <div className="font-cormorant text-2xl font-medium text-white">98%</div>
            <div className="font-inter text-xs text-white/70">{t("clientSatisfaction")}</div>
          </div>
        </div>
      </div>
    </section>
  );
}