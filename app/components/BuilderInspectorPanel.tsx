"use client";

import type { ReactNode } from 'react';
import type { ComponentBlueprint } from '@/lib/blueprint-schema';
import type { ProjectFile } from '@/lib/project-files';
import type { SelectedVisualElement, StyleChanges } from '@/lib/visual-editor-types';
import FileTree from '@/app/components/FileTree';
import StylePanel from '@/app/components/StylePanel';
import SeoPanel from '@/app/components/SeoPanel';
import IntegrationsPanel from '@/app/components/IntegrationsPanel';
import BuilderOllamaSettings, { BuilderOllamaLockedHint } from '@/app/components/BuilderOllamaSettings';
import RoiTracker from '@/app/components/RoiTracker';
import type { ProjectSeoSettings } from '@/lib/seo-types';

export type InspectorTab = 'code' | 'blueprint' | 'styles' | 'seo' | 'integrations';

type BuilderInspectorPanelProps = {
  open: boolean;
  tab: InspectorTab;
  onTabChange: (tab: InspectorTab) => void;
  onClose: () => void;
  projectFiles: ProjectFile[];
  activeFile: string;
  onSelectFile: (path: string) => void;
  codeEditor: ReactNode;
  blueprintData: ComponentBlueprint | null;
  subscriptionTier: string;
  useLocalOllama: boolean;
  onUseLocalOllamaChange: (enabled: boolean) => void;
  onOllamaUpgrade: () => void;
  userId?: string;
  canUseLocalOllama: boolean;
  showStylesTab: boolean;
  selectedVisualElement: SelectedVisualElement | null;
  stylePanel: StyleChanges;
  onStyleChange: (key: keyof StyleChanges, value: string | number) => void;
  visualMobilePreview: boolean;
  showMobileStyleControls: boolean;
  visualEditApplying: boolean;
  seoSettings: ProjectSeoSettings;
  onSeoChange: (settings: ProjectSeoSettings) => void;
  subscriptionStatus: string;
  activeProjectId: string | null;
  onSaveSeo: () => Promise<void>;
  onGenerateSeo: () => Promise<void>;
  seoSaving: boolean;
  seoGenerating: boolean;
  seoMessage?: string;
  generatedCode: string;
  onIntegrationAdded: (code: string, message: string, creditsRemaining?: number) => void;
  onIntegrationStatus?: (message: string) => void;
};

const TABS: { id: InspectorTab; label: string; icon: string }[] = [
  { id: 'code', label: 'Code', icon: '📄' },
  { id: 'blueprint', label: 'Blueprint', icon: '📋' },
  { id: 'seo', label: 'SEO', icon: '🔍' },
  { id: 'integrations', label: 'Integrations', icon: '🔌' },
  { id: 'styles', label: 'Styles', icon: '🎨' },
];

export default function BuilderInspectorPanel({
  open,
  tab,
  onTabChange,
  onClose,
  projectFiles,
  activeFile,
  onSelectFile,
  codeEditor,
  blueprintData,
  subscriptionTier,
  useLocalOllama,
  onUseLocalOllamaChange,
  onOllamaUpgrade,
  userId,
  canUseLocalOllama,
  showStylesTab,
  selectedVisualElement,
  stylePanel,
  onStyleChange,
  visualMobilePreview,
  showMobileStyleControls,
  visualEditApplying,
  seoSettings,
  onSeoChange,
  subscriptionStatus,
  activeProjectId,
  onSaveSeo,
  onGenerateSeo,
  seoSaving,
  seoGenerating,
  seoMessage,
  generatedCode,
  onIntegrationAdded,
  onIntegrationStatus,
}: BuilderInspectorPanelProps) {
  const visibleTabs = TABS.filter((t) => t.id !== 'styles' || showStylesTab);

  return (
    <aside
      className="builder-inspector-panel"
      aria-hidden={!open}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-nisk shrink-0">
        <div className="flex gap-1">
          {visibleTabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onTabChange(t.id)}
              className={`px-2.5 py-1.5 text-xs rounded-lg transition-colors ${
                tab === t.id
                  ? 'bg-[var(--primary)]/20 text-[var(--primary)]'
                  : 'text-nisk-muted hover:text-white'
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-nisk-muted hover:text-white text-sm px-1"
          aria-label="Close inspector"
          title="Hide inspector"
        >
          ✕
        </button>
      </div>

      {tab === 'code' && (
        <div className="flex-1 min-h-0 flex flex-col">
          <div className="flex min-h-0 flex-1">
            <div className="w-28 lg:w-32 shrink-0 border-r border-nisk flex flex-col bg-nisk min-h-0">
              <div className="flex-1 overflow-y-auto min-h-0">
                <FileTree files={projectFiles} activePath={activeFile} onSelect={onSelectFile} />
              </div>
              <RoiTracker userId={userId} />
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
            <div className="flex-1 flex flex-col min-w-0">
              <div className="px-3 py-1.5 border-b border-nisk shrink-0">
                <span className="text-[10px] font-mono text-[var(--accent-cyan)] truncate block">
                  {activeFile}
                </span>
              </div>
              <div className="flex-1 min-h-0 code-panel">{codeEditor}</div>
            </div>
          </div>
        </div>
      )}

      {tab === 'blueprint' && (
        <div className="flex-1 min-h-0 p-4 overflow-auto">
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

      {tab === 'styles' && showStylesTab && selectedVisualElement && (
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <StylePanel
            breadcrumb={selectedVisualElement.breadcrumb}
            styles={stylePanel}
            onStyleChange={onStyleChange}
            isMobile={visualMobilePreview}
            showMobileControls={showMobileStyleControls}
            showUndoReset={false}
            isApplying={visualEditApplying}
            embedded
          />
        </div>
      )}

      {tab === 'seo' && (
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

      {tab === 'integrations' && (
        <IntegrationsPanel
          projectId={activeProjectId}
          subscriptionTier={subscriptionTier}
          subscriptionStatus={subscriptionStatus}
          currentCode={generatedCode}
          onIntegrationAdded={onIntegrationAdded}
          onStatusMessage={onIntegrationStatus}
        />
      )}
    </aside>
  );
}
