import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { task_id, all_tasks } = await req.json();

    // Get task details
    let targetTask = null;
    let allUserTasks = [];

    if (task_id) {
      const tasks = await base44.entities.Task.filter({ id: task_id });
      targetTask = tasks[0];
    }

    // Get all user's tasks for context
    if (!all_tasks) {
      allUserTasks = await base44.entities.Task.filter({
        created_by: user.email,
        status: { $in: ['todo', 'in_progress', 'blocked'] }
      });
    } else {
      allUserTasks = all_tasks;
    }

    // Analyze dependencies using AI
    const prompt = `You are an intelligent task management assistant. Analyze these tasks and identify dependencies:

${targetTask ? `
Target Task:
- Title: ${targetTask.title}
- Description: ${targetTask.description || 'None'}
- Category: ${targetTask.category}
- Priority: ${targetTask.priority}
- Due Date: ${targetTask.due_date || 'Not set'}
` : ''}

All Active Tasks:
${allUserTasks.map((t, i) => `${i + 1}. ${t.title} (${t.category}, ${t.priority} priority) - Status: ${t.status}`).join('\n')}

Analyze and provide:
1. For the target task (or if analyzing all): Which tasks should be completed BEFORE this one?
2. Which tasks depend ON this task being completed?
3. Suggested optimal sequence for completing all tasks
4. Any circular dependencies or conflicts
5. Critical path tasks (highest priority sequence)

Consider:
- Task categories and natural workflows
- Priority levels
- Due dates
- Task descriptions for context clues
- Common work patterns`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          dependencies: {
            type: "array",
            items: {
              type: "object",
              properties: {
                task_id: { type: "string" },
                task_title: { type: "string" },
                blocks: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      task_id: { type: "string" },
                      task_title: { type: "string" },
                      reason: { type: "string" }
                    }
                  }
                },
                blocked_by: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      task_id: { type: "string" },
                      task_title: { type: "string" },
                      reason: { type: "string" }
                    }
                  }
                }
              }
            }
          },
          optimal_sequence: {
            type: "array",
            items: {
              type: "object",
              properties: {
                order: { type: "number" },
                task_id: { type: "string" },
                task_title: { type: "string" },
                reason: { type: "string" }
              }
            }
          },
          critical_path: {
            type: "array",
            items: { type: "string" }
          },
          conflicts: {
            type: "array",
            items: {
              type: "object",
              properties: {
                description: { type: "string" },
                affected_tasks: { type: "array", items: { type: "string" } }
              }
            }
          },
          recommendations: {
            type: "array",
            items: { type: "string" }
          }
        }
      }
    });

    // Auto-update task dependencies if target task provided
    if (targetTask && response.dependencies) {
      const taskDeps = response.dependencies.find(d => d.task_id === task_id);
      if (taskDeps) {
        const updatedDependencies = [
          ...(targetTask.dependencies || []),
          ...taskDeps.blocked_by?.map(dep => ({
            task_id: dep.task_id,
            task_title: dep.task_title,
            type: 'required_by'
          })) || []
        ];

        await base44.entities.Task.update(task_id, {
          dependencies: updatedDependencies
        });
      }
    }

    return Response.json({
      success: true,
      analysis: response,
      tasks_analyzed: allUserTasks.length
    });

  } catch (error) {
    console.error('Error analyzing dependencies:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});