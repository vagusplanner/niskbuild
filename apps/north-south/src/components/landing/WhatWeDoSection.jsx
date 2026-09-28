import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/LanguageContext";

const GOLD = "#B8952A";
const CREAM = "#F5F0E0";

const items = [
  { num: "1", key: "Image consulting & personal presence to unlock your potential." },
  { num: "2", key: "Face-to-face and online sessions, fully adaptable to your needs." },
  { num: "3", key: "Rewrite scripts, speeches, official documents and social profiles." },
  { num: "4", key: "Encourage personal and professional development to enhance your strengths." },
  { num: "5", key: "Flexible techniques to improve formal and informal conversations." },
  { num: "6", key: "Build confidence to speak dynamically to audiences of any size." },
];

export default function WhatWeDoSection() {
  const { t } = useLanguage();

  return (
    <section className="py-20" style={{ backgroundColor: "#3D4A2F" }}>
      <div className="max-w-7xl mx-auto px-6">
        {/* Illustration images — no faces */}
        <div className="grid grid-cols-2 gap-4 mb-14">
          <div className="rounded-2xl overflow-hidden h-52">
            <img
              src="https://media.base44.com/images/public/69dbb919df7f322227ac67eb/531005525_Gemini_Generated_Image_m23gf2m23gf2m23g.png"
              alt="Nishat presenting"
              className="w-full h-full object-cover object-top"
            />
          </div>
          <div className="rounded-2xl overflow-hidden h-52">
            <img
              src="https://media.base44.com/images/public/69dbb919df7f322227ac67eb/769915688_Gemini_Generated_Image_qpwd4aqpwd4aqpwd.png"
              alt="Nishat consulting"
              className="w-full h-full object-cover object-top"
            />
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-14 items-center">
          <div className="space-y-5">
            <div>
              <p className="font-inter text-xs tracking-widest uppercase font-medium mb-3" style={{ color: GOLD }}>{t("whatWeDoTag")}</p>
              <h2 className="font-cormorant text-4xl md:text-5xl font-light text-white leading-tight">
                {t("whatWeDoTitle")}<br /><em style={{ color: GOLD }}>{t("whatWeDoSubtitle")}</em>
              </h2>
            </div>
            <p className="font-inter leading-relaxed text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
              {t("whatWeDoDesc")}
            </p>
            <div className="flex flex-wrap gap-4 pt-1">
              <Link to="/discovery">
                <Button size="lg" className="rounded-full px-8" style={{ backgroundColor: GOLD, color: CREAM }}>
                  {t("startFreeCall")}
                </Button>
              </Link>
              <Link to="/book">
                <Button size="lg" variant="outline" className="rounded-full px-8 border-white/20 text-white hover:bg-white/10">
                  {t("bookSession")}
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            {items.map((item) => (
              <div key={item.num} className="rounded-2xl p-4 space-y-2 border"
                style={{ backgroundColor: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.08)" }}>
                <span className="font-cormorant text-2xl font-medium" style={{ color: GOLD }}>{item.num}.</span>
                <p className="font-inter text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.7)" }}>{item.key}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}