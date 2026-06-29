import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import Layout from '@/app/components/Layout';
import NiskBuildLogo from '@/app/components/NiskBuildLogo';
import BrandAssetCard from '@/app/brand/BrandAssetCard';
import {
  BRAND_ASSET_GROUPS,
  BRAND_PALETTE_SWATCHES,
  BRAND_TAGLINE,
  DOCS_UI_COLORS,
} from '@/lib/brand-assets';

export default async function BrandPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/brand');
  }

  return (
    <Layout variant="marketing" showFooter={false}>
      <div className="max-w-5xl mx-auto py-10 px-4">
        <header className="text-center mb-10">
          <NiskBuildLogo variant="lockup" size="lg" className="mx-auto mb-5" />
          <p className="inline-block mb-3 rounded-full border border-[var(--copper-primary)]/30 bg-[var(--copper-primary)]/10 px-3 py-1 text-xs font-medium text-[var(--copper-melt)]">
            Logged-in brand kit — official downloads
          </p>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Brand kit</h1>
          <p className="text-nisk-muted max-w-xl mx-auto text-sm">
            Cream icons are full-bleed for favicons. Matte iron icons match the lockup — darker iron
            on a balanced site palette.
          </p>
          <p className="mt-2 text-sm text-[var(--copper-melt)]">{BRAND_TAGLINE}</p>
        </header>

        <div className="space-y-14">
          {BRAND_ASSET_GROUPS.map((group) => (
            <section key={group.id} aria-labelledby={`brand-${group.id}`}>
              <h2 id={`brand-${group.id}`} className="text-xl font-semibold text-white mb-1">
                {group.title}
              </h2>
              <p className="text-sm text-nisk-muted mb-5 max-w-2xl">{group.blurb}</p>

              <div
                className={
                  group.paired
                    ? 'grid gap-4 sm:grid-cols-2 items-stretch'
                    : 'grid gap-4 sm:grid-cols-2 lg:grid-cols-2'
                }
              >
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
            Synced with{' '}
            <Link href="/docs" className="text-[var(--copper-melt)] hover:underline">
              Docs
            </Link>{' '}
            and <code className="text-[var(--copper-light)] text-xs">app/globals.css</code>.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {BRAND_PALETTE_SWATCHES.map((swatch) => (
              <div key={swatch.hex + swatch.name} className="rounded-lg border border-nisk overflow-hidden">
                <div className="h-14" style={{ backgroundColor: swatch.hex }} />
                <div className="px-3 py-2 text-xs">
                  <p className="text-white font-medium">{swatch.name}</p>
                  <p className="text-nisk-muted font-mono mt-0.5">{swatch.hex}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-nisk bg-[var(--surface)]/50 p-4 mt-6">
            <h3 className="text-sm font-semibold text-white mb-2">Docs step text</h3>
            <p className="text-xs font-mono" style={{ color: DOCS_UI_COLORS.stepText }}>
              {DOCS_UI_COLORS.stepText} — muted parchment on lighter iron shell
            </p>
          </div>
        </section>

        <p className="mt-10 text-center text-sm text-nisk-muted">
          <Link href="/dashboard" className="text-[var(--accent-cyan)] hover:underline">
            ← Back to dashboard
          </Link>
        </p>
      </div>
    </Layout>
  );
}
