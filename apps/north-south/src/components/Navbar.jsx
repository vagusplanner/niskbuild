import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X, ChevronDown, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useLanguage } from "@/lib/LanguageContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";

// Brand tokens from NSC logo
const FOREST = "#2C3B2D";
const GOLD = "#B8952A";
const OLIVE = "#3D4A2F";
const CREAM = "#F5F0E0";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [appMenu, setAppMenu] = useState(false);
  const { isAuthenticated, logout } = useAuth();
  const { t } = useLanguage();

  const links = [
    { label: t("services"), href: "/#services" },
    { label: t("about"), href: "/#about" },
    { label: t("pricing"), href: "/#pricing" },
    { label: t("insights") || "Insights", href: "/insights" },
  ];

  const appLinks = [
    { label: t("clientPortal"), href: "/portal" },
    { label: t("aiCoach"), href: "/ai-coach" },
    { label: t("leadershipGoals"), href: "/goals" },
    { label: t("performanceInsights"), href: "/insights" },
    { label: t("mySessions"), href: "/my-bookings" },
    { label: t("dashboard"), href: "/dashboard" },
    { label: "Learning Paths", href: "/learning" },
    { label: t("resources"), href: "/resources" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b" style={{ backgroundColor: CREAM + "F5", backdropFilter: "blur(16px)", borderColor: GOLD + "30" }}>
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 shrink-0 group">
          <img
            src="https://media.base44.com/images/public/69dbb919df7f322227ac67eb/afb515277_NSC-logo-v5.png"
            alt="North South Consulting"
            className="h-20 w-auto object-contain"
          />
          <div className="flex flex-col leading-none">
            <span className="font-cormorant text-lg font-semibold tracking-widest uppercase" style={{ color: FOREST }}>North South</span>
            <span className="font-inter text-xs tracking-[0.2em] uppercase font-medium" style={{ color: GOLD }}>Consulting</span>
          </div>
        </Link>

        <div className="hidden md:flex items-center gap-6">
          {links.map(l => (
            <a key={l.href} href={l.href} className="font-inter text-sm transition-colors hover:opacity-100"
              style={{ color: FOREST + "99" }}
              onMouseEnter={e => e.target.style.color = GOLD}
              onMouseLeave={e => e.target.style.color = FOREST + "99"}>
              {l.label}
            </a>
          ))}

          {/* App dropdown */}
          <div className="relative">
            <button
              onClick={() => setAppMenu(!appMenu)}
              className="flex items-center gap-1 font-inter text-sm transition-colors"
              style={{ color: FOREST + "99" }}
            >
              {t("myAccount")} <ChevronDown className={`w-3.5 h-3.5 transition-transform ${appMenu ? "rotate-180" : ""}`} />
            </button>
            {appMenu && (
              <div className="absolute top-full right-0 mt-2 rounded-2xl shadow-xl p-2 min-w-[190px] border"
                style={{ backgroundColor: CREAM, borderColor: GOLD + "30" }}
                onMouseLeave={() => setAppMenu(false)}>
                {appLinks.map(l => (
                  <Link key={l.href} to={l.href} onClick={() => setAppMenu(false)}
                    className="block px-4 py-2.5 font-inter text-sm rounded-xl transition-colors"
                    style={{ color: FOREST + "99" }}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = GOLD + "15"; e.currentTarget.style.color = FOREST; }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = FOREST + "99"; }}>
                    {l.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <LanguageSwitcher />

          <Link to="/onboarding">
            <Button size="sm" variant="ghost" className="rounded-full px-5 font-inter border"
              style={{ color: GOLD, borderColor: GOLD + "50", backgroundColor: GOLD + "10" }}>
              {t("getToKnowYou")}
            </Button>
          </Link>
          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <Link to="/dashboard">
                <Button size="sm" className="rounded-full px-5 font-inter"
                  style={{ backgroundColor: OLIVE, color: CREAM }}>
                  {t("dashboard")}
                </Button>
              </Link>
              <Button size="sm" variant="ghost" className="rounded-full px-4 font-inter"
                style={{ color: FOREST + "80" }}
                onClick={() => logout()}>
                {t("signOut")}
              </Button>
            </div>
          ) : (
            <Button size="sm" className="rounded-full px-5 font-inter gap-1.5"
              style={{ backgroundColor: FOREST, color: CREAM }}
              onClick={() => base44.auth.redirectToLogin(window.location.href)}>
              <LogIn className="w-3.5 h-3.5" /> {t("signIn")}
            </Button>
          )}
        </div>

        <button className="md:hidden" onClick={() => setOpen(!open)} style={{ color: FOREST }}>
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t px-6 py-4 flex flex-col gap-3"
          style={{ backgroundColor: CREAM, borderColor: GOLD + "20" }}>
          {links.map(l => (
            <a key={l.href} href={l.href} onClick={() => setOpen(false)}
              className="font-inter text-sm py-1" style={{ color: FOREST + "80" }}>{l.label}</a>
          ))}
          <div className="border-t pt-3 space-y-2" style={{ borderColor: GOLD + "20" }}>
            {appLinks.map(l => (
              <Link key={l.href} to={l.href} onClick={() => setOpen(false)}>
                <Button size="sm" variant="ghost" className="w-full rounded-full justify-start font-inter"
                  style={{ color: FOREST + "80" }}>{l.label}</Button>
              </Link>
            ))}
          </div>
          <Link to="/onboarding" onClick={() => setOpen(false)}>
            <Button size="sm" className="w-full rounded-full font-inter"
              style={{ backgroundColor: GOLD, color: CREAM }}>Get to Know You</Button>
          </Link>
          <Link to="/discovery" onClick={() => setOpen(false)}>
            <Button size="sm" variant="outline" className="w-full rounded-full font-inter"
              style={{ borderColor: FOREST + "40", color: FOREST }}>Free Discovery Call</Button>
          </Link>
          {isAuthenticated ? (
            <>
              <Link to="/dashboard" onClick={() => setOpen(false)}>
                <Button size="sm" className="w-full rounded-full font-inter"
                  style={{ backgroundColor: OLIVE, color: CREAM }}>Dashboard</Button>
              </Link>
              <Button size="sm" variant="ghost" className="w-full rounded-full font-inter"
                style={{ color: FOREST + "70" }}
                onClick={() => { setOpen(false); logout(); }}>
                Sign Out
              </Button>
            </>
          ) : (
            <Button size="sm" className="w-full rounded-full font-inter gap-1.5"
              style={{ backgroundColor: FOREST, color: CREAM }}
              onClick={() => { setOpen(false); base44.auth.redirectToLogin(window.location.href); }}>
              <LogIn className="w-3.5 h-3.5" /> Sign In / Register
            </Button>
          )}
        </div>
      )}
    </nav>
  );
}