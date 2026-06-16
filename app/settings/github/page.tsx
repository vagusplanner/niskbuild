"use client";

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Layout from '@/app/components/Layout';
import { getSafeSession } from '@/lib/supabaseSession';

const TOKEN_KEY = 'github_token';
const REPO_KEY = 'github_selected_repo';
const CODE_KEY = 'niskbuild_current_code';

type GitHubRepo = {
  id: number;
  full_name: string;
  private: boolean;
};

export default function GitHubSettingsPage() {
  const [authChecked, setAuthChecked] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [githubToken, setGithubToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [reposLoading, setReposLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [selectedRepo, setSelectedRepo] = useState('');
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchRepos = useCallback(async (token: string) => {
    setReposLoading(true);
    try {
      const response = await fetch(`/api/github/sync?token=${encodeURIComponent(token)}`, {
        credentials: 'include',
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load repositories');
      }
      setRepos(Array.isArray(data.repos) ? data.repos : []);
    } catch (error) {
      console.error('Failed to fetch repos:', error);
      setStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to load repositories',
      });
      setRepos([]);
    } finally {
      setReposLoading(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      const session = await getSafeSession();
      setSignedIn(!!session?.user);
      setAuthChecked(true);

      if (!session?.user) return;

      const params = new URLSearchParams(window.location.search);
      const oauthError = params.get('error');
      if (oauthError) {
        setStatus({ type: 'error', message: decodeURIComponent(oauthError) });
        window.history.replaceState({}, '', '/settings/github');
      }

      const tokenFromUrl = params.get('token');
      const token = tokenFromUrl || localStorage.getItem(TOKEN_KEY);

      if (tokenFromUrl) {
        localStorage.setItem(TOKEN_KEY, tokenFromUrl);
        window.history.replaceState({}, '', '/settings/github');
      }

      const savedRepo = localStorage.getItem(REPO_KEY);
      if (savedRepo) setSelectedRepo(savedRepo);

      if (token) {
        setGithubToken(token);
        setConnected(true);
        void fetchRepos(token);
      }
    };

    void init();
  }, [fetchRepos]);

  const handleConnect = () => {
    const clientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID;
    if (!clientId) {
      setStatus({
        type: 'error',
        message: 'GitHub OAuth is not configured. Add NEXT_PUBLIC_GITHUB_CLIENT_ID to your environment.',
      });
      return;
    }
    const redirectUri = `${window.location.origin}/api/github/callback`;
    window.location.href = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=repo,user`;
  };

  const handleDisconnect = () => {
    setGithubToken('');
    setConnected(false);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REPO_KEY);
    setRepos([]);
    setSelectedRepo('');
    setStatus({ type: 'success', message: 'Disconnected from GitHub.' });
  };

  const handleRepoChange = (value: string) => {
    setSelectedRepo(value);
    if (value) localStorage.setItem(REPO_KEY, value);
    else localStorage.removeItem(REPO_KEY);
  };

  const handleSync = async () => {
    if (!selectedRepo) {
      setStatus({ type: 'error', message: 'Please select a repository.' });
      return;
    }

    setLoading(true);
    setStatus(null);
    try {
      const projectCode =
        localStorage.getItem(CODE_KEY) ||
        '// Export a project from the Builder first, or paste code here.\nexport default function App() {\n  return <div>Hello from NiskBuild</div>;\n}\n';

      const response = await fetch('/api/github/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          repo: selectedRepo,
          token: githubToken,
          files: [
            { path: 'src/App.tsx', content: projectCode },
            {
              path: 'README.md',
              content: `# NiskBuild Project\n\nGenerated with NiskBuild on ${new Date().toISOString()}\n`,
            },
          ],
          commitMessage: `Update from NiskBuild — ${new Date().toLocaleString()}`,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Sync failed');
      }

      setStatus({
        type: 'success',
        message: `Successfully synced to GitHub. View: ${data.commitUrl}`,
      });
    } catch (error) {
      console.error('Sync error:', error);
      setStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to sync with GitHub',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!authChecked) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="w-8 h-8 border-4 border-[var(--accent-cyan)] border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!signedIn) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto py-8">
          <h1 className="text-3xl font-bold text-[var(--foreground)] mb-2">GitHub Sync</h1>
          <p className="text-nisk-muted mb-6">Sign in to connect GitHub and push your NiskBuild projects.</p>
          <Link href="/login?next=/settings/github" className="btn-primary px-6 py-3 rounded-xl inline-block">
            Sign in
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto py-8">
        <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-[var(--foreground)] mb-2">GitHub Sync</h1>
            <p className="text-nisk-muted">
              Connect your GitHub account to push NiskBuild project code directly to a repository.
            </p>
          </div>
          <Link href="/dashboard/settings" className="text-sm text-[var(--accent-cyan)] hover:underline">
            ← Settings
          </Link>
        </div>

        {status && (
          <div
            className={`mb-6 rounded-xl border px-4 py-3 text-sm ${
              status.type === 'success'
                ? 'border-[var(--success)]/30 bg-[var(--success)]/10 text-[var(--tagline)]'
                : 'border-[var(--error)]/20 bg-[var(--surface)] text-[var(--foreground)]'
            }`}
          >
            {status.message}
          </div>
        )}

        {!connected ? (
          <div className="glass-panel rounded-2xl p-8 text-center">
            <div className="text-5xl mb-4" aria-hidden="true">
              🐙
            </div>
            <h2 className="text-xl font-semibold text-[var(--foreground)] mb-2">Connect GitHub</h2>
            <p className="text-nisk-muted text-sm mb-6 max-w-md mx-auto">
              Authorize NiskBuild to push to repositories you choose. Your token stays in this browser — we
              do not store it on our servers.
            </p>
            <button type="button" onClick={handleConnect} className="btn-primary px-6 py-3 rounded-xl inline-flex items-center gap-2">
              <svg className="w-5 h-5" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.3.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
              </svg>
              Connect GitHub Account
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="glass-panel rounded-xl p-4 flex items-center gap-3 flex-wrap">
              <div className="w-3 h-3 rounded-full bg-[var(--success)] animate-pulse" />
              <span className="text-sm text-[var(--tagline)] font-medium">Connected to GitHub</span>
              <button
                type="button"
                onClick={handleDisconnect}
                className="ml-auto text-xs text-[var(--muted)] hover:text-[var(--foreground)] underline"
              >
                Disconnect
              </button>
            </div>

            <div className="glass-panel rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">Select repository</h3>

              {reposLoading ? (
                <p className="text-nisk-muted text-sm">Loading repositories…</p>
              ) : repos.length > 0 ? (
                <select
                  value={selectedRepo}
                  onChange={(e) => handleRepoChange(e.target.value)}
                  className="w-full p-3 glass-input rounded-xl text-[var(--foreground)]"
                >
                  <option value="">Select a repository…</option>
                  {repos.map((repo) => (
                    <option key={repo.id} value={repo.full_name}>
                      {repo.full_name} ({repo.private ? 'Private' : 'Public'})
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-nisk-muted text-sm">
                  No repositories found. Create one on GitHub first, then refresh this page.
                </p>
              )}

              <button
                type="button"
                onClick={handleSync}
                disabled={loading || !selectedRepo}
                className="mt-4 w-full py-3 btn-primary rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Syncing…
                  </>
                ) : (
                  'Push to GitHub'
                )}
              </button>
            </div>

            <div className="glass-panel rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">How it works</h3>
              <ul className="space-y-2 text-sm text-nisk-muted list-disc pl-5">
                <li>Your current builder code (from local storage) is pushed to the selected repository</li>
                <li>A README.md is included with each sync</li>
                <li>Each sync creates a new commit on the default branch</li>
                <li>Your GitHub token stays in this browser — we never store it server-side</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
