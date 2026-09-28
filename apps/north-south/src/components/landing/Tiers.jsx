import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Zap, Users, Crown, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

const COFFEE = "#B8952A";
const OLIVE = "#3D4A2F";
const CHESTNUT = "#B8952A";

const tiers = [
  {
    icon: Zap,
    name: "AI Self-Service",
    price: "$34.99",
    period: "/month",
    tagline: "Your always-on communication coach",
    highlighted: false,
    stripe: true,
    features: [
      "AI speech & writing analysis",
      "Communication style assessment",
      "Video analysis — tone, clarity & body language",
      "On-demand video lessons library",
      "Vocabulary elevation suggestions",
      "Progress tracking dashboard",
      "Body language video guides",
      "Goal tracking & weekly check-ins",
    ],
  },
  {
    icon: Users,
    name: "Hybrid Coaching",
    price: "Contact Us",
    period: "",
    tagline: "Please contact us for a tailor made plan",
    highlighted: true,
    stripe: false,
    features: [
      "Everything in AI Self-Service",
      "2 live 1:1 sessions per month with a senior coach",
      "Personalised learning pathway",
      "Document review — proposals & speeches",
      "Priority async messaging",
      "Monthly progress report",
      "Cross-cultural communication coaching",
      "Business communication strategy session",
    ],
  },
  {
    icon: Crown,
    name: "Bespoke Retainer",
    price: "Contact Us",
    period: "",
    tagline: "Please contact us for a tailor made plan",
    highlighted: false,
    stripe: false,
    features: [
      "Everything in Hybrid Coaching",
      "Unlimited 1:1 sessions with Nishat or senior coaches",
      "Speech ghostwriting",
      "Media & crisis communication preparation",
      "Diplomatic & international relations advisory",
      "Corporate team workshops & away-days",
      "Board presentation coaching",
      "Dedicated account management",
    ],
  },
];

export default function Tiers() {
  const [annual, setAnnual] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const getPrice = (tier) => {
    if (tier.price === "Custom" || tier.price === "Contact") return tier.price;
    if (tier.price === "$34.99") return annual ? "$249" : "$34.99";
    return tier.price;
  };

  const handleCheckout = async () => {
    // Block if in iframe (preview)
    if (window.self !== window.top) {
      alert("Checkout works only from the published app. Please open the live version to subscribe.");
      return;
    }
    setLoading(true);
    const res = await base44.functions.invoke("stripeCheckout", { annual });
    setLoading(false);
    if (res.data?.url) {
      window.location.href = res.data.url;
    }
  };

  return (
    <section id="pricing" className="py-28 bg-background">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16 space-y-4">
          <p className="font-inter text-xs tracking-widest uppercase font-medium" style={{ color: COFFEE }}>Investment</p>
          <h2 className="font-cormorant text-4xl md:text-5xl font-light text-foreground">
            Choose your path to<br /><em>extraordinary leadership</em>
          </h2>

          <div className="flex items-center justify-center gap-3 pt-2">
            <span className={`font-inter text-sm ${!annual ? "text-foreground font-medium" : "text-muted-foreground"}`}>Monthly</span>
            <button onClick={() => setAnnual(!annual)}
              className="relative w-12 h-6 rounded-full transition-colors"
              style={{ backgroundColor: annual ? COFFEE : "hsl(var(--border))" }}>
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${annual ? "translate-x-7" : "translate-x-1"}`} />
            </button>
            <span className={`font-inter text-sm ${annual ? "text-foreground font-medium" : "text-muted-foreground"}`}>
              Annual <span className="text-xs px-2 py-0.5 rounded-full ml-1" style={{ backgroundColor: COFFEE + "20", color: COFFEE }}>Save 40%</span>
            </span>
          </div>
          <p className="font-inter text-xs text-muted-foreground">✓ 14-day money-back guarantee &nbsp;·&nbsp; ✓ Cancel anytime &nbsp;·&nbsp; ✓ No contracts</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 items-start">
          {tiers.map((tier, i) => (
            <div key={i}
              className={`relative bg-card rounded-3xl p-8 border-2 transition-all ${tier.highlighted ? "shadow-2xl scale-105" : "shadow-sm"}`}
              style={{ borderColor: tier.highlighted ? COFFEE : "hsl(var(--border))" }}>
              {tier.highlighted && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-white text-xs font-inter font-medium px-4 py-1.5 rounded-full"
                  style={{ backgroundColor: COFFEE }}>
                  Most Popular
                </div>
              )}

              <div className="mb-6">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                  style={{ backgroundColor: tier.highlighted ? COFFEE + "30" : COFFEE + "12" }}>
                  <tier.icon className="w-5 h-5" style={{ color: COFFEE }} />
                </div>
                <h3 className="font-cormorant text-2xl font-medium text-foreground">{tier.name}</h3>
                <p className="font-inter text-sm text-muted-foreground mt-1">{tier.tagline}</p>
              </div>

              <div className="mb-7">
                <span className="font-cormorant text-4xl font-medium text-foreground">{getPrice(tier)}</span>
                <span className="font-inter text-sm text-muted-foreground">{tier.period}</span>
                {annual && tier.price === "$34.99" && (
                  <div className="font-inter text-xs mt-1" style={{ color: COFFEE }}>billed annually — save $171</div>
                )}
              </div>

              <ul className="space-y-3 mb-8">
                {tier.features.map((f, j) => (
                  <li key={j} className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 mt-0.5 shrink-0" style={{ color: COFFEE }} />
                    <span className="font-inter text-sm text-muted-foreground">{f}</span>
                  </li>
                ))}
              </ul>

              {tier.stripe ? (
                <Button onClick={handleCheckout} disabled={loading} className="w-full rounded-full" size="lg"
                  style={{ backgroundColor: COFFEE, color: "#f5f0eb" }}>
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</> : "Get Started"}
                </Button>
              ) : (
                <Link to="/discovery">
                  <Button className="w-full rounded-full" size="lg"
                    style={tier.highlighted
                      ? { backgroundColor: COFFEE, color: "#f5f0eb" }
                      : { backgroundColor: "transparent", color: COFFEE, border: `1px solid ${COFFEE}` }}>
                    Contact for Pricing
                  </Button>
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}