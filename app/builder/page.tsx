"use client";

import { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { hasCompletedOnboarding, markOnboardingComplete } from '@/lib/auth';
import { getSafeSession } from '@/lib/supabaseSession';
import { readCloudGenerateStream } from '@/lib/cloud-generate-stream';
import { cleanGeneratedCode, isExportableCode } from '@/lib/cleanGeneratedCode';
import { getDeployablePreviewHtml } from '@/lib/deploy-preview';
import { injectSeoIntoHtml } from '@/lib/seo-inject';
import { buildProjectFiles, filesToMap, type ProjectFile } from '@/lib/project-files';
import {
  buildPageScopedPrompt,
  createPageScaffold,
  getPreviewHtmlForPage,
  inferProjectContext,
  isHtmlPage,
  mergeGeneratedIntoFiles,
  pageDisplayLabel,
  slugifyPageFilename,
  listHtmlPages,
  renameProjectPage,
  deleteProjectPage,
} from '@/lib/project-pages';
import { buildContextualSuggestions } from '@/lib/project-suggestions';
import { isFullAppAuditPrompt } from '@/lib/builder-audit-shared';
import { injectPreviewPageNavScript } from '@/lib/preview-page-nav-inject';
import type { NiskBuildPromptEntry } from '@/lib/niskbuild-config';
import { parseNiskBuildConfig } from '@/lib/niskbuild-config';
import Layout from '@/app/components/Layout';
import WelcomeAssistant from '@/app/components/WelcomeAssistant';
import HelpAssistant from '@/app/components/HelpAssistant';
import DemographicOnboarding from '@/app/components/DemographicOnboarding';
import type { DemographicTier } from '@/lib/demographic-tiers';
import InspectPicker, { injectInspectScript, type InspectTarget } from '@/app/components/InspectPicker';
import SubscriptionGuard from '@/app/components/SubscriptionGuard';
import BuilderSidebar from '@/app/components/BuilderSidebar';
import BuilderProjectsDrawer from '@/app/components/BuilderProjectsDrawer';
import BuilderWorkspaceLayout from '@/app/components/BuilderWorkspaceLayout';
import SocialPublisherPanel from '@/app/components/SocialPublisherPanel';
import { type PreviewDevice, previewFrameClassForDevice } from '@/app/components/PreviewDeviceSwitcher';
import VersionHistoryPanel from '@/app/components/VersionHistoryPanel';
import { type InspectorTab } from '@/app/components/BuilderInspectorPanel';
import PlanPanel from '@/app/components/PlanPanel';
import MobileExportModal from '@/app/components/MobileExportModal';
import { DEFAULT_SEO_SETTINGS, type ProjectSeoSettings } from '@/lib/seo-types';
import {
  canExportNative,
  canExportPwa,
  canImportGooglePlaces,
  canUseCompetitorIntel,
  canUseSocialProofAggregator,
  canUseLocalOllama,
  canUseSeoSchema,
  canUseVisualEditor,
  canUseVisualEditorFull,
  getCloudCreditsForTier,
  isSandboxTier,
  LOCAL_OLLAMA_PRO_BANNER,
} from '@/lib/tier-config';
import type { ComponentBlueprint } from '@/lib/blueprint-schema';
import {
  downloadBlob,
  handleExportError,
  requestNativeExport,
  requestPwaExport,
  type MobileExportPayload,
} from '@/lib/mobile-export-client';
import { getProjectLimit } from '@/lib/project-limits';
import {
  BUILDER_EXPORT_EVENT,
  BUILDER_NEW_PROJECT_EVENT,
} from '@/lib/command-palette-events';
import { slugifyProjectName } from '@/lib/version-limits';
import {
  estimateTokens,
  recordCloudGeneration,
  recordLocalGeneration,
  recordLocalWork,
} from '@/lib/roi-tracker';
import {
  broadcastToPreviewIframes,
  injectVisualEditorScript,
} from '@/lib/visual-editor-inject';
import type { SelectedVisualElement, StyleChanges } from '@/lib/visual-editor-types';
import {
  buildGooglePlacesPrompt,
  buildGooglePlacesUserPrompt,
} from '@/lib/google-places-prompt';
import type {
  GooglePlacesBusiness,
  GooglePlacesProjectContext,
} from '@/lib/google-places-types';
import { getGameTemplate } from '@/lib/game-templates';
import JSZip from 'jszip';

type ProjectSort = 'newest' | 'oldest' | 'name';

const CodeEditor = dynamic(() => import('@/app/components/CodeEditor'), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center text-nisk-muted text-sm">
      Loading editor...
    </div>
  ),
});

const EDITOR_PLACEHOLDER = `// Your generated code will appear here...
// Describe your app below and press Generate`;

const PLACEHOLDER_PREVIEW = `<div style="display:flex;align-items:center;justify-content:center;height:100%;background:linear-gradient(160deg,#1e1a16 0%,#1a1612 100%);color:#8a7d6e;font-family:system-ui,sans-serif;font-size:14px;text-align:center;padding:2rem;"><div style="max-width:320px;padding:2rem;background:#241f1a;border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,0.35);border:1px solid rgba(184,115,51,0.2);"><div style="font-size:36px;margin-bottom:12px">✨</div><p style="margin:0 0 8px;font-weight:600;color:#e8dcc8;">Your preview appears here</p><p style="margin:0;font-size:13px;">Describe your app in the chat and hit <strong style="color:#d49a5c">Generate</strong></p></div></div>`;

interface SavedProject {
  id: string;
  title: string;
  prompt: string;
  generated_code: string;
  created_at: string;
  project_context?: GooglePlacesProjectContext | null;
}

function BuilderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [authChecking, setAuthChecking] = useState(true);
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [prompt, setPrompt] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [activeFile, setActiveFile] = useState('index.html');
  const [projectFiles, setProjectFiles] = useState<ProjectFile[]>(buildProjectFiles(''));
  const [promptHistory, setPromptHistory] = useState<NiskBuildPromptEntry[]>([]);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showDemographic, setShowDemographic] = useState(false);
  const [activeEditorTab, setActiveEditorTab] = useState<'chat' | 'preview' | 'inspector'>('preview');
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>('code');
  const [blueprintData, setBlueprintData] = useState<ComponentBlueprint | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [activityLog, setActivityLog] = useState<string[]>([]);
  const [streamingCode, setStreamingCode] = useState('');
  const [streamingNarration, setStreamingNarration] = useState('');
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [showProjects, setShowProjects] = useState(false);
  const [projectSearch, setProjectSearch] = useState('');
  const [projectSort, setProjectSort] = useState<ProjectSort>('newest');
  const [inspectMode, setInspectMode] = useState(false);
  const [inspectTarget, setInspectTarget] = useState<InspectTarget | null>(null);
  const [isDraggingZip, setIsDraggingZip] = useState(false);
  const [planMode, setPlanMode] = useState(false);
  const [architecturePlan, setArchitecturePlan] = useState<string | null>(null);
  const [subscriptionTier, setSubscriptionTier] = useState('free');
  const [subscriptionStatus, setSubscriptionStatus] = useState('inactive');
  const [useLocalOllama, setUseLocalOllama] = useState(false);
  const [showProOllamaBanner, setShowProOllamaBanner] = useState(false);
  const [projectLimit, setProjectLimit] = useState(1);
  const [showMobileExport, setShowMobileExport] = useState(false);
  const [mobileExporting, setMobileExporting] = useState<'pwa' | 'native' | null>(null);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [currentVersionNumber, setCurrentVersionNumber] = useState(0);
  const [versionHistoryOpen, setVersionHistoryOpen] = useState(false);
  const [seoSettings, setSeoSettings] = useState<ProjectSeoSettings>(DEFAULT_SEO_SETTINGS);
  const [seoSaving, setSeoSaving] = useState(false);
  const [seoGenerating, setSeoGenerating] = useState(false);
  const [seoMessage, setSeoMessage] = useState('');
  const [visualEditMode, setVisualEditMode] = useState(false);
  const [visualMobilePreview, setVisualMobilePreview] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<PreviewDevice>('desktop');
  const [socialPublisherOpen, setSocialPublisherOpen] = useState(false);
  const [purchasedTemplates, setPurchasedTemplates] = useState<unknown[]>([]);
  const [selectedVisualElement, setSelectedVisualElement] = useState<SelectedVisualElement | null>(null);
  const [stylePanel, setStylePanel] = useState<StyleChanges>({});
  const [visualEditApplying, setVisualEditApplying] = useState(false);
  const [visualEditHistory, setVisualEditHistory] = useState<string[]>([]);
  const [cloudCreditsRemaining, setCloudCreditsRemaining] = useState(0);
  const [projectContext, setProjectContext] = useState<GooglePlacesProjectContext | null>(null);
  const previewDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const visualEditDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aiOriginalCodeRef = useRef<string | null>(null);
  const lastCodeLenRef = useRef(0);

  useEffect(() => {
    if (!statusMessage.trim()) return;
    setActivityLog((prev) => {
      if (prev[prev.length - 1] === statusMessage) return prev;
      return [...prev.slice(-48), statusMessage];
    });
  }, [statusMessage]);

  useEffect(() => {
    const checkAuth = async () => {
      const session = await getSafeSession();
      if (!session?.user) {
        setAuthChecking(false);
        return;
      }
      setUser(session.user);
      setAuthChecking(false);
      loadProjects();
      fetch('/api/builder', { method: 'POST', credentials: 'include' })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.tier) {
            setSubscriptionTier(data.tier);
            setProjectLimit(data.projectLimit ?? getProjectLimit(data.tier));
            setCloudCreditsRemaining(data.cloudCreditsRemaining ?? 0);
            const savedLocal = localStorage.getItem('niskbuild_use_local_ollama') === 'true';
            const sandbox = isSandboxTier(data.tier);
            setUseLocalOllama(
              sandbox || (savedLocal && canUseLocalOllama(data.tier))
            );
            if (savedLocal && !canUseLocalOllama(data.tier) && !sandbox) {
              localStorage.removeItem('niskbuild_use_local_ollama');
            }
          }
        })
        .catch(() => {});

      fetch('/api/subscription/status', { credentials: 'include' })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
        if (data?.tier) {
          setSubscriptionTier(data.tier);
          setSubscriptionStatus(data.status ?? 'inactive');
          setProjectLimit(data.projectLimit ?? getProjectLimit(data.tier));
          if (typeof data.credits === 'number') {
            setCloudCreditsRemaining(data.credits);
          }
          if (Array.isArray(data.purchasedTemplates)) {
            setPurchasedTemplates(data.purchasedTemplates);
          }
        }
        })
        .catch(() => {});

      const privacyRes = await fetch('/api/settings/privacy').catch(() => null);
      const privacy = privacyRes?.ok ? await privacyRes.json() : null;

      const fromLogin = searchParams.get('welcome') === '1';
      const needsOnboarding = fromLogin || !hasCompletedOnboarding(session.user.id);

      if (needsOnboarding && privacy?.demographicTier === 'unspecified') {
        setShowDemographic(true);
      } else if (needsOnboarding) {
        setShowWelcome(true);
      }
    };
    checkAuth();
  }, [router, searchParams]);

  useEffect(() => {
    const savedPrompt = localStorage.getItem('niskbuild_template_prompt');
    if (savedPrompt) {
      setPrompt(savedPrompt);
      localStorage.removeItem('niskbuild_template_prompt');
    }
  }, []);

  useEffect(() => {
    if (generatedCode.trim()) {
      localStorage.setItem('niskbuild_current_code', generatedCode);
    }
  }, [generatedCode]);

  useEffect(() => {
    const onExport = () => void handleExportZip();
    const onNewProject = () => handleNewProject();
    window.addEventListener(BUILDER_EXPORT_EVENT, onExport);
    window.addEventListener(BUILDER_NEW_PROJECT_EVENT, onNewProject);
    return () => {
      window.removeEventListener(BUILDER_EXPORT_EVENT, onExport);
      window.removeEventListener(BUILDER_NEW_PROJECT_EVENT, onNewProject);
    };
  }); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const gameId = searchParams.get('game');
    if (!gameId || !user) return;

    const meta = getGameTemplate(gameId);
    if (!meta) return;

    let cancelled = false;

    (async () => {
      setStatusMessage(`🎮 Loading ${meta.name} template...`);
      try {
        const res = await fetch('/api/generate/game', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ template: gameId }),
        });
        const data = await res.json();
        if (cancelled) return;

        if (!res.ok) {
          setPrompt(meta.prompt);
          if (res.status === 403 && data.upgrade) {
            setStatusMessage('Agency plan required for game templates');
          } else {
            setStatusMessage(data.error || 'Could not load game template');
          }
          setTimeout(() => setStatusMessage(''), 8000);
          return;
        }

        if (data.code) {
          setPrompt(meta.prompt);
          setGeneratedCode(data.code);
          setPreviewHtml(cleanGeneratedCode(data.code));
          setProjectFiles(buildProjectFiles(data.code));
          setStatusMessage(`🎮 ${meta.name} ready — customize or export`);
          setTimeout(() => setStatusMessage(''), 6000);
          setActiveEditorTab('preview');
        }
      } catch {
        if (!cancelled) {
          setPrompt(meta.prompt);
          setStatusMessage('Network error loading template — hit Generate');
          setTimeout(() => setStatusMessage(''), 6000);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams, user]);

  const loadProjects = async () => {
    const res = await fetch('/api/projects');
    if (!res.ok) return;
    const data = await res.json();
    const projects: SavedProject[] = data.projects || [];
    setSavedProjects(projects);

    const pendingId = localStorage.getItem('niskbuild_load_project_id');
    if (pendingId) {
      const match = projects.find((p) => p.id === pendingId);
      localStorage.removeItem('niskbuild_load_project_id');
      if (match) {
        setActiveProjectId(match.id);
        setPrompt(match.prompt);
        applyGeneratedCode(match.generated_code, `📂 Loaded: ${match.title}`, {
          prompt: match.prompt,
          timestamp: match.created_at,
        });
      }
    }
  };

  const syncFilesFromCode = (
    rawCode: string,
    fileMap?: Record<string, string>,
    opts?: { preserveActive?: boolean; activePage?: string }
  ) => {
    const files = buildProjectFiles(rawCode, fileMap);
    setProjectFiles(files);
    if (!opts?.preserveActive) {
      setActiveFile(opts?.activePage || files[0]?.path || 'index.html');
    }
    return files;
  };

  const fetchBlueprint = async (effectivePrompt: string) => {
    try {
      const res = await fetch('/api/builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ prompt: effectivePrompt }),
      });
      const data = await res.json();
      if (data?.blueprint) {
        setBlueprintData(data.blueprint);
      }
    } catch {
      // Blueprint is optional enrichment — don't block the editor
    }
  };

  const wrapPreviewHtml = (cleaned: string) => {
    const pagePaths = listHtmlPages(projectFiles).map((f) => f.path);
    let html =
      pagePaths.length > 1 ? injectPreviewPageNavScript(cleaned, pagePaths) : cleaned;
    if (visualEditMode) return injectVisualEditorScript(html);
    if (inspectMode) return injectInspectScript(html);
    return html;
  };

  const applyGeneratedCode = (rawCode: string, status: string, entry?: NiskBuildPromptEntry) => {
    const hasExistingProject = isExportableCode(generatedCode);

    if (hasExistingProject && isHtmlPage(activeFile)) {
      const merged = mergeGeneratedIntoFiles(projectFiles, activeFile, rawCode);
      setProjectFiles(merged);
      if (activeFile === 'index.html') {
        lastCodeLenRef.current = rawCode.length;
        setGeneratedCode(rawCode);
      }
      const preview = getPreviewHtmlForPage(activeFile, merged, generatedCode);
      setPreviewHtml(wrapPreviewHtml(preview));
    } else {
      const cleaned = cleanGeneratedCode(rawCode);
      syncFilesFromCode(rawCode, undefined, { activePage: activeFile });
      lastCodeLenRef.current = rawCode.length;
      setGeneratedCode(rawCode);
      setPreviewHtml(wrapPreviewHtml(cleaned));
    }

    if (!aiOriginalCodeRef.current && isExportableCode(rawCode)) {
      aiOriginalCodeRef.current = rawCode;
    }
    setStatusMessage(status);
    setActiveEditorTab('preview');
    if (entry) {
      setPromptHistory((prev) => [...prev, { ...entry, target: activeFile }]);
      fetchBlueprint(entry.prompt);
    }
  };

  const saveProjectVersionSilent = async (
    code: string,
    promptUsed: string,
    creditsUsed: number
  ) => {
    if (!activeProjectId) return;
    try {
      const res = await fetch(`/api/projects/${activeProjectId}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          generated_code: code,
          blueprint_json: blueprintData,
          prompt_used: promptUsed,
          credits_used: creditsUsed,
        }),
      });
      const data = await res.json();
      if (res.ok && data.version?.version_number) {
        setCurrentVersionNumber(data.version.version_number);
      }
    } catch {
      // background save — never interrupt the user
    }
  };

  const fetchProjectVersionNumber = async (projectId: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/versions`, { credentials: 'include' });
      const data = await res.json();
      if (res.ok) setCurrentVersionNumber(data.latest_version ?? 0);
    } catch {
      setCurrentVersionNumber(0);
    }
  };

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === 'niskbuild-inspect') {
        setInspectTarget({
          tag: e.data.tag || '',
          id: e.data.id || '',
          classes: e.data.classes || '',
          text: e.data.text || '',
        });
      }
      if (e.data?.type === 'niskbuild-visual-select' && visualEditMode) {
        setSelectedVisualElement({
          selector: e.data.selector || '',
          tagName: e.data.tagName || '',
          breadcrumb: Array.isArray(e.data.breadcrumb) ? e.data.breadcrumb : [],
          styles: e.data.styles || {},
        });
        setStylePanel(e.data.styles || {});
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [visualEditMode]);

  useEffect(() => {
    if (!previewHtml || previewHtml === PLACEHOLDER_PREVIEW) return;
    const base = cleanGeneratedCode(generatedCode);
    setPreviewHtml(wrapPreviewHtml(base));
    if (visualEditMode) {
      const timer = setTimeout(() => {
        broadcastToPreviewIframes({ type: 'nisk-visual-toggle', enabled: true });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [inspectMode, visualEditMode]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    broadcastToPreviewIframes({ type: 'nisk-visual-toggle', enabled: visualEditMode });
    if (!visualEditMode) {
      setSelectedVisualElement(null);
      broadcastToPreviewIframes({ type: 'nisk-visual-clear-selection' });
    }
  }, [visualEditMode]);

  const activeFileContent = projectFiles.find((f) => f.path === activeFile)?.content ?? generatedCode;

  const syncPreviewFromHtml = (content: string) => {
    setGeneratedCode(content);
    const cleaned = cleanGeneratedCode(content);
    setPreviewHtml(wrapPreviewHtml(cleaned));

    if (user?.id) {
      const delta = Math.abs(content.length - lastCodeLenRef.current);
      lastCodeLenRef.current = content.length;
      if (delta >= 20) {
        recordLocalWork(user.id, estimateTokens(content.slice(-Math.min(delta, 2000))));
      }
    }
  };

  const updateActiveFileContent = (content: string) => {
    setProjectFiles((prev) =>
      prev.map((f) => (f.path === activeFile ? { ...f, content } : f))
    );

    if (activeFile === 'index.html') {
      if (previewDebounceRef.current) clearTimeout(previewDebounceRef.current);
      previewDebounceRef.current = setTimeout(() => syncPreviewFromHtml(content), 350);
    } else if (isHtmlPage(activeFile)) {
      if (previewDebounceRef.current) clearTimeout(previewDebounceRef.current);
      previewDebounceRef.current = setTimeout(() => {
        const cleaned = cleanGeneratedCode(content);
        setPreviewHtml(wrapPreviewHtml(cleaned));
      }, 350);
    }
  };

  const handleSelectFile = (path: string) => {
    setActiveFile(path);
    if (isHtmlPage(path) && isExportableCode(generatedCode)) {
      const html = getPreviewHtmlForPage(path, projectFiles, generatedCode);
      setPreviewHtml(wrapPreviewHtml(html));
    }
  };

  const handleAddPage = (name: string) => {
    if (!name?.trim()) return;

    const path = slugifyPageFilename(name);
    if (projectFiles.some((f) => f.path === path)) {
      setStatusMessage('❌ That page already exists');
      setTimeout(() => setStatusMessage(''), 4000);
      return;
    }

    const indexHtml =
      projectFiles.find((f) => f.path === 'index.html')?.content?.trim() || generatedCode;
    const scaffold = createPageScaffold(path, indexHtml || '');

    setProjectFiles((prev) => [
      ...prev,
      {
        path,
        name: path.split('/').pop() || path,
        content: scaffold,
        icon: '📄',
      },
    ]);
    handleSelectFile(path);
    setStatusMessage(`📄 Added ${pageDisplayLabel(path)} — prompt to fill it in for your app`);
    setTimeout(() => setStatusMessage(''), 6000);
  };

  const handleRenamePage = (path: string, newName: string) => {
    const result = renameProjectPage(projectFiles, path, newName);
    if (!result) {
      setStatusMessage('❌ Could not rename page');
      setTimeout(() => setStatusMessage(''), 4000);
      return;
    }
    setProjectFiles(result.files);
    if (activeFile === path) {
      handleSelectFile(result.newPath);
    }
    setStatusMessage(`✏️ Renamed to ${pageDisplayLabel(result.newPath)}`);
    setTimeout(() => setStatusMessage(''), 5000);
  };

  const handleDeletePage = (path: string) => {
    const next = deleteProjectPage(projectFiles, path);
    if (!next) return;
    setProjectFiles(next);
    if (activeFile === path) {
      handleSelectFile('index.html');
    }
    setStatusMessage(`🗑️ Deleted ${pageDisplayLabel(path)}`);
    setTimeout(() => setStatusMessage(''), 5000);
  };

  const pageContext = useMemo(
    () =>
      inferProjectContext({
        files: projectFiles,
        activePage: activeFile,
        generatedCode,
        businessName: projectContext?.business?.name ?? null,
        lastPrompt: promptHistory[promptHistory.length - 1]?.prompt,
      }),
    [projectFiles, activeFile, generatedCode, projectContext, promptHistory]
  );

  const promptSuggestions = useMemo(() => {
    const base = buildContextualSuggestions(pageContext);
    return [
      'Run a full export audit before shipping to clients',
      'Check all pages, buttons, and links work on mobile',
      ...base,
    ].slice(0, 6);
  }, [pageContext]);

  const applyAuditReport = (
    report: string,
    summary?: { fail?: number; warn?: number }
  ) => {
    const lines = report.split('\n').filter(Boolean);
    setActivityLog((prev) => [...prev.slice(-12), ...lines]);
    setStatusMessage(
      `📋 Export audit — ${summary?.fail ?? 0} blocking · ${summary?.warn ?? 0} warning(s)`
    );
    setTimeout(() => setStatusMessage(''), 15000);
  };

  const runExportAudit = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    setStatusMessage('📋 Running full export audit…');
    try {
      const res = await fetch('/api/projects/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          files: filesToMap(projectFiles),
          generatedCode,
          activeFile,
          seo: seoSettings,
          subscriptionTier,
          subscriptionStatus,
          projectId: activeProjectId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatusMessage(`❌ ${data.error || 'Audit failed'}`);
        return;
      }
      applyAuditReport(data.report, data.audit?.summary);
    } catch {
      setStatusMessage('❌ Audit request failed — try again');
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    return () => {
      if (previewDebounceRef.current) clearTimeout(previewDebounceRef.current);
      if (visualEditDebounceRef.current) clearTimeout(visualEditDebounceRef.current);
    };
  }, []);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === 'niskbuild-preview-nav' && typeof e.data.path === 'string') {
        const path = e.data.path as string;
        if (projectFiles.some((f) => f.path === path)) {
          handleSelectFile(path);
        }
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [projectFiles, generatedCode, visualEditMode, inspectMode]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (selectedVisualElement) {
      setInspectorOpen(true);
      setInspectorTab('styles');
    }
  }, [selectedVisualElement?.selector]);

  useEffect(() => {
    if (visualEditDebounceRef.current) clearTimeout(visualEditDebounceRef.current);
  }, [selectedVisualElement?.selector]);

  const persistVisualEdit = async (styles: StyleChanges, element: SelectedVisualElement) => {
    if (!isExportableCode(generatedCode)) return;

    setVisualEditApplying(true);
    setVisualEditHistory((prev) => [...prev, generatedCode]);

    try {
      const res = await fetch('/api/visual-edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          currentCode: generatedCode,
          selector: element.selector,
          breadcrumb: element.breadcrumb,
          styles,
          isMobile: visualMobilePreview && canUseVisualEditorFull(subscriptionTier, subscriptionStatus),
          sessionId: user?.id || 'builder',
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setVisualEditHistory((prev) => prev.slice(0, -1));
        if (res.status === 403 || res.status === 402) {
          handleExportError(data.error || 'Visual edit requires Pro plan and credits', data.upgrade);
        } else {
          alert(data.error || 'Visual edit failed');
        }
        return;
      }

      if (data.code) {
        applyGeneratedCode(data.code, `🎨 Visual edit — ${data.creditsUsed ?? 0.3} credits used`);
        if (typeof data.creditsRemaining === 'number') {
          setCloudCreditsRemaining(data.creditsRemaining);
        }
        void saveProjectVersionSilent(
          data.code,
          `Visual edit: ${selectedVisualElement?.selector || 'element'}`,
          Number(data.creditsUsed) || 0.3
        );
      }
    } catch {
      setVisualEditHistory((prev) => prev.slice(0, -1));
      alert('Visual edit failed — network error');
    } finally {
      setVisualEditApplying(false);
    }
  };

  const handleVisualStyleChange = (key: keyof StyleChanges, value: string | number) => {
    if (!selectedVisualElement) return;

    const newStyles = { ...stylePanel, [key]: value };
    setStylePanel(newStyles);

    broadcastToPreviewIframes({
      type: 'nisk-visual-apply',
      selector: selectedVisualElement.selector,
      styles: { [key]: value },
    });

    if (visualEditDebounceRef.current) clearTimeout(visualEditDebounceRef.current);
    visualEditDebounceRef.current = setTimeout(() => {
      persistVisualEdit(newStyles, selectedVisualElement);
    }, 600);
  };

  const handleVisualUndo = () => {
    if (visualEditHistory.length === 0) return;
    const previous = visualEditHistory[visualEditHistory.length - 1];
    setVisualEditHistory((prev) => prev.slice(0, -1));
    applyGeneratedCode(previous, '↩️ Reverted last visual edit');
    setSelectedVisualElement(null);
    broadcastToPreviewIframes({ type: 'nisk-visual-clear-selection' });
  };

  const handleVisualReset = () => {
    if (!aiOriginalCodeRef.current) return;
    setVisualEditHistory([]);
    applyGeneratedCode(aiOriginalCodeRef.current, '🔄 Reset to AI original');
    setSelectedVisualElement(null);
    broadcastToPreviewIframes({ type: 'nisk-visual-clear-selection' });
  };

  const toggleVisualEditMode = () => {
    if (!canUseVisualEditor(subscriptionTier, subscriptionStatus)) {
      handleExportError('Visual editing requires Free or an active paid plan.', true);
      return;
    }
    if (!isExportableCode(generatedCode)) {
      alert('Generate an app first before using visual edit mode.');
      return;
    }
    setVisualEditMode((prev) => {
      const next = !prev;
      if (next) {
        setInspectMode(false);
        setInspectTarget(null);
        if (!aiOriginalCodeRef.current) {
          aiOriginalCodeRef.current = generatedCode;
        }
      }
      return next;
    });
  };

  const restoreFromZip = async (file: File) => {
    const zip = await JSZip.loadAsync(file);
    const configEntry =
      zip.file('generated-app/niskbuild.config.json') ||
      zip.file('niskbuild.config.json');

    if (!configEntry) {
      alert('No niskbuild.config.json found — this ZIP may not be a NiskBuild export.');
      return;
    }

    const config = parseNiskBuildConfig(JSON.parse(await configEntry.async('string')));
    if (!config) {
      alert('Invalid niskbuild.config.json');
      return;
    }

    const mainCode = config.files['index.html'] || Object.values(config.files)[0] || '';
    setPrompt(config.promptHistory[config.promptHistory.length - 1]?.prompt || '');
    setPromptHistory(config.promptHistory);
    syncFilesFromCode(mainCode, config.files);
    if (user?.id) {
      recordLocalWork(user.id, estimateTokens(mainCode));
    }
    applyGeneratedCode(mainCode, '📂 Project restored from local ZIP sync');
    setActiveFile(config.activeFile || 'index.html');
  };

  const handleDemographicComplete = (_tier: DemographicTier) => {
    setShowDemographic(false);
    const fromLogin = searchParams.get('welcome') === '1';
    if (user && (fromLogin || !hasCompletedOnboarding(user.id))) {
      setShowWelcome(true);
    }
  };

  const handleWelcomeComplete = () => {
    if (user) markOnboardingComplete(user.id);
    setShowWelcome(false);
    router.replace('/builder');
  };

  const handlePlan = async (promptOverride?: string) => {
    const effectivePrompt = (promptOverride ?? prompt).trim();
    if (!effectivePrompt) return;

    setIsGenerating(true);
    setArchitecturePlan(null);
    setStatusMessage('📋 Generating architecture plan (0 credits)...');

    try {
      const res = await fetch('/api/builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planOnly: true, prompt: effectivePrompt }),
      });
      const data = await res.json();

      if (data.success && data.plan) {
        setArchitecturePlan(data.plan);
        setStatusMessage('✅ Plan ready — review roadmap, then Build from plan');
      } else {
        setStatusMessage(`❌ ${data.error || 'Plan generation failed'}`);
      }
    } catch {
      setStatusMessage('❌ Network error generating plan');
    } finally {
      setIsGenerating(false);
      setTimeout(() => setStatusMessage(''), 8000);
    }
  };

  const handleGenerate = async (promptOverride?: string) => {
    const basePrompt = (promptOverride ?? prompt).trim();
    if (!basePrompt) return;

    if (isFullAppAuditPrompt(basePrompt)) {
      await runExportAudit();
      return;
    }

    const placesContext = buildGooglePlacesPrompt(projectContext?.business);
    const withPlaces = placesContext
      ? `${basePrompt}\n\n${placesContext}`
      : basePrompt;

    const ctx = inferProjectContext({
      files: projectFiles,
      activePage: activeFile,
      generatedCode,
      businessName: projectContext?.business?.name ?? null,
      lastPrompt: promptHistory[promptHistory.length - 1]?.prompt,
    });
    const effectivePrompt = buildPageScopedPrompt(withPlaces, ctx);

    if (planMode && !promptOverride?.includes('TARGETED EDIT')) {
      await handlePlan(effectivePrompt);
      return;
    }

    setIsGenerating(true);
    setStreamingCode('');
    setStreamingNarration('');
    setActiveProjectId(null);
    setVisualEditHistory([]);
    setSelectedVisualElement(null);
    aiOriginalCodeRef.current = null;
    setGeneratedCode('// Generating...');
    setPreviewHtml('<div style="padding:2rem;text-align:center;color:#94A3B8;background:#0B0F19;height:100%">🔄 Generating your app...</div>');

    const session = await getSafeSession();
    const sandbox = isSandboxTier(subscriptionTier);
    const onProductionHost =
      typeof window !== 'undefined' &&
      !['localhost', '127.0.0.1'].includes(window.location.hostname);
    const useLocalPath =
      !onProductionHost &&
      (sandbox || (useLocalOllama && canUseLocalOllama(subscriptionTier)));

    if (useLocalPath) {
      setStatusMessage('🖥️ Generating via local Ollama...');
      setStreamingNarration(
        'Understanding your request…\nPlanning the page layout…\nGenerating HTML, styles, and interactions…'
      );
      try {
        const localRes = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: effectivePrompt, projectId: activeProjectId }),
          credentials: 'include',
        });
        const localData = await localRes.json();

        if (localRes.ok && localData.success && localData.code) {
          if (session?.user?.id) {
            recordLocalGeneration(session.user.id, effectivePrompt, localData.code);
          }
          applyGeneratedCode(
            localData.code,
            '✅ Generated via Local Ollama',
            { prompt: effectivePrompt, timestamp: new Date().toISOString() }
          );
          void saveProjectVersionSilent(localData.code, effectivePrompt, 0);
          return;
        }

        setGeneratedCode(`// Error: ${localData.error || 'Local generation failed'}`);
        setPreviewHtml(
          `<div style="padding:2rem;color:#EF4444;background:#1a0a0a;height:100%;text-align:center"><h3>❌ Local AI Failed</h3><p>${localData.error || 'Unknown error'}</p></div>`
        );
        if (sandbox) {
          setPreviewHtml(
            `<div style="padding:2rem;color:#94A3B8;background:#1a1612;height:100%;text-align:center"><h3>Sandbox — Local AI</h3><p>Run Ollama locally, or <a href="/pricing" style="color:#d49a5c">upgrade to Pro</a> for cloud AI.</p></div>`
          );
        }
        setStatusMessage(`❌ ${localData.error || 'Local generation failed'}`);
      } catch {
        setGeneratedCode('// Failed to reach local Ollama.');
        setPreviewHtml(
          sandbox
            ? '<div style="padding:2rem;color:#94A3B8;text-align:center;background:#0B0F19;height:100%"><h3>Sandbox mode</h3><p>Start Ollama on your machine, or upgrade for cloud AI.</p></div>'
            : '<div style="padding:2rem;color:#EF4444;text-align:center">❌ Network error — is Ollama running?</div>'
        );
        setStatusMessage('❌ Network error');
      } finally {
        setIsGenerating(false);
        setStreamingNarration('');
        setTimeout(() => setStatusMessage(''), 8000);
      }
      return;
    }

    setStatusMessage(
      sandbox
        ? '☁️ Generating with your free trial cloud credits...'
        : '☁️ Generating with cloud AI (live)...'
    );

    const historyEntry: NiskBuildPromptEntry = { prompt: effectivePrompt, timestamp: new Date().toISOString() };

    try {
      const { code, error } = await readCloudGenerateStream(effectivePrompt, activeProjectId, {
        onNarration: (accumulated) => setStreamingNarration(accumulated),
        onStatus: (message) => setStatusMessage(message),
        onCodeChunk: (accumulated) => {
          setStreamingCode(accumulated);
          if (!(ctx.isExistingProject && isHtmlPage(activeFile) && activeFile !== 'index.html')) {
            setGeneratedCode(accumulated);
          }
          if (previewDebounceRef.current) clearTimeout(previewDebounceRef.current);
          previewDebounceRef.current = setTimeout(() => {
            const cleaned = cleanGeneratedCode(accumulated);
            if (cleaned.length > 80) {
              setPreviewHtml(wrapPreviewHtml(cleaned));
            }
          }, 400);
        },
      });

      setStreamingCode('');
      setStreamingNarration('');

      if (error && !code.trim()) {
        setGeneratedCode(`// Error: ${error}`);
        setPreviewHtml(
          `<div style="padding:2rem;color:#EF4444;background:#1a0a0a;height:100%;text-align:center"><h3>❌ Generation Failed</h3><p>${error}</p><p style="margin-top:1rem"><a href="/pricing" style="color:#d49a5c">View plans</a></p></div>`
        );
        setStatusMessage(`❌ ${error}`);
        return;
      }

      if (!code.trim()) {
        setGeneratedCode('// Error: Generation returned empty code');
        setPreviewHtml(
          '<div style="padding:2rem;color:#EF4444;background:#1a0a0a;height:100%;text-align:center"><h3>❌ Generation Failed</h3><p>Empty response from cloud AI</p></div>'
        );
        setStatusMessage('❌ Generation failed');
        return;
      }

      if (session?.user?.id) {
        recordCloudGeneration(session.user.id, effectivePrompt, code, 1);
      }
      applyGeneratedCode(code, '✅ Generated via Cloud AI (live)', historyEntry);
      void saveProjectVersionSilent(code, effectivePrompt, 1);
    } catch {
      setStreamingCode('');
      setStreamingNarration('');
      setGeneratedCode('// Failed to generate. Please try again.');
      setPreviewHtml('<div style="padding:2rem;color:#EF4444;text-align:center">❌ Network error — please try again</div>');
      setStatusMessage('❌ Network error');
    } finally {
      setIsGenerating(false);
      setStreamingCode('');
      setStreamingNarration('');
      setTimeout(() => setStatusMessage(''), 8000);
    }
  };

  const handleExportZip = async () => {
    if (!isExportableCode(generatedCode)) {
      alert('Generate an app first before exporting.');
      return;
    }

    setIsExporting(true);
    try {
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: generatedCode,
          prompt,
          promptHistory,
          files: filesToMap(projectFiles),
          activeFile,
          projectName: prompt.substring(0, 50) || 'NiskBuild Project',
          seo: seoSettings,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        if (response.status === 403 && err.upgrade) {
          const upgrade = confirm(
            `${err.error}\n\nOpen Pricing to upgrade?`
          );
          if (upgrade) window.location.href = '/pricing';
          return;
        }
        throw new Error(err.error || 'Export failed');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const savedTitle = activeProjectId
        ? savedProjects.find((p) => p.id === activeProjectId)?.title
        : null;
      const baseName = slugifyProjectName(savedTitle || prompt.substring(0, 50) || 'project');
      const versionSuffix = currentVersionNumber > 0 ? `-v${currentVersionNumber}` : '';
      a.download = `${baseName}${versionSuffix}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      setStatusMessage('✅ ZIP exported — your code, your ownership');
    } catch (err) {
      alert(`Export failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsExporting(false);
    }
  };

  const buildMobileExportPayload = (): MobileExportPayload => {
    if (activeProjectId) {
      return { projectId: activeProjectId };
    }
    return {
      inline: {
        title: prompt.substring(0, 50) || 'NiskBuild Project',
        prompt,
        generated_code: generatedCode,
        blueprint_json: blueprintData ?? undefined,
      },
    };
  };

  const handleOpenMobileExport = () => {
    if (!isExportableCode(generatedCode)) {
      alert('Generate an app first before exporting.');
      return;
    }
    if (!canExportPwa(subscriptionTier, subscriptionStatus)) {
      handleExportError('PWA export requires an active Pro plan or above.', true);
      return;
    }
    setShowMobileExport(true);
  };

  const handleExportPwa = async () => {
    setMobileExporting('pwa');
    try {
      const result = await requestPwaExport(buildMobileExportPayload());
      if (!result.ok) {
        handleExportError(result.error || 'PWA export failed', result.upgrade);
        return;
      }
      downloadBlob(result.blob!, result.filename!);
      setShowMobileExport(false);
      setStatusMessage('✅ PWA bundle exported');
      setTimeout(() => setStatusMessage(''), 5000);
    } catch (err) {
      handleExportError(err instanceof Error ? err.message : 'PWA export failed');
    } finally {
      setMobileExporting(null);
    }
  };

  const handleExportNative = async () => {
    setMobileExporting('native');
    try {
      const result = await requestNativeExport(buildMobileExportPayload());
      if (!result.ok) {
        handleExportError(result.error || 'Native export failed', result.upgrade);
        return;
      }
      downloadBlob(result.blob!, result.filename!);
      setShowMobileExport(false);
      setStatusMessage('✅ Native bundle exported');
      setTimeout(() => setStatusMessage(''), 5000);
    } catch (err) {
      handleExportError(err instanceof Error ? err.message : 'Native export failed');
    } finally {
      setMobileExporting(null);
    }
  };

  const handleDeployLive = async () => {
    if (!isExportableCode(generatedCode)) {
      alert('Generate an app first before deploying.');
      return;
    }

    let html = getDeployablePreviewHtml(generatedCode, projectFiles);
    if (seoSettings.title || seoSettings.metaDescription) {
      html = injectSeoIntoHtml(html, seoSettings);
    }
    setStatusMessage('🌐 Publishing live preview link...');

    try {
      const res = await fetch('/api/previews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          html,
          title: prompt?.substring(0, 80) || 'NiskBuild Preview',
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 403) {
          const upgrade = confirm(
            `${data.error || 'Live preview requires an active paid plan.'}\n\nOpen Pricing?`
          );
          if (upgrade) window.location.href = '/pricing';
        } else {
          alert(data.error || 'Failed to publish preview link');
        }
        setStatusMessage(`❌ ${data.error || 'Preview publish failed'}`);
        return;
      }

      const opened = window.open(data.url, '_blank', 'noopener,noreferrer');
      if (!opened) {
        try {
          await navigator.clipboard.writeText(data.url);
          setStatusMessage(`✅ Link copied — ${data.url}`);
        } catch {
          setStatusMessage(`✅ Live preview: ${data.url}`);
        }
      } else {
        setStatusMessage(`✅ Live preview published — ${data.url}`);
      }
    } catch {
      setStatusMessage('❌ Failed to publish preview link');
    }

    setTimeout(() => setStatusMessage(''), 8000);
  };

  const loadProjectSeo = async (projectId: string) => {
    try {
      const res = await fetch(`/api/seo?projectId=${projectId}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        if (data.seo) setSeoSettings(data.seo);
      } else {
        setSeoSettings({ ...DEFAULT_SEO_SETTINGS });
      }
    } catch {
      setSeoSettings({ ...DEFAULT_SEO_SETTINGS });
    }
  };

  const handleSaveSeo = async () => {
    if (!activeProjectId) {
      setSeoMessage('Save your project first to persist SEO settings.');
      return;
    }
    setSeoSaving(true);
    setSeoMessage('');
    try {
      const res = await fetch('/api/seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ projectId: activeProjectId, seo: seoSettings }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.upgrade) {
          const upgrade = confirm(`${data.error}\n\nOpen Pricing?`);
          if (upgrade) window.location.href = '/pricing';
        } else {
          setSeoMessage(data.error || 'Failed to save SEO');
        }
        return;
      }
      if (data.seo) setSeoSettings(data.seo);
      setSeoMessage('✅ SEO settings saved');
    } catch {
      setSeoMessage('Failed to save SEO');
    } finally {
      setSeoSaving(false);
      setTimeout(() => setSeoMessage(''), 5000);
    }
  };

  const handleGenerateSeo = async () => {
    setSeoGenerating(true);
    setSeoMessage('');
    try {
      const res = await fetch('/api/seo/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          prompt,
          pageContent: getDeployablePreviewHtml(generatedCode, projectFiles),
          blueprint: blueprintData,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.upgrade) {
          const upgrade = confirm(`${data.error}\n\nOpen Pricing?`);
          if (upgrade) window.location.href = '/pricing';
        } else {
          setSeoMessage(data.error || 'AI SEO generation failed');
        }
        return;
      }
      const s = data.suggestion;
      setSeoSettings((prev) => ({
        ...prev,
        title: s.title || prev.title,
        metaDescription: s.metaDescription || prev.metaDescription,
        focusKeyword: s.focusKeyword || prev.focusKeyword,
        ogTitle: s.ogTitle || s.title || prev.ogTitle,
        ogDescription: s.ogDescription || s.metaDescription || prev.ogDescription,
        schemaJson: canUseSeoSchema(subscriptionTier, subscriptionStatus)
          ? s.suggestedSchema || prev.schemaJson
          : prev.schemaJson,
        seoScore: data.seoScore ?? prev.seoScore,
      }));
      setSeoMessage('✨ SEO fields updated from AI');
      setInspectorTab('seo');
      setInspectorOpen(true);
    } catch {
      setSeoMessage('AI SEO generation failed');
    } finally {
      setSeoGenerating(false);
      setTimeout(() => setSeoMessage(''), 6000);
    }
  };

  const handleIntegrationAdded = (code: string, message: string, creditsRemaining?: number) => {
    applyGeneratedCode(code, `✅ ${message}`);
    if (typeof creditsRemaining === 'number') {
      setCloudCreditsRemaining(creditsRemaining);
    }
    setStatusMessage(message);
    setTimeout(() => setStatusMessage(''), 8000);
    setInspectorTab('integrations');
    setInspectorOpen(true);
  };

  const filteredProjects = useMemo(() => {
    let list = [...savedProjects];
    const q = projectSearch.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.prompt.toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      if (projectSort === 'name') return a.title.localeCompare(b.title);
      if (projectSort === 'oldest') return a.created_at.localeCompare(b.created_at);
      return b.created_at.localeCompare(a.created_at);
    });
    return list;
  }, [savedProjects, projectSearch, projectSort]);

  const handleDeleteProject = async (project: SavedProject, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    if (!confirm(`Delete "${project.title}"? This cannot be undone.`)) return;

    const res = await fetch(`/api/projects?id=${project.id}`, { method: 'DELETE' });
    const data = await res.json();

    if (!res.ok) {
      alert(`Delete failed: ${data.error || 'Unknown error'}`);
    } else {
      setSavedProjects((prev) => prev.filter((p) => p.id !== project.id));
      setStatusMessage('🗑️ Project deleted');
      setTimeout(() => setStatusMessage(''), 3000);
    }
  };

  const handleSaveProject = async () => {
    if (!user) return;
    if (!isExportableCode(generatedCode)) {
      alert('Generate an app first before saving.');
      return;
    }

    const sandbox = isSandboxTier(subscriptionTier);
    const limit = projectLimit || getProjectLimit(subscriptionTier);
    if (sandbox && savedProjects.length >= limit) {
      const upgrade = confirm(
        `Free tier limited to ${limit} project. Upgrade to Pro for more.\n\nOpen Pricing?`
      );
      if (upgrade) window.location.href = '/pricing';
      return;
    }

    const title = window.prompt('Project name:', prompt.substring(0, 50) || 'Untitled Project');
    if (!title) return;

    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        prompt,
        generated_code: generatedCode,
        project_context: projectContext,
      }),
    });
    const data = await res.json();

    if (!res.ok) {
      if (res.status === 403) {
        const upgrade = confirm(`${data.error}\n\nOpen Pricing to upgrade?`);
        if (upgrade) window.location.href = '/pricing';
      } else {
        alert(`Save failed: ${data.error || 'Unknown error'}`);
      }
    } else {
      setStatusMessage('✅ Project saved');
      if (data.project?.id) setActiveProjectId(data.project.id);
      loadProjects();
      setTimeout(() => setStatusMessage(''), 3000);
    }
  };

  const loadProject = (project: SavedProject) => {
    setActiveProjectId(project.id);
    void fetchProjectVersionNumber(project.id);
    setPrompt(project.prompt);
    const ctx =
      project.project_context?.type === 'google_places' ? project.project_context : null;
    setProjectContext(ctx);
    applyGeneratedCode(project.generated_code, `📂 Loaded: ${project.title}`, {
      prompt: project.prompt,
      timestamp: project.created_at,
    });
    void loadProjectSeo(project.id);
    setShowProjects(false);
    setActiveEditorTab('preview');
  };

  const handleGooglePlacesImport = (
    _business: GooglePlacesBusiness,
    context: GooglePlacesProjectContext
  ) => {
    setProjectContext(context);
    setPrompt(buildGooglePlacesUserPrompt(context.business));
    setStatusMessage(`📍 Imported ${context.business.name} — hit Generate to pre-fill`);
    setTimeout(() => setStatusMessage(''), 8000);
    setActiveEditorTab('chat');
  };

  const handleFigmaScreenshotBuild = async (combinedPrompt: string) => {
    setPlanMode(false);
    setPrompt(combinedPrompt);
    setStatusMessage('🎨 Building from Figma screenshot…');
    await handleGenerate(combinedPrompt);
  };

  const handleNewProject = () => {
    if (
      isExportableCode(generatedCode) &&
      !confirm('Start a new project? Current unsaved work will be cleared.')
    ) {
      return;
    }
    setPrompt('');
    setGeneratedCode('');
    setPreviewHtml(PLACEHOLDER_PREVIEW);
    setProjectFiles(buildProjectFiles(''));
    setActiveFile('index.html');
    setPromptHistory([]);
    setBlueprintData(null);
    setActiveProjectId(null);
    setCurrentVersionNumber(0);
    setVersionHistoryOpen(false);
    setSeoSettings({ ...DEFAULT_SEO_SETTINGS });
    setSeoMessage('');
    setVisualEditHistory([]);
    setSelectedVisualElement(null);
    setVisualEditMode(false);
    setInspectMode(false);
    setInspectTarget(null);
    setArchitecturePlan(null);
    setProjectContext(null);
    setStatusMessage('');
    aiOriginalCodeRef.current = null;
    setActiveEditorTab('preview');
    setInspectorOpen(false);
    setInspectorTab('code');
  };

  const handleTargetedEdit = async (changePrompt: string) => {
    if (!inspectTarget) return;
    const scoped = `${prompt}\n\nTARGETED EDIT — only modify this element, do not change unrelated layout:\nElement: <${inspectTarget.tag.toLowerCase()}>${inspectTarget.id ? ` id="${inspectTarget.id}"` : ''}${inspectTarget.classes ? ` class="${inspectTarget.classes}"` : ''}\nText snippet: "${inspectTarget.text}"\nChange requested: ${changePrompt}`;
    setPrompt(scoped);
    setInspectTarget(null);
    setInspectMode(false);
    await handleGenerate(scoped);
  };

  if (authChecking) {
    return (
      <div className="h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="text-center p-8 rounded-2xl bg-nisk-card shadow-lg border border-nisk">
          <div className="w-10 h-10 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-nisk-muted text-sm font-medium">Loading builder...</p>
        </div>
      </div>
    );
  }

  const userName = user?.email?.split('@')[0];
  const canAct = isExportableCode(generatedCode);
  const canPwa = canExportPwa(subscriptionTier, subscriptionStatus);
  const canNative = canExportNative(subscriptionTier, subscriptionStatus);
  const canVisualEdit = canUseVisualEditor(subscriptionTier, subscriptionStatus);
  const canVisualEditFull = canUseVisualEditorFull(subscriptionTier, subscriptionStatus);
  const canGooglePlaces = canImportGooglePlaces(subscriptionTier, subscriptionStatus);
  const canCompetitorIntel = canUseCompetitorIntel(subscriptionTier, subscriptionStatus);
  const canSocialProof = canUseSocialProofAggregator(subscriptionTier, subscriptionStatus);
  const cloudCreditsAllowance = getCloudCreditsForTier(subscriptionTier);
  const importedBusinessName = projectContext?.business?.name ?? null;
  const recentProjects = savedProjects.slice(0, 5);

  const previewFrameClass =
    visualMobilePreview && canVisualEditFull
      ? previewFrameClassForDevice('mobile')
      : previewFrameClassForDevice(previewDevice);

  return (
    <SubscriptionGuard>
    <Layout variant="builder">
      <DemographicOnboarding open={showDemographic} onComplete={handleDemographicComplete} />
      <WelcomeAssistant open={showWelcome} onComplete={handleWelcomeComplete} userName={userName} />
      <HelpAssistant mode="user" projectId={activeProjectId} />
      <MobileExportModal
        open={showMobileExport}
        projectTitle={prompt.substring(0, 50) || 'Untitled Project'}
        canPwa={canPwa}
        canNative={canNative}
        exporting={mobileExporting}
        onClose={() => setShowMobileExport(false)}
        onExportPwa={handleExportPwa}
        onExportNative={handleExportNative}
      />
      <SocialPublisherPanel
        open={socialPublisherOpen}
        onClose={() => setSocialPublisherOpen(false)}
        prompt={prompt}
        blueprint={blueprintData}
        subscriptionTier={subscriptionTier}
        subscriptionStatus={subscriptionStatus}
        purchasedTemplates={purchasedTemplates}
      />

        <button
        onClick={() => setShowWelcome(true)}
        className="fixed bottom-4 right-4 z-40 w-10 h-10 rounded-full bg-nisk-card border border-nisk text-[var(--primary)] hover:border-[var(--primary)] shadow-lg transition-colors flex items-center justify-center text-sm font-bold"
        title="Help tour (? for shortcuts)"
        aria-label="Open help tour"
      >
        ?
      </button>

      <div className="h-full flex">
        <BuilderSidebar
          onProjectsClick={() => setShowProjects((v) => !v)}
          projectCount={savedProjects.length}
          projectsOpen={showProjects}
        />

        <div className="flex-1 min-w-0 flex flex-col min-h-0 relative">
        {isSandboxTier(subscriptionTier) && savedProjects.length >= projectLimit && (
          <div className="shrink-0 bg-yellow-500/10 border-b border-yellow-500/30 p-3 text-center">
            <p className="text-yellow-400 text-sm">
              Free tier limit: {savedProjects.length}/{projectLimit} project.{' '}
              <a href="/pricing" className="text-[var(--primary)] hover:underline ml-1">
                Upgrade to Pro →
              </a>
            </p>
          </div>
        )}
        {showProOllamaBanner && subscriptionTier === 'pro' && (
          <div className="shrink-0 flex items-start justify-between gap-3 px-4 py-2.5 border-b border-[var(--accent-cyan)]/30 bg-[var(--accent-cyan)]/10">
            <p className="text-xs text-gray-200 leading-relaxed">{LOCAL_OLLAMA_PRO_BANNER}</p>
            <button
              type="button"
              onClick={() => setShowProOllamaBanner(false)}
              className="shrink-0 text-nisk-muted hover:text-white text-sm px-1"
              aria-label="Dismiss banner"
            >
              ✕
            </button>
          </div>
        )}
        <BuilderProjectsDrawer
          open={showProjects}
          onClose={() => setShowProjects(false)}
          projects={savedProjects}
          filteredProjects={filteredProjects}
          projectSearch={projectSearch}
          projectSort={projectSort}
          onSearchChange={setProjectSearch}
          onSortChange={setProjectSort}
          onLoad={loadProject}
          onDelete={handleDeleteProject}
        />

        <BuilderWorkspaceLayout
          userId={user?.id}
          subscriptionTier={subscriptionTier}
          subscriptionStatus={subscriptionStatus}
          cloudCreditsRemaining={cloudCreditsRemaining}
          cloudCreditsAllowance={cloudCreditsAllowance}
          recentProjects={recentProjects}
          onNewProject={handleNewProject}
          onLoadRecentProject={(p) => {
            const full = savedProjects.find((s) => s.id === p.id);
            if (full) loadProject(full);
          }}
          onOpenAllProjects={() => setShowProjects(true)}
          projectLimit={projectLimit}
          savedProjectsCount={savedProjects.length}
          canAct={canAct}
          canPwa={canPwa}
          canVisualEdit={canVisualEdit}
          canVisualEditFull={canVisualEditFull}
          canUseLocalOllama={canUseLocalOllama(subscriptionTier)}
          prompt={prompt}
          onPromptChange={setPrompt}
          onGenerate={() => handleGenerate()}
          isGenerating={isGenerating}
          statusMessage={statusMessage}
          activityLog={activityLog}
          streamingCode={streamingCode}
          streamingNarration={streamingNarration}
          planMode={planMode}
          onPlanModeChange={setPlanMode}
          previewHtml={previewHtml}
          placeholderPreview={PLACEHOLDER_PREVIEW}
          previewFrameClass={previewFrameClass}
          previewDevice={previewDevice}
          onPreviewDeviceChange={setPreviewDevice}
          canShareSocial={canAct}
          onOpenSocialPublisher={() => setSocialPublisherOpen(true)}
          visualEditMode={visualEditMode}
          visualMobilePreview={visualMobilePreview}
          selectedVisualElement={selectedVisualElement}
          stylePanel={stylePanel}
          visualEditApplying={visualEditApplying}
          visualEditHistoryLength={visualEditHistory.length}
          hasAiOriginal={!!aiOriginalCodeRef.current}
          inspectMode={inspectMode}
          inspectTarget={inspectTarget}
          onToggleVisualEdit={toggleVisualEditMode}
          onToggleMobilePreview={() => setVisualMobilePreview((v) => !v)}
          onVisualUndo={handleVisualUndo}
          onVisualReset={handleVisualReset}
          onStyleChange={handleVisualStyleChange}
          onToggleInspect={() => {
            setInspectMode((v) => !v);
            setInspectTarget(null);
          }}
          onClearInspectTarget={() => setInspectTarget(null)}
          onTargetedEdit={handleTargetedEdit}
          onSave={handleSaveProject}
          onExportZip={handleExportZip}
          onMobileExport={handleOpenMobileExport}
          onDeployLive={handleDeployLive}
          isExporting={isExporting}
          mobileExporting={mobileExporting !== null}
          onRestoreZip={restoreFromZip}
          isDraggingZip={isDraggingZip}
          onDragOver={(e) => { e.preventDefault(); setIsDraggingZip(true); }}
          onDragLeave={() => setIsDraggingZip(false)}
          onDrop={async (e) => {
            e.preventDefault();
            setIsDraggingZip(false);
            const file = e.dataTransfer.files[0];
            if (file?.name.endsWith('.zip')) await restoreFromZip(file);
          }}
          mobileTab={activeEditorTab}
          onMobileTabChange={setActiveEditorTab}
          inspectorOpen={inspectorOpen}
          onInspectorOpenChange={setInspectorOpen}
          inspectorTab={inspectorTab}
          onInspectorTabChange={setInspectorTab}
          projectFiles={projectFiles}
          activeFile={activeFile}
          onSelectFile={handleSelectFile}
          promptSuggestions={promptSuggestions}
          editingPageLabel={
            isExportableCode(generatedCode) && isHtmlPage(activeFile)
              ? pageContext.pageLabel
              : undefined
          }
          onAddPage={handleAddPage}
          onRenamePage={handleRenamePage}
          onDeletePage={handleDeletePage}
          canAddPage={canAct || !isExportableCode(generatedCode)}
          onRunExportAudit={() => void runExportAudit()}
          codeEditor={
            <CodeEditor
              path={activeFile}
              value={activeFileContent || EDITOR_PLACEHOLDER}
              onChange={updateActiveFileContent}
            />
          }
          blueprintData={blueprintData}
          useLocalOllama={useLocalOllama}
          onUseLocalOllamaChange={(enabled) => {
            setUseLocalOllama(enabled);
            localStorage.setItem('niskbuild_use_local_ollama', String(enabled));
          }}
          onOllamaUpgrade={() => {
            if (subscriptionTier === 'pro') setShowProOllamaBanner(true);
            else router.push('/pricing');
          }}
          isSandboxAtLimit={isSandboxTier(subscriptionTier) && savedProjects.length >= projectLimit}
          canImportGooglePlaces={canGooglePlaces}
          canUseCompetitorIntel={canCompetitorIntel}
          canUseSocialProof={canSocialProof}
          importedBusinessName={importedBusinessName}
          onGooglePlacesImport={handleGooglePlacesImport}
          onBuildFromFigmaScreenshot={(p) => void handleFigmaScreenshotBuild(p)}
          seoSettings={seoSettings}
          onSeoChange={setSeoSettings}
          activeProjectId={activeProjectId}
          onSaveSeo={handleSaveSeo}
          onGenerateSeo={handleGenerateSeo}
          seoSaving={seoSaving}
          seoGenerating={seoGenerating}
          seoMessage={seoMessage}
          generatedCode={generatedCode}
          onIntegrationAdded={handleIntegrationAdded}
          onIntegrationStatus={setStatusMessage}
          onOpenHistory={() => setVersionHistoryOpen((v) => !v)}
          versionHistoryOpen={versionHistoryOpen}
        />

        <VersionHistoryPanel
          open={versionHistoryOpen}
          onClose={() => setVersionHistoryOpen(false)}
          projectId={activeProjectId}
          subscriptionTier={subscriptionTier}
          onRestore={(payload) => {
            setPrompt(payload.prompt);
            if (payload.blueprint_json) {
              setBlueprintData(payload.blueprint_json as ComponentBlueprint);
            }
            applyGeneratedCode(
              payload.generated_code,
              `↩️ Restored from v${payload.restored_version}`,
              { prompt: payload.prompt, timestamp: new Date().toISOString() }
            );
            setCurrentVersionNumber(payload.restored_version);
          }}
        />


          {architecturePlan && (
            <PlanPanel
              plan={architecturePlan}
              onClose={() => setArchitecturePlan(null)}
              onBuildFromPlan={async () => {
                const planContext = `${prompt}\n\n--- APPROVED ARCHITECTURE PLAN ---\n${architecturePlan}`;
                setPlanMode(false);
                setArchitecturePlan(null);
                setPrompt(planContext);
                await handleGenerate(planContext);
              }}
              isBuilding={isGenerating}
            />
          )}

        </div>
      </div>
    </Layout>
    </SubscriptionGuard>
  );
}

export default function BuilderPage() {
  return (
    <Suspense fallback={
      <div className="h-screen flex items-center justify-center bg-nisk">
        <div className="w-10 h-10 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <BuilderContent />
    </Suspense>
  );
}
