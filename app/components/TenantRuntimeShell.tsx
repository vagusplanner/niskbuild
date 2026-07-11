import type { AppType, CompiledApplication } from '@/lib/compiled-applications';
import { runtimeHtmlFromConfig } from '@/lib/compiled-applications';
import type { TenantBrand } from '@/lib/tenant-brand-types';
import {
  hasCustomTenantBranding,
  tenantDisplayName,
} from '@/lib/tenant-brand-types';

type TenantRuntimeShellProps = {
  app: CompiledApplication;
  variant: AppType;
  brand?: TenantBrand | null;
};

function BrandChrome({ brand }: { brand: TenantBrand }) {
  const name = tenantDisplayName(brand, 'App');
  return (
    <header className="shrink-0 h-9 px-3 flex items-center gap-2 border-b border-white/10 bg-[#0B0F19]/90 backdrop-blur-sm">
      {brand.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={brand.logoUrl}
          alt=""
          className="h-5 w-5 rounded object-contain bg-white/5"
        />
      ) : null}
      <span className="text-xs font-medium text-[#E2E8F0] truncate">{name}</span>
    </header>
  );
}

export function TenantRuntimeShell({
  app,
  variant,
  brand = null,
}: TenantRuntimeShellProps) {
  const showBrandChrome = hasCustomTenantBranding(brand);
  const title =
    app.configuration_state?.title ||
    tenantDisplayName(brand, 'App');
  const html = runtimeHtmlFromConfig(app);
  const bundleUrl =
    typeof app.configuration_state?.bundle_url === 'string'
      ? app.configuration_state.bundle_url
      : null;

  const frame = (className: string) => {
    if (html) {
      return (
        <iframe
          srcDoc={html}
          title={title}
          className={className}
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals"
        />
      );
    }
    if (bundleUrl) {
      return (
        <iframe
          src={bundleUrl}
          title={title}
          className={className}
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals"
        />
      );
    }
    return null;
  };

  if (variant === 'webapp') {
    const content = frame(
      showBrandChrome ? 'w-full flex-1 min-h-0 border-0' : 'w-full h-screen border-0'
    );
    if (!content) {
      return (
        <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center text-[#94A3B8] text-sm px-6 text-center">
          Runtime ready — publish your build to activate this domain.
        </div>
      );
    }
    if (showBrandChrome && brand) {
      return (
        <div className="h-screen flex flex-col bg-[#0B0F19]">
          <BrandChrome brand={brand} />
          {content}
        </div>
      );
    }
    return content;
  }

  if (variant === 'mobile') {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex flex-col">
        {showBrandChrome && brand ? <BrandChrome brand={brand} /> : null}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-[390px] aspect-[9/19] rounded-[2.5rem] border border-white/10 bg-black shadow-2xl overflow-hidden">
            {frame('w-full h-full border-0') || (
              <div className="h-full flex items-center justify-center text-[#94A3B8] text-sm px-6 text-center">
                Mobile runtime ready — deploy bundle to go live.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0F19] flex flex-col">
      {showBrandChrome && brand ? <BrandChrome brand={brand} /> : null}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-4xl aspect-video rounded-2xl border border-white/10 bg-black shadow-2xl overflow-hidden">
          {frame('w-full h-full border-0') || (
            <div className="h-full flex items-center justify-center text-[#94A3B8] text-sm px-6 text-center">
              Runtime ready — publish your build to activate this domain.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
