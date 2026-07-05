import { createAdminClient } from '@/lib/supabase/admin';

interface PreviewPageProps {
  params: Promise<{ token: string }>;
}

export default async function PreviewPage({ params }: PreviewPageProps) {
  const { token } = await params;
  const supabase = createAdminClient();

  const { data: preview } = await supabase
    .from('previews')
    .select('html_content, is_active, title')
    .eq('token', token)
    .maybeSingle();

  if (!preview || !preview.is_active) {
    const pricingUrl = process.env.NEXT_PUBLIC_APP_URL
      ? `${process.env.NEXT_PUBLIC_APP_URL}/pricing`
      : 'https://niskbuild.com/pricing';

    return (
      <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <div className="text-5xl mb-6 opacity-60">⏱</div>
          <h1 className="text-2xl font-bold text-white mb-3">This preview has expired</h1>
          <p className="text-[#94A3B8] text-sm leading-relaxed mb-8">
            The creator of this app needs an active NiskBuild subscription to share live previews.
            If you are the creator, reactivate your plan to restore this link instantly.
          </p>
          <a
            href={pricingUrl}
            className="inline-block px-6 py-3 rounded-xl bg-gradient-to-r from-[#4F6EF7] to-[#7C3AED] text-white font-semibold text-sm no-underline hover:opacity-90"
          >
            Reactivate NiskBuild
          </a>
        </div>
      </div>
    );
  }

  return (
    <iframe
      srcDoc={preview.html_content}
      title={preview.title || 'NiskBuild Preview'}
      className="w-full h-screen border-0"
      sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals"
    />
  );
}

export async function generateMetadata({ params }: PreviewPageProps) {
  const { token } = await params;
  return {
    title: `Preview · ${token.slice(0, 8)}`,
    robots: 'noindex',
  };
}
