import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const DAILY_API_KEY = Deno.env.get('DAILY_API_KEY');
const DAILY_BASE = 'https://api.daily.co/v1';

async function dailyFetch(path, method = 'GET', body = null) {
  const res = await fetch(`${DAILY_BASE}${path}`, {
    method,
    headers: {
      'Authorization': `Bearer ${DAILY_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Daily API error ${res.status}`);
  return data;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { action, room_name, chat_id, get_participants } = await req.json();

    // Create or get a room for a given chat
    if (action === 'get_or_create_room') {
      if (!chat_id) return Response.json({ error: 'chat_id required' }, { status: 400 });

      // Sanitize room name: only lowercase alphanumeric and hyphens
      const safeName = `vagus-${chat_id.replace(/[^a-z0-9]/gi, '-').toLowerCase().slice(0, 40)}`;

      // Try to get existing room first
      try {
        const existing = await dailyFetch(`/rooms/${safeName}`);
        // Create a meeting token for this user
        const token = await dailyFetch('/meeting-tokens', 'POST', {
          properties: {
            room_name: safeName,
            user_name: user.full_name || user.email.split('@')[0],
            user_id: user.email,
            exp: Math.floor(Date.now() / 1000) + 3600, // 1hr expiry
            is_owner: existing.config?.owner_only_broadcast === false
          }
        });
        return Response.json({ room: existing, token: token.token, room_url: existing.url });
      } catch (_) {
        // Room doesn't exist, create it
      }

      const room = await dailyFetch('/rooms', 'POST', {
        name: safeName,
        privacy: 'private',
        properties: {
          max_participants: 8,
          enable_chat: true,
          enable_screenshare: true,
          exp: Math.floor(Date.now() / 1000) + 86400, // 24hr room
          enable_recording: false,
          start_video_off: false,
          start_audio_off: false
        }
      });

      const token = await dailyFetch('/meeting-tokens', 'POST', {
        properties: {
          room_name: safeName,
          user_name: user.full_name || user.email.split('@')[0],
          user_id: user.email,
          exp: Math.floor(Date.now() / 1000) + 3600,
          is_owner: true
        }
      });

      return Response.json({ room, token: token.token, room_url: room.url });
    }

    // Delete a room
    if (action === 'delete_room') {
      if (!room_name) return Response.json({ error: 'room_name required' }, { status: 400 });
      await dailyFetch(`/rooms/${room_name}`, 'DELETE');
      return Response.json({ success: true });
    }

    // Get room info / participant count
    if (action === 'get_room_info') {
      if (!room_name) return Response.json({ error: 'room_name required' }, { status: 400 });
      const info = await dailyFetch(`/rooms/${room_name}`);
      return Response.json({ room: info });
    }

    // Get room participant count (presence)
    if (action === 'get_presence') {
      if (!room_name) return Response.json({ error: 'room_name required' }, { status: 400 });
      const presence = await dailyFetch(`/presence/${room_name}`);
      return Response.json({ presence });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });

  } catch (error) {
    console.error('dailyRoom error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});