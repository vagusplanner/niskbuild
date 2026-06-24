import { useState, useEffect, useRef } from 'react';
import { getYear } from 'date-fns';

// Converts a Hijri date to Gregorian using AlAdhan API (with fallback)
async function hijriToGregorianDate(hijriYear, hijriMonth, hijriDay) {
  try {
    const res = await fetch(
      `https://api.aladhan.com/v1/hToG/${hijriDay}-${hijriMonth}-${hijriYear}`
    );
    if (!res.ok) throw new Error('API error');
    const data = await res.json();
    const g = data.data.gregorian;
    return new Date(parseInt(g.year), parseInt(g.month.number) - 1, parseInt(g.day));
  } catch {
    // Approximate fallback
    const daysInHijriYear = 354;
    const daysSinceStart = (hijriYear - 1) * daysInHijriYear + (hijriMonth - 1) * 29.5 + hijriDay;
    const hijriStart = new Date(622, 6, 16);
    return new Date(hijriStart.getTime() + daysSinceStart * 86400000);
  }
}

// Given a target Gregorian year, find which Hijri year(s) correspond
// A Gregorian year spans roughly 1.03 Hijri years
function gregorianYearToHijriYears(gYear) {
  // Approximate: Hijri year = (Gregorian year - 622) * (365.25/354.36)
  const hijriApprox = Math.round((gYear - 622) * (365.25 / 354.36));
  // Check hijriApprox - 1, hijriApprox, hijriApprox + 1 to cover all occurrences in that gregorian year
  return [hijriApprox - 1, hijriApprox, hijriApprox + 1];
}

function toDateString(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/**
 * Given raw events from DB and a target Gregorian year,
 * returns events expanded with computed gregorian_date for that year.
 * - Non-recurring events: shown only if their stored gregorian_date falls in targetYear
 * - Recurring events: computed from hijri_month + hijri_day for all matching dates in targetYear
 */
export function useIslamicEventsForYear(rawEvents, targetYear) {
  const [expandedEvents, setExpandedEvents] = useState([]);
  const [isComputing, setIsComputing] = useState(false);
  const cacheRef = useRef({}); // cache: "hijriYear-hijriMonth-hijriDay" -> dateString

  useEffect(() => {
    if (!rawEvents || rawEvents.length === 0) {
      setExpandedEvents([]);
      return;
    }

    let cancelled = false;

    async function compute() {
      setIsComputing(true);
      const results = [];

      const hijriYearsToCheck = gregorianYearToHijriYears(targetYear);

      // Process recurring events: compute their date in targetYear
      const recurringEvents = rawEvents.filter(e => e.is_recurring && e.hijri_month && e.hijri_day);
      const nonRecurringEvents = rawEvents.filter(e => !e.is_recurring);

      // For non-recurring: only include if gregorian_date falls in targetYear
      for (const event of nonRecurringEvents) {
        if (!event.gregorian_date) continue;
        const eventYear = new Date(event.gregorian_date).getFullYear();
        if (eventYear === targetYear) {
          results.push({ ...event, _computed: false });
        }
      }

      // For recurring: compute date for each Hijri year that might fall in targetYear
      const computations = [];
      for (const event of recurringEvents) {
        for (const hijriYear of hijriYearsToCheck) {
          const cacheKey = `${hijriYear}-${event.hijri_month}-${event.hijri_day}`;
          computations.push({ event, hijriYear, cacheKey });
        }
      }

      // Batch fetch (deduplicated by cacheKey)
      const uniqueKeys = [...new Set(computations.map(c => c.cacheKey))];
      await Promise.all(
        uniqueKeys.map(async (key) => {
          if (cacheRef.current[key]) return; // already cached
          const [hy, hm, hd] = key.split('-').map(Number);
          const date = await hijriToGregorianDate(hy, hm, hd);
          cacheRef.current[key] = toDateString(date);
        })
      );

      if (cancelled) return;

      // Now build expanded events
      const seen = new Set();
      for (const { event, hijriYear, cacheKey } of computations) {
        const dateStr = cacheRef.current[cacheKey];
        if (!dateStr) continue;
        const eventYear = parseInt(dateStr.split('-')[0]);
        if (eventYear !== targetYear) continue;

        // Deduplicate: same event, same computed date
        const dedupKey = `${event.id}-${dateStr}`;
        if (seen.has(dedupKey)) continue;
        seen.add(dedupKey);

        results.push({
          ...event,
          gregorian_date: dateStr,
          _computed: true,
          _hijri_year: hijriYear,
        });
      }

      if (!cancelled) {
        setExpandedEvents(results);
        setIsComputing(false);
      }
    }

    compute();
    return () => { cancelled = true; };
  }, [rawEvents, targetYear]);

  return { expandedEvents, isComputing };
}