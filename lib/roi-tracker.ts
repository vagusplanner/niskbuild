/** Benchmark $/1K tokens vs typical cloud-only builders (Bolt, Lovable, v0-class) */
export const BENCHMARK_USD_PER_1K = 0.03;

export const ROI_UPDATE_EVENT = 'niskbuild-roi-update';

export interface DailyRoiStats {
  date: string;
  localTokens: number;
  cloudTokens: number;
  localOps: number;
  cloudOps: number;
  creditsUsed: number;
}

const STORAGE_PREFIX = 'niskbuild_roi_';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function storageKey(userId: string): string {
  return `${STORAGE_PREFIX}${userId}_${today()}`;
}

export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.max(1, Math.ceil(text.length / 4));
}

function emptyStats(): DailyRoiStats {
  return {
    date: today(),
    localTokens: 0,
    cloudTokens: 0,
    localOps: 0,
    cloudOps: 0,
    creditsUsed: 0,
  };
}

export function getDailyRoiStats(userId: string): DailyRoiStats {
  if (typeof window === 'undefined' || !userId) return emptyStats();

  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return emptyStats();
    const parsed = JSON.parse(raw) as DailyRoiStats;
    if (parsed.date !== today()) return emptyStats();
    return parsed;
  } catch {
    return emptyStats();
  }
}

function persist(userId: string, stats: DailyRoiStats) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(storageKey(userId), JSON.stringify(stats));
  window.dispatchEvent(new CustomEvent(ROI_UPDATE_EVENT, { detail: { userId } }));
}

export function recordLocalWork(userId: string, tokens: number) {
  if (!userId || tokens <= 0) return;
  const stats = getDailyRoiStats(userId);
  stats.localTokens += tokens;
  stats.localOps += 1;
  persist(userId, stats);
}

export function recordCloudGeneration(
  userId: string,
  prompt: string,
  code: string,
  creditsUsed = 1
) {
  if (!userId) return;
  const stats = getDailyRoiStats(userId);
  stats.cloudTokens += estimateTokens(prompt) + estimateTokens(code);
  stats.cloudOps += 1;
  stats.creditsUsed += creditsUsed;
  persist(userId, stats);
}

export function recordLocalGeneration(userId: string, prompt: string, code: string) {
  if (!userId) return;
  const stats = getDailyRoiStats(userId);
  const tokens = estimateTokens(prompt) + estimateTokens(code);
  stats.localTokens += tokens;
  stats.localOps += 1;
  persist(userId, stats);
}

export function calculateLocalSavingsUsd(localTokens: number): number {
  return (localTokens / 1000) * BENCHMARK_USD_PER_1K;
}

export function isLocalProvider(provider: string | undefined): boolean {
  return provider === 'local';
}
