"use client";

import { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { hasCompletedOnboarding, markOnboardingComplete } from '@/lib/auth';
import { getSafeSession } from '@/lib/supabaseSession';
import { cleanGeneratedCode, isExportableCode } from '@/lib/cleanGeneratedCode';
import { buildProjectFiles, filesToMap, type ProjectFile } from '@/lib/project-files';
import type { NiskBuildPromptEntry } from '@/lib/niskbuild-config';
import { parseNiskBuildConfig } from '@/lib/niskbuild-config';
import Layout from '@/app/components/Layout';
import WelcomeAssistant from '@/app/components/WelcomeAssistant';
import DemographicOnboarding from '@/app/components/DemographicOnboarding';
import type { DemographicTier } from '@/lib/demographic-tiers';
import FileTree from '@/app/components/FileTree';
import InspectPicker, { injectInspectScript, type InspectTarget } from '@/app/components/InspectPicker';
import ProjectLimitBadge from '@/app/components/ProjectLimitBadge';
import SubscriptionGuard from '@/app/components/SubscriptionGuard';
import RoiTracker from '@/app/components/RoiTracker';
import BuilderSidebar from '@/app/components/BuilderSidebar';
import ResizableSplit from '@/app/components/ResizableSplit';
import PromptBar from '@/app/components/PromptBar';
import PlanPanel from '@/app/components/PlanPanel';
import BuilderOllamaSettings, {
  BuilderOllamaLockedHint,
} from '@/app/components/BuilderOllamaSettings';
import {
  canUseLocalOllama,
  isSandboxTier,
  LOCAL_OLLAMA_PRO_BANNER,
} from '@/lib/tier-config';
import { getProjectLimit } from '@/lib/project-limits';
import {
  estimateTokens,
  isLocalProvider,
  recordCloudGeneration,
  recordLocalGeneration,
  recordLocalWork,
} from '@/lib/roi-tracker';
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

const PLACEHOLDER_PREVIEW = `<div style="display:flex;align-items:center;justify-content:center;height:100%;background:#0B0F19;color:#94A3B8;font-family:system-ui,sans-serif;font-size:14px;text-align:center;padding:2rem;"><div><div style="font-size:32px;margin-bottom:12px">⚡</div>Your live preview will appear here<br><span style="color:#4F6EF7;margin-top:8px;display:block">Describe your app and hit Generate</span></div></div>`;

interface SavedProject {
  id: string;
  title: string;
  prompt: string;
  generated_code: string;
  created_at: string;
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
  const [showPreview, setShowPreview] = useState(true);
  const [statusMessage, setStatusMessage] = useState('');
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
  const [useLocalOllama, setUseLocalOllama] = useState(false);
  const [showProOllamaBanner, setShowProOllamaBanner] = useState(false);
  const [projectLimit, setProjectLimit] = useState(1);
  const previewDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCodeLenRef = useRef(0);

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
        setPrompt(match.prompt);
        applyGeneratedCode(match.generated_code, `📂 Loaded: ${match.title}`, {
          prompt: match.prompt,
          timestamp: match.created_at,
        });
      }
    }
  };

  const syncFilesFromCode = (rawCode: string, fileMap?: Record<string, string>) => {
    const files = buildProjectFiles(rawCode, fileMap);
    setProjectFiles(files);
    setActiveFile(files[0]?.path || 'index.html');
    return files;
  };

  const applyGeneratedCode = (rawCode: string, status: string, entry?: NiskBuildPromptEntry) => {
    const cleaned = cleanGeneratedCode(rawCode);
    syncFilesFromCode(rawCode);
    lastCodeLenRef.current = rawCode.length;
    setGeneratedCode(rawCode);
    setPreviewHtml(inspectMode ? injectInspectScript(cleaned) : cleaned);
    setStatusMessage(status);
    setShowPreview(true);
    if (entry) {
      setPromptHistory((prev) => [...prev, entry]);
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
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  useEffect(() => {
    if (!previewHtml || previewHtml === PLACEHOLDER_PREVIEW) return;
    const base = cleanGeneratedCode(generatedCode);
    setPreviewHtml(inspectMode ? injectInspectScript(base) : base);
  }, [inspectMode]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeFileContent = projectFiles.find((f) => f.path === activeFile)?.content ?? generatedCode;

  const syncPreviewFromHtml = (content: string) => {
    setGeneratedCode(content);
    const cleaned = cleanGeneratedCode(content);
    setPreviewHtml(inspectMode ? injectInspectScript(cleaned) : cleaned);

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
    }
  };

  useEffect(() => {
    return () => {
      if (previewDebounceRef.current) clearTimeout(previewDebounceRef.current);
    };
  }, []);

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
    const effectivePrompt = (promptOverride ?? prompt).trim();
    if (!effectivePrompt) return;

    if (planMode && !promptOverride?.includes('TARGETED EDIT')) {
      await handlePlan(promptOverride);
      return;
    }

    setIsGenerating(true);
    setGeneratedCode('// Generating...');
    setPreviewHtml('<div style="padding:2rem;text-align:center;color:#94A3B8;background:#0B0F19;height:100%">🔄 Generating your app...</div>');

    const session = await getSafeSession();
    const sandbox = isSandboxTier(subscriptionTier);
    const useLocalPath =
      sandbox || (useLocalOllama && canUseLocalOllama(subscriptionTier));

    if (useLocalPath) {
      setStatusMessage('🖥️ Generating via local Ollama...');
      try {
        const localRes = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: effectivePrompt }),
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
          return;
        }

        setGeneratedCode(`// Error: ${localData.error || 'Local generation failed'}`);
        setPreviewHtml(
          `<div style="padding:2rem;color:#EF4444;background:#1a0a0a;height:100%;text-align:center"><h3>❌ Local AI Failed</h3><p>${localData.error || 'Unknown error'}</p></div>`
        );
        if (sandbox) {
          setPreviewHtml(
            `<div style="padding:2rem;color:#94A3B8;background:#0B0F19;height:100%;text-align:center"><h3>Sandbox — Local AI</h3><p>Run Ollama locally, or <a href="/pricing" style="color:#7C3AED">upgrade to Pro</a> for cloud AI.</p></div>`
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
        setTimeout(() => setStatusMessage(''), 8000);
      }
      return;
    }

    if (sandbox) {
      setGeneratedCode('// Cloud AI requires a paid plan.');
      setPreviewHtml(
        '<div style="padding:2rem;color:#94A3B8;background:#0B0F19;height:100%;text-align:center"><h3>Upgrade for cloud AI</h3><p>Sandbox includes local preview + 1 saved project. Pro unlocks cloud credits.</p></div>'
      );
      setStatusMessage('☁️ Cloud AI requires Pro or higher');
      setIsGenerating(false);
      setTimeout(() => setStatusMessage(''), 8000);
      return;
    }

    setStatusMessage('🔄 Starting generation with self-correction...');

    try {
      // 1. Try self-heal loop first (fixes code errors automatically)
      setStatusMessage('🔄 Attempt 1/5: Self-correction loop...');
      const selfHealRes = await fetch('/api/self-heal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: effectivePrompt }),
        credentials: 'include',
      });
      const selfHealData = await selfHealRes.json();

      const historyEntry: NiskBuildPromptEntry = { prompt: effectivePrompt, timestamp: new Date().toISOString() };

      if (selfHealData.success && selfHealData.code) {
        if (session?.user?.id) {
          recordCloudGeneration(
            session.user.id,
            effectivePrompt,
            selfHealData.code,
            1
          );
        }
        applyGeneratedCode(
          selfHealData.code,
          `✅ Generated in ${selfHealData.attempts ?? 1} attempt(s) with self-correction`,
          historyEntry
        );
        return;
      }

      if (selfHealData.code) {
        if (session?.user?.id) {
          recordCloudGeneration(session.user.id, effectivePrompt, selfHealData.code, 1);
        }
        applyGeneratedCode(
          selfHealData.code,
          `⚠️ Best attempt (${selfHealData.errors?.length ?? 0} issues remain)`,
          historyEntry
        );
        return;
      }

      // 2. Fallback to cloud AI
      setStatusMessage('☁️ Falling back to cloud AI...');
      const response = await fetch('/api/cloud-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: effectivePrompt }),
        credentials: 'include',
      });

      const data = await response.json();

      if (data.success && data.code) {
        if (session?.user?.id) {
          if (isLocalProvider(data.source)) {
            recordLocalGeneration(session.user.id, effectivePrompt, data.code);
          } else {
            recordCloudGeneration(
              session.user.id,
              effectivePrompt,
              data.code,
              1
            );
          }
        }
        applyGeneratedCode(
          data.code,
          `✅ Generated via ${data.source === 'local' ? 'Local AI' : 'Cloud AI'}`,
          { prompt: effectivePrompt, timestamp: new Date().toISOString() }
        );
      } else {
        setGeneratedCode(`// Error: ${data.error || 'Generation failed'}`);
        setPreviewHtml(`<div style="padding:2rem;color:#EF4444;background:#1a0a0a;height:100%;text-align:center"><h3>❌ Generation Failed</h3><p>${data.error || 'Unknown error'}</p></div>`);
        setStatusMessage(`❌ ${data.error || 'Generation failed'}`);
      }
    } catch {
      setGeneratedCode('// Failed to generate. Please try again.');
      setPreviewHtml('<div style="padding:2rem;color:#EF4444;text-align:center">❌ Network error — please try again</div>');
      setStatusMessage('❌ Network error');
    } finally {
      setIsGenerating(false);
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
      a.download = `niskbuild-export-${Date.now()}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      setStatusMessage('✅ ZIP exported — your code, your ownership');
    } catch (err) {
      alert(`Export failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeployLive = async () => {
    if (!isExportableCode(generatedCode)) {
      alert('Generate an app first before deploying.');
      return;
    }

    const html = cleanGeneratedCode(generatedCode);
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
        alert(data.error || 'Failed to publish preview link');
        setStatusMessage(`❌ ${data.error || 'Preview publish failed'}`);
        return;
      }

      window.open(data.url, '_blank', 'noopener,noreferrer');
      setStatusMessage(`✅ Live preview published — ${data.url}`);
    } catch {
      setStatusMessage('❌ Failed to publish preview link');
    }

    setTimeout(() => setStatusMessage(''), 8000);
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
      body: JSON.stringify({ title, prompt, generated_code: generatedCode }),
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
      loadProjects();
      setTimeout(() => setStatusMessage(''), 3000);
    }
  };

  const loadProject = (project: SavedProject) => {
    setPrompt(project.prompt);
    applyGeneratedCode(project.generated_code, `📂 Loaded: ${project.title}`, {
      prompt: project.prompt,
      timestamp: project.created_at,
    });
    setShowProjects(false);
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
      <div className="h-screen flex items-center justify-center bg-nisk">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-nisk-muted text-sm">Loading builder...</p>
        </div>
      </div>
    );
  }

  const userName = user?.email?.split('@')[0];
  const canAct = isExportableCode(generatedCode);

  return (
    <SubscriptionGuard>
    <Layout variant="builder">
      <DemographicOnboarding open={showDemographic} onComplete={handleDemographicComplete} />
      <WelcomeAssistant open={showWelcome} onComplete={handleWelcomeComplete} userName={userName} />

      <button
        onClick={() => setShowWelcome(true)}
        className="fixed bottom-4 right-4 z-40 w-10 h-10 rounded-full bg-nisk-card border border-nisk text-white hover:border-[var(--accent-cyan)] shadow-lg transition-colors flex items-center justify-center text-sm font-bold"
        title="How does NiskBuild work?"
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

        <div className="flex-1 min-w-0 flex flex-col relative">
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
        {/* Builder action toolbar */}
        <div className="shrink-0 flex items-center justify-between gap-2 px-3 py-2 border-b border-nisk bg-nisk-surface overflow-x-auto">
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowPreview(false)}
              className={`btn-secondary px-3 py-1.5 text-xs rounded-lg md:hidden ${
                !showPreview ? 'border-[var(--accent-cyan)] text-[var(--accent-cyan)]' : ''
              }`}
            >
              Code
            </button>
            <button
              onClick={() => setShowPreview(true)}
              className={`btn-secondary px-3 py-1.5 text-xs rounded-lg md:hidden ${
                showPreview ? 'border-[var(--success)] text-[var(--success)]' : ''
              }`}
            >
              Preview
            </button>
            {user && (
              <span className="hidden sm:inline">
                <ProjectLimitBadge userId={user.id} currentCount={savedProjects.length} />
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleSaveProject}
              disabled={!canAct}
              className="btn-secondary px-3 py-1.5 text-xs rounded-lg disabled:opacity-40"
            >
              Save
            </button>
            <button
              onClick={handleExportZip}
              disabled={!canAct || isExporting}
              className="btn-secondary px-3 py-1.5 text-xs rounded-lg disabled:opacity-40"
            >
              {isExporting ? 'Exporting...' : 'Export ZIP'}
            </button>
            <button
              onClick={handleDeployLive}
              disabled={!canAct}
              className="btn-success px-3 py-1.5 text-xs rounded-lg disabled:opacity-40"
            >
              Deploy Live
            </button>
          </div>
        </div>

        {/* Saved projects panel */}
        {showProjects && (
          <div className="shrink-0 border-b border-nisk bg-nisk-card px-4 py-3">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <p className="text-[10px] uppercase tracking-wider text-nisk-muted mr-2">My Projects</p>
              <input
                type="text"
                placeholder="Search projects..."
                value={projectSearch}
                onChange={(e) => setProjectSearch(e.target.value)}
                className="flex-1 min-w-[140px] max-w-xs bg-nisk border border-nisk rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[var(--accent-cyan)]"
              />
              <select
                value={projectSort}
                onChange={(e) => setProjectSort(e.target.value as ProjectSort)}
                className="bg-nisk border border-nisk rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-[var(--accent-cyan)]"
              >
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="name">Name A–Z</option>
              </select>
            </div>
            {savedProjects.length === 0 ? (
              <p className="text-xs text-nisk-muted">No saved projects yet. Generate and click Save.</p>
            ) : filteredProjects.length === 0 ? (
              <p className="text-xs text-nisk-muted">No projects match your search.</p>
            ) : (
              <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto">
                {filteredProjects.map((p) => (
                  <div key={p.id} className="flex items-center gap-0.5">
                    <button
                      onClick={() => loadProject(p)}
                      className="px-3 py-1.5 text-xs rounded-l-lg bg-nisk-surface border border-nisk hover:border-[var(--primary)] text-white transition-colors"
                      title={new Date(p.created_at).toLocaleDateString()}
                    >
                      {p.title}
                    </button>
                    <button
                      onClick={(e) => handleDeleteProject(p, e)}
                      className="px-2 py-1.5 text-xs rounded-r-lg bg-nisk-surface border border-l-0 border-nisk hover:border-[var(--error)] hover:text-[var(--error)] text-nisk-muted transition-colors"
                      title="Delete project"
                      aria-label={`Delete ${p.title}`}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div
          className={`flex-1 flex flex-col min-h-0 relative ${isDraggingZip ? 'ring-2 ring-[var(--accent-cyan)] ring-inset' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setIsDraggingZip(true); }}
          onDragLeave={() => setIsDraggingZip(false)}
          onDrop={async (e) => {
            e.preventDefault();
            setIsDraggingZip(false);
            const file = e.dataTransfer.files[0];
            if (file?.name.endsWith('.zip')) await restoreFromZip(file);
          }}
        >
          {isDraggingZip && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 backdrop-blur-sm pointer-events-none">
              <p className="text-[var(--accent-cyan)] font-medium">Drop NiskBuild ZIP to restore project</p>
            </div>
          )}

          {/* Mobile: code panel */}
          <div className={`flex-1 min-h-0 flex flex-col md:hidden bg-nisk-surface ${!showPreview ? 'flex' : 'hidden'}`}>
            <div className="flex min-h-0 flex-1">
              <div className="w-28 shrink-0 border-r border-nisk flex flex-col bg-nisk-card min-h-0">
                <div className="flex-1 overflow-y-auto min-h-0">
                  <FileTree
                    files={projectFiles}
                    activePath={activeFile}
                    onSelect={setActiveFile}
                  />
                </div>
                {canUseLocalOllama(subscriptionTier) ? (
                  <BuilderOllamaSettings
                    tier={subscriptionTier}
                    useLocalOllama={useLocalOllama}
                    onUseLocalOllamaChange={(enabled) => {
                      setUseLocalOllama(enabled);
                      localStorage.setItem('niskbuild_use_local_ollama', String(enabled));
                    }}
                  />
                ) : (
                  <BuilderOllamaLockedHint
                    onUpgradeClick={() => {
                      if (subscriptionTier === 'pro') {
                        setShowProOllamaBanner(true);
                      } else {
                        router.push('/pricing');
                      }
                    }}
                  />
                )}
              </div>
              <div className="flex-1 flex flex-col min-w-0">
                <div className="flex items-center gap-2 px-3 py-2 border-b border-nisk shrink-0">
                  <span className="text-[10px] uppercase tracking-wider text-nisk-muted">Editor</span>
                  <span className="text-[11px] font-mono text-[var(--accent-cyan)] truncate">{activeFile}</span>
                </div>
                <div className="flex-1 min-h-0 code-panel">
                  <CodeEditor
                    path={activeFile}
                    value={activeFileContent || EDITOR_PLACEHOLDER}
                    onChange={updateActiveFileContent}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Mobile: preview panel */}
          <div className={`flex-1 min-h-0 flex flex-col md:hidden ${showPreview ? 'flex' : 'hidden'}`}>
            <div className="flex items-center justify-between px-4 py-2 border-b border-nisk shrink-0">
              <span className="text-sm font-medium text-white">Live Preview</span>
              <InspectPicker
                active={inspectMode}
                onToggle={() => {
                  setInspectMode((v) => !v);
                  setInspectTarget(null);
                }}
                target={inspectTarget}
                onClearTarget={() => setInspectTarget(null)}
                onSubmit={handleTargetedEdit}
                isGenerating={isGenerating}
              />
            </div>
            <div className="flex-1 min-h-0 relative">
              <iframe
                key={`mobile-${previewHtml.slice(0, 80)}`}
                srcDoc={previewHtml || PLACEHOLDER_PREVIEW}
                title="Live Preview"
                className="absolute inset-0 w-full h-full border-0 bg-white"
                sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals"
              />
            </div>
          </div>

          <div className="flex-1 min-h-0 hidden md:flex flex-col">
            <ResizableSplit
              defaultLeftPercent={34}
              minLeftPercent={20}
              maxLeftPercent={55}
              left={
                <div className="h-full flex flex-col bg-nisk-surface border-r border-nisk">
                  <div className="flex min-h-0 flex-1">
                    <div className="w-32 lg:w-40 shrink-0 border-r border-nisk flex flex-col bg-nisk-card min-h-0">
                      <div className="flex-1 overflow-y-auto min-h-0">
                        <FileTree
                          files={projectFiles}
                          activePath={activeFile}
                          onSelect={setActiveFile}
                        />
                      </div>
                      <RoiTracker userId={user?.id} />
                      {canUseLocalOllama(subscriptionTier) ? (
                        <BuilderOllamaSettings
                          tier={subscriptionTier}
                          useLocalOllama={useLocalOllama}
                          onUseLocalOllamaChange={(enabled) => {
                            setUseLocalOllama(enabled);
                            localStorage.setItem('niskbuild_use_local_ollama', String(enabled));
                          }}
                        />
                      ) : (
                        <BuilderOllamaLockedHint
                          onUpgradeClick={() => {
                            if (subscriptionTier === 'pro') {
                              setShowProOllamaBanner(true);
                            } else {
                              router.push('/pricing');
                            }
                          }}
                        />
                      )}
                    </div>
                    <div className="flex-1 flex flex-col min-w-0">
                      <div className="flex items-center gap-2 px-3 py-2 border-b border-nisk shrink-0">
                        <span className="text-[10px] uppercase tracking-wider text-nisk-muted">Editor</span>
                        <span className="text-[11px] font-mono text-[var(--accent-cyan)] truncate">{activeFile}</span>
                      </div>
                      <div className="flex-1 min-h-0 code-panel">
                        <CodeEditor
                          path={activeFile}
                          value={activeFileContent || EDITOR_PLACEHOLDER}
                          onChange={updateActiveFileContent}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              }
              right={
                <div className="h-full flex flex-col bg-nisk min-w-0">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-nisk shrink-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="w-2 h-2 rounded-full bg-[var(--success)] status-dot-active" />
                      <span className="text-sm font-medium text-white">Live Preview</span>
                      <InspectPicker
                        active={inspectMode}
                        onToggle={() => {
                          setInspectMode((v) => !v);
                          setInspectTarget(null);
                        }}
                        target={inspectTarget}
                        onClearTarget={() => setInspectTarget(null)}
                        onSubmit={handleTargetedEdit}
                        isGenerating={isGenerating}
                      />
                      <label className="hidden sm:inline-flex items-center gap-1 text-[10px] text-nisk-muted cursor-pointer btn-secondary rounded-lg px-2 py-1">
                        Import ZIP
                        <input
                          type="file"
                          accept=".zip"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) await restoreFromZip(file);
                            e.target.value = '';
                          }}
                        />
                      </label>
                    </div>
                    <span className="text-[11px] text-nisk-muted font-mono">sandbox</span>
                  </div>
                  <div className="flex-1 min-h-0 relative">
                    <iframe
                      key={previewHtml.slice(0, 80)}
                      srcDoc={previewHtml || PLACEHOLDER_PREVIEW}
                      title="Live Preview"
                      className="absolute inset-0 w-full h-full border-0 bg-white"
                      sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals"
                    />
                  </div>
                </div>
              }
            />
          </div>

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

          <PromptBar
            prompt={prompt}
            onChange={setPrompt}
            onGenerate={() => handleGenerate()}
            isGenerating={isGenerating}
            statusMessage={statusMessage}
            planMode={planMode}
            onPlanModeChange={setPlanMode}
          />
        </div>
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
