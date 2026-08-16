'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ArrowRight, Hash, Loader2, LogIn, Plus, Users } from 'lucide-react';
import type { StudyGroup } from '@/lib/shift-ai/groups-shared';
import { SA } from '@/lib/shift-ai/theme';

type Tab = 'my' | 'create' | 'join';

export default function ShiftAiGroupsClient({
  subjectOptions,
  initialGroups,
}: {
  subjectOptions: string[];
  initialGroups: StudyGroup[];
}) {
  const t = useTranslations('groups');
  const router = useRouter();
  const groups = initialGroups;
  const [tab, setTab] = useState<Tab>('my');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', subject: subjectOptions[0] ?? '' });
  const [joinCode, setJoinCode] = useState('');

  const createGroup = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/shift-ai/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          subject: form.subject || null,
        }),
      });
      const data = (await res.json()) as { group?: StudyGroup; error?: string };
      if (!res.ok) {
        setError(data.error || t('createFailed'));
        return;
      }
      if (data.group) {
        router.push(`/builder/shift-ai/groups/${data.group.id}`);
      }
    } catch {
      setError(t('createFailed'));
    } finally {
      setSaving(false);
    }
  };

  const joinGroup = async () => {
    if (!joinCode.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/shift-ai/groups/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode: joinCode.trim() }),
      });
      const data = (await res.json()) as { group?: StudyGroup; error?: string };
      if (!res.ok) {
        setError(data.error || t('joinFailed'));
        return;
      }
      if (data.group) {
        router.push(`/builder/shift-ai/groups/${data.group.id}`);
      }
    } catch {
      setError(t('joinFailed'));
    } finally {
      setSaving(false);
    }
  };

  const tabs: { id: Tab; label: string; icon: typeof Users }[] = [
    { id: 'my', label: t('tabMy'), icon: Users },
    { id: 'create', label: t('tabCreate'), icon: Plus },
    { id: 'join', label: t('tabJoin'), icon: LogIn },
  ];

  return (
    <div className={SA.content}>
      <div className="mb-8">
        <h1 className={SA.heading}>{t('title')}</h1>
        <p className={`mt-2 text-sm ${SA.muted}`}>{t('subtitle')}</p>
      </div>

      <div className="mb-6 flex gap-1 rounded-xl bg-[var(--sa-navy-50)] p-1">
        {tabs.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setTab(item.id);
                setError(null);
              }}
              className={tab === item.id ? SA.tabActive : SA.tab}
            >
              <Icon className="h-3.5 w-3.5" />
              {item.label}
            </button>
          );
        })}
      </div>

      {error ? <div className={`${SA.error} mb-4`}>{error}</div> : null}

      {tab === 'my' ? (
        <div className="space-y-3">
          {groups.length === 0 ? (
            <div className={`${SA.cardPadded} text-center`}>
              <p className={`text-sm ${SA.muted}`}>{t('empty')}</p>
              <button
                type="button"
                onClick={() => setTab('create')}
                className={`${SA.btnPrimary} mt-4`}
              >
                <Plus className="h-4 w-4" />
                {t('createFirst')}
              </button>
            </div>
          ) : (
            groups.map((group) => (
              <Link
                key={group.id}
                href={`/builder/shift-ai/groups/${group.id}`}
                className={`${SA.cardHover} flex items-center justify-between gap-4 p-5`}
              >
                <div>
                  <p className={`font-bold ${SA.text}`}>{group.name}</p>
                  {group.subject ? (
                    <p className={`mt-0.5 text-sm ${SA.muted}`}>{group.subject}</p>
                  ) : null}
                  <p className={`mt-2 flex items-center gap-1 text-xs ${SA.muted}`}>
                    <Users className="h-3.5 w-3.5" />
                    {t('memberCount', { count: group.member_count ?? 1 })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 rounded-lg bg-[var(--sa-navy-50)] px-2 py-1 font-mono text-xs font-bold tracking-widest">
                    <Hash className="h-3 w-3" />
                    {group.invite_code}
                  </span>
                  <ArrowRight className={`h-4 w-4 rtl:-scale-x-100 ${SA.muted}`} />
                </div>
              </Link>
            ))
          )}
        </div>
      ) : null}

      {tab === 'create' ? (
        <div className={`${SA.cardPadded} max-w-lg space-y-4`}>
          <div>
            <label className={`mb-1 block text-xs font-semibold uppercase tracking-wide ${SA.muted}`}>
              {t('groupName')}
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder={t('groupNamePlaceholder')}
              className={SA.input}
            />
          </div>
          <div>
            <label className={`mb-1 block text-xs font-semibold uppercase tracking-wide ${SA.muted}`}>
              {t('subjectOptional')}
            </label>
            <select
              value={form.subject}
              onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
              className={SA.select}
            >
              <option value="">{t('noSubject')}</option>
              {subjectOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => void createGroup()}
            disabled={saving || !form.name.trim()}
            className={SA.btnPrimary}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {t('createGroup')}
          </button>
        </div>
      ) : null}

      {tab === 'join' ? (
        <div className={`${SA.cardPadded} max-w-lg space-y-4`}>
          <div>
            <label className={`mb-1 block text-xs font-semibold uppercase tracking-wide ${SA.muted}`}>
              {t('inviteCode')}
            </label>
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              placeholder={t('invitePlaceholder')}
              className={`${SA.input} font-mono tracking-widest`}
            />
          </div>
          <button
            type="button"
            onClick={() => void joinGroup()}
            disabled={saving || !joinCode.trim()}
            className={SA.btnPrimary}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
            {t('joinGroup')}
          </button>
        </div>
      ) : null}
    </div>
  );
}
