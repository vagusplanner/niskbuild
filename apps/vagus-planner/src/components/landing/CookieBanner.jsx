import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cookie, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('vp_cookie_consent');
    if (!consent) {
      // Short delay so landing page loads first
      const t = setTimeout(() => setVisible(true), 1200);
      return () => clearTimeout(t);
    }
  }, []);

  const accept = (all = true) => {
    localStorage.setItem('vp_cookie_consent', all ? 'all' : 'essential');
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ type: 'spring', damping: 22, stiffness: 200 }}
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-[120] bg-[#0a1a38] border border-[#E8B84B]/30 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden"
        >
          <div className="p-5">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#E8B84B]/10 flex items-center justify-center flex-shrink-0">
                  <Cookie className="w-5 h-5 text-[#E8B84B]" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-sm">We use cookies</h3>
                  <p className="text-white/50 text-xs">To improve your experience</p>
                </div>
              </div>
              <button onClick={() => accept(false)} className="text-white/30 hover:text-white/60 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-white/60 text-xs leading-relaxed mb-3">
              We use essential cookies for authentication and optional analytics cookies to understand how you use the app.
              {' '}<Link to="/PrivacyPolicy" className="text-[#38bdf8] hover:underline">Privacy Policy</Link>
            </p>

            <AnimatePresence>
              {expanded && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden mb-3">
                  <div className="space-y-2 text-xs text-white/50 border border-white/10 rounded-xl p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-white/70">Essential cookies</span>
                      <span className="text-[#3ecfa0] font-semibold">Always on</span>
                    </div>
                    <p>Required for login, sessions, and core functionality. Cannot be disabled.</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="font-medium text-white/70">Analytics cookies</span>
                      <span className="text-white/40">Optional</span>
                    </div>
                    <p>Help us understand usage patterns to improve the app. No personal data sold.</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1 text-white/40 hover:text-white/60 text-xs mb-4 transition-colors">
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {expanded ? 'Show less' : 'Cookie details'}
            </button>

            <div className="flex gap-2">
              <Button onClick={() => accept(false)} variant="outline"
                className="flex-1 border-white/20 text-white/70 hover:bg-white/10 hover:text-white text-xs h-9">
                Essential Only
              </Button>
              <Button onClick={() => accept(true)}
                className="flex-1 bg-[#E8B84B] text-[#071224] font-bold hover:opacity-90 text-xs h-9">
                Accept All
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}