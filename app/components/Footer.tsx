export default function Footer() {
  return (
    <footer className="border-t border-nisk py-6 text-center text-xs text-nisk-muted">
      <div className="container mx-auto px-4">
        <p>🔒 Fully Local · No Telemetry</p>
        <div className="mt-2 flex justify-center gap-4">
          <a href="/privacy" className="hover:text-[var(--primary)] transition-colors">Privacy Policy</a>
          <a href="/terms" className="hover:text-[var(--primary)] transition-colors">Terms of Service</a>
        </div>
        <p className="mt-2">© 2026 NiskBuild. All rights reserved.</p>
      </div>
    </footer>
  );
}