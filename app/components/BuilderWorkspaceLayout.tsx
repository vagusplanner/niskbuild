"use client";

import { useRef, useState, useEffect, type ReactNode, type RefObject } from 'react';
import Link from 'next/link';
import InspectPicker, { type InspectTarget } from '@/app/components/InspectPicker';
import ProjectLimitBadge from '@/app/components/ProjectLimitBadge';
import BuilderActionsMenu from '@/app/components/BuilderActionsMenu';
import BuilderInspectorPanel, { type InspectorTab } from '@/app/components/BuilderInspectorPanel';
import VisualEditorToolbar from '@/app/components/VisualEditorToolbar';
import GooglePlacesImport, {
  type GooglePlacesImportHandle,
} from '@/app/components/GooglePlacesImport';
import BuilderHeaderMenu from '@/app/components/BuilderHeaderMenu';
import { ChatPanelDragHandle, PromptHeightDragHandle } from '@/app/components/BuilderResizeHandles';
import PromptBar from '@/app/components/PromptBar';
import PreviewDeviceSwitcher, {
  type PreviewDevice,
} from '@/app/components/PreviewDeviceSwitcher';
import BuilderPreviewPageNav from '@/app/components/BuilderPreviewPageNav';
import type {
  GooglePlacesBusiness,
  GooglePlacesProjectContext,
} from '@/lib/google-places-types';
import type { ComponentBlueprint } from '@/lib/blueprint-schema';
import type { ProjectFile } from '@/lib/project-files';
import type { SelectedVisualElement, StyleChanges } from '@/lib/visual-editor-types';
import {
  CHAT_WIDTH_MAX,
  CHAT_WIDTH_MIN,
  PROMPT_HEIGHT_MAX,
  PROMPT_HEIGHT_MIN,
  getBuilderChatWidthPx,
  getBuilderPromptHeightPx,
  setBuilderChatWidthPx,
  setBuilderPromptHeightPx,
} from '@/lib/builder-layout-prefs';

type MobileTab = 'chat' | 'preview' | 'inspector';

type RecentProject = {
  id: string;
  title: string;
  created_at: string;
};

export type BuilderWorkspaceLayoutProps = {
  userId?: string;
  subscriptionTier: string;
  subscriptionStatus: string;
  cloudCreditsRemaining: number;
  cloudCreditsAllowance: number;
  recentProjects: RecentProject[];
  onNewProject: () => void;
  onLoadRecentProject: (project: RecentProject) => void;
  onOpenAllProjects: () => void;
  projectLimit: number;
  savedProjectsCount: number;
  canAct: boolean;
  canPwa: boolean;
  canVisualEdit: boolean;
  canVisualEditFull: boolean;
  canUseLocalOllama: boolean;
  prompt: string;
  onPromptChange: (v: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  statusMessage: string;
  activityLog?: string[];
  streamingCode?: string;
  streamingNarration?: string;
  planMode: boolean;
  onPlanModeChange: (v: boolean) => void;
  previewHtml: string;
  placeholderPreview: string;
  previewFrameClass: string;
  previewDevice?: PreviewDevice;
  onPreviewDeviceChange?: (device: PreviewDevice) => void;
  canShareSocial?: boolean;
  onOpenSocialPublisher?: () => void;
  visualEditMode: boolean;
  visualMobilePreview: boolean;
  selectedVisualElement: SelectedVisualElement | null;
  stylePanel: StyleChanges;
  visualEditApplying: boolean;
  visualEditHistoryLength: number;
  hasAiOriginal: boolean;
  inspectMode: boolean;
  inspectTarget: InspectTarget | null;
  onToggleVisualEdit: () => void;
  onToggleMobilePreview: () => void;
  onVisualUndo: () => void;
  onVisualReset: () => void;
  onStyleChange: (key: keyof StyleChanges, value: string | number) => void;
  onToggleInspect: () => void;
  onClearInspectTarget: () => void;
  onTargetedEdit: (prompt: string) => void;
  onSave: () => void;
  onExportZip: () => void;
  onMobileExport: () => void;
  onDeployLive: () => void;
  isExporting: boolean;
  mobileExporting: boolean;
  onRestoreZip: (file: File) => Promise<void>;
  isDraggingZip: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  mobileTab: MobileTab;
  onMobileTabChange: (tab: MobileTab) => void;
  inspectorOpen: boolean;
  onInspectorOpenChange: (open: boolean) => void;
  inspectorTab: InspectorTab;
  onInspectorTabChange: (tab: InspectorTab) => void;
  projectFiles: ProjectFile[];
  activeFile: string;
  onSelectFile: (path: string) => void;
  codeEditor: ReactNode;
  blueprintData: ComponentBlueprint | null;
  useLocalOllama: boolean;
  onUseLocalOllamaChange: (enabled: boolean) => void;
  onOllamaUpgrade: () => void;
  isSandboxAtLimit: boolean;
  canImportGooglePlaces: boolean;
  canUseCompetitorIntel: boolean;
  canUseSocialProof: boolean;
  importedBusinessName: string | null;
  onGooglePlacesImport: (
    business: GooglePlacesBusiness,
    context: GooglePlacesProjectContext
  ) => void;
  onBuildFromFigmaScreenshot: (combinedPrompt: string) => void;
  seoSettings: import('@/lib/seo-types').ProjectSeoSettings;
  onSeoChange: (settings: import('@/lib/seo-types').ProjectSeoSettings) => void;
  activeProjectId: string | null;
  onSaveSeo: () => Promise<void>;
  onGenerateSeo: () => Promise<void>;
  seoSaving: boolean;
  seoGenerating: boolean;
  seoMessage?: string;
  generatedCode: string;
  onIntegrationAdded: (code: string, message: string, creditsRemaining?: number) => void;
  onIntegrationStatus?: (message: string) => void;
  onOpenHistory?: () => void;
  versionHistoryOpen?: boolean;
  promptSuggestions?: string[];
  editingPageLabel?: string;
  onAddPage?: (name: string) => void;
  onRenamePage?: (path: string, newName: string) => void;
  onDeletePage?: (path: string) => void;
  canAddPage?: boolean;
  onRunExportAudit?: () => void;
};

function ProjectPageTabs({
  projectFiles,
  activeFile,
  onSelectFile,
}: {
  projectFiles: ProjectFile[];
  activeFile: string;
  onSelectFile: (path: string) => void;
}) {
  if (projectFiles.length <= 1) return null;

  return (
    <div className="flex items-center gap-1 min-w-0 overflow-x-auto max-w-[min(50vw,420px)] scrollbar-thin">
      {projectFiles.map((file) => {
        const label = file.path.replace(/^pages\//, '').replace(/\.html$/, '') || file.path;
        const active = file.path === activeFile;
        return (
          <button
            key={file.path}
            type="button"
            onClick={() => onSelectFile(file.path)}
            className={`shrink-0 px-2.5 py-1 text-[10px] font-medium rounded-md border transition-colors truncate max-w-[120px] ${
              active
                ? 'border-[var(--copper-primary)] bg-[var(--copper-primary)]/15 text-[var(--copper-melt)]'
                : 'border-transparent text-nisk-muted hover:text-[var(--foreground)] hover:bg-[var(--surface)]'
            }`}
            title={file.path}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function CanvasHeader({
  canAct,
  isExporting,
  mobileExporting,
  canPwa,
  canVisualEdit,
  visualEditMode,
  inspectMode,
  cloudCreditsRemaining,
  onSave,
  onExportZip,
  onMobileExport,
  onDeployLive,
  onToggleVisualEdit,
  onToggleInspect,
  onRestoreZip,
  onOpenInspector,
  inspectorOpen,
  inspectorTab,
  onFocusPreview,
  onOpenCodeView,
  onToggleFullscreen,
  showViewToggle = false,
  onOpenHistory,
  versionHistoryOpen,
  previewDevice = 'desktop',
  onPreviewDeviceChange,
  canShareSocial = false,
  onOpenSocialPublisher,
  onRunExportAudit,
  projectFiles = [],
  activeFile = '',
  onSelectFile,
}: {
  canAct: boolean;
  isExporting: boolean;
  mobileExporting: boolean;
  canPwa: boolean;
  canVisualEdit: boolean;
  visualEditMode: boolean;
  inspectMode: boolean;
  cloudCreditsRemaining: number;
  onSave: () => void;
  onExportZip: () => void;
  onMobileExport: () => void;
  onDeployLive: () => void;
  onToggleVisualEdit: () => void;
  onToggleInspect: () => void;
  onRestoreZip: (file: File) => Promise<void>;
  onOpenInspector: () => void;
  inspectorOpen: boolean;
  inspectorTab?: InspectorTab;
  onFocusPreview?: () => void;
  onOpenCodeView?: () => void;
  onToggleFullscreen?: () => void;
  showViewToggle?: boolean;
  onOpenHistory?: () => void;
  versionHistoryOpen?: boolean;
  previewDevice?: PreviewDevice;
  onPreviewDeviceChange?: (device: PreviewDevice) => void;
  canShareSocial?: boolean;
  onOpenSocialPublisher?: () => void;
  onRunExportAudit?: () => void;
  projectFiles?: ProjectFile[];
  activeFile?: string;
  onSelectFile?: (path: string) => void;
}) {
  const codeViewActive = inspectorOpen && inspectorTab === 'code';

  return (
    <div className="shrink-0 flex items-center justify-between gap-2 px-3 py-1.5 border-b border-nisk builder-canvas-header">
      <div className="flex items-center gap-2 min-w-0">
        {showViewToggle && onFocusPreview && onOpenCodeView && (
          <div className="flex gap-0.5 p-0.5 rounded-lg bg-[var(--surface)] border border-nisk">
            <button
              type="button"
              onClick={onFocusPreview}
              className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                !codeViewActive
                  ? 'bg-[var(--card-bg)] text-[var(--copper-melt)]'
                  : 'text-nisk-muted hover:text-[var(--foreground)]'
              }`}
            >
              Preview
            </button>
            <button
              type="button"
              onClick={onOpenCodeView}
              className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                codeViewActive
                  ? 'bg-[var(--card-bg)] text-[var(--copper-melt)]'
                  : 'text-nisk-muted hover:text-[var(--foreground)]'
              }`}
            >
              Code
            </button>
          </div>
        )}
        {onPreviewDeviceChange && (
          <div className="hidden sm:block">
            <PreviewDeviceSwitcher device={previewDevice} onChange={onPreviewDeviceChange} />
          </div>
        )}
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--copper-primary)] status-dot-active shrink-0 hidden sm:block" />
        <span className="text-xs font-medium text-nisk-muted hidden lg:inline">Live preview</span>
        {onSelectFile && (
          <ProjectPageTabs
            projectFiles={projectFiles}
            activeFile={activeFile}
            onSelectFile={onSelectFile}
          />
        )}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {onRunExportAudit && (
          <button
            type="button"
            onClick={onRunExportAudit}
            className="btn-secondary px-2.5 py-1.5 text-xs rounded-lg hidden sm:inline-flex"
          >
            Export audit
          </button>
        )}
        {canShareSocial && onOpenSocialPublisher && (
          <button
            type="button"
            onClick={onOpenSocialPublisher}
            className="btn-secondary px-2.5 py-1.5 text-xs rounded-lg hidden sm:inline-flex"
          >
            Share to Social
          </button>
        )}
        <BuilderActionsMenu
          canAct={canAct}
          isExporting={isExporting}
          mobileExporting={mobileExporting}
          canPwa={canPwa}
          canVisualEdit={canVisualEdit}
          visualEditMode={visualEditMode}
          inspectMode={inspectMode}
          onSave={onSave}
          onExportZip={onExportZip}
          onMobileExport={onMobileExport}
          onDeployLive={onDeployLive}
          onToggleVisualEdit={onToggleVisualEdit}
          onToggleInspect={onToggleInspect}
          onRestoreZip={onRestoreZip}
          onOpenInspector={onOpenInspector}
          inspectorOpen={inspectorOpen}
          onToggleFullscreen={onToggleFullscreen}
          onOpenHistory={onOpenHistory}
          versionHistoryOpen={versionHistoryOpen}
          previewDevice={previewDevice}
          onPreviewDeviceChange={onPreviewDeviceChange}
          canShareSocial={canShareSocial}
          onOpenSocialPublisher={onOpenSocialPublisher}
          onRunExportAudit={onRunExportAudit}
        />
      </div>
    </div>
  );
}

function PreviewIframe({
  previewHtml,
  placeholderPreview,
  previewFrameClass,
}: {
  previewHtml: string;
  placeholderPreview: string;
  previewFrameClass: string;
}) {
  return (
    <iframe
      key={previewHtml.slice(0, 80)}
      srcDoc={previewHtml || placeholderPreview}
      title="Live Preview"
      className={`${previewFrameClass} border-0 bg-white`}
      sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals"
    />
  );
}

function ShareThisBuildFab({
  visible,
  onOpen,
}: {
  visible: boolean;
  onOpen?: () => void;
}) {
  if (!visible || !onOpen) return null;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="absolute bottom-4 right-4 z-[12] px-4 py-2.5 rounded-full bg-gradient-to-r from-[var(--copper-primary)] to-[var(--copper-melt)] text-white text-xs font-semibold shadow-lg hover:opacity-90 transition-opacity"
      aria-label="Share this build to social media"
    >
      Share This Build
    </button>
  );
}

function CreditsBar({
  remaining,
  allowance,
  tier,
}: {
  remaining: number;
  allowance: number;
  tier: string;
}) {
  const pct = allowance > 0 ? Math.min(100, Math.round((remaining / allowance) * 100)) : 0;

  return (
    <div className="shrink-0 px-4 py-3 border-t border-nisk bg-nisk-card/50">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-[10px] text-nisk-muted uppercase tracking-wider">Cloud credits</span>
        <span className="text-xs font-medium text-[var(--accent-cyan)]">
          {allowance > 0 ? `${remaining} / ${allowance}` : 'Sandbox'}
        </span>
      </div>
      {allowance > 0 ? (
        <div className="w-full bg-nisk rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-gradient-brand h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      ) : (
        <p className="text-[10px] text-nisk-muted">
          Local preview · <Link href="/pricing" className="text-[var(--primary)] hover:underline">Upgrade for cloud AI</Link>
        </p>
      )}
      <p className="text-[10px] text-nisk-muted mt-1.5 capitalize">{tier.replace('_', ' ')} plan</p>
    </div>
  );
}

function RecentProjectsList({
  projects,
  onLoad,
  onOpenAll,
  compact = false,
}: {
  projects: RecentProject[];
  onLoad: (project: RecentProject) => void;
  onOpenAll: () => void;
  compact?: boolean;
}) {
  if (projects.length === 0) return null;

  return (
    <div className={compact ? '' : 'shrink-0 px-4 py-3 border-t border-nisk max-h-40 overflow-y-auto'}>
      {!compact && (
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] uppercase tracking-wider text-nisk-muted">Recent projects</p>
          <button
            type="button"
            onClick={onOpenAll}
            className="text-[10px] text-[var(--accent-cyan)] hover:underline"
          >
            View all
          </button>
        </div>
      )}
      <ul className="space-y-1">
        {projects.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => onLoad(p)}
              className="w-full text-left px-2.5 py-2 rounded-lg bg-nisk-surface border border-nisk hover:border-[var(--primary)]/40 transition-colors"
            >
              <p className="text-xs text-white truncate">{p.title}</p>
              <p className="text-[10px] text-nisk-muted">{new Date(p.created_at).toLocaleDateString()}</p>
            </button>
          </li>
        ))}
      </ul>
      {compact ? (
        <button
          type="button"
          onClick={onOpenAll}
          className="w-full text-center text-[10px] text-[var(--accent-cyan)] hover:underline mt-2"
        >
          View all projects
        </button>
      ) : (
        <Link
          href="/dashboard"
          className="block text-center text-[10px] text-nisk-muted hover:text-[var(--accent-cyan)] mt-2"
        >
          Open dashboard →
        </Link>
      )}
    </div>
  );
}

function ChatPanelContent({
  userId,
  savedProjectsCount,
  projectLimit,
  isSandboxAtLimit,
  onNewProject,
  recentProjects,
  onLoadRecentProject,
  onOpenAllProjects,
  cloudCreditsRemaining,
  cloudCreditsAllowance,
  subscriptionTier,
  subscriptionStatus,
  prompt,
  onPromptChange,
  onGenerate,
  isGenerating,
  statusMessage,
  activityLog = [],
  streamingCode,
  streamingNarration,
  planMode,
  onPlanModeChange,
  promptSuggestions = [],
  editingPageLabel,
  promptHeightPx,
  onPromptHeightChange,
  canImportGooglePlaces,
  canUseCompetitorIntel,
  canUseSocialProof,
  importedBusinessName,
  onGooglePlacesImport,
  onBuildFromFigmaScreenshot,
  activeProjectId,
  useLocalOllama,
  onUseLocalOllamaChange,
  onOllamaUpgrade,
  onRestoreZip,
  googlePlacesRef,
}: {
  userId?: string;
  savedProjectsCount: number;
  projectLimit: number;
  isSandboxAtLimit: boolean;
  onNewProject: () => void;
  recentProjects: RecentProject[];
  onLoadRecentProject: (project: RecentProject) => void;
  onOpenAllProjects: () => void;
  cloudCreditsRemaining: number;
  cloudCreditsAllowance: number;
  subscriptionTier: string;
  subscriptionStatus: string;
  prompt: string;
  onPromptChange: (v: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  statusMessage: string;
  activityLog?: string[];
  streamingCode?: string;
  streamingNarration?: string;
  planMode: boolean;
  onPlanModeChange: (v: boolean) => void;
  promptSuggestions?: string[];
  editingPageLabel?: string;
  promptHeightPx: number;
  onPromptHeightChange: (px: number) => void;
  canImportGooglePlaces: boolean;
  canUseCompetitorIntel: boolean;
  canUseSocialProof: boolean;
  importedBusinessName: string | null;
  onGooglePlacesImport: (
    business: GooglePlacesBusiness,
    context: GooglePlacesProjectContext
  ) => void;
  onBuildFromFigmaScreenshot: (combinedPrompt: string) => void;
  activeProjectId: string | null;
  useLocalOllama: boolean;
  onUseLocalOllamaChange: (enabled: boolean) => void;
  onOllamaUpgrade: () => void;
  onRestoreZip: (file: File) => Promise<void>;
  googlePlacesRef: RefObject<GooglePlacesImportHandle | null>;
}) {
  return (
    <>
      <div className="shrink-0 px-3 py-2.5 border-b border-nisk">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-[var(--foreground)]">AI Builder</p>
          <BuilderHeaderMenu
            onNewProject={onNewProject}
            onOpenProjects={onOpenAllProjects}
            projectCount={recentProjects.length}
          />
        </div>
        {userId && (
          <div className="mt-1.5">
            <ProjectLimitBadge userId={userId} currentCount={savedProjectsCount} />
          </div>
        )}
      </div>

      {isSandboxAtLimit && (
        <p className="shrink-0 px-3 py-1.5 text-[10px] text-yellow-400 border-b border-nisk/50">
          Limit {savedProjectsCount}/{projectLimit}.{' '}
          <Link href="/pricing" className="underline">Upgrade</Link>
        </p>
      )}

      <div className="builder-chat-scroll flex-1 min-h-0">
        {importedBusinessName && (
          <div className="mx-3 mt-2 px-3 py-2 rounded-lg border border-[var(--copper-primary)]/30 bg-[var(--copper-primary)]/10">
            <p className="text-[10px] text-[var(--copper-melt)] font-medium">
              📍 {importedBusinessName}
            </p>
          </div>
        )}

      </div>

      <div className="builder-prompt-dock">
        <PromptHeightDragHandle
          onResize={(delta) => {
            const next = Math.min(
              PROMPT_HEIGHT_MAX,
              Math.max(PROMPT_HEIGHT_MIN, promptHeightPx + delta)
            );
            if (next !== promptHeightPx) {
              setBuilderPromptHeightPx(next);
              onPromptHeightChange(next);
            }
          }}
        />
        <PromptBar
          variant="cursor"
          prompt={prompt}
          onChange={onPromptChange}
          onGenerate={onGenerate}
          onBuildFromFigmaScreenshot={onBuildFromFigmaScreenshot}
          onUploadZip={(file) => void onRestoreZip(file)}
          onOpenGooglePlaces={() => googlePlacesRef.current?.open()}
          projectId={activeProjectId}
          isGenerating={isGenerating}
          statusMessage={statusMessage}
          activityLog={activityLog}
          streamingCode={streamingCode}
          streamingNarration={streamingNarration}
          streamingLine={isGenerating && !streamingNarration ? statusMessage : undefined}
          promptRows={Math.max(3, Math.round(promptHeightPx / 28))}
          promptMinHeight={promptHeightPx}
          suggestions={promptSuggestions}
          editingPageLabel={editingPageLabel}
          planMode={planMode}
          onPlanModeChange={onPlanModeChange}
          subscriptionTier={subscriptionTier}
          subscriptionStatus={subscriptionStatus}
          useLocalOllama={useLocalOllama}
          onUseLocalOllamaChange={onUseLocalOllamaChange}
          onProviderUpgrade={onOllamaUpgrade}
        />
        <div className="px-3 pb-2 flex items-center justify-between text-[10px] text-nisk-muted">
          <span className="capitalize">{subscriptionTier.replace('_', ' ')}</span>
          {cloudCreditsAllowance > 0 ? (
            <span className="text-[var(--copper-melt)]">
              {cloudCreditsRemaining}/{cloudCreditsAllowance} credits
            </span>
          ) : (
            <Link href="/pricing" className="text-[var(--copper-melt)] hover:underline">
              Upgrade
            </Link>
          )}
        </div>
      </div>

      <GooglePlacesImport
        ref={googlePlacesRef}
        canImport={canImportGooglePlaces}
        canUseCompetitorIntel={canUseCompetitorIntel}
        canUseSocialProof={canUseSocialProof}
        onImport={onGooglePlacesImport}
      />
    </>
  );
}

export default function BuilderWorkspaceLayout(props: BuilderWorkspaceLayoutProps) {
  const {
    userId,
    subscriptionTier,
    subscriptionStatus,
    cloudCreditsRemaining,
    cloudCreditsAllowance,
    recentProjects,
    onNewProject,
    onLoadRecentProject,
    onOpenAllProjects,
    projectLimit,
    savedProjectsCount,
    canAct,
    canPwa,
    canVisualEdit,
    canVisualEditFull,
    canUseLocalOllama: canUseLocal,
    prompt,
    onPromptChange,
    onGenerate,
    isGenerating,
    statusMessage,
    activityLog = [],
    streamingCode,
    streamingNarration,
    planMode,
    onPlanModeChange,
    previewHtml,
    placeholderPreview,
    previewFrameClass,
    previewDevice = 'desktop',
    onPreviewDeviceChange,
    canShareSocial = false,
    onOpenSocialPublisher,
    onRunExportAudit,
    visualEditMode,
    visualMobilePreview,
    selectedVisualElement,
    stylePanel,
    visualEditApplying,
    visualEditHistoryLength,
    hasAiOriginal,
    inspectMode,
    inspectTarget,
    onToggleVisualEdit,
    onToggleMobilePreview,
    onVisualUndo,
    onVisualReset,
    onStyleChange,
    onToggleInspect,
    onClearInspectTarget,
    onTargetedEdit,
    onSave,
    onExportZip,
    onMobileExport,
    onDeployLive,
    isExporting,
    mobileExporting,
    isDraggingZip,
    onDragOver,
    onDragLeave,
    onDrop,
    mobileTab,
    onMobileTabChange,
    inspectorOpen,
    onInspectorOpenChange,
    inspectorTab,
    onInspectorTabChange,
    projectFiles,
    activeFile,
    onSelectFile,
    codeEditor,
    blueprintData,
    useLocalOllama,
    onUseLocalOllamaChange,
    onOllamaUpgrade,
    isSandboxAtLimit,
    canImportGooglePlaces,
    canUseCompetitorIntel,
    canUseSocialProof,
    importedBusinessName,
    onGooglePlacesImport,
    onBuildFromFigmaScreenshot,
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
    onOpenHistory,
    versionHistoryOpen,
    promptSuggestions = [],
    editingPageLabel,
    onAddPage,
    onRenamePage,
    onDeletePage,
    canAddPage = true,
  } = props;

  const seoInspectorProps = {
    seoSettings,
    onSeoChange,
    subscriptionStatus,
    activeProjectId,
    onSaveSeo,
    onGenerateSeo,
    seoSaving,
    seoGenerating,
    seoMessage,
  };

  const integrationInspectorProps = {
    generatedCode,
    onIntegrationAdded,
    onIntegrationStatus,
  };

  const showStylesTab = visualEditMode && !!selectedVisualElement;

  const previewFullscreenRef = useRef<HTMLDivElement>(null);
  const mobilePreviewFullscreenRef = useRef<HTMLDivElement>(null);
  const googlePlacesRef = useRef<GooglePlacesImportHandle>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [chatWidthPxState, setChatWidthPxState] = useState(340);
  const [promptHeightPx, setPromptHeightPx] = useState(140);

  useEffect(() => {
    setChatWidthPxState(getBuilderChatWidthPx());
    setPromptHeightPx(getBuilderPromptHeightPx());
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty('--builder-chat-width', `${chatWidthPxState}px`);
  }, [chatWidthPxState]);

  const handleChatWidthResize = (delta: number) => {
    setChatWidthPxState((current) => {
      const next = Math.min(CHAT_WIDTH_MAX, Math.max(CHAT_WIDTH_MIN, current + delta));
      setBuilderChatWidthPx(next);
      return next;
    });
  };

  const handleFocusPreview = () => {
    onInspectorOpenChange(false);
  };

  const handleOpenCodeView = () => {
    onInspectorOpenChange(true);
    onInspectorTabChange('code');
  };

  const chatPanel = (
    <ChatPanelContent
      userId={userId}
      savedProjectsCount={savedProjectsCount}
      projectLimit={projectLimit}
      isSandboxAtLimit={isSandboxAtLimit}
      onNewProject={onNewProject}
      recentProjects={recentProjects}
      onLoadRecentProject={onLoadRecentProject}
      onOpenAllProjects={onOpenAllProjects}
      cloudCreditsRemaining={cloudCreditsRemaining}
      cloudCreditsAllowance={cloudCreditsAllowance}
      subscriptionTier={subscriptionTier}
      subscriptionStatus={subscriptionStatus}
      prompt={prompt}
      onPromptChange={onPromptChange}
      onGenerate={onGenerate}
      isGenerating={isGenerating}
      statusMessage={statusMessage}
      activityLog={activityLog}
      streamingCode={streamingCode}
      streamingNarration={streamingNarration}
      planMode={planMode}
      onPlanModeChange={onPlanModeChange}
      promptSuggestions={promptSuggestions}
      editingPageLabel={editingPageLabel}
      promptHeightPx={promptHeightPx}
      onPromptHeightChange={setPromptHeightPx}
      canImportGooglePlaces={canImportGooglePlaces}
      canUseCompetitorIntel={canUseCompetitorIntel}
      canUseSocialProof={canUseSocialProof}
      importedBusinessName={importedBusinessName}
      onGooglePlacesImport={onGooglePlacesImport}
      onBuildFromFigmaScreenshot={onBuildFromFigmaScreenshot}
      activeProjectId={activeProjectId}
      useLocalOllama={useLocalOllama}
      onUseLocalOllamaChange={onUseLocalOllamaChange}
      onOllamaUpgrade={onOllamaUpgrade}
      onRestoreZip={props.onRestoreZip}
      googlePlacesRef={googlePlacesRef}
    />
  );

  const visualToolbar = (
    <VisualEditorToolbar
      editMode={visualEditMode}
      onToggleEditMode={onToggleVisualEdit}
      canUseEditor={canVisualEdit}
      mobilePreview={visualMobilePreview}
      onToggleMobilePreview={onToggleMobilePreview}
      showMobileToggle={canVisualEditFull}
      showUndoReset={canVisualEditFull}
      onUndo={onVisualUndo}
      onReset={onVisualReset}
      canUndo={visualEditHistoryLength > 0}
      canReset={hasAiOriginal}
      selectedLabel={selectedVisualElement?.breadcrumb.join(' > ')}
      hideEditToggle
    />
  );

  const togglePreviewFullscreen = () => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const el = isMobile ? mobilePreviewFullscreenRef.current : previewFullscreenRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  useEffect(() => {
    const isTyping = (el: EventTarget | null) => {
      if (!el || !(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
    };

    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (canAct) onSave();
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        onInspectorOpenChange(!inspectorOpen);
      }
      if (e.key.toLowerCase() === 'f' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        togglePreviewFullscreen();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canAct, inspectorOpen, onInspectorOpenChange, onSave]);

  const inspector = (
    <BuilderInspectorPanel
      open={inspectorOpen}
      tab={inspectorTab}
      onTabChange={onInspectorTabChange}
      onClose={() => onInspectorOpenChange(false)}
      projectFiles={projectFiles}
      activeFile={activeFile}
      onSelectFile={onSelectFile}
      codeEditor={codeEditor}
      blueprintData={blueprintData}
      subscriptionTier={subscriptionTier}
      useLocalOllama={useLocalOllama}
      onUseLocalOllamaChange={onUseLocalOllamaChange}
      onOllamaUpgrade={onOllamaUpgrade}
      userId={userId}
      canUseLocalOllama={canUseLocal}
      showStylesTab={showStylesTab}
      selectedVisualElement={selectedVisualElement}
      stylePanel={stylePanel}
      onStyleChange={onStyleChange}
      visualMobilePreview={visualMobilePreview}
      showMobileStyleControls={canVisualEditFull}
      visualEditApplying={visualEditApplying}
      {...seoInspectorProps}
      {...integrationInspectorProps}
    />
  );

  return (
    <div
      className={`flex-1 min-h-0 flex flex-col relative ${isDraggingZip ? 'ring-2 ring-[var(--accent-cyan)] ring-inset' : ''}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <InspectPicker
        active={inspectMode}
        onToggle={onToggleInspect}
        target={inspectTarget}
        onClearTarget={onClearInspectTarget}
        onSubmit={onTargetedEdit}
        isGenerating={isGenerating}
        hideToggle
      />
      {isDraggingZip && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 backdrop-blur-sm pointer-events-none">
          <p className="text-[var(--accent-cyan)] font-medium">Drop NiskBuild ZIP to restore project</p>
        </div>
      )}

      {/* Mobile: tabbed workspace */}
      <div className="flex-1 min-h-0 flex flex-col md:hidden">
        <div className="shrink-0 flex border-b border-nisk bg-nisk-card">
          {(['chat', 'preview', 'inspector'] as MobileTab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => onMobileTabChange(tab)}
              className={`flex-1 py-2.5 text-xs font-medium capitalize transition-colors ${
                mobileTab === tab
                  ? 'text-[var(--primary)] border-b-2 border-[var(--primary)] bg-[var(--primary)]/5'
                  : 'text-nisk-muted'
              }`}
            >
              {tab === 'chat' ? '💬 Chat' : tab === 'preview' ? '👁️ Preview' : '◧ Inspector'}
            </button>
          ))}
        </div>

        {mobileTab === 'chat' && (
          <aside className="builder-chat-panel w-full flex-1 min-h-0 border-r-0 flex flex-col">
            {chatPanel}
          </aside>
        )}

        {mobileTab === 'preview' && (
          <main className="builder-preview-panel flex-1 min-h-0">
            <CanvasHeader
              canAct={canAct}
              isExporting={isExporting}
              mobileExporting={mobileExporting}
              canPwa={canPwa}
              canVisualEdit={canVisualEdit}
              visualEditMode={visualEditMode}
              inspectMode={inspectMode}
              cloudCreditsRemaining={cloudCreditsRemaining}
              onSave={onSave}
              onExportZip={onExportZip}
              onMobileExport={onMobileExport}
              onDeployLive={onDeployLive}
              onToggleVisualEdit={onToggleVisualEdit}
              onToggleInspect={onToggleInspect}
              onRestoreZip={props.onRestoreZip}
              onOpenInspector={() => {
                onInspectorTabChange('code');
                onMobileTabChange('inspector');
              }}
              inspectorOpen={false}
              showViewToggle
              onFocusPreview={() => onMobileTabChange('preview')}
              onOpenCodeView={() => {
                onInspectorTabChange('code');
                onMobileTabChange('inspector');
              }}
              onToggleFullscreen={togglePreviewFullscreen}
              onOpenHistory={onOpenHistory}
              versionHistoryOpen={versionHistoryOpen}
              previewDevice={previewDevice}
              onPreviewDeviceChange={onPreviewDeviceChange}
              canShareSocial={canShareSocial}
              onOpenSocialPublisher={onOpenSocialPublisher}
              onRunExportAudit={onRunExportAudit}
              projectFiles={projectFiles}
              activeFile={activeFile}
              onSelectFile={onSelectFile}
            />
            <BuilderPreviewPageNav
              projectFiles={projectFiles}
              activeFile={activeFile}
              onSelectPage={onSelectFile}
              onAddPage={onAddPage}
              onRenamePage={onRenamePage}
              onDeletePage={onDeletePage}
              canAddPage={canAddPage}
            />
            {visualToolbar}
            <div
              ref={mobilePreviewFullscreenRef}
              className={`flex-1 min-h-0 relative builder-preview-canvas ${
                previewDevice !== 'desktop' || visualMobilePreview ? 'bg-[var(--iron-surface)]' : ''
              }`}
            >
              <PreviewIframe
                previewHtml={previewHtml}
                placeholderPreview={placeholderPreview}
                previewFrameClass={previewFrameClass}
              />
              <ShareThisBuildFab
                visible={canShareSocial}
                onOpen={onOpenSocialPublisher}
              />
            </div>
          </main>
        )}

        {mobileTab === 'inspector' && (
          <div className="flex-1 min-h-0 flex flex-col">
            <BuilderInspectorPanel
              open
              tab={inspectorTab}
              onTabChange={onInspectorTabChange}
              onClose={() => onMobileTabChange('preview')}
              projectFiles={projectFiles}
              activeFile={activeFile}
              onSelectFile={onSelectFile}
              codeEditor={codeEditor}
              blueprintData={blueprintData}
              subscriptionTier={subscriptionTier}
              useLocalOllama={useLocalOllama}
              onUseLocalOllamaChange={onUseLocalOllamaChange}
              onOllamaUpgrade={onOllamaUpgrade}
              userId={userId}
              canUseLocalOllama={canUseLocal}
              showStylesTab={showStylesTab}
              selectedVisualElement={selectedVisualElement}
              stylePanel={stylePanel}
              onStyleChange={onStyleChange}
              visualMobilePreview={visualMobilePreview}
              showMobileStyleControls={canVisualEditFull}
              visualEditApplying={visualEditApplying}
              {...seoInspectorProps}
              {...integrationInspectorProps}
            />
          </div>
        )}
      </div>

      {/* Desktop: three-panel workspace */}
      <div className="hidden md:flex builder-workspace flex-1 min-h-0">
        <aside
          className={`builder-chat-panel flex flex-col min-h-0 relative transition-[width,min-width] duration-200 ease-out ${
            sidebarCollapsed ? 'builder-chat-panel--collapsed' : ''
          }`}
        >
          {!sidebarCollapsed && <ChatPanelDragHandle onResize={handleChatWidthResize} />}
          <button
            type="button"
            className="absolute -right-3 top-14 z-20 w-6 h-6 rounded-full border border-nisk bg-[var(--card-bg)] text-[10px] text-nisk-muted hover:text-[var(--copper-melt)] hover:border-[var(--copper-primary)]/50 flex items-center justify-center shadow-md"
            onClick={() => setSidebarCollapsed((v) => !v)}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? '›' : '‹'}
          </button>
          {sidebarCollapsed ? (
            <div className="flex flex-col items-center py-4 gap-4 flex-1">
              <button
                type="button"
                onClick={() => setSidebarCollapsed(false)}
                className="p-2 rounded-lg text-lg hover:bg-[var(--surface-elevated)]"
                title="Expand AI panel"
              >
                💬
              </button>
            </div>
          ) : (
            chatPanel
          )}
        </aside>

        <main className="builder-preview-panel">
          <CanvasHeader
            canAct={canAct}
            isExporting={isExporting}
            mobileExporting={mobileExporting}
            canPwa={canPwa}
            canVisualEdit={canVisualEdit}
            visualEditMode={visualEditMode}
            inspectMode={inspectMode}
            cloudCreditsRemaining={cloudCreditsRemaining}
            onSave={onSave}
            onExportZip={onExportZip}
            onMobileExport={onMobileExport}
            onDeployLive={onDeployLive}
            onToggleVisualEdit={onToggleVisualEdit}
            onToggleInspect={onToggleInspect}
            onRestoreZip={props.onRestoreZip}
            onOpenInspector={() => onInspectorOpenChange(!inspectorOpen)}
            inspectorOpen={inspectorOpen}
            inspectorTab={inspectorTab}
            showViewToggle
            onFocusPreview={handleFocusPreview}
            onOpenCodeView={handleOpenCodeView}
            onToggleFullscreen={togglePreviewFullscreen}
            onOpenHistory={onOpenHistory}
            versionHistoryOpen={versionHistoryOpen}
            previewDevice={previewDevice}
            onPreviewDeviceChange={onPreviewDeviceChange}
            canShareSocial={canShareSocial}
            onOpenSocialPublisher={onOpenSocialPublisher}
            onRunExportAudit={onRunExportAudit}
            projectFiles={projectFiles}
            activeFile={activeFile}
            onSelectFile={onSelectFile}
          />
          <BuilderPreviewPageNav
            projectFiles={projectFiles}
            activeFile={activeFile}
            onSelectPage={onSelectFile}
            onAddPage={onAddPage}
            onRenamePage={onRenamePage}
            onDeletePage={onDeletePage}
            canAddPage={canAddPage}
          />
          {visualToolbar}
          <div
            ref={previewFullscreenRef}
            className={`flex-1 min-h-0 relative builder-preview-canvas ${
              previewDevice !== 'desktop' || visualMobilePreview ? 'bg-[var(--iron-surface)]' : ''
            }`}
          >
            <div
              className={`builder-inspector-backdrop hidden md:block ${inspectorOpen ? 'is-open' : ''}`}
              onClick={() => onInspectorOpenChange(false)}
              aria-hidden
            />
            <div className="absolute inset-0 z-[1]">
              <PreviewIframe
                previewHtml={previewHtml}
                placeholderPreview={placeholderPreview}
                previewFrameClass={previewFrameClass}
              />
              <ShareThisBuildFab
                visible={canShareSocial}
                onOpen={onOpenSocialPublisher}
              />
            </div>
            <button
              type="button"
              className={`builder-inspector-toggle hidden md:block ${inspectorOpen ? 'is-open' : ''}`}
              onClick={() => onInspectorOpenChange(!inspectorOpen)}
              aria-label={inspectorOpen ? 'Hide inspector' : 'Show inspector'}
            >
              {inspectorOpen ? 'Hide' : 'Code'}
            </button>
            {inspectorOpen && (
              <div className="builder-inspector-overlay hidden md:flex">
                <BuilderInspectorPanel
                  open
                  tab={inspectorTab}
                  onTabChange={onInspectorTabChange}
                  onClose={() => onInspectorOpenChange(false)}
                  projectFiles={projectFiles}
                  activeFile={activeFile}
                  onSelectFile={onSelectFile}
                  codeEditor={codeEditor}
                  blueprintData={blueprintData}
                  subscriptionTier={subscriptionTier}
                  useLocalOllama={useLocalOllama}
                  onUseLocalOllamaChange={onUseLocalOllamaChange}
                  onOllamaUpgrade={onOllamaUpgrade}
                  userId={userId}
                  canUseLocalOllama={canUseLocal}
                  showStylesTab={showStylesTab}
                  selectedVisualElement={selectedVisualElement}
                  stylePanel={stylePanel}
                  onStyleChange={onStyleChange}
                  visualMobilePreview={visualMobilePreview}
                  showMobileStyleControls={canVisualEditFull}
                  visualEditApplying={visualEditApplying}
                  {...seoInspectorProps}
                  {...integrationInspectorProps}
                />
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
