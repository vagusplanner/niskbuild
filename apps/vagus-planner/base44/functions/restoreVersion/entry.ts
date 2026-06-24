import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { version_id } = body;

    if (!version_id) {
      return Response.json({ error: 'version_id is required' }, { status: 400 });
    }

    // Fetch the version to restore
    const versions = await base44.asServiceRole.entities.VersionHistory.filter({ id: version_id });
    if (!versions.length) {
      return Response.json({ error: 'Version not found' }, { status: 404 });
    }

    const version = versions[0];
    const { entity_type, entity_id, snapshot, version_number } = version;

    // Get current entity data first (to record as a new version before restoring)
    const entityModule = base44.asServiceRole.entities[entity_type];
    if (!entityModule) {
      return Response.json({ error: `Unknown entity type: ${entity_type}` }, { status: 400 });
    }

    const currentItems = await entityModule.filter({ id: entity_id });
    const currentData = currentItems[0] || null;

    // Strip system fields from snapshot before restoring
    const { id, created_date, updated_date, created_by, ...restoreData } = snapshot;

    // Update the entity with the snapshot data
    await entityModule.update(entity_id, restoreData);

    // Record the restore as a new version
    const existing = await base44.asServiceRole.entities.VersionHistory.filter({
      entity_type,
      entity_id
    }, '-version_number', 1);
    const new_version_number = existing.length > 0 ? (existing[0].version_number + 1) : 1;

    await base44.asServiceRole.entities.VersionHistory.create({
      entity_type,
      entity_id,
      entity_title: snapshot.title || snapshot.name || snapshot.destination || entity_id,
      version_number: new_version_number,
      snapshot: restoreData,
      changed_fields: [],
      change_summary: `Restored to version ${version_number}`,
      changed_by: user.email,
      change_type: 'restore'
    });

    return Response.json({ success: true, restored_version: version_number });
  } catch (error) {
    console.error('restoreVersion error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});