export function scorePassword(password: string): number {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return Math.min(score, 4);
}

export function passwordStrengthLabel(score: number): string {
  if (score <= 1) return 'Weak';
  if (score === 2) return 'Fair';
  if (score === 3) return 'Good';
  return 'Strong';
}

export function passwordStrengthColor(score: number): string {
  if (score <= 1) return 'bg-[var(--error)]';
  if (score === 2) return 'bg-amber-400';
  if (score === 3) return 'bg-[var(--accent-cyan)]';
  return 'bg-[var(--success)]';
}

export function validatePassword(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (!/[0-9]/.test(password)) return 'Password must include at least one number';
  if (!/[A-Z]/.test(password)) return 'Password must include at least one uppercase letter';
  return null;
}
