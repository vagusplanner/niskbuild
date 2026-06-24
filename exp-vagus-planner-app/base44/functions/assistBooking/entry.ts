import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      booking_type = 'transport|tour|activity',
      destination,
      date,
      time,
      party_size = 1,
      special_requirements = [],
      budget_usd,
      preferences = {}
    } = await req.json();

    const booking_info = await base44.integrations.Core.InvokeLLM({
      prompt: `As an AI concierge, provide booking assistance for a ${booking_type} reservation.

Booking Details:
- Type: ${booking_type}
- Destination: ${destination}
- Date: ${date}
- Time: ${time}
- Party Size: ${party_size}
- Budget: $${budget_usd}
- Special Requirements: ${special_requirements.join(', ') || 'None'}
- Preferences: ${JSON.stringify(preferences)}

User Email: ${user.email}

Provide booking assistance in JSON format:
{
  "booking_type": "${booking_type}",
  "confirmation_number": "booking-id",
  "status": "available|limited|fully_booked|recommended_alternatives",
  "options": [
    {
      "provider": "company/service name",
      "option_name": "specific option",
      "description": "what's included",
      "price_usd": number,
      "duration": "duration/details",
      "pickup_location": "where they pick you up",
      "pickup_time": "HH:MM",
      "estimated_arrival": "HH:MM",
      "vehicle_type": "type if transport",
      "cancellation_policy": "cancellation terms",
      "rating": "user rating",
      "special_features": ["feature 1", "feature 2"],
      "how_to_book": "booking instructions/URL"
    }
  ],
  "booking_instructions": {
    "step1": "instruction",
    "step2": "instruction",
    "step3": "instruction"
  },
  "payment_methods_accepted": ["cash", "card", "mobile_payment"],
  "confirmation_details": {
    "what_to_show": "bring confirmation code and ID",
    "contact_number": "operator contact if available",
    "customer_service_email": "support contact"
  },
  "tips": [
    "arrive 15 mins early",
    "bring water",
    "payment accepted in USD and SAR"
  ],
  "alternative_options": [
    {
      "name": "alternative service",
      "advantage": "why consider this"
    }
  ],
  "price_comparison": "cheapest vs most convenient",
  "best_choice_for_user": "AI recommendation based on requirements"
}`,
      response_json_schema: {
        type: "object",
        properties: {
          booking_type: { type: "string" },
          status: { type: "string" },
          options: { type: "array" },
          booking_instructions: { type: "object" },
          payment_methods_accepted: { type: "array" },
          confirmation_details: { type: "object" },
          tips: { type: "array" },
          alternative_options: { type: "array" },
          best_choice_for_user: { type: "string" }
        }
      },
      add_context_from_internet: true
    });

    return Response.json({
      success: true,
      booking_assistance: booking_info,
      user_email: user.email,
      assistance_provided_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Booking assistance error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});