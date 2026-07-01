import { NextRequest, NextResponse } from 'next/server';
import { guardApiRequest } from '@/lib/api-auth';
import { resolveBuilderApp } from '@/lib/builder-apps/handlers';
import { formatVpAuditReport, runVpAppStoreAudit } from '@/lib/vp-app-store-audit';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const guard = await guardApiRequest(request, { rateLimit: 12 });
  if (!guard.ok) return guard.response;

  const { id: appId } = await context.params;
  const app = resolveBuilderApp(appId);
  if (!app || appId !== 'vagus-planner') {
    return NextResponse.json({ error: 'Audit only available for Vagus Planner' }, { status: 404 });
  }

  const audit = await runVpAppStoreAudit(guard.user!.id);
  return NextResponse.json({
    success: true,
    report: formatVpAuditReport(audit),
    audit,
  });
}
