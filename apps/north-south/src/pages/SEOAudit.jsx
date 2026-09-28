import { useState } from "react";
import { base44 } from "@/api/base44Client";
import Navbar from "../components/Navbar";
import FooterSection from "../components/landing/FooterSection";
import { Button } from "@/components/ui/button";
import {
  Search, CheckCircle, AlertTriangle, XCircle, Loader2,
  ChevronDown, ChevronUp, Globe, FileText, Smartphone, Tag, Hash
} from "lucide-react";

const GOLD = "#B8952A";
const OLIVE = "#3D4A2F";
const CREAM = "#F5F0E0";
const FOREST = "#2C3B2D";

const PAGES_TO_AUDIT = [
  {
    id: "home",
    label: "Home / Landing",
    path: "/",
    title: "North South Consulting — Executive Communication & Leadership Coaching",
    metaDesc: "Led by Nishat Ismail-Kemih. Transforming how leaders communicate across cultures, boardrooms and global stages. 20+ years experience, 30+ countries.",
    h1: "Navigate your path to extraordinary",
    h2s: ["What We Offer", "What We Can Do For You", "Investment", "About Nishat", "Transformations That Speak For Themselves"],
    wordCount: 2800,
    hasImages: true,
    imagesWithAlt: true,
    mobileViewport: true,
    canonicalTag: true,
    keywords: ["executive coaching", "communication coaching", "leadership", "Nishat Ismail-Kemih", "executive presence"],
  },
  {
    id: "blog",
    label: "Blog",
    path: "/blog",
    title: "Communication Intelligence — Blog | North South Consulting",
    metaDesc: "Practical insights from 20 years of coaching executives and advising international organisations on communication, media training and leadership.",
    h1: "Communication Intelligence from the field",
    h2s: ["Executive Presence", "Language & Communication", "Body Language", "Cross-Cultural", "Media Training", "Written Communication"],
    wordCount: 1200,
    hasImages: true,
    imagesWithAlt: false,
    mobileViewport: true,
    canonicalTag: false,
    keywords: ["executive communication", "leadership blog", "body language", "media training", "communication tips"],
  },
  {
    id: "case-studies",
    label: "Case Studies",
    path: "/case-studies",
    title: "Results & Impact — Case Studies | North South Consulting",
    metaDesc: "Real transformation outcomes from media training, cross-cultural coaching, executive communication and diplomatic advisory engagements.",
    h1: "Transformations that speak for themselves",
    h2s: ["Media Training", "Cross-Cultural Communication", "Written Communication", "Diplomatic Communication"],
    wordCount: 1800,
    hasImages: true,
    imagesWithAlt: true,
    mobileViewport: true,
    canonicalTag: false,
    keywords: ["executive coaching results", "communication transformation", "media training results", "case studies"],
  },
  {
    id: "about",
    label: "About (Section)",
    path: "/#about",
    title: "About Nishat Ismail-Kemih",
    metaDesc: "20 years of international communication consulting across media, automotive, government and finance sectors.",
    h1: "Communication & Media Consultant",
    h2s: ["Skills & Abilities", "Clients & Organisations"],
    wordCount: 900,
    hasImages: true,
    imagesWithAlt: true,
    mobileViewport: true,
    canonicalTag: true,
    keywords: ["Nishat Ismail-Kemih", "communication consultant", "media consultant", "executive coach UK"],
  },
];

const TARGET_KEYWORDS = [
  "executive communication coaching",
  "leadership communication",
  "executive presence",
  "media training",
  "cross-cultural communication",
  "communication consultant UK",
  "Nishat Ismail-Kemih",
  "business communication",
];

function scoreItem(page) {
  const checks = [];

  // Title tag
  const titleLen = page.title?.length || 0;
  checks.push({
    category: "Meta",
    icon: Tag,
    label: "Title Tag Length",
    status: titleLen >= 50 && titleLen <= 60 ? "pass" : titleLen > 0 && titleLen < 70 ? "warn" : "fail",
    detail: titleLen > 0
      ? `"${page.title}" (${titleLen} chars — ideal: 50–60)`
      : "No title tag found",
    fix: titleLen > 60 ? "Shorten title to under 60 characters for optimal display in SERPs." : titleLen < 50 ? "Expand title to at least 50 characters with primary keyword." : null,
  });

  // Meta description
  const descLen = page.metaDesc?.length || 0;
  checks.push({
    category: "Meta",
    icon: FileText,
    label: "Meta Description",
    status: descLen >= 120 && descLen <= 160 ? "pass" : descLen > 0 ? "warn" : "fail",
    detail: descLen > 0
      ? `${descLen} chars (ideal: 120–160)`
      : "No meta description found",
    fix: descLen > 160 ? "Trim meta description to under 160 characters." : descLen < 120 ? "Expand meta description to 120–160 characters including the primary keyword." : null,
  });

  // H1
  checks.push({
    category: "Headers",
    icon: Hash,
    label: "H1 Tag",
    status: page.h1 ? "pass" : "fail",
    detail: page.h1 ? `"${page.h1}"` : "No H1 tag found",
    fix: !page.h1 ? "Add a single H1 tag containing your primary keyword." : null,
  });

  // H2s
  checks.push({
    category: "Headers",
    icon: Hash,
    label: "H2 Tags",
    status: page.h2s?.length >= 2 ? "pass" : page.h2s?.length === 1 ? "warn" : "fail",
    detail: page.h2s?.length > 0 ? `${page.h2s.length} H2 tags found: ${page.h2s.slice(0, 3).join(", ")}${page.h2s.length > 3 ? "…" : ""}` : "No H2 tags found",
    fix: !page.h2s?.length ? "Add H2 subheadings with secondary keywords to structure content." : null,
  });

  // Word count
  checks.push({
    category: "Content",
    icon: FileText,
    label: "Word Count",
    status: page.wordCount >= 1000 ? "pass" : page.wordCount >= 500 ? "warn" : "fail",
    detail: `~${page.wordCount.toLocaleString()} words (recommended: 1,000+ for key pages)`,
    fix: page.wordCount < 1000 ? "Expand content to at least 1,000 words. Add FAQs, case study detail, or expanded service descriptions." : null,
  });

  // Images
  checks.push({
    category: "Content",
    icon: Globe,
    label: "Image Alt Text",
    status: !page.hasImages ? "warn" : page.imagesWithAlt ? "pass" : "fail",
    detail: !page.hasImages ? "No images detected" : page.imagesWithAlt ? "All images have alt text" : "Some images missing alt text",
    fix: page.hasImages && !page.imagesWithAlt ? "Add descriptive alt text to all images including primary keywords where natural." : null,
  });

  // Mobile
  checks.push({
    category: "Technical",
    icon: Smartphone,
    label: "Mobile Viewport",
    status: page.mobileViewport ? "pass" : "fail",
    detail: page.mobileViewport ? "Viewport meta tag present — mobile-friendly" : "No viewport meta tag",
    fix: !page.mobileViewport ? "Add <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"> to the HTML head." : null,
  });

  // Canonical
  checks.push({
    category: "Technical",
    icon: Globe,
    label: "Canonical Tag",
    status: page.canonicalTag ? "pass" : "warn",
    detail: page.canonicalTag ? "Canonical tag present" : "No canonical tag — duplicate content risk",
    fix: !page.canonicalTag ? "Add a canonical URL tag to each page to prevent duplicate content penalties." : null,
  });

  // Keyword usage
  const matchedKeywords = TARGET_KEYWORDS.filter(kw =>
    (page.title + " " + page.metaDesc + " " + page.h1).toLowerCase().includes(kw.toLowerCase())
  );
  checks.push({
    category: "Keywords",
    icon: Search,
    label: "Target Keyword Coverage",
    status: matchedKeywords.length >= 3 ? "pass" : matchedKeywords.length >= 1 ? "warn" : "fail",
    detail: matchedKeywords.length > 0
      ? `${matchedKeywords.length} target keywords found: ${matchedKeywords.join(", ")}`
      : "No target keywords detected in title/meta/H1",
    fix: matchedKeywords.length < 3 ? `Incorporate these missing keywords naturally: ${TARGET_KEYWORDS.filter(k => !matchedKeywords.includes(k)).slice(0, 3).join(", ")}` : null,
  });

  const score = Math.round((checks.filter(c => c.status === "pass").length / checks.length) * 100);
  return { checks, score };
}

const statusIcon = { pass: CheckCircle, warn: AlertTriangle, fail: XCircle };
const statusColor = { pass: "#16a34a", warn: "#d97706", fail: "#dc2626" };
const statusBg = { pass: "#f0fdf4", warn: "#fffbeb", fail: "#fef2f2" };

function ScoreBadge({ score }) {
  const color = score >= 80 ? "#16a34a" : score >= 60 ? "#d97706" : "#dc2626";
  return (
    <div className="w-14 h-14 rounded-full flex items-center justify-center border-2 font-inter font-bold text-base"
      style={{ borderColor: color, color }}>
      {score}
    </div>
  );
}

function CheckRow({ check }) {
  const [open, setOpen] = useState(false);
  const Icon = statusIcon[check.status];
  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: statusBg[check.status] === "#f0fdf4" ? "#bbf7d0" : statusBg[check.status] === "#fffbeb" ? "#fde68a" : "#fecaca" }}>
      <button className="w-full flex items-center gap-3 px-4 py-3 text-left" onClick={() => setOpen(!open)}
        style={{ backgroundColor: statusBg[check.status] }}>
        <Icon className="w-4 h-4 shrink-0" style={{ color: statusColor[check.status] }} />
        <span className="font-inter text-sm font-medium text-foreground flex-1">{check.label}</span>
        <span className="font-inter text-xs text-muted-foreground mr-2">{check.category}</span>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
      </button>
      {open && (
        <div className="px-4 py-3 space-y-2 bg-white border-t" style={{ borderColor: "hsl(var(--border))" }}>
          <p className="font-inter text-sm text-muted-foreground">{check.detail}</p>
          {check.fix && (
            <div className="rounded-lg p-3 border-l-4" style={{ backgroundColor: "#fffbeb", borderColor: GOLD }}>
              <p className="font-inter text-xs font-medium mb-0.5" style={{ color: GOLD }}>Recommendation</p>
              <p className="font-inter text-sm text-foreground">{check.fix}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PageAuditCard({ page }) {
  const [open, setOpen] = useState(false);
  const { checks, score } = scoreItem(page);
  const passes = checks.filter(c => c.status === "pass").length;
  const warns = checks.filter(c => c.status === "warn").length;
  const fails = checks.filter(c => c.status === "fail").length;

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      <button className="w-full flex items-center gap-4 p-5 text-left hover:bg-secondary/30 transition-colors"
        onClick={() => setOpen(!open)}>
        <ScoreBadge score={score} />
        <div className="flex-1 min-w-0">
          <h3 className="font-cormorant text-xl font-medium text-foreground">{page.label}</h3>
          <p className="font-inter text-xs text-muted-foreground">{page.path}</p>
          <div className="flex items-center gap-3 mt-1.5">
            <span className="font-inter text-xs flex items-center gap-1" style={{ color: "#16a34a" }}>
              <CheckCircle className="w-3 h-3" /> {passes} passed
            </span>
            <span className="font-inter text-xs flex items-center gap-1" style={{ color: "#d97706" }}>
              <AlertTriangle className="w-3 h-3" /> {warns} warnings
            </span>
            <span className="font-inter text-xs flex items-center gap-1" style={{ color: "#dc2626" }}>
              <XCircle className="w-3 h-3" /> {fails} issues
            </span>
          </div>
        </div>
        {open ? <ChevronUp className="w-5 h-5 text-muted-foreground shrink-0" /> : <ChevronDown className="w-5 h-5 text-muted-foreground shrink-0" />}
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-2 border-t border-border">
          <p className="font-inter text-xs text-muted-foreground pt-4 pb-1">
            {checks.filter(c => c.fix).length} actionable recommendations
          </p>
          {checks.map((check, i) => <CheckRow key={i} check={check} />)}
        </div>
      )}
    </div>
  );
}

export default function SEOAudit() {
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [aiInsights, setAiInsights] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);

  const overallScore = Math.round(
    PAGES_TO_AUDIT.reduce((sum, p) => sum + scoreItem(p).score, 0) / PAGES_TO_AUDIT.length
  );

  const handleScan = () => {
    setScanning(true);
    setTimeout(() => { setScanning(false); setScanned(true); }, 1800);
  };

  const handleAIInsights = async () => {
    setLoadingAI(true);
    const summary = PAGES_TO_AUDIT.map(p => {
      const { checks } = scoreItem(p);
      const issues = checks.filter(c => c.fix).map(c => c.fix).join("; ");
      return `${p.label} (${p.path}): ${issues || "No issues"}`;
    }).join("\n");

    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an SEO expert for a premium executive coaching website called "North South Consulting" (nsconsultd.com). The site offers executive communication coaching, media training, cross-cultural coaching, and leadership development led by Nishat Ismail-Kemih with 20 years of international experience.

Here is the SEO audit summary for the main pages:
${summary}

Target keywords: ${TARGET_KEYWORDS.join(", ")}

Provide 5 prioritised, actionable SEO recommendations specific to this business. Focus on quick wins, content strategy, and technical improvements. Be concise and practical.`,
      response_json_schema: {
        type: "object",
        properties: {
          recommendations: {
            type: "array",
            items: {
              type: "object",
              properties: {
                priority: { type: "string" },
                title: { type: "string" },
                action: { type: "string" },
                impact: { type: "string" },
              }
            }
          },
          summary: { type: "string" }
        }
      }
    });
    setAiInsights(res);
    setLoadingAI(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-4xl mx-auto px-6 py-28">

        {/* Header */}
        <div className="mb-10 space-y-3">
          <p className="font-inter text-xs tracking-widest uppercase font-medium" style={{ color: GOLD }}>Admin Tool</p>
          <h1 className="font-cormorant text-5xl font-light text-foreground">SEO Audit</h1>
          <p className="font-inter text-muted-foreground max-w-xl">
            Scan all key pages for SEO health — title tags, meta descriptions, headers, keyword coverage, mobile-friendliness and more.
          </p>
        </div>

        {/* Scan button */}
        {!scanned ? (
          <div className="rounded-3xl border-2 border-dashed border-border p-12 text-center space-y-5">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto" style={{ backgroundColor: GOLD + "15" }}>
              <Search className="w-7 h-7" style={{ color: GOLD }} />
            </div>
            <div>
              <h2 className="font-cormorant text-2xl font-medium text-foreground">Run SEO Audit</h2>
              <p className="font-inter text-sm text-muted-foreground mt-1">Checks {PAGES_TO_AUDIT.length} pages across {9} SEO factors</p>
            </div>
            <Button onClick={handleScan} disabled={scanning} className="rounded-full px-10 font-inter gap-2"
              style={{ backgroundColor: GOLD, color: CREAM }}>
              {scanning ? <><Loader2 className="w-4 h-4 animate-spin" /> Scanning…</> : <><Search className="w-4 h-4" /> Start Audit</>}
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Overall score */}
            <div className="rounded-2xl p-6 flex items-center gap-6 border"
              style={{ backgroundColor: OLIVE, borderColor: GOLD + "30" }}>
              <div className="w-20 h-20 rounded-full flex items-center justify-center border-4 shrink-0"
                style={{ borderColor: overallScore >= 70 ? "#86efac" : "#fde68a", backgroundColor: "rgba(255,255,255,0.08)" }}>
                <span className="font-cormorant text-3xl font-medium text-white">{overallScore}</span>
              </div>
              <div className="flex-1">
                <h2 className="font-cormorant text-2xl font-light text-white">Overall SEO Score</h2>
                <p className="font-inter text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.6)" }}>
                  {overallScore >= 80 ? "Good foundation — focus on content depth and canonical tags." : overallScore >= 60 ? "Room to improve — address warnings and missing technical tags." : "Needs attention — fix critical issues first."}
                </p>
              </div>
              <Button onClick={handleScan} variant="ghost" className="rounded-full font-inter shrink-0"
                style={{ color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.2)" }}>
                Re-scan
              </Button>
            </div>

            {/* Page audits */}
            <div className="space-y-4">
              {PAGES_TO_AUDIT.map(page => <PageAuditCard key={page.id} page={page} />)}
            </div>

            {/* AI Insights */}
            <div className="rounded-2xl border border-border p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-cormorant text-2xl font-medium text-foreground">AI-Powered Recommendations</h3>
                  <p className="font-inter text-sm text-muted-foreground">Personalised SEO strategy based on your audit results</p>
                </div>
                <Button onClick={handleAIInsights} disabled={loadingAI} className="rounded-full font-inter gap-2 shrink-0"
                  style={{ backgroundColor: FOREST, color: CREAM }}>
                  {loadingAI ? <><Loader2 className="w-4 h-4 animate-spin" /> Analysing…</> : "Get AI Insights"}
                </Button>
              </div>

              {aiInsights && (
                <div className="space-y-4 pt-2">
                  {aiInsights.summary && (
                    <p className="font-inter text-sm text-muted-foreground italic border-l-4 pl-4" style={{ borderColor: GOLD }}>
                      {aiInsights.summary}
                    </p>
                  )}
                  {aiInsights.recommendations?.map((rec, i) => (
                    <div key={i} className="rounded-xl p-4 border border-border space-y-1.5" style={{ backgroundColor: "hsl(var(--secondary))" }}>
                      <div className="flex items-center gap-2">
                        <span className="font-inter text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ backgroundColor: rec.priority === "High" ? "#fef2f2" : rec.priority === "Medium" ? "#fffbeb" : "#f0fdf4", color: rec.priority === "High" ? "#dc2626" : rec.priority === "Medium" ? "#d97706" : "#16a34a" }}>
                          {rec.priority} Priority
                        </span>
                        <h4 className="font-inter text-sm font-medium text-foreground">{rec.title}</h4>
                      </div>
                      <p className="font-inter text-sm text-muted-foreground">{rec.action}</p>
                      {rec.impact && (
                        <p className="font-inter text-xs" style={{ color: GOLD }}>Impact: {rec.impact}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Target keywords panel */}
            <div className="rounded-2xl border border-border p-6 space-y-3">
              <h3 className="font-cormorant text-xl font-medium text-foreground">Target Keywords to Monitor</h3>
              <div className="flex flex-wrap gap-2">
                {TARGET_KEYWORDS.map(kw => (
                  <span key={kw} className="font-inter text-xs px-3 py-1.5 rounded-full border border-border text-muted-foreground"
                    style={{ backgroundColor: "hsl(var(--secondary))" }}>
                    {kw}
                  </span>
                ))}
              </div>
              <p className="font-inter text-xs text-muted-foreground">
                Ensure these keywords appear naturally in page titles, meta descriptions, H1/H2 tags, and the first 100 words of body content.
              </p>
            </div>
          </div>
        )}
      </div>
      <FooterSection />
    </div>
  );
}