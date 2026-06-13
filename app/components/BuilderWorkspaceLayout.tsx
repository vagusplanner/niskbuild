"use client";

import type { ReactNode } from 'react';
import Link from 'next/link';
import InspectPicker, { type InspectTarget } from '@/app/components/InspectPicker';
import ProjectLimitBadge from '@/app/components/ProjectLimitBadge';
import BuilderActionsMenu from '@/app/components/BuilderActionsMenu';
import BuilderInspectorPanel, { type InspectorTab } from '@/app/components/BuilderInspectorPanel';
import VisualEditorToolbar from '@/app/components/VisualEditorToolbar';
import GooglePlacesImport from '@/app/components/GooglePlacesImport';
import PromptBar from '@/app/components/PromptBar';
import type {
  GooglePlacesBusiness,
  GooglePlacesProjectContext,
} from '@/lib/google-places-types';
import type { ComponentBlueprint } from '@/lib/blueprint-schema';
import type { ProjectFile } from '@/lib/project-files';
import type { SelectedVisualElement, StyleChanges } from '@/lib/visual-editor-types';

type MobileTab = 'chat' | 'preview' | 'inspector';

type RecentProject = {
  id: string;
  title: string;
  created_at: string;
};

export type BuilderWorkspaceLayoutProps = {
  userId?: string;
  subscriptionTier: string;
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
  planMode: boolean;
  onPlanModeChange: (v: boolean) => void;
  previewHtml: string;
  placeholderPreview: string;
  previewFrameClass: string;
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
  importedBusinessName: string | null;
  onGooglePlacesImport: (
    business: GooglePlacesBusiness,
    context: GooglePlacesProjectContext
  ) => void;
};

function CanvasHeader({
  canAct,
  isExporting,
  mobileExporting,
  canPwa,
  cloudCreditsRemaining,
  onSave,
  onExportZip,
  onMobileExport,
  onDeployLive,
  onOpenInspector,
  inspectorOpen,
  inspectorTab,
  onFocusPreview,
  onOpenCodeView,
  showViewToggle = false,
  children,
}: {
  canAct: boolean;
  isExporting: boolean;
  mobileExporting: boolean;
  canPwa: boolean;
  cloudCreditsRemaining: number;
  onSave: () => void;
  onExportZip: () => void;
  onMobileExport: () => void;
  onDeployLive: () => void;
  onOpenInspector: () => void;
  inspectorOpen: boolean;
  inspectorTab?: InspectorTab;
  onFocusPreview?: () => void;
  onOpenCodeView?: () => void;
  showViewToggle?: boolean;
  children?: ReactNode;
}) {
  const codeViewActive = inspectorOpen && inspectorTab === 'code';

  return (
    <div className="shrink-0 flex items-center justify-between gap-2 px-3 py-2 border-b border-nisk bg-nisk-surface">
      <div className="flex items-center gap-2 min-w-0 flex-wrap">
        {showViewToggle && onFocusPreview && onOpenCodeView && (
          <div className="flex gap-1 mr-1">
            <button
              type="button"
              onClick={onFocusPreview}
              className={`px-2.5 py-1 text-xs rounded-lg transition-colors ${
                !codeViewActive
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'text-nisk-muted hover:text-white'
              }`}
            >
              👁️ Preview
            </button>
            <button
              type="button"
              onClick={onOpenCodeView}
              className={`px-2.5 py-1 text-xs rounded-lg transition-colors ${
                codeViewActive
                  ? 'bg-purple-500/20 text-purple-400'
                  : 'text-nisk-muted hover:text-white'
              }`}
            >
              📄 Code
            </button>
          </div>
        )}
        <span className="w-2 h-2 rounded-full bg-[var(--success)] status-dot-active shrink-0" />
        <span className="text-sm font-medium text-white truncate hidden sm:inline">Live Preview</span>
        {children}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="hidden sm:inline text-[10px] text-nisk-muted font-mono">
          {cloudCreditsRemaining > 0 ? `${cloudCreditsRemaining} cr` : 'sandbox'}
        </span>
        <BuilderActionsMenu
          canAct={canAct}
          isExporting={isExporting}
          mobileExporting={mobileExporting}
          canPwa={canPwa}
          onSave={onSave}
          onExportZip={onExportZip}
          onMobileExport={onMobileExport}
          onDeployLive={onDeployLive}
        />
        <button
          type="button"
          onClick={onOpenInspector}
          className={`hidden md:inline-flex btn-secondary px-2.5 py-1.5 text-xs rounded-lg ${
            inspectorOpen ? 'border-[var(--accent-cyan)]/50 text-[var(--accent-cyan)]' : ''
          }`}
          title={inspectorOpen ? 'Hide code inspector' : 'Show code inspector'}
        >
          {inspectorOpen ? '◧ Inspector' : '◨ Inspector'}
        </button>
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
}: {
  projects: RecentProject[];
  onLoad: (project: RecentProject) => void;
  onOpenAll: () => void;
}) {
  if (projects.length === 0) return null;

  return (
    <div className="shrink-0 px-4 py-3 border-t border-nisk max-h-40 overflow-y-auto">
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
      <Link
        href="/dashboard"
        className="block text-center text-[10px] text-nisk-muted hover:text-[var(--accent-cyan)] mt-2"
      >
        Open dashboard →
      </Link>
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
  prompt,
  onPromptChange,
  onGenerate,
  isGenerating,
  statusMessage,
  planMode,
  onPlanModeChange,
  canImportGooglePlaces,
  importedBusinessName,
  onGooglePlacesImport,
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
  prompt: string;
  onPromptChange: (v: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  statusMessage: string;
  planMode: boolean;
  onPlanModeChange: (v: boolean) => void;
  canImportGooglePlaces: boolean;
  importedBusinessName: string | null;
  onGooglePlacesImport: (
    business: GooglePlacesBusiness,
    context: GooglePlacesProjectContext
  ) => void;
}) {
  return (
    <>
      <div className="shrink-0 px-4 py-3 border-b border-nisk">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <p className="text-xs font-semibold text-white">Build with AI</p>
            <p className="text-[10px] text-nisk-muted mt-0.5">Describe your app — preview updates live</p>
          </div>
          <button
            type="button"
            onClick={onNewProject}
            className="shrink-0 px-2.5 py-1.5 text-[10px] font-medium rounded-lg bg-[var(--secondary)]/20 text-[var(--secondary)] border border-[var(--secondary)]/30 hover:bg-[var(--secondary)]/30 transition-colors"
            title="Start fresh project"
          >
            + New
          </button>
        </div>
        {userId && (
          <ProjectLimitBadge userId={userId} currentCount={savedProjectsCount} />
        )}
        {isSandboxAtLimit && (
          <p className="text-[10px] text-yellow-400 mt-2">
            Limit {savedProjectsCount}/{projectLimit}.{' '}
            <Link href="/pricing" className="underline">Upgrade</Link>
          </p>
        )}
      </div>
      {importedBusinessName && (
        <div className="shrink-0 mx-4 mt-2 px-3 py-2 rounded-lg border border-[var(--accent-cyan)]/30 bg-[var(--accent-cyan)]/10">
          <p className="text-[10px] text-[var(--accent-cyan)] font-medium">
            📍 Client info imported — {importedBusinessName}
          </p>
          <p className="text-[10px] text-nisk-muted mt-0.5">
            Your app will be pre-filled with real business data on Generate.
          </p>
        </div>
      )}
      <GooglePlacesImport
        canImport={canImportGooglePlaces}
        onImport={onGooglePlacesImport}
      />
      <PromptBar
        variant="sidebar"
        prompt={prompt}
        onChange={onPromptChange}
        onGenerate={onGenerate}
        isGenerating={isGenerating}
        statusMessage={statusMessage}
        planMode={planMode}
        onPlanModeChange={onPlanModeChange}
      />
      <RecentProjectsList
        projects={recentProjects}
        onLoad={onLoadRecentProject}
        onOpenAll={onOpenAllProjects}
      />
      <CreditsBar
        remaining={cloudCreditsRemaining}
        allowance={cloudCreditsAllowance}
        tier={subscriptionTier}
      />
    </>
  );
}

export default function BuilderWorkspaceLayout(props: BuilderWorkspaceLayoutProps) {
  const {
    userId,
    subscriptionTier,
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
    planMode,
    onPlanModeChange,
    previewHtml,
    placeholderPreview,
    previewFrameClass,
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
    importedBusinessName,
    onGooglePlacesImport,
  } = props;

  const showStylesTab = visualEditMode && !!selectedVisualElement;

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
      prompt={prompt}
      onPromptChange={onPromptChange}
      onGenerate={onGenerate}
      isGenerating={isGenerating}
      statusMessage={statusMessage}
      planMode={planMode}
      onPlanModeChange={onPlanModeChange}
      canImportGooglePlaces={canImportGooglePlaces}
      importedBusinessName={importedBusinessName}
      onGooglePlacesImport={onGooglePlacesImport}
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
    />
  );

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
    />
  );

  return (
    <div
      className={`flex-1 min-h-0 flex flex-col relative ${isDraggingZip ? 'ring-2 ring-[var(--accent-cyan)] ring-inset' : ''}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
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
                  ? 'text-[var(--accent-cyan)] border-b-2 border-[var(--accent-cyan)] bg-[var(--accent-cyan)]/5'
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
              cloudCreditsRemaining={cloudCreditsRemaining}
              onSave={onSave}
              onExportZip={onExportZip}
              onMobileExport={onMobileExport}
              onDeployLive={onDeployLive}
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
            >
              {!visualEditMode && (
                <InspectPicker
                  active={inspectMode}
                  onToggle={onToggleInspect}
                  target={inspectTarget}
                  onClearTarget={onClearInspectTarget}
                  onSubmit={onTargetedEdit}
                  isGenerating={isGenerating}
                />
              )}
            </CanvasHeader>
            {visualToolbar}
            <div className={`flex-1 min-h-0 relative ${visualMobilePreview ? 'bg-nisk' : ''}`}>
              <PreviewIframe
                previewHtml={previewHtml}
                placeholderPreview={placeholderPreview}
                previewFrameClass={previewFrameClass}
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
            />
          </div>
        )}
      </div>

      {/* Desktop: three-panel workspace */}
      <div className="hidden md:flex builder-workspace flex-1 min-h-0">
        <aside className="builder-chat-panel flex flex-col min-h-0">
          {chatPanel}
        </aside>

        <main className="builder-preview-panel">
          <CanvasHeader
            canAct={canAct}
            isExporting={isExporting}
            mobileExporting={mobileExporting}
            canPwa={canPwa}
            cloudCreditsRemaining={cloudCreditsRemaining}
            onSave={onSave}
            onExportZip={onExportZip}
            onMobileExport={onMobileExport}
            onDeployLive={onDeployLive}
            onOpenInspector={() => onInspectorOpenChange(!inspectorOpen)}
            inspectorOpen={inspectorOpen}
            inspectorTab={inspectorTab}
            showViewToggle
            onFocusPreview={handleFocusPreview}
            onOpenCodeView={handleOpenCodeView}
          >
            {!visualEditMode && (
              <InspectPicker
                active={inspectMode}
                onToggle={onToggleInspect}
                target={inspectTarget}
                onClearTarget={onClearInspectTarget}
                onSubmit={onTargetedEdit}
                isGenerating={isGenerating}
              />
            )}
            <label className="inline-flex items-center gap-1 text-[10px] text-nisk-muted cursor-pointer btn-secondary rounded-lg px-2 py-1">
              Import ZIP
              <input
                type="file"
                accept=".zip"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) await props.onRestoreZip(file);
                  e.target.value = '';
                }}
              />
            </label>
          </CanvasHeader>
          {visualToolbar}
          <div className={`flex-1 min-h-0 relative ${visualMobilePreview ? 'bg-nisk' : ''}`}>
            <PreviewIframe
              previewHtml={previewHtml}
              placeholderPreview={placeholderPreview}
              previewFrameClass={previewFrameClass}
            />
            <button
              type="button"
              className={`builder-inspector-toggle hidden md:block ${inspectorOpen ? 'is-open' : ''}`}
              onClick={() => onInspectorOpenChange(!inspectorOpen)}
              aria-label={inspectorOpen ? 'Hide inspector' : 'Show inspector'}
            >
              {inspectorOpen ? 'Hide' : 'Code'}
            </button>
          </div>
        </main>

        {inspector}
      </div>
    </div>
  );
}
