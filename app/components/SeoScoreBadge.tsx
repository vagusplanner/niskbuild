import { seoScoreColor } from '@/lib/seo-score';

export default function SeoScoreBadge({ score }: { score: number | null | undefined }) {
  if (score == null || score === 0) {
    return (
      <span
        className="inline-flex items-center justify-center w-7 h-7 rounded-full border border-nisk text-[10px] text-nisk-muted"
        title="SEO not configured"
      >
        —
      </span>
    );
  }

  const color = seoScoreColor(score);
  const ring =
    color === 'green'
      ? 'border-[var(--success)]/50 text-[var(--success)] bg-[var(--success)]/10'
      : color === 'amber'
        ? 'border-amber-400/50 text-amber-400 bg-amber-400/10'
        : 'border-[var(--error)]/50 text-[var(--error)] bg-[var(--error)]/10';

  return (
    <span
      className={`inline-flex items-center justify-center w-7 h-7 rounded-full border text-[10px] font-semibold ${ring}`}
      title={`SEO score: ${score}/100`}
    >
      {score}
    </span>
  );
}
