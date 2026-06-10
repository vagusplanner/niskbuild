import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { guardApiRequest } from '@/lib/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';

// Helper: Create anonymous session ID (one-way hash, cannot be reversed)
function createAnonymousId(userId: string | null, sessionId: string): string {
  const combined = `${userId || 'anonymous'}-${sessionId}`;
  return createHash('sha256').update(combined).digest('hex').substring(0, 32);
}

// Helper: Extract features from prompt
function extractFeatures(prompt: string): string[] {
  const features: string[] = [];
  const featureKeywords = [
    'payment', 'auth', 'dashboard', 'chart', 'form', 'map', 
    'calendar', 'booking', 'chat', 'upload', 'search', 'filter', 'notification'
  ];
  
  featureKeywords.forEach(keyword => {
    if (prompt.toLowerCase().includes(keyword)) {
      features.push(keyword);
    }
  });
  
  return features;
}

// Helper: Get region from locale (country only, no city/precise location)
function getRegion(locale: string): string {
  const regionMap: Record<string, string> = {
    'us': 'United States', 'gb': 'United Kingdom', 'ca': 'Canada',
    'au': 'Australia', 'de': 'Germany', 'fr': 'France', 'es': 'Spain',
    'it': 'Italy', 'nl': 'Netherlands', 'br': 'Brazil', 'in': 'India',
    'jp': 'Japan', 'cn': 'China', 'kr': 'South Korea', 'mx': 'Mexico'
  };
  
  const countryCode = locale.split('-')[1]?.toLowerCase() || 'unknown';
  return regionMap[countryCode] || 'Other';
}

// Helper: Differential privacy - flip 4% of boolean values
function applyDifferentialPrivacy(value: boolean): boolean {
  if (Math.random() < 0.04) {
    return !value;
  }
  return value;
}

export async function POST(request: NextRequest) {
  const guard = await guardApiRequest(request, { rateLimit: 30 });
  if (!guard.ok) return guard.response;

  try {
    const body = await request.json();
    const userId = guard.user!.id;
    const {
      sessionId,
      appCategory,
      prompts,
      successCount,
      failCount,
      buildDurationMinutes,
      exportedLocally,
      subscriptionTier,
      locale = 'en-US',
    } = body;

    // Check if telemetry is enabled (sent from frontend)
    if (!body.telemetryEnabled) {
      return NextResponse.json({ message: 'Telemetry disabled, not logging' }, { status: 200 });
    }

    // Create anonymous ID (never store real user ID)
    const anonymousId = createAnonymousId(userId, sessionId);
    
    // Extract features from all prompts combined
    const allPrompts = prompts?.join(' ') || '';
    const featuresList = extractFeatures(allPrompts);
    
    // Get region (country only)
    const region = getRegion(locale);
    
    // Apply differential privacy
    const privateExportedLocally = applyDifferentialPrivacy(exportedLocally);

    const supabase = createAdminClient();
    const { error } = await supabase
      .from('metadata_logs')
      .insert([
        {
          anonymous_id: anonymousId,
          app_category: appCategory || 'unknown',
          features_list: featuresList,
          prompts_count: prompts?.length || 0,
          success_count: successCount || 0,
          fail_count: failCount || 0,
          build_duration: buildDurationMinutes || 0,
          exported_locally: privateExportedLocally,
          subscription_tier: subscriptionTier || 'free',
          region: region,
          created_at: new Date().toISOString(),
        }
      ]);

    if (error) {
      console.error('Supabase insert error:', error);
      return NextResponse.json({ error: 'Failed to log metadata' }, { status: 500 });
    }

    console.log('🔒 Metadata logged anonymously:', {
      anonymous_id: anonymousId.substring(0, 8) + '...',
      app_category: appCategory,
      features: featuresList.length,
      region: region
    });

    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Metadata logging error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}