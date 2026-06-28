'use client';

export type AppBuilderPreviewProps = {
  /** Direct Vite/dev-server base URL (e.g. http://localhost:5175) */
  previewUrl?: string;
  /** Route path appended to previewUrl (e.g. /Dashboard) */
  route?: string;
  /** Next.js embed path (e.g. /vagus-planner) — same iframe as app/vagus-planner/page.tsx */
  embedPath?: string;
  previewKey: number;
  appName: string;
  onReload: () => void;
};

function buildPreviewSrc(props: AppBuilderPreviewProps): string {
  if (props.embedPath) {
    const origin =
      typeof window !== 'undefined'
        ? window.location.origin
        : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const route = props.route || '/Dashboard';
    const routeQuery = `&route=${encodeURIComponent(route)}`;
    return `${origin.replace(/\/$/, '')}${props.embedPath}?builder=${props.previewKey}${routeQuery}`;
  }

  const base = (props.previewUrl || '').replace(/\/$/, '');
  const route = props.route || '/Dashboard';
  return `${base}${route}?builder=${props.previewKey}`;
}

export default function AppBuilderPreview(props: AppBuilderPreviewProps) {
  const src = buildPreviewSrc(props);
  const isEmbed = !!props.embedPath;

  return (
    <section className="flex-1 min-w-0 flex flex-col bg-[#060f1e]">
      <div className="shrink-0 flex items-center justify-between px-4 py-2 border-b border-white/10">
        <p className="text-xs uppercase tracking-wider text-white/50 font-semibold">
          Live preview
        </p>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-emerald-400/80 font-mono">
            {isEmbed ? 'VP embed' : 'Vite HMR'}
          </span>
          <button
            type="button"
            onClick={props.onReload}
            className="px-2 py-1 text-xs border border-white/20 text-white/70 hover:text-white hover:border-white/40 transition-colors"
          >
            Reload
          </button>
        </div>
      </div>
      <div className="flex-1 min-h-[320px] relative">
        <iframe
          key={src}
          src={src}
          title={`${props.appName} preview`}
          className="absolute inset-0 w-full h-full border-0 bg-white"
          allow="clipboard-read; clipboard-write; fullscreen"
        />
        <div className="absolute bottom-3 left-3 right-3 pointer-events-none">
          <p className="text-[10px] text-white/40 font-mono truncate">
            {src.replace(/\?builder=\d+$/, '')}
          </p>
        </div>
      </div>
    </section>
  );
}
