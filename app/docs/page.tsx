import { redirect } from 'next/navigation';
import Layout from '@/app/components/Layout';
import { getAuthenticatedProfile } from '@/lib/server-profile';
import { listDocArticles } from '@/lib/docs/fetch-articles';
import DocsShell from '@/app/docs/components/DocsShell';
import Link from 'next/link';

export const metadata = {
  title: 'Documentation · NiskBuild',
  description: 'Guides for building, importing, and shipping apps with NiskBuild.',
};

export default async function DocsIndexPage() {
  const { user } = await getAuthenticatedProfile();
  if (!user) redirect('/login?next=/docs');

  const articles = await listDocArticles();
  const featured =
    articles.find((a) => a.slug === 'welcome-to-niskbuild') ?? articles[0] ?? null;

  return (
    <Layout>
      <div className="py-8">
        <DocsShell articles={articles}>
          <header className="mb-8">
            <h1 className="text-3xl font-bold text-[var(--foreground)] mb-2">NiskBuild Documentation</h1>
            <p className="text-nisk-muted leading-relaxed max-w-2xl">
              Step-by-step guides for your plan — building apps, importing from Base44, and
              submitting to the App Store. Use the sidebar to browse, or the <strong>?</strong> icon
              from any page for quick help.
            </p>
          </header>

          {featured ? (
            <section className="rounded-2xl border border-nisk bg-[var(--card-bg)] p-6">
              <p className="text-xs uppercase tracking-wider text-nisk-muted mb-2">{featured.category}</p>
              <h2 className="text-xl font-semibold text-[var(--foreground)] mb-2">{featured.title}</h2>
              <p className="text-sm text-nisk-muted mb-4">
                Start here if you are new to NiskBuild or want a quick orientation.
              </p>
              <Link
                href={`/docs/${featured.slug}`}
                className="inline-flex items-center text-sm font-medium text-[var(--copper-melt)] hover:underline"
              >
                Read guide →
              </Link>
            </section>
          ) : (
            <p className="text-nisk-muted">No articles available yet.</p>
          )}

          <section className="mt-10 grid gap-4 sm:grid-cols-2">
            {articles
              .filter((a) => a.slug !== featured?.slug)
              .slice(0, 6)
              .map((article) => (
                <Link
                  key={article.id}
                  href={`/docs/${article.slug}`}
                  className="rounded-xl border border-nisk bg-[var(--surface)]/40 p-4 hover:border-[var(--copper-primary)]/40 transition-colors"
                >
                  <p className="text-[10px] uppercase tracking-wider text-nisk-muted mb-1">
                    {article.category}
                  </p>
                  <h3 className="font-semibold text-[var(--foreground)]">{article.title}</h3>
                </Link>
              ))}
          </section>
        </DocsShell>
      </div>
    </Layout>
  );
}
