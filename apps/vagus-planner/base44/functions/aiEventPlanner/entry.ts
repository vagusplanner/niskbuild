import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, eventData } = await req.json();

    if (action === 'suggestThemes') {
      const { keywords, eventType } = eventData;
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate 5 creative and engaging event theme suggestions based on these keywords: "${keywords}". Event type: ${eventType}. For each theme, provide: theme name, brief description, and color scheme. Return as JSON array.`,
        response_json_schema: {
          type: "object",
          properties: {
            themes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  description: { type: "string" },
                  colorScheme: { type: "string" }
                }
              }
            }
          }
        }
      });
      return Response.json(result);
    }

    if (action === 'generateGuestList') {
      const { eventType, keywords, maxGuests = 50 } = eventData;
      const contacts = await base44.entities.SocialConnection.filter({ created_by: user.email });
      
      const contactSummary = contacts.slice(0, 100).map(c => 
        `${c.friend_name || c.friend_email} (${c.relationship || 'contact'})`
      ).join(', ');

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Based on this event: "${eventType}" with theme/keywords: "${keywords}", suggest which contacts from this list would be most appropriate to invite. Available contacts: ${contactSummary}. Maximum guests: ${maxGuests}. Return a JSON array of recommended guest emails with reasoning.`,
        response_json_schema: {
          type: "object",
          properties: {
            recommendations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  email: { type: "string" },
                  name: { type: "string" },
                  reason: { type: "string" }
                }
              }
            }
          }
        }
      });
      return Response.json(result);
    }

    if (action === 'recommendVenues') {
      const { eventType, location, guestCount, budget } = eventData;
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Recommend 5 suitable venues for a ${eventType} event in ${location}. Expected guests: ${guestCount}. Budget range: ${budget || 'moderate'}. For each venue, provide: name, type, capacity, estimated cost range, amenities, and why it's suitable.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            venues: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  type: { type: "string" },
                  capacity: { type: "string" },
                  costRange: { type: "string" },
                  amenities: { type: "array", items: { type: "string" } },
                  suitability: { type: "string" }
                }
              }
            }
          }
        }
      });
      return Response.json(result);
    }

    if (action === 'createInvitation') {
      const { eventTitle, eventType, theme, date, time, location, description } = eventData;
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Create a compelling and professional event invitation for:
Event: ${eventTitle}
Type: ${eventType}
Theme: ${theme || 'not specified'}
Date: ${date}
Time: ${time}
Location: ${location}
Description: ${description || ''}

Generate both a formal version and a casual version. Include appropriate tone, engaging language, and all necessary details. Return as JSON with 'formal' and 'casual' fields.`,
        response_json_schema: {
          type: "object",
          properties: {
            formal: { type: "string" },
            casual: { type: "string" },
            subject: { type: "string" }
          }
        }
      });
      return Response.json(result);
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});