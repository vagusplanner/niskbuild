export function planDisplayName(tier: string): string {
  const map: Record<string, string> = {
    free: 'Sandbox',
    basic: 'Basic',
    pro: 'Pro Worker',
    agency: 'Agency Studio',
    scale: 'Scale Team',
    white_label: 'White-Label',
    team_enterprise: 'Team Enterprise',
    sovereign: 'Sovereign',
  };
  return map[tier] || tier.charAt(0).toUpperCase() + tier.slice(1);
}

export function planBadgeClass(tier: string): string {
  if (tier === 'free') return 'bg-nisk-surface text-nisk-muted border-nisk';
  if (tier === 'basic') return 'bg-slate-500/15 text-slate-300 border-slate-500/30';
  if (tier === 'pro') return 'bg-[var(--primary)]/15 text-[var(--primary)] border-[var(--primary)]/30';
  if (tier === 'agency' || tier === 'scale')
    return 'bg-[var(--accent-cyan)]/10 text-[var(--accent-cyan)] border-[var(--accent-cyan)]/30';
  return 'bg-[var(--secondary)]/15 text-[var(--secondary)] border-[var(--secondary)]/30';
}
