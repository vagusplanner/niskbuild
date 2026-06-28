import { notFound, redirect } from 'next/navigation';
import Layout from '@/app/components/Layout';
import DocsShell from '@/app/docs/components/DocsShell';
import DocsMarkdown from '@/app/docs/components/DocsMarkdown';
import DocsFeedback from '@/app/docs/components/DocsFeedback';
import { getAuthenticatedProfile } from '@/lib/server-profile';
import {
  getDocArticleBySlug,
  getUserDocTier,
  listDocArticles,
} from '@/lib/docs/fetch-articles';
import { articleVisibleToUser } from '@/lib/docs/utils';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const article = await getDocArticleBySlug(slug);
  if (!article) return { title: 'Not found · NiskBuild Docs' };
  return {
    title: `${article.title} · NiskBuild Docs`,
    description: article.title,
  };
}

export default async function DocArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const { user } = await getAuthenticatedProfile();
  if (!user) redirect(`/login?next=/docs/${slug}`);

  const [article, articles, tier] = await Promise.all([
    getDocArticleBySlug(slug),
    listDocArticles(),
    getUserDocTier(),
  ]);

  if (!article) notFound();

  if (!articleVisibleToUser(article, tier)) {
    notFound();
  }

  const updated = new Date(article.updated_at).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Layout>
      <div className="py-8">
        <DocsShell articles={articles} currentSlug={slug}>
          <article>
            <p className="text-xs uppercase tracking-wider text-nisk-muted mb-2">{article.category}</p>
            <h1 className="text-3xl font-bold text-[var(--foreground)] mb-2">{article.title}</h1>
            <p className="text-xs text-nisk-muted mb-6">Updated {updated}</p>
            <DocsMarkdown content={article.content} />
            {!article.id.startsWith('seed-') && <DocsFeedback articleId={article.id} />}
          </article>
        </DocsShell>
      </div>
    </Layout>
  );
}
