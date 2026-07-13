import type { SocialNetwork } from '@/lib/social-links';
import { getActiveSocialLinks } from '@/lib/social-links';

/** Simple brand marks — lucide-react no longer ships trademarked social icons. */
function SocialIcon({ network, className }: { network: SocialNetwork; className?: string }) {
  const common = {
    className,
    viewBox: '0 0 24 24',
    fill: 'currentColor',
    'aria-hidden': true as const,
  };

  switch (network) {
    case 'instagram':
      return (
        <svg {...common}>
          <path d="M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4Zm10 2H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Zm-5 3.25A3.75 3.75 0 1 1 8.25 12 3.75 3.75 0 0 1 12 8.25Zm0 2A1.75 1.75 0 1 0 13.75 12 1.75 1.75 0 0 0 12 10.25ZM16.7 7a1 1 0 1 1-1 1 1 1 0 0 1 1-1Z" />
        </svg>
      );
    case 'facebook':
      return (
        <svg {...common}>
          <path d="M14.5 3h-5A4.5 4.5 0 0 0 5 7.5v5A4.5 4.5 0 0 0 9.5 17H11v-4.2H9.4V11H11V9.7c0-1.7 1-2.6 2.5-2.6.7 0 1.4.1 1.4.1v1.7h-.8c-.8 0-1 .4-1 1V11h1.8l-.3 1.8H13.1V17h1.4A4.5 4.5 0 0 0 19 12.5v-5A4.5 4.5 0 0 0 14.5 3Z" />
        </svg>
      );
    case 'linkedin':
      return (
        <svg {...common}>
          <path d="M6.3 9.2H3.6V20h2.7V9.2ZM4.95 4A1.7 1.7 0 1 0 5 7.4 1.7 1.7 0 0 0 4.95 4ZM20.4 13.1c0-3-1.6-4.9-4.1-4.9-1.9 0-2.8 1-3.3 1.7V9.2h-2.7c0 .7 0 10.8 0 10.8h2.7v-6c0-.3 0-.7.1-1 .3-.7.9-1.5 2-1.5 1.4 0 2 1.1 2 2.6V20h2.7v-6.9Z" />
        </svg>
      );
    case 'x':
      // Kept for when href is set in lib/social-links.ts — not rendered while inactive.
      return (
        <svg {...common}>
          <path d="M17.6 4h2.3l-5 5.7L21 20h-5.5l-3.6-4.7L7.2 20H4.9l5.4-6.1L3.4 4h5.6l3.2 4.3L17.6 4Zm-.8 14.4h1.3L7.7 5.5H6.3l10.5 12.9Z" />
        </svg>
      );
    default:
      return null;
  }
}

type FollowUsLinksProps = {
  /** Extra classes on the outer wrapper */
  className?: string;
  /** Heading size / emphasis for denser footers */
  compact?: boolean;
};

/**
 * Marketing "Follow us" links — only networks with a confirmed live URL.
 */
export default function FollowUsLinks({ className = '', compact = false }: FollowUsLinksProps) {
  const links = getActiveSocialLinks();
  if (links.length === 0) return null;

  return (
    <div className={className}>
      <p
        className={`font-semibold uppercase tracking-[0.14em] text-[var(--copper-melt)] ${
          compact ? 'text-[10px] mb-2' : 'text-xs mb-3'
        }`}
      >
        Follow us
      </p>
      <ul className="flex flex-wrap items-center justify-center gap-3">
        {links.map((link) => (
          <li key={link.id}>
            <a
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${link.label} (opens in a new tab)`}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--iron-mid)]/40 text-[var(--copper-melt)] transition-colors hover:border-[var(--copper-primary)]/45 hover:bg-[var(--copper-primary)]/10 hover:text-[var(--copper-light)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--copper-primary)]"
            >
              <SocialIcon network={link.id} className="h-4 w-4" />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
