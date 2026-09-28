import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle, Loader2, Mail } from "lucide-react";

export default function ContactForm({ dark = false }) {
  const [form, setForm] = useState({ name: "", email: "", company: "", message: "", subject: "General Enquiry" });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const subjects = ["General Enquiry", "Book a Session", "Corporate Training", "Partnership", "Media Enquiry"];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      setError("Please fill in all required fields.");
      return;
    }
    setError("");
    setLoading(true);
    await base44.integrations.Core.SendEmail({
      to: "contact@nsconsultd.com",
      from_name: "North South Consulting Website",
      subject: `[NSC Website] ${form.subject} — from ${form.name}`,
      body: `
<div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; color: #373935;">
  <div style="background: #373935; padding: 30px; border-radius: 12px 12px 0 0;">
    <h2 style="color: #967462; margin: 0; font-size: 22px;">New Website Enquiry</h2>
    <p style="color: rgba(255,255,255,0.5); margin: 4px 0 0; font-size: 13px;">${form.subject}</p>
  </div>
  <div style="background: #f5f1ec; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e2dbd4;">
    <table style="width: 100%; border-collapse: collapse;">
      <tr><td style="padding: 8px 0; color: #777471; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Name</td><td style="padding: 8px 0; font-size: 15px; color: #373935;">${form.name}</td></tr>
      <tr><td style="padding: 8px 0; color: #777471; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Email</td><td style="padding: 8px 0; font-size: 15px; color: #373935;"><a href="mailto:${form.email}" style="color: #705546;">${form.email}</a></td></tr>
      ${form.company ? `<tr><td style="padding: 8px 0; color: #777471; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Company</td><td style="padding: 8px 0; font-size: 15px; color: #373935;">${form.company}</td></tr>` : ""}
    </table>
    <div style="margin-top: 20px; padding: 16px; background: white; border-radius: 8px; border-left: 3px solid #967462;">
      <p style="color: #777471; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 8px;">Message</p>
      <p style="color: #373935; font-size: 15px; line-height: 1.6; margin: 0;">${form.message.replace(/\n/g, "<br>")}</p>
    </div>
  </div>
</div>
      `,
    });
    setLoading(false);
    setSent(true);
  };

  if (sent) {
    return (
      <div className="text-center py-12 space-y-4">
        <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center"
          style={{ backgroundColor: "#705546" + "20", border: "2px solid #967462" }}>
          <CheckCircle className="w-7 h-7" style={{ color: "#967462" }} />
        </div>
        <h3 className="font-cormorant text-2xl font-light text-foreground">Message received</h3>
        <p className="font-inter text-sm text-muted-foreground max-w-sm mx-auto">
          Thank you for reaching out. We'll respond to <strong>{form.email}</strong> within 24–48 hours.
        </p>
        <button onClick={() => { setSent(false); setForm({ name: "", email: "", company: "", message: "", subject: "General Enquiry" }); }}
          className="font-inter text-xs underline text-muted-foreground mt-2">
          Send another message
        </button>
      </div>
    );
  }

  const labelClass = dark ? "font-inter text-xs uppercase tracking-widest" : "font-inter text-xs text-muted-foreground uppercase tracking-widest";
  const labelStyle = dark ? { color: "rgba(255,255,255,0.45)" } : {};
  const inputStyle = dark ? { backgroundColor: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", color: "white" } : {};
  const selectStyle = dark ? { backgroundColor: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", color: "white" } : {};

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className={labelClass} style={labelStyle}>Full Name *</label>
          <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
            placeholder="Your name" className="rounded-xl h-11" style={inputStyle} />
        </div>
        <div className="space-y-1.5">
          <label className={labelClass} style={labelStyle}>Email *</label>
          <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
            placeholder="your@email.com" className="rounded-xl h-11" style={inputStyle} />
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className={labelClass} style={labelStyle}>Company</label>
          <Input value={form.company} onChange={e => setForm({ ...form, company: e.target.value })}
            placeholder="Organisation (optional)" className="rounded-xl h-11" style={inputStyle} />
        </div>
        <div className="space-y-1.5">
          <label className={labelClass} style={labelStyle}>Subject</label>
          <select value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })}
            className="w-full h-11 rounded-xl px-3 font-inter text-sm"
            style={selectStyle.color ? selectStyle : { border: "1px solid hsl(var(--input))", backgroundColor: "hsl(var(--background))", color: "hsl(var(--foreground))" }}>
            {subjects.map(s => <option key={s} style={{ backgroundColor: "#373935", color: "white" }}>{s}</option>)}
          </select>
        </div>
      </div>
      <div className="space-y-1.5">
        <label className={labelClass} style={labelStyle}>Message *</label>
        <textarea value={form.message} onChange={e => setForm({ ...form, message: e.target.value })}
          placeholder="Tell us about your goals and how we can help…"
          rows={5} className="w-full rounded-xl px-3 py-2.5 font-inter text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
          style={inputStyle.color ? { ...inputStyle, border: "1px solid rgba(255,255,255,0.12)" } : { border: "1px solid hsl(var(--input))", backgroundColor: "hsl(var(--background))" }} />
      </div>
      {error && <p className="font-inter text-xs text-destructive">{error}</p>}
      <Button type="submit" className="w-full rounded-full h-11 gap-2 font-inter" disabled={loading}
        style={{ backgroundColor: "#967462", color: "white" }}>
        {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</> : <><Mail className="w-4 h-4" /> Send Message</>}
      </Button>
      <p className="font-inter text-xs text-center" style={dark ? { color: "rgba(255,255,255,0.3)" } : { color: "hsl(var(--muted-foreground))" }}>
        We respond within 24–48 hours · contact@nsconsultd.com
      </p>
    </form>
  );
}