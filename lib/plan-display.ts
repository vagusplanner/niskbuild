export function planDisplayName(tier: string): string {
  const map: Record<string, string> = {
    free: 'Sandbox',
    pro: 'Pro',
    agency: 'Agency',
    scale: 'Scale',
    white_label: 'White-Label',
    team_enterprise: 'Enterprise',
    sovereign: 'Sovereign',
  };
  return map[tier] || tier.charAt(0).toUpperCase() + tier.slice(1);
}

export function planBadgeClass(tier: string): string {
  if (tier === 'free') return 'bg-nisk-surface text-nisk-muted border-nisk';
  if (tier === 'pro') return 'bg-[var(--primary)]/15 text-[var(--primary)] border-[var(--primary)]/30';
  if (tier === 'agency' || tier === 'scale')
    return 'bg-[var(--accent-cyan)]/10 text-[var(--accent-cyan)] border-[var(--accent-cyan)]/30';
  return 'bg-[var(--secondary)]/15 text-[var(--secondary)] border-[var(--secondary)]/30';
}
