'use client';

import { useState } from 'react';
import { GraduationCap, Loader2, Plus, Target, Trophy } from 'lucide-react';
import type { MentorChallenge, ObserverSnapshot } from '@/lib/shift-ai/observer-shared';

type Tab = 'overview' | 'challenges';

export default function ShiftAiMentorViewClient({
  snapshot,
  initialChallenges,
  mentorToken,
}: {
  snapshot: ObserverSnapshot;
  initialChallenges: MentorChallenge[];
  mentorToken: string;
}) {
  const [tab, setTab] = useState<Tab>('overview');
  const [challenges, setChallenges] = useState(initialChallenges);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [rewardText, setRewardText] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { student, planner, mastery, activity } = snapshot;

  const assignChallenge = async () => {
    if (!title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/shift-ai/mentor/${mentorToken}/challenges`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, rewardText }),
      });
      const data = (await res.json()) as { challenge?: MentorChallenge; error?: string };
      if (!res.ok) {
        setError(data.error || 'Could not assign challenge');
        return;
      }
      if (data.challenge) {
        setChallenges((prev) => [data.challenge!, ...prev]);
        setTitle('');
        setDescription('');
        setRewardText('');
        setTab('challenges');
      }
    } catch {
      setError('Could not assign challenge');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#050d1a] to-[#0a1628] px-4 py-8">
      <div className="mx-auto max-w-4xl space-y-5">
        <div className="rounded-2xl bg-white p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-700">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                Mentor Dashboard
              </p>
              <h1 className="text-xl font-bold text-[var(--sa-navy-900)]">
                {student.fullName}&apos;s Progress
              </h1>
              <p className="text-sm text-neutral-500">
                {student.yearGroup} · {student.keyStage}
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-1 rounded-xl bg-white/10 p-1">
          {(['overview', 'challenges'] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium capitalize transition-all ${
                tab === t ? 'bg-white text-[var(--sa-navy-800)] shadow-sm' : 'text-white/60 hover:text-white'
              }`}
            >
              {t === 'overview' ? 'Overview' : 'Challenges'}
            </button>
          ))}
        </div>

        {error ? (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}

        {tab === 'overview' ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: 'Tasks Done', value: planner.completed, icon: '✅' },
                { label: 'Overdue', value: planner.overdue, icon: '⚠️' },
                { label: 'Mastery %', value: `${mastery[0]?.masteredPercent ?? 0}%`, icon: '🎯' },
                { label: 'Arcade Best', value: activity.arcadeBestScore, icon: '🏆' },
              ].map((s) => (
                <div key={s.label} className="rounded-2xl border bg-white p-4 text-center">
                  <p className="mb-1 text-2xl">{s.icon}</p>
                  <p className="text-xl font-bold text-[var(--sa-navy-900)]">{s.value}</p>
                  <p className="text-xs text-neutral-500">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="rounded-2xl bg-white p-5">
              <h2 className="mb-3 flex items-center gap-2 font-bold text-[var(--sa-navy-800)]">
                <Target className="h-4 w-4 text-amber-500" />
                Topics needing attention
              </h2>
              {mastery.flatMap((g) =>
                g.topics.filter((t) => t.status !== 'mastered').slice(0, 2).map((t) => (
                  <div
                    key={t.id}
                    className="mb-2 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-amber-900">{t.topic}</p>
                      <p className="text-xs text-amber-700">{g.subject}</p>
                    </div>
                    <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700">
                      {t.status.replace('_', ' ')}
                    </span>
                  </div>
                ))
              )}
              {mastery.every((g) => g.topics.every((t) => t.status === 'mastered')) ? (
                <p className="text-sm text-neutral-500">All tracked topics look strong.</p>
              ) : null}
            </div>
          </div>
        ) : null}

        {tab === 'challenges' ? (
          <div className="space-y-4">
            <div className="space-y-4 rounded-2xl bg-white p-6">
              <h2 className="flex items-center gap-2 font-bold text-[var(--sa-navy-800)]">
                <Target className="h-4 w-4 text-purple-600" />
                Assign a study challenge
              </h2>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Challenge title *"
                className="w-full rounded-xl border px-3 py-2 text-sm"
              />
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What should the student do?"
                rows={3}
                className="w-full resize-none rounded-xl border px-3 py-2 text-sm"
              />
              <input
                type="text"
                value={rewardText}
                onChange={(e) => setRewardText(e.target.value)}
                placeholder="Reward (optional, e.g. extra screen time)"
                className="w-full rounded-xl border px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={() => void assignChallenge()}
                disabled={saving || !title.trim()}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-700 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Assign challenge
              </button>
            </div>

            {challenges.length === 0 ? (
              <div className="rounded-2xl bg-white p-8 text-center">
                <Trophy className="mx-auto mb-3 h-10 w-10 text-neutral-300" />
                <p className="text-sm text-neutral-500">No challenges assigned yet.</p>
              </div>
            ) : (
              challenges.map((c) => (
                <div key={c.id} className="rounded-2xl border-2 border-neutral-200 bg-white p-5">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                      {c.status}
                    </span>
                  </div>
                  <p className="font-bold text-[var(--sa-navy-900)]">{c.title}</p>
                  {c.description ? (
                    <p className="mt-1 text-sm text-neutral-600">{c.description}</p>
                  ) : null}
                  {c.reward_text ? (
                    <p className="mt-1 text-xs font-medium text-amber-700">🎁 {c.reward_text}</p>
                  ) : null}
                  <p className="mt-2 text-xs text-neutral-400">
                    {new Date(c.created_at).toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </div>
        ) : null}

        <p className="pb-4 text-center text-xs text-white/20">
          Shift Learning · Secure mentor view
        </p>
      </div>
    </div>
  );
}
