/**
 * Official NiskBuild social profiles (marketing footers).
 * Only include clickable URLs that are live — never placeholder/broken links.
 */

export type SocialNetwork = 'instagram' | 'facebook' | 'linkedin' | 'x';

export type SocialLink = {
  id: SocialNetwork;
  label: string;
  /** Public profile URL, or null when not yet available (do not render as a link). */
  href: string | null;
};

export const NISKBUILD_SOCIAL_LINKS: SocialLink[] = [
  {
    id: 'instagram',
    label: 'Instagram',
    href: 'https://www.instagram.com/niskbuildai/',
  },
  {
    id: 'facebook',
    label: 'Facebook',
    href: 'https://www.facebook.com/profile.php?id=61591778555060',
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    href: 'https://www.linkedin.com/company/niskbuild/',
  },
  // Enable when the X handle is ready — keep out of the UI while href is null.
  {
    id: 'x',
    label: 'X',
    href: null,
  },
];

export type ActiveSocialLink = SocialLink & { href: string };

export function getActiveSocialLinks(): ActiveSocialLink[] {
  return NISKBUILD_SOCIAL_LINKS.filter((l): l is ActiveSocialLink => typeof l.href === 'string');
}
