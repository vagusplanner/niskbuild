import NiskBuildLogo from '@/app/components/NiskBuildLogo';

export default function NodesOfflinePage() {
  const pricingUrl = process.env.NEXT_PUBLIC_APP_URL
    ? `${process.env.NEXT_PUBLIC_APP_URL}/pricing`
    : 'https://www.niskbuild.com/pricing';

  return (
    <div className="min-h-screen bg-[#0B0F19] flex flex-col items-center justify-center px-6">
      <div className="mb-10 opacity-80">
        <NiskBuildLogo />
      </div>
      <div className="max-w-md text-center">
        <div className="text-5xl mb-6 opacity-60">⚡</div>
        <h1 className="text-2xl font-bold text-white mb-3">Nodes offline</h1>
        <p className="text-[#94A3B8] text-sm leading-relaxed mb-8">
          This white-label deployment is suspended because the owner&apos;s NiskBuild
          subscription is inactive. Reactivate the plan to bring this app back online.
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

export const metadata = {
  title: 'Nodes Offline · NiskBuild',
  robots: 'noindex',
};
