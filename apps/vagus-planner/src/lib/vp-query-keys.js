/**
 * Shared React Query keys + invalidation for Vagus Planner entities.
 * Keep Dashboard keys distinct from MonthlyLifeRecap / list pages.
 */

export const vpQueryKeys = {
  todayEvents: ['todayEvents'],
  activeTasks: ['activeTasks'],
  events: ['events'],
  tasks: ['tasks'],
  reflections: ['reflections'],
  expenses: ['expenses'],
  monthlyRecapEvents: ['monthlyRecap', 'events'],
  monthlyRecapTasks: ['monthlyRecap', 'tasks'],
  monthlyRecapExpenses: ['monthlyRecap', 'expenses'],
  monthlyRecapGoals: ['monthlyRecap', 'goals'],
};

/** @type {null | ((entityName: string, action?: string) => void)} */
let entityChangeListener = null;

/** Register from App bootstrap so base44-compat can invalidate after writes. */
export function registerVpEntityChangeListener(listener) {
  entityChangeListener = typeof listener === 'function' ? listener : null;
}

export function notifyVpEntityChange(entityName, action = 'write') {
  try {
    entityChangeListener?.(entityName, action);
  } catch (err) {
    console.warn('vp entity change listener failed', err);
  }
}

/** @param {import('@tanstack/react-query').QueryClient} queryClient */
export function invalidateAfterEventChange(queryClient) {
  if (!queryClient) return;
  queryClient.invalidateQueries({ queryKey: vpQueryKeys.events });
  queryClient.invalidateQueries({ queryKey: vpQueryKeys.todayEvents });
  queryClient.invalidateQueries({ queryKey: vpQueryKeys.monthlyRecapEvents });
}

/** @param {import('@tanstack/react-query').QueryClient} queryClient */
export function invalidateAfterTaskChange(queryClient) {
  if (!queryClient) return;
  queryClient.invalidateQueries({ queryKey: vpQueryKeys.tasks });
  queryClient.invalidateQueries({ queryKey: vpQueryKeys.activeTasks });
  queryClient.invalidateQueries({ queryKey: vpQueryKeys.monthlyRecapTasks });
}

/** @param {import('@tanstack/react-query').QueryClient} queryClient */
export function invalidateAfterExpenseChange(queryClient) {
  if (!queryClient) return;
  queryClient.invalidateQueries({ queryKey: vpQueryKeys.expenses });
  queryClient.invalidateQueries({ queryKey: vpQueryKeys.monthlyRecapExpenses });
}

/** @param {import('@tanstack/react-query').QueryClient} queryClient */
export function invalidateAfterReflectionChange(queryClient) {
  if (!queryClient) return;
  queryClient.invalidateQueries({ queryKey: vpQueryKeys.reflections });
}

/** Wire base44 write notifications → React Query invalidation. */
export function installVpQueryInvalidation(queryClient) {
  registerVpEntityChangeListener((entityName) => {
    switch (entityName) {
      case 'Event':
        invalidateAfterEventChange(queryClient);
        break;
      case 'Task':
        invalidateAfterTaskChange(queryClient);
        break;
      case 'Expense':
        invalidateAfterExpenseChange(queryClient);
        break;
      case 'Reflection':
        invalidateAfterReflectionChange(queryClient);
        break;
      default:
        break;
    }
  });
}
