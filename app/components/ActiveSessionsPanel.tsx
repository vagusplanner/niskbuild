"use client";

import { useCallback, useEffect, useState } from 'react';

const SESSION_TOKEN_KEY = 'niskbuild_session_key';

interface SessionRow {
  id: string;
  label: string;
  lastActive: string;
  createdAt: string;
  isCurrent: boolean;
}

export default function ActiveSessionsPanel() {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [sessionLimit, setSessionLimit] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem(SESSION_TOKEN_KEY) || '';
      const res = await fetch(
        `/api/session/list?sessionToken=${encodeURIComponent(token)}`,
        { credentials: 'include' }
      );
      const data = await res.json();
      if (res.ok) {
        setSessions(data.sessions || []);
        if (typeof data.sessionLimit === 'number') setSessionLimit(data.sessionLimit);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const revoke = async (id: string) => {
    setRevoking(id);
    setMessage('');
    try {
      const res = await fetch(`/api/session/revoke?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to sign out device');
      }
      setMessage('Device signed out');
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to sign out');
    } finally {
      setRevoking(null);
    }
  };

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  };

  const [revokingOthers, setRevokingOthers] = useState(false);

  const revokeOthers = async () => {
    setRevokingOthers(true);
    setMessage('');
    try {
      const token = localStorage.getItem(SESSION_TOKEN_KEY) || '';
      const res = await fetch(
        `/api/session/revoke-others?sessionToken=${encodeURIComponent(token)}`,
        { method: 'DELETE', credentials: 'include' }
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to sign out other devices');
      }
      setMessage('Signed out all other devices');
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to sign out others');
    } finally {
      setRevokingOthers(false);
    }
  };

  return (
    <section className="bg-nisk-card border border-nisk rounded-xl p-6 mb-6">
      <div className="flex items-center justify-between gap-3 mb-2">
        <h2 className="text-lg font-semibold text-white">Active sessions</h2>
        {sessions.length > 1 && (
          <button
            type="button"
            onClick={revokeOthers}
            disabled={revokingOthers}
            className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50"
          >
            {revokingOthers ? 'Signing out…' : 'Sign out all others'}
          </button>
        )}
      </div>
      <p className="text-sm text-nisk-muted mb-4">
        Devices signed in during the last 24 hours.
        {sessionLimit != null && sessionLimit < 999999 && (
          <> Your plan allows <span className="text-white">{sessionLimit}</span> concurrent session{sessionLimit !== 1 ? 's' : ''} — oldest devices are signed out when you exceed the limit.</>
        )}
      </p>

      {loading ? (
        <p className="text-sm text-nisk-muted">Loading sessions...</p>
      ) : sessions.length === 0 ? (
        <p className="text-sm text-nisk-muted">No active sessions recorded.</p>
      ) : (
        <ul className="space-y-3">
          {sessions.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between gap-3 p-3 rounded-lg bg-nisk border border-nisk"
            >
              <div className="min-w-0">
                <p className="text-sm text-white font-medium truncate">
                  {s.label}
                  {s.isCurrent && (
                    <span className="ml-2 text-[10px] uppercase tracking-wider text-[var(--accent-cyan)]">
                      This device
                    </span>
                  )}
                </p>
                <p className="text-xs text-nisk-muted mt-0.5">
                  Last active {formatTime(s.lastActive)}
                </p>
              </div>
              {!s.isCurrent && (
                <button
                  type="button"
                  onClick={() => revoke(s.id)}
                  disabled={revoking === s.id}
                  className="shrink-0 text-xs px-3 py-1.5 rounded-lg border border-red-500/40 text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                >
                  {revoking === s.id ? 'Signing out...' : 'Sign out'}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {message && <p className="text-xs text-nisk-muted mt-3">{message}</p>}
    </section>
  );
}
