import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { task_id } = await req.json();

    // Fetch the task and all tasks
    const task = await base44.entities.Task.get(task_id);
    const allTasks = await base44.entities.Task.list();

    if (!task) {
      return Response.json({ error: 'Task not found' }, { status: 404 });
    }

    // Check if task is blocked by dependencies
    const blockedDependencies = [];
    const completedDependencies = [];
    const inProgressDependencies = [];

    if (task.dependencies && task.dependencies.length > 0) {
      for (const dep of task.dependencies) {
        const depTask = allTasks.find(t => t.id === dep.task_id);
        
        if (!depTask) {
          blockedDependencies.push({
            ...dep,
            reason: 'Task not found'
          });
          continue;
        }

        if (dep.type === 'blocks') {
          if (depTask.status === 'completed') {
            completedDependencies.push({ ...dep, task: depTask });
          } else if (depTask.status === 'in_progress') {
            inProgressDependencies.push({ ...dep, task: depTask });
          } else {
            blockedDependencies.push({
              ...dep,
              task: depTask,
              reason: `"${depTask.title}" must be completed first`
            });
          }
        } else {
          // For non-blocking dependencies, just track status
          if (depTask.status === 'completed') {
            completedDependencies.push({ ...dep, task: depTask });
          } else {
            inProgressDependencies.push({ ...dep, task: depTask });
          }
        }
      }
    }

    // Find tasks that depend on this one
    const dependentTasks = allTasks.filter(t => 
      t.dependencies?.some(d => d.task_id === task.id)
    );

    const isBlocked = blockedDependencies.length > 0;
    const canStart = !isBlocked && task.status !== 'completed';

    // Calculate estimated availability
    let estimatedAvailableDate = null;
    if (isBlocked) {
      // Find the latest due date among blocking tasks
      const blockingDueDates = blockedDependencies
        .map(d => d.task?.due_date)
        .filter(date => date);
      
      if (blockingDueDates.length > 0) {
        estimatedAvailableDate = blockingDueDates.sort().reverse()[0];
      }
    }

    return Response.json({
      success: true,
      task_id: task.id,
      task_title: task.title,
      is_blocked: isBlocked,
      can_start: canStart,
      dependencies: {
        total: task.dependencies?.length || 0,
        blocked: blockedDependencies.length,
        in_progress: inProgressDependencies.length,
        completed: completedDependencies.length
      },
      blocking_tasks: blockedDependencies,
      dependent_tasks: dependentTasks.map(t => ({
        id: t.id,
        title: t.title,
        status: t.status
      })),
      estimated_available_date: estimatedAvailableDate,
      recommendation: isBlocked 
        ? `Complete ${blockedDependencies.length} blocking task(s) before starting this task`
        : canStart 
        ? 'This task is ready to start'
        : 'Task is already in progress or completed'
    });

  } catch (error) {
    console.error('Error checking dependencies:', error);
    return Response.json({ 
      error: error.message,
      success: false
    }, { status: 500 });
  }
});