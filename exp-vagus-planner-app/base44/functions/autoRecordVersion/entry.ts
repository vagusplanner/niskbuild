import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { event, data, old_data } = body;

    if (!event || !data) {
      return Response.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const entity_type = event.entity_name;
    const entity_id = event.entity_id;
    const change_type = event.type === 'create' ? 'create' : 'update';

    // Compute changed fields for updates
    const changed_fields = [];
    if (old_data && change_type === 'update') {
      const allKeys = new Set([...Object.keys(old_data), ...Object.keys(data)]);
      const skipKeys = new Set(['id', 'created_date', 'updated_date', 'created_by']);
      for (const key of allKeys) {
        if (skipKeys.has(key)) continue;
        const oldVal = old_data[key];
        const newVal = data[key];
        if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
          const toStr = (v) => {
            if (v == null || v === undefined) return '';
            if (typeof v === 'string') return v;
            if (typeof v === 'number' || typeof v === 'boolean') return String(v);
            try { return JSON.stringify(v) ?? ''; } catch { return '[complex value]'; }
          };
          changed_fields.push({
            field: key,
            old_value: toStr(oldVal),
            new_value: toStr(newVal)
          });
        }
      }
    }

    // Skip if nothing actually changed
    if (change_type === 'update' && changed_fields.length === 0) {
      return Response.json({ success: true, skipped: true });
    }

    // Fetch existing versions for next version number
    const existing = await base44.asServiceRole.entities.VersionHistory.filter({
      entity_type,
      entity_id
    }, '-version_number', 1);

    const version_number = existing.length > 0 ? (existing[0].version_number + 1) : 1;

    // Build change summary
    let change_summary = '';
    if (change_type === 'create') {
      change_summary = 'Created';
    } else if (changed_fields.length > 0) {
      change_summary = `Updated: ${changed_fields.map(f => f.field).join(', ')}`;
    } else {
      change_summary = 'Updated';
    }

    const entity_title = data.title || data.name || data.destination || entity_id;
    const changed_by = data.created_by || 'system';

    await base44.asServiceRole.entities.VersionHistory.create({
      entity_type,
      entity_id,
      entity_title,
      version_number,
      snapshot: data,
      changed_fields,
      change_summary,
      changed_by,
      change_type
    });

    return Response.json({ success: true, version_number });
  } catch (error) {
    console.error('autoRecordVersion error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});