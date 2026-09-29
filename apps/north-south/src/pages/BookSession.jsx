import { useState } from "react";
import { base44 } from "@/api/base44Client";
import Navbar from "../components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, Calendar, Clock, Globe } from "lucide-react";

const sessionTypes = {
  ai_self_service: ["Communication Assessment", "Writing Analysis", "Vocabulary Workshop"],
  hybrid: ["1:1 Strategy Session", "Media Training", "Speech Review", "Life Coaching"],
  bespoke: ["Board Presentation Prep", "Crisis Communication", "Team Workshop", "Retainer Consultation"],
};

export default function BookSession() {
  const [form, setForm] = useState({ client_name: "", client_email: "", client_company: "", service_tier: "", session_type: "", preferred_date: "", preferred_time: "", timezone: "UTC", message: "" });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSubmitError(null);
    try {
      await base44.entities.Booking.create({ ...form, status: "pending" });
      setSubmitted(true);
    } catch (err) {
      setSubmitError(
        err?.message ||
          "Booking requests are not available yet. Online booking will return once the secure server handler is live."
      );
    } finally {
      setLoading(false);
    }
  };

  if (submitted) return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-6 max-w-md mx-auto px-6">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-10 h-10 text-primary" />
          </div>
          <h2 className="font-cormorant text-4xl font-light text-foreground">Booking Received</h2>
          <p className="font-inter text-muted-foreground">Thank you, {form.client_name}. I'll be in touch within 24 hours to confirm your session details.</p>
          <Button className="rounded-full px-8" onClick={() => setSubmitted(false)}>Book Another</Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-4xl mx-auto px-6 py-28">
        <div className="text-center mb-12 space-y-3">
          <p className="font-inter text-sm tracking-widest uppercase text-primary font-medium">Get Started</p>
          <h1 className="font-cormorant text-5xl font-light text-foreground">Book Your Session</h1>
          <p className="font-inter text-muted-foreground max-w-lg mx-auto">
            Choose your service tier and preferred time. I'll confirm your booking within 24 hours.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Info sidebar */}
          <div className="space-y-6">
            {[
              { icon: Calendar, title: "Flexible Scheduling", desc: "Sessions available across time zones, including evenings and weekends." },
              { icon: Clock, title: "Session Length", desc: "AI sessions are self-paced. Human sessions typically 60–90 minutes." },
              { icon: Globe, title: "Global Clients", desc: "I work with clients in 40+ countries in English, French, and more." },
            ].map(({ icon: Icon, title, desc }, i) => (
              <div key={i} className="flex gap-4">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <div className="font-inter text-sm font-medium text-foreground">{title}</div>
                  <div className="font-inter text-xs text-muted-foreground mt-1">{desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="md:col-span-2 bg-card rounded-3xl border border-border p-8 space-y-5">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="font-inter text-xs font-medium text-muted-foreground">Full Name *</label>
                <Input value={form.client_name} onChange={e => set("client_name", e.target.value)} placeholder="Your name" required className="rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <label className="font-inter text-xs font-medium text-muted-foreground">Email *</label>
                <Input type="email" value={form.client_email} onChange={e => set("client_email", e.target.value)} placeholder="your@email.com" required className="rounded-xl" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-inter text-xs font-medium text-muted-foreground">Company / Organisation</label>
              <Input value={form.client_company} onChange={e => set("client_company", e.target.value)} placeholder="Your company" className="rounded-xl" />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="font-inter text-xs font-medium text-muted-foreground">Service Tier *</label>
                <Select value={form.service_tier} onValueChange={v => { set("service_tier", v); set("session_type", ""); }}>
                  <SelectTrigger className="rounded-xl"><SelectValue placeholder="Choose tier" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ai_self_service">AI Self-Service ($79/mo)</SelectItem>
                    <SelectItem value="hybrid">Hybrid Coaching ($449/mo)</SelectItem>
                    <SelectItem value="bespoke">Bespoke Retainer (Custom)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="font-inter text-xs font-medium text-muted-foreground">Session Type *</label>
                <Select value={form.session_type} onValueChange={v => set("session_type", v)} disabled={!form.service_tier}>
                  <SelectTrigger className="rounded-xl"><SelectValue placeholder="Choose session" /></SelectTrigger>
                  <SelectContent>
                    {(sessionTypes[form.service_tier] || []).map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="font-inter text-xs font-medium text-muted-foreground">Preferred Date</label>
                <Input type="date" value={form.preferred_date} onChange={e => set("preferred_date", e.target.value)} className="rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <label className="font-inter text-xs font-medium text-muted-foreground">Preferred Time</label>
                <Input type="time" value={form.preferred_time} onChange={e => set("preferred_time", e.target.value)} className="rounded-xl" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-inter text-xs font-medium text-muted-foreground">Message / Goals</label>
              <Textarea value={form.message} onChange={e => set("message", e.target.value)} placeholder="Tell me about your communication goals and what you'd like to achieve..." rows={4} className="rounded-xl resize-none" />
            </div>

            {submitError && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 font-inter text-sm text-amber-900">
                {submitError}
              </div>
            )}

            <Button type="submit" className="w-full rounded-full" size="lg" disabled={loading || !form.client_name || !form.client_email || !form.service_tier || !form.session_type}>
              {loading ? "Submitting..." : "Request Booking"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}