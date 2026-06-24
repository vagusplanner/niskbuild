import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { command, user_location } = await req.json();

    if (!command) {
      return Response.json({ error: 'command required' }, { status: 400 });
    }

    // Get user settings for prayer times and preferences
    const settings = await base44.entities.UserSettings.list();
    const userSettings = settings.find(s => s.created_by === user.email);

    // Get recent tasks and events for context
    const recentEvents = await base44.entities.Event.filter({
      created_by: user.email
    });
    const recentTasks = await base44.entities.Task.filter({
      created_by: user.email
    });

    // Build context
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const prompt = `You are an intelligent voice command parser for a Muslim-friendly calendar and task management app.

Voice Command: "${command}"

Current Context:
- Date: ${todayStr}
- Time: ${now.toTimeString().slice(0, 5)}
- User's prayer times enabled: ${userSettings?.prayer_enabled || false}
- User's location: ${userSettings?.location_city || 'Not set'}
- Recent event categories: ${[...new Set(recentEvents.slice(0, 10).map(e => e.category))].join(', ')}
- Recent task categories: ${[...new Set(recentTasks.slice(0, 10).map(t => t.category))].join(', ')}

Prayer Times Reference (typical):
- Fajr: 5:30 AM, Dhuhr: 12:30 PM, Asr: 3:30 PM, Maghrib: 6:00 PM, Isha: 7:30 PM

SUPPORTED COMMAND TYPES:
1. CREATE (event/task): "Add meeting tomorrow at 3pm", "Create task to buy milk"
2. READ: "Read my next task", "What's my schedule today", "Show upcoming events"
3. UPDATE: "Mark first task as done", "Move meeting to 4pm"
4. BUDGET: "Add expense 50 dollars for groceries", "Create budget entry food 30"

Parse the command and determine:
1. Type: "event" or "task"
2. Title: extracted title
3. Date: resolve relative dates (tomorrow, next Monday, etc.) to YYYY-MM-DD
4. Time: resolve times including "after/before prayer" references to HH:MM format
5. Duration: in minutes if specified
6. Category: work, personal, family, prayer, health, etc.
7. Priority: low, medium, high, urgent
8. Recurrence: daily, weekly, monthly if mentioned
9. Notes: any additional context

Be smart about Islamic context:
- "after Asr prayer" means 30 mins after Asr (around 4:00 PM)
- "before Maghrib" means 15 mins before Maghrib (around 5:45 PM)
- "Friday" without time likely means afternoon after Jummah
- "Ramadan iftar" is at Maghrib time
- "Suhoor" is before Fajr

Return null for fields not mentioned in the command.`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          action: { type: "string", enum: ["create", "read", "update", "budget"] },
          type: { type: "string", enum: ["event", "task", "expense", "query"] },
          title: { type: "string" },
          description: { type: "string" },
          date: { type: "string" },
          start_time: { type: "string" },
          end_time: { type: "string" },
          duration_minutes: { type: "number" },
          category: { type: "string" },
          priority: { type: "string" },
          is_recurring: { type: "boolean" },
          recurrence_type: { type: "string" },
          location: { type: "string" },
          notes: { type: "string" },
          amount: { type: "number" },
          query_text: { type: "string" },
          confidence: { type: "number", description: "0-100" },
          parsed_correctly: { type: "boolean" }
        }
      }
    });

    // Execute action based on command type
    let result = null;
    
    if (response.parsed_correctly && response.confidence > 70) {
      // CREATE actions
      if (response.action === 'create') {
        if (response.type === 'event') {
          const eventData = {
            title: response.title,
            description: response.description,
            start_date: response.date ? `${response.date}T${response.start_time || '09:00'}:00` : new Date().toISOString(),
            end_date: response.date && response.end_time 
              ? `${response.date}T${response.end_time}:00`
              : response.date && response.duration_minutes
                ? new Date(new Date(`${response.date}T${response.start_time || '09:00'}:00`).getTime() + response.duration_minutes * 60000).toISOString()
                : new Date(Date.now() + 3600000).toISOString(),
            category: response.category || 'personal',
            location: response.location,
            notes: response.notes,
            is_recurring: response.is_recurring || false,
            recurrence_type: response.recurrence_type
          };
          result = await base44.entities.Event.create(eventData);
        } else if (response.type === 'task') {
          const taskData = {
            title: response.title,
            description: response.description,
            due_date: response.date || todayStr,
            due_time: response.start_time,
            category: response.category || 'personal',
            priority: response.priority || 'medium',
            status: 'todo',
            estimated_minutes: response.duration_minutes,
            notes: response.notes,
            is_recurring: response.is_recurring || false,
            recurrence_type: response.recurrence_type
          };
          result = await base44.entities.Task.create(taskData);
        }
      }
      
      // BUDGET actions
      else if (response.action === 'budget' && response.type === 'expense') {
        const expenseData = {
          date: response.date || todayStr,
          amount: response.amount || 0,
          type: 'expense',
          category: response.category || 'other',
          description: response.title || response.description,
          notes: response.notes
        };
        result = await base44.entities.Expense.create(expenseData);
      }
      
      // READ actions
      else if (response.action === 'read') {
        if (response.type === 'task') {
          const tasks = await base44.entities.Task.filter({ status: 'todo', created_by: user.email }, 'due_date', 1);
          result = { read: tasks[0] || null, message: tasks[0] ? `Next task: ${tasks[0].title}` : 'No pending tasks' };
        } else if (response.type === 'event') {
          const events = await base44.entities.Event.filter({ created_by: user.email }, 'start_date', 3);
          const upcoming = events.filter(e => new Date(e.start_date) > now);
          result = { read: upcoming, message: upcoming.length > 0 ? `${upcoming.length} upcoming events` : 'No upcoming events' };
        } else {
          result = { read: null, message: 'What would you like to read?' };
        }
      }
      
      // UPDATE actions  
      else if (response.action === 'update' && response.type === 'task') {
        const tasks = await base44.entities.Task.filter({ status: 'todo', created_by: user.email }, 'due_date', 1);
        if (tasks[0]) {
          await base44.entities.Task.update(tasks[0].id, { status: 'completed' });
          result = { updated: tasks[0], message: `Marked "${tasks[0].title}" as done` };
        }
      }
    }

    return Response.json({
      success: true,
      action: response.action,
      parsed: response,
      result: result,
      created: result && response.action === 'create' ? { type: response.type, id: result.id } : null,
      original_command: command
    });

  } catch (error) {
    console.error('Error parsing voice command:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});