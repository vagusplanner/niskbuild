import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    // Support both direct invocation (workflow_id provided) and entity automation trigger
    const { workflow_id, trigger_data: explicitTriggerData, event, data, old_data } = body;

    const startTime = Date.now();

    let workflowsToRun = [];

    if (workflow_id) {
      // Direct invocation with a specific workflow
      const workflows = await base44.asServiceRole.entities.WorkflowAutomation.filter({ id: workflow_id });
      const workflow = workflows[0];
      if (!workflow) return Response.json({ error: 'Workflow not found' }, { status: 404 });
      if (!workflow.is_active) return Response.json({ error: 'Workflow is not active' }, { status: 400 });
      workflowsToRun = [workflow];
    } else if (event) {
      // Entity automation trigger — find all active workflows matching this entity + event type
      const allWorkflows = await base44.asServiceRole.entities.WorkflowAutomation.filter({ is_active: true });
      const eventType = event.type; // 'create' or 'update'
      const entityName = event.entity_name;

      workflowsToRun = allWorkflows.filter(w => {
        const triggerEntity = w.trigger_entity || w.entity_name;
        const triggerEvents = w.trigger_events || w.trigger_on || [];
        return (
          triggerEntity === entityName &&
          (triggerEvents.includes(eventType) ||
            (eventType === 'update' && data?.status === 'completed' && triggerEvents.includes('completed')))
        );
      });

      if (workflowsToRun.length === 0) {
        return Response.json({ success: true, message: 'No matching active workflows for this trigger', ran: 0 });
      }
    } else {
      return Response.json({ error: 'workflow_id or entity event payload required' }, { status: 400 });
    }

    // Create execution log
    const results = [];

    for (const workflow of workflowsToRun) {
      // Build trigger_data: prefer explicit, fall back to entity event data
      const trigger_data = explicitTriggerData || (event ? { ...data, event_type: event.type, entity_name: event.entity_name, old_data } : {});

      const executionLog = await base44.asServiceRole.entities.WorkflowExecutionLog.create({
        created_by: workflow.created_by,
        workflow_id: workflow.id,
        workflow_name: workflow.name,
        trigger_data: trigger_data || {},
        status: 'running',
        steps_executed: []
      });

      const stepsExecuted = [];
      let currentStepId = workflow.steps?.[0]?.id;
      let executionStatus = 'success';
      let errorMessage = null;

      // Execute workflow steps
      while (currentStepId) {
        const step = workflow.steps.find(s => s.id === currentStepId);
        if (!step) break;

        const stepStartTime = Date.now();
        let stepStatus = 'success';
        let stepResult = null;
        let stepError = null;

        try {
          // Check conditions
          if (step.conditions && step.conditions.length > 0) {
            const conditionsMet = evaluateConditions(step.conditions, trigger_data);
            if (!conditionsMet) {
              stepStatus = 'skipped';
              stepResult = { skipped: true, reason: 'Conditions not met' };
              currentStepId = step.on_failure || null;
              continue;
            }
          }

          // Execute step action
          stepResult = await executeStepAction(step, trigger_data, base44);
          currentStepId = step.on_success || null;

        } catch (error) {
          stepStatus = 'failed';
          stepError = error.message;
          executionStatus = 'failed';
          errorMessage = `Step ${step.id} failed: ${error.message}`;
          currentStepId = step.on_failure || null;
        }

        stepsExecuted.push({
          step_id: step.id,
          step_type: step.type,
          status: stepStatus,
          result: stepResult,
          error: stepError,
          executed_at: new Date().toISOString(),
          duration_ms: Date.now() - stepStartTime
        });
      }

      const duration = Date.now() - startTime;

      // Update execution log
      await base44.asServiceRole.entities.WorkflowExecutionLog.update(executionLog.id, {
        status: executionStatus,
        steps_executed: stepsExecuted,
        error_message: errorMessage,
        duration_ms: duration,
        completed_at: new Date().toISOString()
      });

      // Update workflow stats
      await base44.asServiceRole.entities.WorkflowAutomation.update(workflow.id, {
        execution_count: (workflow.execution_count || 0) + 1,
        last_execution: new Date().toISOString(),
        last_execution_status: executionStatus
      });

      results.push({
        workflow_id: workflow.id,
        workflow_name: workflow.name,
        execution_id: executionLog.id,
        status: executionStatus,
        steps_executed: stepsExecuted.length,
        duration_ms: duration,
        error: errorMessage
      });
    }

    return Response.json({
      success: true,
      ran: results.length,
      results
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function evaluateConditions(conditions, data) {
  return conditions.every(condition => {
    const fieldValue = getNestedValue(data, condition.field);
    
    switch (condition.operator) {
      case 'equals':
        return fieldValue == condition.value;
      case 'not_equals':
        return fieldValue != condition.value;
      case 'contains':
        return String(fieldValue).includes(condition.value);
      case 'greater_than':
        return Number(fieldValue) > Number(condition.value);
      case 'less_than':
        return Number(fieldValue) < Number(condition.value);
      case 'exists':
        return fieldValue !== null && fieldValue !== undefined;
      default:
        return true;
    }
  });
}

function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

async function executeStepAction(step, triggerData, base44) {
  switch (step.type) {
    case 'send_notification':
      return await base44.asServiceRole.entities.Notification.create({
        user_email: step.config.recipient || triggerData.user_email,
        title: interpolate(step.config.title, triggerData),
        message: interpolate(step.config.message, triggerData),
        type: step.config.notification_type || 'info',
        priority: step.config.priority || 'normal',
        is_read: false
      });

    case 'send_email':
      return await base44.asServiceRole.integrations.Core.SendEmail({
        to: step.config.recipient || triggerData.user_email,
        subject: interpolate(step.config.subject, triggerData),
        body: interpolate(step.config.body, triggerData)
      });

    case 'create_event':
      return await base44.asServiceRole.entities.Event.create({
        created_by: triggerData.user_email,
        title: interpolate(step.config.title, triggerData),
        description: interpolate(step.config.description, triggerData),
        start_date: step.config.start_date || new Date().toISOString(),
        end_date: step.config.end_date || new Date().toISOString(),
        category: step.config.category || 'other',
        location: step.config.location
      });

    case 'update_event':
      if (triggerData.event_id) {
        return await base44.asServiceRole.entities.Event.update(
          triggerData.event_id,
          step.config.updates
        );
      }
      throw new Error('No event_id in trigger data');

    case 'create_task':
      return await base44.asServiceRole.entities.Task.create({
        created_by: triggerData.user_email,
        title: interpolate(step.config.title, triggerData),
        description: interpolate(step.config.description, triggerData),
        due_date: step.config.due_date,
        priority: step.config.priority || 'medium',
        status: 'pending'
      });

    case 'invoke_function':
      return await base44.asServiceRole.functions.invoke(
        step.config.function_name,
        step.config.parameters || triggerData
      );

    case 'wait':
      await new Promise(resolve => setTimeout(resolve, step.config.duration_ms || 1000));
      return { waited: step.config.duration_ms || 1000 };

    default:
      return { message: 'Step type not implemented', type: step.type };
  }
}

function interpolate(template, data) {
  if (!template) return template;
  return String(template).replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, path) => {
    return getNestedValue(data, path) || match;
  });
}