import type { AppType, CompiledApplication } from '@/lib/compiled-applications';
import { runtimeHtmlFromConfig } from '@/lib/compiled-applications';

type TenantRuntimeShellProps = {
  app: CompiledApplication;
  variant: AppType;
};

export function TenantRuntimeShell({ app, variant }: TenantRuntimeShellProps) {
  const title = app.configuration_state?.title || 'NiskBuild App';
  const html = runtimeHtmlFromConfig(app);
  const bundleUrl =
    typeof app.configuration_state?.bundle_url === 'string'
      ? app.configuration_state.bundle_url
      : null;

  if (variant === 'webapp') {
    if (html) {
      return (
        <iframe
          srcDoc={html}
          title={title}
          className="w-full h-screen border-0"
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals"
        />
      );
    }
    if (bundleUrl) {
      return (
        <iframe
          src={bundleUrl}
          title={title}
          className="w-full h-screen border-0"
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals"
        />
      );
    }
  }

  if (variant === 'mobile') {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center p-6">
        <div className="w-full max-w-[390px] aspect-[9/19] rounded-[2.5rem] border border-white/10 bg-black shadow-2xl overflow-hidden">
          {html ? (
            <iframe
              srcDoc={html}
              title={title}
              className="w-full h-full border-0"
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals"
            />
          ) : bundleUrl ? (
            <iframe
              src={bundleUrl}
              title={title}
              className="w-full h-full border-0"
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals"
            />
          ) : (
            <div className="h-full flex items-center justify-center text-[#94A3B8] text-sm px-6 text-center">
              Mobile runtime ready — deploy bundle to go live.
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center p-6">
      <div className="w-full max-w-4xl aspect-video rounded-2xl border border-white/10 bg-black shadow-2xl overflow-hidden">
        {html ? (
          <iframe
            srcDoc={html}
            title={title}
            className="w-full h-full border-0"
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals"
          />
        ) : bundleUrl ? (
          <iframe
            src={bundleUrl}
            title={title}
            className="w-full h-full border-0"
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals"
          />
        ) : (
          <div className="h-full flex items-center justify-center text-[#94A3B8] text-sm px-6 text-center">
            Game runtime ready — publish your build to activate this domain.
          </div>
        )}
      </div>
    </div>
  );
}
