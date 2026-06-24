import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Send, CheckCircle, MessageSquare, Shield, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const LOGO = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6965607bc386491646bad6e8/10b500d37_IMG_6630.png";

const TOPICS = [
  'General Enquiry',
  'Billing & Subscription',
  'Privacy / Data Request',
  'Technical Support',
  'Bug Report',
  'Feature Request',
  'Partnership',
  'Other',
];

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', topic: '', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.topic || !form.message) {
      setError('Please fill in all fields.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await base44.functions.invoke('sendContactForm', {
        name: form.name,
        email: form.email,
        topic: form.topic,
        message: form.message,
      });
      setSubmitted(true);
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen py-12 px-4" style={{ background: '#060f1e' }}>
      <div className="max-w-2xl mx-auto">
        {/* Back */}
        <div className="flex items-center justify-between mb-8">
          <Link to="/" className="flex items-center gap-2 text-[#E8B84B] hover:opacity-80 transition-opacity">
            <ArrowLeft className="w-4 h-4" />
            <img src={LOGO} alt="Vagus Planner" className="w-7 h-7 rounded-lg object-cover" />
            <span className="font-bold text-sm">Vagus Planner</span>
          </Link>
        </div>

        {/* Direct email links */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6 justify-center">
          <a href="mailto:support@vagusplanner.com"
            className="flex items-center gap-2.5 bg-[#3ecfa0]/8 border border-[#3ecfa0]/25 hover:border-[#3ecfa0]/50 rounded-2xl px-5 py-3 transition-all group">
            <div className="w-8 h-8 rounded-xl bg-[#3ecfa0]/15 flex items-center justify-center flex-shrink-0">
              <MessageSquare className="w-4 h-4 text-[#3ecfa0]" />
            </div>
            <div className="text-left">
              <p className="text-[10px] text-white/40 font-medium uppercase tracking-widest">General Support</p>
              <p className="text-sm font-bold text-[#3ecfa0] group-hover:underline">support@vagusplanner.com</p>
            </div>
          </a>
          <a href="mailto:team@vagusplanner.com"
            className="flex items-center gap-2.5 bg-[#E8B84B]/8 border border-[#E8B84B]/25 hover:border-[#E8B84B]/50 rounded-2xl px-5 py-3 transition-all group">
            <div className="w-8 h-8 rounded-xl bg-[#E8B84B]/15 flex items-center justify-center flex-shrink-0">
              <Shield className="w-4 h-4 text-[#E8B84B]" />
            </div>
            <div className="text-left">
              <p className="text-[10px] text-white/40 font-medium uppercase tracking-widest">Enterprise & Partnerships</p>
              <p className="text-sm font-bold text-[#E8B84B] group-hover:underline">team@vagusplanner.com</p>
            </div>
          </a>
        </div>

        {/* Trust badges */}
        <div className="flex flex-wrap gap-3 mb-8 justify-center">
          {[
            { icon: Clock, text: 'Reply within 72 hours' },
            { icon: Shield, text: 'Your email stays private' },
            { icon: MessageSquare, text: 'No bots — real humans' },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 text-xs text-white/60">
              <Icon className="w-3.5 h-3.5 text-[#3ecfa0]" /> {text}
            </div>
          ))}
        </div>

        <div className="bg-white/[0.03] border border-white/10 rounded-2xl overflow-hidden">
          {/* Title */}
          <div className="bg-gradient-to-r from-[#1a4a6e] to-[#3ecfa0]/40 px-8 py-7 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-[#E8B84B]" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">Get in Touch</h1>
              <p className="text-white/60 text-sm">We read every message and respond personally</p>
            </div>
          </div>

          <div className="p-8">
            {submitted ? (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-[#3ecfa0]/15 border border-[#3ecfa0]/30 flex items-center justify-center mx-auto mb-5">
                  <CheckCircle className="w-8 h-8 text-[#3ecfa0]" />
                </div>
                <h2 className="text-2xl font-black text-white mb-3">Message Sent!</h2>
                <p className="text-white/60 mb-6">We'll get back to you within 72 hours. Check your inbox (and spam folder just in case).</p>
                <div className="flex gap-3 justify-center">
                  <Button onClick={() => { setSubmitted(false); setForm({ name: '', email: '', topic: '', message: '' }); }}
                    variant="outline" className="border-white/20 text-white hover:bg-white/10">
                    Send Another
                  </Button>
                  <Link to="/">
                    <Button className="bg-[#E8B84B] text-[#071224] font-bold hover:opacity-90">Back to Home</Button>
                  </Link>
                </div>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-white/70 text-sm font-medium mb-1.5 block">Your Name *</label>
                    <Input
                      value={form.name}
                      onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                      placeholder="Jane Smith"
                      className="bg-white/5 border-white/15 text-white placeholder:text-white/30 focus:border-[#38bdf8]/50"
                    />
                  </div>
                  <div>
                    <label className="text-white/70 text-sm font-medium mb-1.5 block">Email Address *</label>
                    <Input
                      type="email"
                      value={form.email}
                      onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                      placeholder="you@example.com"
                      className="bg-white/5 border-white/15 text-white placeholder:text-white/30 focus:border-[#38bdf8]/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-white/70 text-sm font-medium mb-1.5 block">Topic *</label>
                  <select
                    value={form.topic}
                    onChange={e => setForm(p => ({ ...p, topic: e.target.value }))}
                    className="w-full h-9 rounded-md border border-white/15 bg-white/5 px-3 text-sm text-white focus:outline-none focus:border-[#38bdf8]/50"
                  >
                    <option value="" className="bg-[#071224]">Select a topic…</option>
                    {TOPICS.map(t => <option key={t} value={t} className="bg-[#071224]">{t}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-white/70 text-sm font-medium mb-1.5 block">Message *</label>
                  <textarea
                    value={form.message}
                    onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                    placeholder="Tell us how we can help…"
                    rows={5}
                    className="w-full rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#38bdf8]/50 resize-none"
                  />
                </div>

                {error && <p className="text-rose-400 text-sm">{error}</p>}

                <p className="text-white/30 text-xs">Your email is used only to reply to your message. We will never share it or add you to any mailing list without consent. See our <Link to="/PrivacyPolicy" className="text-[#38bdf8] hover:underline">Privacy Policy</Link>.</p>

                <Button type="submit" disabled={loading}
                  className="w-full bg-gradient-to-r from-[#E8B84B] to-[#f0c060] text-[#071224] font-bold h-12 hover:opacity-90">
                  {loading ? (
                    <div className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-[#071224]/30 border-t-[#071224] rounded-full animate-spin" /> Sending…</div>
                  ) : (
                    <><Send className="w-4 h-4 mr-2" /> Send Message</>
                  )}
                </Button>
              </form>
            )}
          </div>
        </div>

        <div className="text-center mt-8 text-white/30 text-xs">
          © 2026 Vagus Planner · <Link to="/PrivacyPolicy" className="hover:text-white/60 transition-colors">Privacy Policy</Link> · <Link to="/TermsOfService" className="hover:text-white/60 transition-colors">Terms</Link>
        </div>
      </div>
    </div>
  );
}