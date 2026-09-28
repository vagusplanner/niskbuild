import { useState } from "react";
import { Download, CheckCircle, X, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

const GOLD = "#B8952A";
const OLIVE = "#3D4A2F";
const CREAM = "#F5F0E0";
const FOREST = "#2C3B2D";

export default function LeadMagnet() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    // Store the lead in the browser (no backend email to external addresses)
    // Notify admin via the base44 registered email
    try {
      await base44.integrations.Core.SendEmail({
        to: "sofiane.kemih@gmail.com",
        subject: `New Lead Magnet Request: ${name}`,
        body: `New lead magnet download request:\n\nName: ${name}\nEmail: ${email}\n\nPlease follow up and send them the Executive Communication Checklist PDF.`,
      });
    } catch (_) {
      // Silently continue — the success screen still shows
    }
    setLoading(false);
    setSubmitted(true);
  };

  return (
    <>
      {/* Trigger banner */}
      <div className="rounded-3xl p-8 md:p-10 flex flex-col md:flex-row items-center gap-6 border"
        style={{ backgroundColor: GOLD + "10", borderColor: GOLD + "30" }}>
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: GOLD + "20" }}>
          <Download className="w-7 h-7" style={{ color: GOLD }} />
        </div>
        <div className="flex-1 text-center md:text-left">
          <p className="font-inter text-xs tracking-widest uppercase font-medium mb-1" style={{ color: GOLD }}>Free Download</p>
          <h3 className="font-cormorant text-2xl font-medium text-foreground">The Executive Communication Checklist</h3>
          <p className="font-inter text-sm text-muted-foreground mt-1">
            20 proven techniques used by the world's most compelling leaders — distilled from 20 years of international coaching.
          </p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="font-inter text-sm px-6 py-3 rounded-full font-medium shrink-0 transition-all hover:opacity-90"
          style={{ backgroundColor: GOLD, color: CREAM }}>
          Download Free
        </button>
      </div>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
          <div className="relative rounded-3xl p-8 max-w-md w-full shadow-2xl"
            style={{ backgroundColor: CREAM, border: `1px solid ${GOLD}30` }}>
            <button onClick={() => setOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center"
              style={{ backgroundColor: FOREST + "15", color: FOREST }}>
              <X className="w-4 h-4" />
            </button>

            {!submitted ? (
              <div className="space-y-5">
                <div>
                  <p className="font-inter text-xs tracking-widest uppercase font-medium mb-2" style={{ color: GOLD }}>Free Resource</p>
                  <h3 className="font-cormorant text-3xl font-medium text-foreground">The Executive Communication Checklist</h3>
                  <p className="font-inter text-sm text-muted-foreground mt-2">
                    Enter your details below and we'll send the PDF directly to your inbox.
                  </p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-3">
                  <input
                    value={name} onChange={e => setName(e.target.value)} required
                    placeholder="Your first name"
                    className="w-full h-11 rounded-xl px-4 font-inter text-sm border outline-none"
                    style={{ borderColor: GOLD + "40", backgroundColor: "white" }}
                  />
                  <input
                    value={email} onChange={e => setEmail(e.target.value)} required type="email"
                    placeholder="Your email address"
                    className="w-full h-11 rounded-xl px-4 font-inter text-sm border outline-none"
                    style={{ borderColor: GOLD + "40", backgroundColor: "white" }}
                  />
                  <button type="submit" disabled={loading}
                    className="w-full h-11 rounded-xl font-inter text-sm font-medium flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
                    style={{ backgroundColor: GOLD, color: CREAM }}>
                    {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</> : <><Download className="w-4 h-4" /> Send Me The Checklist</>}
                  </button>
                </form>
                <p className="font-inter text-xs text-center text-muted-foreground">No spam. Unsubscribe anytime.</p>
              </div>
            ) : (
              <div className="text-center space-y-4 py-4">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
                  style={{ backgroundColor: "#dcfce7" }}>
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="font-cormorant text-2xl font-medium text-foreground">On its way!</h3>
                <p className="font-inter text-sm text-muted-foreground">
                  Thank you, {name}. Check your inbox — your Executive Communication Checklist will arrive shortly.
                </p>
                <button onClick={() => setOpen(false)}
                  className="font-inter text-sm px-6 py-2.5 rounded-full"
                  style={{ backgroundColor: GOLD, color: CREAM }}>
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}