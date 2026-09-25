'use client';

import type { ComponentBlueprint } from '@/lib/blueprint-schema';
import type { ProjectSeoSettings } from '@/lib/seo-types';
import SeoPanel from '@/app/components/SeoPanel';
import IntegrationsPanel from '@/app/components/IntegrationsPanel';
import BuilderOllamaSettings, { BuilderOllamaLockedHint } from '@/app/components/BuilderOllamaSettings';
import RoiTracker from '@/app/components/RoiTracker';
import FullAppBackendPanel from '@/app/components/FullAppBackendPanel';
import type { FullAppBackendConfig } from '@/lib/full-app-backend';

export type ProjectSettingsTab =
  | 'seo'
  | 'integrations'
  | 'blueprint'
  | 'ai'
  | 'credits'
  | 'backend';

const TABS: {
  id: ProjectSettingsTab;
  label: string;
  icon: string;
  /** false = not meaningful for Full App React projects yet */
  fullAppReady: boolean;
  /** Only show this tab in Full App mode */
  fullAppOnly?: boolean;
}[] = [
  { id: 'backend', label: 'Backend', icon: '🗄️', fullAppReady: true, fullAppOnly: true },
  { id: 'seo', label: 'SEO', icon: '🔍', fullAppReady: false },
  { id: 'integrations', label: 'Integrations', icon: '🔌', fullAppReady: false },
  { id: 'blueprint', label: 'Blueprint', icon: '📋', fullAppReady: false },
  { id: 'ai', label: 'AI / Ollama', icon: '🤖', fullAppReady: true },
  { id: 'credits', label: 'Credits / ROI', icon: '📊', fullAppReady: true },
];

type BuilderProjectSettingsDrawerProps = {
  open: boolean;
  tab: ProjectSettingsTab;
  onTabChange: (tab: ProjectSettingsTab) => void;
  onClose: () => void;
  blueprintData: ComponentBlueprint | null;
  subscriptionTier: string;
  subscriptionStatus: string;
  useLocalOllama: boolean;
  onUseLocalOllamaChange: (enabled: boolean) => void;
  onOllamaUpgrade: () => void;
  userId?: string;
  canUseLocalOllama: boolean;
  seoSettings: ProjectSeoSettings;
  onSeoChange: (settings: ProjectSeoSettings) => void;
  activeProjectId: string | null;
  onSaveSeo: () => Promise<void>;
  onGenerateSeo: () => Promise<void>;
  seoSaving: boolean;
  seoGenerating: boolean;
  seoMessage?: string;
  generatedCode: string;
  onIntegrationAdded: (code: string, message: string, creditsRemaining?: number) => void;
  onIntegrationStatus?: (message: string) => void;
  outputMode?: 'simple' | 'full-app';
  onFullAppBackendChange?: (config: FullAppBackendConfig | null) => void;
};

function FullAppLimitedNotice({ feature }: { feature: string }) {
  return (
    <div className="m-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <p className="text-sm font-medium text-[var(--foreground)] mb-1">
        {feature} isn’t wired for Full App yet
      </p>
      <p className="text-xs text-nisk-muted leading-relaxed">
        This control was built for Simple (HTML) projects. Full App React projects use{' '}
        <code className="text-[10px]">src/</code> files and client routing — {feature.toLowerCase()}{' '}
        will return here once that path is supported. Use the file tree / Code panel to edit source
        for now.
      </p>
    </div>
  );
}

export default function BuilderProjectSettingsDrawer({
  open,
  tab,
  onTabChange,
  onClose,
  blueprintData,
  subscriptionTier,
  subscriptionStatus,
  useLocalOllama,
  onUseLocalOllamaChange,
  onOllamaUpgrade,
  userId,
  canUseLocalOllama,
  seoSettings,
  onSeoChange,
  activeProjectId,
  onSaveSeo,
  onGenerateSeo,
  seoSaving,
  seoGenerating,
  seoMessage,
  generatedCode,
  onIntegrationAdded,
  onIntegrationStatus,
  outputMode = 'simple',
  onFullAppBackendChange,
}: BuilderProjectSettingsDrawerProps) {
  if (!open) return null;

  const isFullApp = outputMode === 'full-app';
  const visibleTabs = TABS.filter((t) => (isFullApp ? true : !t.fullAppOnly));
  const activeTabMeta = visibleTabs.find((t) => t.id === tab) ?? visibleTabs[0];
  const tabLimited = isFullApp && activeTabMeta && !activeTabMeta.fullAppReady;

  return (
    <div className="fixed inset-0 z-[80] flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"
        aria-label="Close project settings"
        onClick={onClose}
      />
      <aside
        className="relative z-10 flex h-full w-full max-w-lg flex-col border-l border-nisk bg-[var(--card-bg)] shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Project settings"
      >
        <div className="flex items-center justify-between gap-2 border-b border-nisk px-4 py-3 shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-[var(--foreground)]">Project settings</h2>
            <p className="text-[10px] text-nisk-muted">
              {isFullApp
                ? 'Full App — Backend, AI, and credits; SEO / HTML integrations later'
                : 'SEO, integrations, blueprint, and AI'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-nisk-muted hover:text-[var(--foreground)] hover:bg-[var(--surface-elevated)]"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="flex gap-1 overflow-x-auto border-b border-nisk px-3 py-2 shrink-0">
          {visibleTabs.map((t) => {
            const limited = isFullApp && !t.fullAppReady;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onTabChange(t.id)}
                className={`shrink-0 rounded-lg px-2.5 py-1.5 text-xs transition-colors ${
                  tab === t.id
                    ? 'bg-[var(--primary)]/20 text-[var(--primary)]'
                    : limited
                      ? 'text-nisk-muted/70 hover:text-nisk-muted'
                      : 'text-nisk-muted hover:text-[var(--foreground)]'
                }`}
                title={limited ? `${t.label} — not available for Full App yet` : t.label}
              >
                {t.icon} {t.label}
                {limited ? ' · soon' : ''}
              </button>
            );
          })}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          {tab === 'backend' && isFullApp ? (
            <FullAppBackendPanel
              projectId={activeProjectId}
              onBackendChange={(cfg) => onFullAppBackendChange?.(cfg)}
            />
          ) : null}

          {tabLimited ? (
            <FullAppLimitedNotice
              feature={
                tab === 'seo'
                  ? 'SEO'
                  : tab === 'integrations'
                    ? 'Integrations'
                    : 'Blueprint'
              }
            />
          ) : null}

          {tab === 'seo' && !tabLimited && (
            <SeoPanel
              settings={seoSettings}
              onChange={onSeoChange}
              subscriptionTier={subscriptionTier}
              subscriptionStatus={subscriptionStatus}
              activeProjectId={activeProjectId}
              onSave={onSaveSeo}
              onGenerateAi={onGenerateSeo}
              saving={seoSaving}
              generating={seoGenerating}
              message={seoMessage}
            />
          )}

          {tab === 'integrations' && !tabLimited && (
            <div className="p-4">
              <IntegrationsPanel
                projectId={activeProjectId}
                subscriptionTier={subscriptionTier}
                subscriptionStatus={subscriptionStatus}
                currentCode={generatedCode}
                onIntegrationAdded={onIntegrationAdded}
                onStatusMessage={onIntegrationStatus}
              />
            </div>
          )}

          {tab === 'blueprint' && !tabLimited && (
            <div className="p-4">
              {blueprintData ? (
                <pre className="text-xs font-mono text-gray-300 whitespace-pre-wrap">
                  {JSON.stringify(blueprintData, null, 2)}
                </pre>
              ) : (
                <p className="text-sm text-nisk-muted text-center mt-8">
                  Generate an app to see its blueprint structure here.
                </p>
              )}
            </div>
          )}

          {tab === 'ai' && (
            <div className="p-4 space-y-4">
              <p className="text-xs text-nisk-muted">
                Local Ollama and AI provider preferences for this builder session.
              </p>
              {canUseLocalOllama ? (
                <BuilderOllamaSettings
                  tier={subscriptionTier}
                  useLocalOllama={useLocalOllama}
                  onUseLocalOllamaChange={onUseLocalOllamaChange}
                />
              ) : (
                <BuilderOllamaLockedHint onUpgradeClick={onOllamaUpgrade} />
              )}
            </div>
          )}

          {tab === 'credits' && (
            <div className="p-4 space-y-3">
              <p className="text-xs text-nisk-muted">
                Credit usage and estimated build ROI for your account.
              </p>
              <RoiTracker userId={userId} />
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
