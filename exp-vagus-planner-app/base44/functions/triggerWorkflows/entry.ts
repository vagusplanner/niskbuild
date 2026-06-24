import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();

    if (!event || !data) {
      return Response.json({ error: 'event and data required' }, { status: 400 });
    }

    // Determine trigger type based on event
    let triggerType = null;
    if (event.entity_name === 'Event' && event.type === 'create') {
      triggerType = 'event_created';
    } else if (event.entity_name === 'Event' && event.type === 'update') {
      triggerType = 'event_updated';
    } else if (event.entity_name === 'Task' && event.type === 'create') {
      triggerType = 'task_created';
    } else if (event.entity_name === 'Task' && event.type === 'update' && data.status === 'completed') {
      triggerType = 'task_completed';
    } else if (event.entity_name === 'Meeting' && event.type === 'create') {
      triggerType = 'meeting_created';
    }

    if (!triggerType) {
      return Response.json({ message: 'No matching trigger type' });
    }

    // Find workflows matching this trigger
    const workflows = await base44.asServiceRole.entities.WorkflowAutomation.filter({
      trigger_type: triggerType,
      is_active: true
    });

    if (workflows.length === 0) {
      return Response.json({ message: 'No active workflows for this trigger' });
    }

    const executions = [];

    // Execute each matching workflow
    for (const workflow of workflows) {
      // Check trigger config conditions
      if (workflow.trigger_config && !checkTriggerConditions(workflow.trigger_config, data)) {
        continue;
      }

      try {
        // Execute workflow
        const result = await base44.asServiceRole.functions.invoke('executeWorkflow', {
          workflow_id: workflow.id,
          trigger_data: {
            event_type: event.type,
            entity_name: event.entity_name,
            entity_id: event.entity_id,
            user_email: data.created_by,
            data: data
          }
        });

        executions.push({
          workflow_id: workflow.id,
          workflow_name: workflow.name,
          status: result.data?.status || 'unknown'
        });
      } catch (error) {
        console.error(`Failed to execute workflow ${workflow.id}:`, error);
        executions.push({
          workflow_id: workflow.id,
          workflow_name: workflow.name,
          status: 'failed',
          error: error.message
        });
      }
    }

    return Response.json({
      success: true,
      trigger_type: triggerType,
      workflows_executed: executions.length,
      executions
    });

  } catch (error) {
    console.error('Error triggering workflows:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function checkTriggerConditions(config, data) {
  if (!config.conditions || config.conditions.length === 0) {
    return true;
  }

  return config.conditions.every(condition => {
    const value = getNestedValue(data, condition.field);
    
    switch (condition.operator) {
      case 'equals':
        return value == condition.value;
      case 'not_equals':
        return value != condition.value;
      case 'contains':
        return String(value).includes(condition.value);
      case 'greater_than':
        return Number(value) > Number(condition.value);
      case 'less_than':
        return Number(value) < Number(condition.value);
      case 'exists':
        return value !== null && value !== undefined;
      default:
        return true;
    }
  });
}

function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}