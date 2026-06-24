import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Generate recurring task instances
 * Creates individual task instances for recurring tasks based on their schedule
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // This can be called by automation or manually
    const { taskId, generateUpTo } = await req.json().catch(() => ({}));
    
    // Default: generate tasks for the next 90 days
    const endDate = generateUpTo ? new Date(generateUpTo) : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get all recurring tasks or a specific one
    const recurringTasks = taskId 
      ? [await base44.asServiceRole.entities.Task.get(taskId)]
      : await base44.asServiceRole.entities.Task.filter({ is_recurring: true });
    
    let totalGenerated = 0;
    
    for (const parentTask of recurringTasks) {
      if (!parentTask.is_recurring || !parentTask.due_date) continue;
      
      const startDate = new Date(parentTask.due_date);
      if (startDate < today) {
        startDate.setTime(today.getTime());
      }
      
      const instances = [];
      let currentDate = new Date(startDate);
      let occurrenceCount = 0;
      const maxOccurrences = parentTask.recurrence_occurrences || 365;
      
      // Check end conditions
      const shouldContinue = () => {
        if (parentTask.recurrence_end_type === 'date' && parentTask.recurrence_end_date) {
          return currentDate <= new Date(parentTask.recurrence_end_date);
        }
        if (parentTask.recurrence_end_type === 'occurrences') {
          return occurrenceCount < maxOccurrences;
        }
        return currentDate <= endDate;
      };
      
      while (shouldContinue() && occurrenceCount < 365) {
        // Check if this occurrence already exists
        const existingInstance = await base44.asServiceRole.entities.Task.filter({
          parent_recurring_task_id: parentTask.id,
          due_date: currentDate.toISOString().split('T')[0]
        });
        
        if (existingInstance.length === 0) {
          // Check if this occurrence should be created based on recurrence pattern
          let shouldCreate = false;
          
          if (parentTask.recurrence_type === 'daily') {
            shouldCreate = true;
          } else if (parentTask.recurrence_type === 'weekly') {
            const dayOfWeek = currentDate.getDay();
            shouldCreate = parentTask.recurrence_days?.includes(dayOfWeek) || false;
          } else if (parentTask.recurrence_type === 'monthly') {
            const startDay = new Date(parentTask.due_date).getDate();
            shouldCreate = currentDate.getDate() === startDay;
          } else if (parentTask.recurrence_type === 'yearly') {
            const startMonth = new Date(parentTask.due_date).getMonth();
            const startDay = new Date(parentTask.due_date).getDate();
            shouldCreate = currentDate.getMonth() === startMonth && currentDate.getDate() === startDay;
          }
          
          if (shouldCreate) {
            instances.push({
              ...parentTask,
              id: undefined,
              created_date: undefined,
              updated_date: undefined,
              parent_recurring_task_id: parentTask.id,
              is_recurring: false, // Individual instances are not recurring
              due_date: currentDate.toISOString().split('T')[0],
              status: 'todo',
              // Keep subtasks but reset completion
              subtasks: parentTask.subtasks?.map(st => ({ ...st, completed: false }))
            });
            occurrenceCount++;
          }
        }
        
        // Increment date based on recurrence type
        if (parentTask.recurrence_type === 'daily') {
          currentDate.setDate(currentDate.getDate() + (parentTask.recurrence_interval || 1));
        } else if (parentTask.recurrence_type === 'weekly') {
          currentDate.setDate(currentDate.getDate() + 1);
        } else if (parentTask.recurrence_type === 'monthly') {
          currentDate.setMonth(currentDate.getMonth() + (parentTask.recurrence_interval || 1));
        } else if (parentTask.recurrence_type === 'yearly') {
          currentDate.setFullYear(currentDate.getFullYear() + (parentTask.recurrence_interval || 1));
        }
      }
      
      // Create all instances in bulk
      if (instances.length > 0) {
        await base44.asServiceRole.entities.Task.bulkCreate(instances);
        totalGenerated += instances.length;
        
        console.log(`Generated ${instances.length} instances for task: ${parentTask.title}`);
      }
    }
    
    return Response.json({ 
      success: true, 
      totalGenerated,
      message: `Generated ${totalGenerated} recurring task instances`
    });

  } catch (error) {
    console.error('Generate recurring tasks error:', error);
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});