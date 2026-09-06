/**
 * Compatibility alias — AIPrayerInsights is merged into AIPrayerCoach (Insights tab).
 */
import AIPrayerCoach from './AIPrayerCoach';

export default function AIPrayerInsights() {
  return <AIPrayerCoach defaultTab="insights" />;
}
