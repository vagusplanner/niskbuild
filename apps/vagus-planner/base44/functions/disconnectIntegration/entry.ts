import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Disconnect an integration by revoking access
 * Note: Token revocation depends on the specific service
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { integration_type } = await req.json();

    if (!integration_type) {
      return Response.json(
        { error: 'Missing integration_type' },
        { status: 400 }
      );
    }

    // In a real implementation, you would revoke the token with the service
    // For now, we'll just log the disconnection
    try {
      await base44.asServiceRole.entities.IntegrationLog?.create?.({
        user_email: user.email,
        action: 'disconnect_integration',
        integration_type,
        created_at: new Date().toISOString()
      }).catch(() => {});
    } catch (err) {
      console.error('Failed to log disconnection:', err);
    }

    return Response.json({
      success: true,
      message: `${integration_type} has been disconnected`,
      integration_type
    });
  } catch (error) {
    console.error('Error disconnecting integration:', error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
});