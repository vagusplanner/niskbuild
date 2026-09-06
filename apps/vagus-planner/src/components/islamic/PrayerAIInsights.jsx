/**
 * Compatibility alias — PrayerAIInsights is merged into AIPrayerCoach (Insights tab).
 */
import AIPrayerCoach from './AIPrayerCoach';

export default function PrayerAIInsights() {
  return <AIPrayerCoach defaultTab="insights" />;
}
