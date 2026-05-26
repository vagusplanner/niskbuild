import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';

// In-memory storage for development
let structuralLogs: any[] = [];

export async function POST(request: NextRequest) {
  try {
    const { templateId, success, stepsCount, durationSeconds, integrations } = await request.json();

    // Create anonymous user ID (hashed, not reversible)
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const anonymousId = createHash('sha256').update(`${ip}${userAgent}`).digest('hex').substring(0, 16);

    // Create the structural log (NO user code, NO prompts)
    const structuralLog = {
      id: Date.now(),
      anonymous_id: anonymousId,
      template_id: templateId || 'custom',
      success: success,
      steps_count: stepsCount,
      duration_seconds: durationSeconds,
      integrations: integrations || [],
      timestamp: new Date().toISOString(),
    };

    // Store the log
    structuralLogs.push(structuralLog);

    // Keep only last 10,000 logs
    if (structuralLogs.length > 10000) {
      structuralLogs = structuralLogs.slice(-10000);
    }

    console.log('🔒 PRIVACY DEPLOYMENT SECURED:', { 
      status: "secured", 
      message: "NiskBuild structural log stored locally.",
      log_count: structuralLogs.length 
    });

    return NextResponse.json({ 
      success: true, 
      message: "Structural data logged anonymously",
    });
    
  } catch (error) {
    console.error('Logging error:', error);
    return NextResponse.json(
      { error: 'Failed to log structural data' },
      { status: 500 }
    );
  }
}

// GET endpoint for admin insights
export async function GET(request: NextRequest) {
  const totalBuilds = structuralLogs.length;
  const successfulBuilds = structuralLogs.filter(l => l.success).length;
  const successRate = totalBuilds > 0 ? (successfulBuilds / totalBuilds * 100).toFixed(1) : 0;
  
  // Count by template
  const templateCounts: Record<string, number> = {};
  structuralLogs.forEach(log => {
    templateCounts[log.template_id] = (templateCounts[log.template_id] || 0) + 1;
  });
  
  // Most popular integrations
  const integrationCounts: Record<string, number> = {};
  structuralLogs.forEach(log => {
    log.integrations?.forEach((int: string) => {
      integrationCounts[int] = (integrationCounts[int] || 0) + 1;
    });
  });

  return NextResponse.json({
    total_builds: totalBuilds,
    success_rate: `${successRate}%`,
    top_templates: Object.entries(templateCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count })),
    top_integrations: Object.entries(integrationCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count })),
  });
}