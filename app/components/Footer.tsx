import Link from 'next/link';
import NiskBuildLogo from './NiskBuildLogo';

export default function Footer() {
  return (
    <footer className="border-t border-nisk py-8 text-center">
      <div className="container mx-auto px-4">
        <div className="flex justify-center mb-4">
          <NiskBuildLogo href="/landing" variant="full" size="sm" showTagline />
        </div>
        <p className="text-xs text-nisk-muted mb-3">🔒 Fully Local · No Telemetry</p>
        <div className="flex justify-center flex-wrap gap-4 text-xs text-nisk-muted">
          <Link href="/pricing" className="hover:text-[var(--accent-cyan)] transition-colors">Pricing</Link>
          <Link href="/games" className="hover:text-[var(--accent-cyan)] transition-colors">Games</Link>
          <Link href="/marketplace" className="hover:text-[var(--accent-cyan)] transition-colors">Marketplace</Link>
          <Link href="/dashboard/settings" className="hover:text-[var(--accent-cyan)] transition-colors">Settings</Link>
          <Link href="/privacy" className="hover:text-[var(--accent-cyan)] transition-colors">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-[var(--accent-cyan)] transition-colors">Terms of Service</Link>
        </div>
        <p className="mt-3 text-xs text-nisk-muted">© 2026 NiskBuild. All rights reserved.</p>
      </div>
    </footer>
  );
}
