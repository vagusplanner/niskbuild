import { useLanguage } from "@/lib/LanguageContext";

const GOLD = "#B8952A";
const FOREST = "#2C3B2D";
const CREAM = "#F5F0E0";

const langs = [
  { code: "en", label: "EN", flag: "🇬🇧" },
  { code: "fr", label: "FR", flag: "🇫🇷" },
  { code: "ar", label: "AR", flag: "🇸🇦" },
  { code: "ur", label: "UR", flag: "🇵🇰" },
];

export default function LanguageSwitcher({ dark = false }) {
  const { lang, setLang } = useLanguage();

  return (
    <div className="flex items-center gap-1 rounded-full border px-1 py-0.5"
      style={{ borderColor: dark ? "rgba(255,255,255,0.15)" : GOLD + "30", backgroundColor: dark ? "rgba(255,255,255,0.06)" : GOLD + "08" }}>
      {langs.map(l => (
        <button
          key={l.code}
          onClick={() => setLang(l.code)}
          className="flex items-center gap-1 px-2 py-1 rounded-full font-inter text-xs font-medium transition-all"
          style={{
            backgroundColor: lang === l.code ? GOLD : "transparent",
            color: lang === l.code ? CREAM : dark ? "rgba(255,255,255,0.5)" : FOREST + "80",
          }}
        >
          <span>{l.flag}</span>
          <span>{l.label}</span>
        </button>
      ))}
    </div>
  );
}