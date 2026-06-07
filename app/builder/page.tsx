"use client";

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { hasCompletedOnboarding, markOnboardingComplete } from '@/lib/auth';
import { getSafeSession } from '@/lib/supabaseSession';
import Layout from '@/app/components/Layout';
import WelcomeAssistant from '@/app/components/WelcomeAssistant';

const FILES = [
  { name: 'index.html', icon: '📄' },
  { name: 'styles.css', icon: '🎨' },
  { name: 'script.js', icon: '⚡' },
];

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
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const session = await getSafeSession();
      if (!session?.user) {
        router.replace('/login?next=/builder');
        return;
      }
      setUser(session.user);
      setAuthChecking(false);

      const fromLogin = searchParams.get('welcome') === '1';
      if (fromLogin || !hasCompletedOnboarding(session.user.id)) {
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

  const handleWelcomeComplete = () => {
    if (user) markOnboardingComplete(user.id);
    setShowWelcome(false);
    router.replace('/builder');
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setGeneratedCode('// Generating...');

    try {
      const session = await getSafeSession();
      const response = await fetch('/api/cloud-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          userId: session?.user?.id,
          useLocal: false,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setGeneratedCode(data.code);
        setPreviewHtml(data.code);
      } else {
        setGeneratedCode(`// Error: ${data.error}`);
      }
    } catch {
      setGeneratedCode('// Failed to generate. Please try again.');
    } finally {
      setIsGenerating(false);
    }
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

  return (
    <Layout variant="builder">
      <WelcomeAssistant
        open={showWelcome}
        onComplete={handleWelcomeComplete}
        userName={userName}
      />

      <button
        onClick={() => setShowWelcome(true)}
        className="fixed bottom-4 right-4 z-40 w-10 h-10 rounded-full bg-nisk-card border border-nisk text-white hover:border-[var(--primary)] shadow-lg transition-colors flex items-center justify-center text-sm font-bold"
        title="How does NiskBuild work?"
        aria-label="Open help tour"
      >
        ?
      </button>

      <div className="h-full flex">
        <div className="w-full md:w-[42%] lg:w-[38%] flex flex-col border-r border-nisk bg-nisk-surface">
          <div className="flex items-center gap-1 px-3 pt-12 pb-0 border-b border-nisk overflow-x-auto shrink-0">
            <span className="text-[10px] uppercase tracking-wider text-nisk-muted px-2 py-2 shrink-0">Explorer</span>
            {FILES.map((file) => (
              <button
                key={file.name}
                onClick={() => setActiveFile(file.name)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs rounded-t-lg transition-colors shrink-0 ${
                  activeFile === file.name
                    ? 'bg-[var(--code-bg)] text-white border-t border-x border-nisk'
                    : 'text-nisk-muted hover:text-white'
                }`}
              >
                <span>{file.icon}</span>
                {file.name}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-auto code-panel min-h-0">
            <pre className="h-full">
              <code>{generatedCode || '// Your generated code will appear here...\n// Describe your app below and press Generate'}</code>
            </pre>
          </div>

          <div className="shrink-0 border-t border-nisk bg-nisk-card p-4">
            <label className="block text-xs font-medium text-nisk-muted uppercase tracking-wider mb-2">
              Prompt to Build
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the application you want to build..."
              className="w-full bg-nisk border border-nisk rounded-lg p-3 text-white placeholder-gray-500 resize-none focus:outline-none focus:border-[var(--primary)] text-sm"
              rows={3}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  handleGenerate();
                }
              }}
            />
            <div className="flex items-center justify-between mt-2">
              <p className="text-[11px] text-nisk-muted">⌘ + Enter to generate</p>
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                className="px-5 py-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {isGenerating ? 'Generating...' : 'Generate →'}
              </button>
            </div>
          </div>
        </div>

        <div className="hidden md:flex flex-1 flex-col bg-nisk min-w-0">
          <div className="flex items-center justify-between px-4 pt-12 pb-2 border-b border-nisk shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[var(--success)] status-dot-active" />
              <span className="text-sm font-medium text-white">Live Preview</span>
            </div>
            <span className="text-[11px] text-nisk-muted font-mono">sandbox</span>
          </div>
          <div className="flex-1 min-h-0 relative">
            <iframe
              srcDoc={
                previewHtml ||
                '<div style="display:flex;align-items:center;justify-content:center;height:100%;background:#0B0F19;color:#94A3B8;font-family:system-ui,sans-serif;font-size:14px;text-align:center;padding:2rem;"><div><div style="font-size:32px;margin-bottom:12px">⚡</div>Your live preview will appear here<br><span style="color:#4F6EF7;margin-top:8px;display:block">Describe your app and hit Generate</span></div></div>'
              }
              title="Live Preview"
              className="absolute inset-0 w-full h-full border-0 bg-white"
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
            />
          </div>
        </div>
      </div>
    </Layout>
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
