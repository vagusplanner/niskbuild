import Link from 'next/link';
import Layout from '@/app/components/Layout';
import NiskBuildLogo from '@/app/components/NiskBuildLogo';
import BrandAssetCard from '@/app/brand/BrandAssetCard';
import {
  BRAND_ASSET_GROUPS,
  BRAND_PALETTE_SWATCHES,
  BRAND_TAGLINE,
  DOCS_UI_COLORS,
} from '@/lib/brand-assets';

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
            Official NiskBuild logos and colors. App icons use the same cream background as the
            light lockup. Matte iron lockup is lighter so the mark reads on dark UI.
          </p>
          <p className="mt-2 text-sm text-[var(--copper-melt)]">{BRAND_TAGLINE}</p>
        </div>

        <div className="space-y-12">
          {BRAND_ASSET_GROUPS.map((group) => (
            <section key={group.id}>
              <h2 className="text-xl font-semibold text-white mb-1">{group.title}</h2>
              <p className="text-sm text-nisk-muted mb-5">{group.blurb}</p>

              <div className={group.paired ? 'grid gap-4 sm:grid-cols-2 items-stretch' : 'grid gap-4 sm:grid-cols-2'}>
                {group.assets.map((asset) => (
                  <BrandAssetCard key={asset.id} asset={asset} />
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
              <div key={swatch.hex + swatch.name} className="rounded-lg border border-nisk overflow-hidden">
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
              <li>
                Step text →{' '}
                <span style={{ color: DOCS_UI_COLORS.stepText }}>{DOCS_UI_COLORS.stepText}</span>
              </li>
              <li>Links → <span style={{ color: DOCS_UI_COLORS.link }}>{DOCS_UI_COLORS.link}</span></li>
              <li>Background → {DOCS_UI_COLORS.background}</li>
            </ul>
          </div>

          <h3 className="text-sm font-semibold text-white mb-3">Quick picks for social</h3>
          <ul className="text-sm text-nisk-muted space-y-2 list-disc pl-5">
            <li>
              <strong className="text-white font-medium">Profile / favicon:</strong>{' '}
              <Link href="/logo/icon-512.png" download="niskbuild-icon-512.png" className="text-[var(--accent-cyan)] hover:underline">
                512×512 PNG (cream, full bleed)
              </Link>
            </li>
            <li>
              <strong className="text-white font-medium">Light lockup:</strong>{' '}
              <Link href="/logo/niskbuild-lockup-light-raster.png" download="niskbuild-lockup-light.png" className="text-[var(--accent-cyan)] hover:underline">
                Lockup PNG
              </Link>
            </li>
          </ul>
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
