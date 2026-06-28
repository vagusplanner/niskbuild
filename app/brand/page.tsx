import Link from 'next/link';
import Layout from '@/app/components/Layout';
import NiskBuildLogo from '@/app/components/NiskBuildLogo';
import {
  BRAND_ASSET_GROUPS,
  BRAND_PALETTE_SWATCHES,
  BRAND_TAGLINE,
  DOCS_UI_COLORS,
} from '@/lib/brand-assets';

function DownloadLink({
  href,
  filename,
  label,
  primary = false,
}: {
  href: string;
  filename: string;
  label: string;
  primary?: boolean;
}) {
  const isApi = href.startsWith('/api/');
  return (
    <a
      href={href}
      {...(!isApi ? { download: filename } : {})}
      className={
        primary
          ? 'inline-flex items-center gap-2 rounded-lg border border-[var(--copper-primary)]/40 bg-[var(--copper-primary)]/10 px-4 py-2 text-sm font-semibold text-[var(--copper-melt)] hover:bg-[var(--copper-primary)]/20 transition-colors'
          : 'inline-flex items-center gap-2 rounded-lg border border-nisk px-4 py-2 text-sm font-medium text-nisk-muted hover:text-white hover:border-[var(--copper-primary)]/30 transition-colors'
      }
    >
      <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
        />
      </svg>
      {label}
    </a>
  );
}

function pdfApiId(assetId: string): string {
  if (assetId === 'icon-small') return 'icon';
  if (assetId === 'lockup-light') return 'lockup';
  return assetId;
}

export default function BrandPage() {
  return (
    <Layout variant="marketing" showFooter={false}>
      <div className="max-w-5xl mx-auto py-10">
        <div className="text-center mb-10">
          <NiskBuildLogo variant="lockup" size="xl" className="mx-auto mb-6" />
          <p className="inline-block mb-4 rounded-full border border-[var(--copper-primary)]/30 bg-[var(--copper-primary)]/10 px-3 py-1 text-xs font-medium text-[var(--copper-melt)]">
            Public page — no login required
          </p>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">Brand kit</h1>
          <p className="text-nisk-muted max-w-xl mx-auto">
            Official NiskBuild logos and colors. Download PDF for print and design tools, or PNG
            for social profile photos. Same copper palette as the app and Docs.
          </p>
          <p className="mt-2 text-sm text-[var(--copper-melt)]">{BRAND_TAGLINE}</p>
        </div>

        <div className="space-y-12">
          {BRAND_ASSET_GROUPS.map((group) => (
            <section key={group.id}>
              <h2 className="text-xl font-semibold text-white mb-1">{group.title}</h2>
              <p className="text-sm text-nisk-muted mb-5">{group.blurb}</p>

              <div className="grid gap-4 sm:grid-cols-2">
                {group.assets.map((asset) => (
                  <article
                    key={asset.id}
                    className="glass-panel rounded-2xl border border-nisk p-5 flex flex-col gap-4"
                  >
                    <div
                      className="flex items-center justify-center rounded-xl border border-nisk min-h-[140px] p-4"
                      style={{
                        backgroundColor:
                          asset.previewBg === 'light' ? '#f5ebe0' : DOCS_UI_COLORS.background,
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={asset.previewSrc}
                        alt={asset.label}
                        className="max-h-28 max-w-full object-contain"
                      />
                    </div>

                    <div className="flex-1">
                      <h3 className="font-semibold text-white mb-1">{asset.label}</h3>
                      <p className="text-sm text-nisk-muted mb-1">{asset.description}</p>
                      <p className="text-xs text-[var(--copper-melt)]/80">{asset.useCase}</p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <DownloadLink
                        href={`/api/brand/download/${pdfApiId(asset.id)}`}
                        filename={asset.pdfFilename}
                        label="Download PDF"
                        primary
                      />
                      <DownloadLink
                        href={asset.pngHref}
                        filename={asset.pngFilename}
                        label={
                          asset.pngWidth
                            ? `PNG ${asset.pngWidth}×${asset.pngHeight}`
                            : 'Download PNG'
                        }
                      />
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>

        <section className="mt-14 glass-panel rounded-2xl border border-nisk p-6">
          <h2 className="text-lg font-semibold text-white mb-2">Brand colors</h2>
          <p className="text-sm text-nisk-muted mb-5">
            These match the <Link href="/docs" className="text-[var(--copper-melt)] hover:underline">Docs</Link>{' '}
            page and the rest of the app — defined in{' '}
            <code className="text-[var(--copper-light)] text-xs">app/globals.css</code> as CSS
            variables (Forged Iron &amp; Melted Copper).
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
            {BRAND_PALETTE_SWATCHES.map((swatch) => (
              <div key={swatch.hex} className="rounded-lg border border-nisk overflow-hidden">
                <div className="h-14" style={{ backgroundColor: swatch.hex }} />
                <div className="px-3 py-2 text-xs">
                  <p className="text-white font-medium">{swatch.name}</p>
                  <p className="text-nisk-muted font-mono mt-0.5">{swatch.hex}</p>
                  <p className="text-nisk-muted mt-1">{swatch.token}</p>
                  <p className="text-[var(--copper-melt)]/70 mt-1">{swatch.usage}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-nisk bg-[var(--surface)]/50 p-4 mb-6">
            <h3 className="text-sm font-semibold text-white mb-2">Docs page uses</h3>
            <ul className="text-xs text-nisk-muted space-y-1 font-mono">
              <li>Links → <span style={{ color: DOCS_UI_COLORS.link }}>{DOCS_UI_COLORS.link}</span> (copper melt)</li>
              <li>Body text → {DOCS_UI_COLORS.muted} (muted parchment)</li>
              <li>Headings → {DOCS_UI_COLORS.foreground} (parchment)</li>
              <li>Code accents → {DOCS_UI_COLORS.code} (copper light)</li>
              <li>Background → {DOCS_UI_COLORS.background} (forge dark)</li>
            </ul>
          </div>

          <h3 className="text-sm font-semibold text-white mb-3">Quick picks for social</h3>
          <ul className="text-sm text-nisk-muted space-y-2 list-disc pl-5">
            <li>
              <strong className="text-white font-medium">Profile photo / Google favicon:</strong>{' '}
              <Link href="/api/brand/download/icon" className="text-[var(--accent-cyan)] hover:underline">
                Icon PDF
              </Link>
              {' · '}
              <Link href="/logo/icon-512.png" download="niskbuild-icon-512.png" className="text-[var(--accent-cyan)] hover:underline">
                512×512 PNG
              </Link>
            </li>
            <li>
              <strong className="text-white font-medium">Instagram / LinkedIn post:</strong>{' '}
              <Link href="/api/brand/download/lockup" className="text-[var(--accent-cyan)] hover:underline">
                Lockup PDF
              </Link>
              {' · '}
              <Link href="/logo/niskbuild-lockup-brand.png" download="niskbuild-lockup.png" className="text-[var(--accent-cyan)] hover:underline">
                Lockup PNG
              </Link>
            </li>
            <li>
              <strong className="text-white font-medium">Watermark / footer:</strong>{' '}
              <Link href="/api/brand/download/wordmark" className="text-[var(--accent-cyan)] hover:underline">
                Wordmark PDF
              </Link>
            </li>
          </ul>
          <p className="mt-4 text-xs text-nisk-muted">
            Google may take days to refresh the search favicon after deploy. Use Search Console → URL
            inspection → Request indexing on your homepage if the old blue icon still appears.
          </p>
        </section>

        <p className="mt-10 text-center text-sm text-nisk-muted">
          <Link href="/landing" className="text-[var(--accent-cyan)] hover:underline">
            ← Back to home
          </Link>
        </p>
      </div>
    </Layout>
  );
}
