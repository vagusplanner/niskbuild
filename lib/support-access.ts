import { hasPaidTier } from '@/lib/access';
import { tierAtLeast } from '@/lib/tier-rank';

const TICKET_TIERS = [
  'pro',
  'agency',
  'scale',
  'white_label',
  'team_enterprise',
  'sovereign',
] as const;

export type SupportTicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type SupportCategory =
  | 'general'
  | 'billing'
  | 'technical'
  | 'sales'
  | 'feature'
  | 'bug';

/** Priority tickets — Pro Worker and above (Basic uses contact form only) */
export function canUseSupportTickets(tier: string | null | undefined, status?: string): boolean {
  if (!tier || !hasPaidTier(tier)) return false;
  if (!TICKET_TIERS.includes(tier as (typeof TICKET_TIERS)[number])) return false;
  return tierAtLeast(tier, 'pro') && (status === 'active' || status === undefined);
}

export function statusLabel(status: SupportTicketStatus): string {
  const map: Record<SupportTicketStatus, string> = {
    open: 'Open',
    in_progress: 'In progress',
    resolved: 'Resolved',
    closed: 'Closed',
  };
  return map[status] || status;
}
