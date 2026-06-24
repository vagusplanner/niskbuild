import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { entity_type, entity_id, new_data, old_data, change_type = 'update' } = body;

    if (!entity_type || !entity_id || !new_data) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get current user
    let changed_by = 'system';
    try {
      const user = await base44.auth.me();
      if (user?.email) changed_by = user.email;
    } catch (_) {}

    // Fetch existing versions to determine next version number
    const existing = await base44.asServiceRole.entities.VersionHistory.filter({
      entity_type,
      entity_id
    }, '-version_number', 1);

    const version_number = existing.length > 0 ? (existing[0].version_number + 1) : 1;

    // Compute changed fields
    const changed_fields = [];
    if (old_data && change_type === 'update') {
      const allKeys = new Set([...Object.keys(old_data), ...Object.keys(new_data)]);
      const skipKeys = new Set(['id', 'created_date', 'updated_date', 'created_by']);
      for (const key of allKeys) {
        if (skipKeys.has(key)) continue;
        const oldVal = old_data[key];
        const newVal = new_data[key];
        if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
          changed_fields.push({ field: key, old_value: oldVal, new_value: newVal });
        }
      }
    }

    // Build change summary
    let change_summary = '';
    if (change_type === 'create') {
      change_summary = 'Created';
    } else if (change_type === 'restore') {
      change_summary = `Restored to version ${old_data?.version_number || ''}`;
    } else if (changed_fields.length > 0) {
      change_summary = `Updated ${changed_fields.map(f => f.field).join(', ')}`;
    } else {
      change_summary = 'Updated';
    }

    const entity_title = new_data.title || new_data.name || new_data.destination || entity_id;

    await base44.asServiceRole.entities.VersionHistory.create({
      entity_type,
      entity_id,
      entity_title,
      version_number,
      snapshot: new_data,
      changed_fields,
      change_summary,
      changed_by,
      change_type
    });

    return Response.json({ success: true, version_number });
  } catch (error) {
    console.error('recordVersionHistory error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});