/**
 * Invisible component — tracks landing page events:
 * - Page view with referrer & UTM params
 * - Section views (Intersection Observer)
 * - Button clicks (CTA, pricing, plan selection)
 * - Time on page & scroll depth
 * - Exit intent
 *
 * Mount this once inside Landing.jsx — it renders nothing.
 */
import { useEffect, useRef } from 'react';
import { SDK } from '@/lib/custom-sdk.js';

function track(eventName, properties = {}) {
  const urlParams = new URLSearchParams(window.location.search);
  SDK.analytics.track({
    eventName,
    properties: {
      ...properties,
      utm_source: urlParams.get('utm_source') || null,
      utm_medium: urlParams.get('utm_medium') || null,
      utm_campaign: urlParams.get('utm_campaign') || null,
      referrer: document.referrer || 'direct',
      page: 'landing',
    },
  });
}

export default function LandingPageTracker() {
  const startTime = useRef(Date.now());
  const maxScrollRef = useRef(0);
  const sectionsSeenRef = useRef(new Set());

  useEffect(() => {
    // 1. Page view
    track('landing_page_view', {
      screen_width: window.innerWidth,
      is_mobile: window.innerWidth < 768,
    });

    // 2. Scroll depth tracker
    const onScroll = () => {
      const scrollPct = Math.round(
        (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100
      );
      if (scrollPct > maxScrollRef.current) {
        maxScrollRef.current = scrollPct;
        // Fire milestones
        if ([25, 50, 75, 90, 100].includes(scrollPct)) {
          track('landing_scroll_depth', { depth_pct: scrollPct });
        }
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    // 3. Section visibility (Intersection Observer)
    const sections = ['features', 'how-it-works', 'pricing'];
    const observers = sections.map(id => {
      const el = document.getElementById(id);
      if (!el) return null;
      const obs = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting && !sectionsSeenRef.current.has(id)) {
          sectionsSeenRef.current.add(id);
          track('landing_section_viewed', { section: id });
        }
      }, { threshold: 0.3 });
      obs.observe(el);
      return obs;
    });

    // 4. Exit intent (mouse leaves top of page)
    const onMouseOut = (e) => {
      if (e.clientY < 10) {
        const timeSpent = Math.round((Date.now() - startTime.current) / 1000);
        track('landing_exit_intent', {
          time_on_page_seconds: timeSpent,
          max_scroll_pct: maxScrollRef.current,
        });
      }
    };
    document.addEventListener('mouseleave', onMouseOut);

    // 5. Time on page when unloading
    const onUnload = () => {
      const timeSpent = Math.round((Date.now() - startTime.current) / 1000);
      track('landing_page_exit', {
        time_on_page_seconds: timeSpent,
        max_scroll_pct: maxScrollRef.current,
        sections_seen: [...sectionsSeenRef.current].join(','),
      });
    };
    window.addEventListener('beforeunload', onUnload);

    return () => {
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('mouseleave', onMouseOut);
      window.removeEventListener('beforeunload', onUnload);
      observers.forEach(obs => obs?.disconnect());
    };
  }, []);

  return null; // renders nothing
}

// ── Exported helper — call these from button onClick handlers ──────────────────
export function trackCTAClick(label, location) {
  track('landing_cta_click', { label, location });
}

export function trackPlanSelect(planName, isIslamic, billingCycle) {
  track('landing_plan_selected', { plan_name: planName, is_islamic: isIslamic, billing_cycle: billingCycle });
}

export function trackPricingToggle(type, value) {
  track('landing_pricing_toggle', { toggle_type: type, value });
}