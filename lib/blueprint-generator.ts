import 'server-only';

import { getGroqClient } from '@/lib/groq-client';
import type { ComponentBlueprint } from '@/lib/blueprint-schema';

const SYSTEM_PROMPT = `You are a blueprint architect. When given a description of an app, return ONLY valid JSON matching the ComponentBlueprint schema. No markdown, no explanation, only JSON.

The blueprint should describe the complete application structure including all components, data tables, and integrations needed.

Use these component names:
- WorkspaceContainer (main layout wrapper)
- DataMetricCard (KPI/metric display with title and value)
- AuthForm (login/signup form)
- NavigationSidebar (side menu navigation)
- DataTable (sortable/filterable table)
- FormBuilder (dynamic form with fields)
- ChartContainer (chart/dashboard visualization)
- GameCanvas (Phaser game canvas)
- MapView (map with markers)
- MediaUploader (file/image upload)
- PaymentButton (Stripe checkout)
- AIAgentWidget (chat/assistant interface)

Schema:
{
  "applicationId": "string",
  "meta": {
    "title": "string",
    "type": "webapp" | "mobile" | "game",
    "description": "string",
    "theme": "dark" | "light"
  },
  "canvasTree": {
    "root": {
      "id": "string",
      "component": "component name",
      "properties": {},
      "children": []
    }
  },
  "dataSchema": {
    "tables": {
      "tableName": {
        "fields": { "fieldName": "string | number | boolean | timestamp | json | relation" },
        "permissions": "public | authenticated | admin"
      }
    }
  },
  "integrations": ["stripe", "clerk", "twilio", "mapbox", "elevenlabs"],
  "targetPlatform": "web | ios | android | pwa | game"
}

Return null for any field you are unsure about.`;

export async function generateBlueprint(
  prompt: string,
  applicationId?: string
): Promise<ComponentBlueprint | null> {
  const groq = getGroqClient();
  if (!groq) {
    console.error('Blueprint generation error: GROQ_API_KEY is not configured');
    return null;
  }

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.3,
      max_tokens: 8192,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) return null;

    const blueprint = JSON.parse(content) as ComponentBlueprint;
    if (applicationId) {
      blueprint.applicationId = applicationId;
    }
    return blueprint;
  } catch (error) {
    console.error('Blueprint generation error:', error);
    return null;
  }
}
