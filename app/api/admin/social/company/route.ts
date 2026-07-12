import { NextRequest, NextResponse } from 'next/server';
import { requirePlatformOwner } from '@/lib/platform-owner-auth';
import { apiErrorResponse } from '@/lib/api-error';
import {
  isBufferPersonalConfigured,
  listAllBufferChannels,
  BufferPersonalApiError,
} from '@/lib/buffer-personal/graphql-client';
import {
  REMINDER_DAYS,
  daysSince,
  getLastCompanyPostAt,
  listCompanyDrafts,
  serviceToPlatformKey,
} from '@/lib/buffer-personal/company-posts';

export async function GET(request: NextRequest) {
  const owner = await requirePlatformOwner(request);
  if (!owner.ok) return owner.response;

  try {
    const configured = isBufferPersonalConfigured();
    const lastCompanyPostAt = await getLastCompanyPostAt();
    const days = daysSince(lastCompanyPostAt);
    const needsReminder = days === null || days >= REMINDER_DAYS;

    let channels: Array<{
      id: string;
      name: string;
      displayName: string | null;
      service: string;
      platform: string | null;
      organizationId: string;
      organizationName: string;
      isQueuePaused: boolean;
    }> = [];
    let channelsError: string | null = null;

    if (configured) {
      try {
        const listed = await listAllBufferChannels();
        channels = listed.map((c) => ({
          id: c.id,
          name: c.name,
          displayName: c.displayName,
          service: c.service,
          platform: serviceToPlatformKey(c.service),
          organizationId: c.organizationId,
          organizationName: c.organizationName,
          isQueuePaused: c.isQueuePaused,
        }));
      } catch (err) {
        channelsError =
          err instanceof BufferPersonalApiError || err instanceof Error
            ? err.message
            : 'Failed to list Buffer channels';
      }
    }

    const drafts = await listCompanyDrafts();

    return NextResponse.json({
      configured,
      reminderDays: REMINDER_DAYS,
      lastCompanyPostAt,
      daysSinceLastPost: days,
      needsReminder,
      reminderMessage: needsReminder
        ? days === null
          ? `No company posts recorded yet — generate drafts and publish when ready.`
          : `You haven't posted in ${days} days — time to share something from NiskBuild.`
        : null,
      channels,
      channelsError,
      drafts,
    });
  } catch (error) {
    return apiErrorResponse(error, 'Failed to load company social');
  }
}
