import 'server-only';
import { createHash } from 'crypto';

/** Normalize to E.164 digits only (no +) for consistent hashing */
export function normalizePhone(phone: string): string {
  return String(phone || '').replace(/\D/g, '');
}

export function hashPhone(phone: string): string {
  const normalized = normalizePhone(phone);
  return createHash('sha256').update(normalized).digest('hex');
}
