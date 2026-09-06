/**
 * SmartGoalSuggestions merged into AIGoalPlanner (Quick Start presets + Plan tab).
 * Kept as a named entry for any remaining imports.
 */
import AIGoalPlanner from '@/components/goals/AIGoalPlanner';

export default function SmartGoalSuggestions() {
  return <AIGoalPlanner defaultTab="plan" />;
}
