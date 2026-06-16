import Link from 'next/link';
import NiskBuildLogo from './NiskBuildLogo';
import { FOOTER_LINKS } from '@/lib/landing-nav';

export default function Footer() {
  return (
    <footer className="border-t border-[var(--border)] py-8 text-center glass-panel rounded-t-2xl mt-8">
      <div className="container mx-auto px-4">
        <div className="flex justify-center mb-4">
          <NiskBuildLogo href="/landing" variant="full" size="sm" showTagline />
        </div>
        <p className="text-xs text-nisk-muted mb-3">Fully local export · You own the code</p>
        <div className="flex justify-center flex-wrap gap-4 text-xs text-nisk-muted">
          {FOOTER_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="hover:text-[var(--accent-cyan)] transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>
        <p className="mt-3 text-xs text-nisk-muted">© 2026 NiskBuild. All rights reserved.</p>
      </div>
    </footer>
  );
}
