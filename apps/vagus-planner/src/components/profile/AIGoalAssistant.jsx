/**
 * Compatibility wrapper — Profile/Goals "AI Goal Assistant" opens the canonical AIGoalPlanner modal.
 * Form helpers (description/steps/progress) remain in goals/AIGoalAssistant.jsx.
 */
import AIGoalPlanner from '@/components/goals/AIGoalPlanner';

export default function AIGoalAssistant({ isOpen, onClose, goal, onUpdateGoal }) {
  return (
    <AIGoalPlanner
      variant="modal"
      isOpen={isOpen}
      onClose={onClose}
      goal={goal}
      onUpdateGoal={onUpdateGoal}
      defaultTab={goal ? 'analyze' : 'plan'}
    />
  );
}
