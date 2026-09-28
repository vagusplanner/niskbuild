import { Link } from "react-router-dom";
import ContactForm from "./ContactForm";
import { Linkedin, Instagram, Youtube } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";
import NewsletterSignup from "@/components/NewsletterSignup";

const FOREST = "#2C3B2D";
const GOLD = "#B8952A";
const OLIVE = "#3D4A2F";
const CREAM = "#F5F0E0";

export default function FooterSection() {
  const { t } = useLanguage();
  return (
    <footer style={{ backgroundColor: OLIVE }} className="text-white">

      {/* Contact section */}
      <div className="max-w-7xl mx-auto px-6 py-20">
        <div className="grid lg:grid-cols-2 gap-16 items-start">
          <div className="space-y-6">
            <div>
              <p className="font-inter text-xs tracking-widest uppercase font-medium mb-3" style={{ color: GOLD }}>{t("getInTouch")}</p>
              <h2 className="font-cormorant text-4xl md:text-5xl font-light text-white leading-tight">
                {t("footerTagline").split("starts")[0]}<br /><em style={{ color: GOLD }}>starts with a conversation.</em>
              </h2>
            </div>
            <p className="font-inter text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>
              {t("footerDesc")}
            </p>
            <p className="font-cormorant text-base italic" style={{ color: GOLD }}>
              {t("footerQuote")}
            </p>
            <div className="space-y-4 pt-2">
              {[
                { emoji: "🌐", text: "International Executive Coaching" },
                { emoji: "🎙️", text: "Media · Government · Corporate · Diplomatic" },
              ].map(item => (
                <div key={item.text} className="flex items-center gap-3">
                  <span className="text-lg">{item.emoji}</span>
                  <span className="font-inter text-sm" style={{ color: "rgba(255,255,255,0.55)" }}>{item.text}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-3xl p-8 border" style={{ backgroundColor: "rgba(255,255,255,0.04)", borderColor: GOLD + "20" }}>
            <ContactForm dark />
          </div>
        </div>
      </div>

      {/* Divider */}
      <div style={{ borderColor: GOLD + "20" }} className="border-t" />

      {/* Newsletter */}
      <div className="max-w-7xl mx-auto px-6 py-12 border-t" style={{ borderColor: GOLD + "20" }}>
        <div className="max-w-xl">
          <NewsletterSignup source="footer" dark />
        </div>
      </div>

      {/* Main footer */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid md:grid-cols-4 gap-10 mb-10">
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <img src="https://media.base44.com/images/public/69dbb919df7f322227ac67eb/afb515277_NSC-logo-v5.png"
                alt="NSC Logo" className="h-14 w-auto object-contain" />
              <div className="flex flex-col leading-none">
                <span className="font-cormorant text-lg font-semibold tracking-widest uppercase text-white">North South</span>
                <span className="font-inter text-xs tracking-[0.2em] uppercase" style={{ color: GOLD }}>Consulting</span>
              </div>
            </div>
            <p className="font-inter text-sm leading-relaxed max-w-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
              Led by Nishat Ismail-Kemih — Communication & Media Consultant and English Coach with 20 years of international experience across media, automotive, banking, petroleum and government sectors.
            </p>
          </div>

          <div className="space-y-4">
            <div className="font-inter text-xs tracking-widest uppercase font-medium" style={{ color: GOLD + "60" }}>Services</div>
            <ul className="space-y-2">
              {["Verbal Communication", "Written Communication", "Media Training", "Body Language", "Cross-Cultural Coaching", "Life Coaching"].map(s => (
                <li key={s}><a href="/#services" className="font-inter text-sm transition-opacity hover:opacity-80" style={{ color: "rgba(255,255,255,0.45)" }}>{s}</a></li>
              ))}
            </ul>
          </div>

          <div className="space-y-4">
            <div className="font-inter text-xs tracking-widest uppercase font-medium" style={{ color: GOLD + "60" }}>Platform</div>
            <ul className="space-y-2">
              {[["Book a Session", "/book"], ["Free Discovery Call", "/discovery"], ["AI Coach", "/ai-coach"], ["Blog & Insights", "/blog"], ["Case Studies", "/case-studies"], ["Dashboard", "/dashboard"]].map(([label, href]) => (
                <li key={label}><Link to={href} className="font-inter text-sm transition-opacity hover:opacity-80" style={{ color: "rgba(255,255,255,0.45)" }}>{label}</Link></li>
              ))}
            </ul>
          </div>
        </div>

        {/* Client strip */}
        <div className="border-t border-b py-5 mb-6" style={{ borderColor: GOLD + "15" }}>
          <div className="flex flex-wrap justify-center gap-5 md:gap-8">
            {["BBC", "National Geographic", "ITV", "Channel 4 & 5", "Al Jazeera", "HSBC", "Canon", "Kellogg's", "Stellantis", "Qatar Media Corp", "Gulf Drilling International"].map(c => (
              <span key={c} className="font-cormorant text-sm font-medium" style={{ color: "rgba(255,255,255,0.25)" }}>{c}</span>
            ))}
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="font-inter text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
            © {new Date().getFullYear()} North South Consulting. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            {[
              { href: "https://www.linkedin.com/company/north-south-consulting", Icon: Linkedin },
              { href: "https://www.instagram.com/northsouthconsulting", Icon: Instagram },
              { href: "https://www.youtube.com/@northsouthconsulting", Icon: Youtube },
            ].map(({ href, Icon }) => (
              <a key={href} href={href} target="_blank" rel="noopener noreferrer"
                className="w-8 h-8 rounded-full flex items-center justify-center transition-opacity hover:opacity-80"
                style={{ backgroundColor: GOLD + "20" }}>
                <Icon className="w-3.5 h-3.5" style={{ color: GOLD }} />
              </a>
            ))}
          </div>
          <div className="flex gap-5">
            <Link to="/legal" className="font-inter text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>{t("privacyPolicy")}</Link>
            <Link to="/legal" className="font-inter text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>{t("termsOfService")}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}