'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Copy, GraduationCap, Loader2, Plus, Users, Volume2 } from 'lucide-react';
import {
  SHIFT_CURRICULA,
  SHIFT_CURRICULUM_FLAGS,
  SHIFT_CURRICULUM_LABELS,
  SHIFT_STUDY_LANGUAGES,
  SHIFT_STUDY_LANGUAGE_LABELS,
  type ShiftCurriculum,
  type ShiftStudyLanguage,
} from '@/lib/shift-ai/constants';
import {
  AI_PERSONA_OPTIONS,
  type InviteTokenInfo,
  type SettingsProfile,
} from '@/lib/shift-ai/settings-shared';
import { SA } from '@/lib/shift-ai/theme';

const VOICE_FALLBACKS = [
  'Google UK English Female',
  'Google UK English Male',
  'Samantha',
  'Daniel',
  'Karen',
];

export default function ShiftAiSettingsClient({
  profile,
  initialTokens,
  appOrigin,
}: {
  profile: SettingsProfile;
  initialTokens: { parent: InviteTokenInfo[]; mentor: InviteTokenInfo[] };
  appOrigin: string;
}) {
  const router = useRouter();
  const [curriculum, setCurriculum] = useState(profile.curriculum);
  const [yearGroup, setYearGroup] = useState(profile.year_group);
  const [subjects, setSubjects] = useState(profile.favourite_subjects);
  const [newSubject, setNewSubject] = useState('');
  const [voiceEnabled, setVoiceEnabled] = useState(profile.voice_enabled);
  const [preferredVoice, setPreferredVoice] = useState(profile.preferred_voice ?? '');
  const [studyLanguage, setStudyLanguage] = useState<ShiftStudyLanguage>(profile.study_language);
  const [personas, setPersonas] = useState<Record<string, string>>(
    Object.fromEntries(
      profile.subjects.map((s) => [s.name, s.aiPersona ?? 'chill'])
    )
  );
  const [voiceOptions, setVoiceOptions] = useState(VOICE_FALLBACKS);
  const [parentTokens, setParentTokens] = useState(initialTokens.parent);
  const [mentorTokens, setMentorTokens] = useState(initialTokens.mentor);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState<'parent' | 'mentor' | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const load = () => {
      const voices = window.speechSynthesis?.getVoices() ?? [];
      const names = voices.map((v) => v.name).filter(Boolean);
      if (names.length > 0) {
        setVoiceOptions(names.filter((n) => n.toLowerCase().includes('english')).slice(0, 12));
      }
    };
    load();
    window.speechSynthesis?.addEventListener('voiceschanged', load);
    return () => window.speechSynthesis?.removeEventListener('voiceschanged', load);
  }, []);

  const saveSettings = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch('/api/shift-ai/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          curriculum: profile.canEditCurriculum ? curriculum : undefined,
          yearGroup: profile.canEditCurriculum ? yearGroup : undefined,
          favouriteSubjects: subjects,
          voiceEnabled,
          preferredVoice: preferredVoice || null,
          studyLanguage,
          subjectPersonas: subjects.map((name) => ({
            name,
            aiPersona: personas[name] ?? 'chill',
          })),
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error || 'Could not save settings');
        return;
      }
      setSaved(true);
      router.refresh();
    } catch {
      setError('Could not save settings');
    } finally {
      setSaving(false);
    }
  };

  const generateToken = async (type: 'parent' | 'mentor') => {
    setGenerating(type);
    setError(null);
    try {
      const res = await fetch(`/api/shift-ai/settings/tokens/${type}`, { method: 'POST' });
      const data = (await res.json()) as { token?: InviteTokenInfo; error?: string };
      if (!res.ok) {
        setError(data.error || 'Could not generate link');
        return;
      }
      if (data.token) {
        if (type === 'parent') setParentTokens((prev) => [data.token!, ...prev]);
        else setMentorTokens((prev) => [data.token!, ...prev]);
      }
    } catch {
      setError('Could not generate link');
    } finally {
      setGenerating(null);
    }
  };

  const copyLink = async (token: InviteTokenInfo) => {
    const url = `${appOrigin}${token.linkPath}`;
    await navigator.clipboard.writeText(url);
    setCopied(token.id);
    setTimeout(() => setCopied(null), 2000);
  };

  const addSubject = () => {
    const trimmed = newSubject.trim();
    if (!trimmed || subjects.includes(trimmed)) return;
    setSubjects((prev) => [...prev, trimmed]);
    setPersonas((prev) => ({ ...prev, [trimmed]: 'chill' }));
    setNewSubject('');
  };

  const removeSubject = (name: string) => {
    setSubjects((prev) => prev.filter((s) => s !== name));
  };

  return (
    <div className={SA.contentNarrow}>
      <h1 className={SA.heading}>Settings</h1>

      {error ? <div className={`${SA.error} mt-4`}>{error}</div> : null}
      {saved ? <div className={`${SA.success} mt-4`}>Settings saved.</div> : null}

      <div className={`${SA.cardPadded} mt-6 space-y-4`}>
        <h2 className={`font-semibold ${SA.text}`}>Curriculum & year group</h2>
        {profile.canEditCurriculum ? (
          <>
            <div className="space-y-2">
              {SHIFT_CURRICULA.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCurriculum(c)}
                  className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left ${
                    curriculum === c
                      ? 'border-[var(--sa-navy-800)] bg-[var(--sa-navy-800)] text-white'
                      : 'border-[var(--sa-navy-100)]'
                  }`}
                >
                  <span className="text-2xl">{SHIFT_CURRICULUM_FLAGS[c]}</span>
                  <span className="text-sm font-semibold">{SHIFT_CURRICULUM_LABELS[c]}</span>
                </button>
              ))}
            </div>
            <input
              type="text"
              value={yearGroup}
              onChange={(e) => setYearGroup(e.target.value)}
              placeholder="Year group (e.g. Year 9, Intermediate 2)"
              className={SA.input}
            />
          </>
        ) : (
          <p className={`text-sm ${SA.muted}`}>
            {SHIFT_CURRICULUM_FLAGS[profile.curriculum]} {SHIFT_CURRICULUM_LABELS[profile.curriculum]} ·{' '}
            {profile.year_group} — managed by your parent account.
          </p>
        )}
      </div>

      <div className={`${SA.cardPadded} mt-4 space-y-4`}>
        <h2 className={`font-semibold ${SA.text}`}>Study language</h2>
        <p className={`text-sm ${SA.muted}`}>
          AI tools will use this language in a later update. Arabic is the default for Saudi Arabia;
          you can switch anytime.
        </p>
        <div className="grid grid-cols-2 gap-2">
          {SHIFT_STUDY_LANGUAGES.map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => setStudyLanguage(lang)}
              className={`rounded-xl border px-4 py-3 text-sm font-semibold ${
                studyLanguage === lang
                  ? 'border-[var(--sa-navy-800)] bg-[var(--sa-navy-800)] text-white'
                  : 'border-[var(--sa-navy-100)]'
              }`}
            >
              {SHIFT_STUDY_LANGUAGE_LABELS[lang]}
            </button>
          ))}
        </div>
      </div>

      <div className={`${SA.cardPadded} mt-4 space-y-4`}>
        <h2 className={`font-semibold ${SA.text}`}>Favourite subjects</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={newSubject}
            onChange={(e) => setNewSubject(e.target.value)}
            placeholder="Add a subject"
            className={SA.input}
          />
          <button type="button" onClick={addSubject} className={SA.btnPrimaryIcon}>
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-2">
          {subjects.map((name) => (
            <div
              key={name}
              className="flex items-center justify-between rounded-lg bg-[var(--sa-navy-50)] px-3 py-2"
            >
              <span className="text-sm">{name}</span>
              <button
                type="button"
                onClick={() => removeSubject(name)}
                className="text-xs text-red-600"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className={`${SA.cardPadded} mt-4 space-y-4`}>
        <h2 className={`flex items-center gap-2 font-semibold ${SA.text}`}>
          <Volume2 className="h-5 w-5" />
          AI voice
        </h2>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={voiceEnabled}
            onChange={(e) => setVoiceEnabled(e.target.checked)}
          />
          Enable AI voice responses
        </label>
        {voiceEnabled ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {voiceOptions.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setPreferredVoice(v)}
                className={`rounded-lg border px-3 py-2 text-left text-sm ${
                  preferredVoice === v
                    ? 'border-[var(--sa-navy-600)] bg-[var(--sa-navy-50)] font-semibold'
                    : 'border-[var(--sa-navy-100)]'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {profile.subjects.length > 0 ? (
        <div className={`${SA.cardPadded} mt-4 space-y-4`}>
          <h2 className={`font-semibold ${SA.text}`}>AI tutor persona per subject</h2>
          {profile.subjects.map((subject) => (
            <div key={subject.name}>
              <p className={`mb-1 text-sm font-medium ${SA.text}`}>{subject.name}</p>
              <select
                value={personas[subject.name] ?? 'chill'}
                onChange={(e) =>
                  setPersonas((prev) => ({ ...prev, [subject.name]: e.target.value }))
                }
                className={SA.select}
              >
                {AI_PERSONA_OPTIONS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      ) : null}

      <div className={`${SA.cardPadded} mt-4 space-y-3`}>
        <div className="flex items-center justify-between">
          <h2 className={`flex items-center gap-2 font-semibold ${SA.text}`}>
            <Users className="h-5 w-5" />
            Parent view links
          </h2>
          <button
            type="button"
            onClick={() => void generateToken('parent')}
            disabled={generating === 'parent'}
            className={SA.btnSecondary}
          >
            {generating === 'parent' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            New link
          </button>
        </div>
        {parentTokens.length === 0 ? (
          <p className={`text-sm ${SA.muted}`}>No parent links yet.</p>
        ) : (
          parentTokens.map((t) => (
            <TokenRow key={t.id} token={t} copied={copied} onCopy={() => void copyLink(t)} />
          ))
        )}
      </div>

      <div className={`${SA.cardPadded} mt-4 space-y-3`}>
        <div className="flex items-center justify-between">
          <h2 className={`flex items-center gap-2 font-semibold ${SA.text}`}>
            <GraduationCap className="h-5 w-5" />
            Mentor view links
          </h2>
          <button
            type="button"
            onClick={() => void generateToken('mentor')}
            disabled={generating === 'mentor'}
            className={SA.btnSecondary}
          >
            {generating === 'mentor' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            New link
          </button>
        </div>
        {mentorTokens.length === 0 ? (
          <p className={`text-sm ${SA.muted}`}>No mentor links yet.</p>
        ) : (
          mentorTokens.map((t) => (
            <TokenRow key={t.id} token={t} copied={copied} onCopy={() => void copyLink(t)} />
          ))
        )}
      </div>

      <button
        type="button"
        onClick={() => void saveSettings()}
        disabled={saving}
        className={`${SA.btnPrimary} mt-6 w-full`}
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Save settings
      </button>
    </div>
  );
}

function TokenRow({
  token,
  copied,
  onCopy,
}: {
  token: InviteTokenInfo;
  copied: string | null;
  onCopy: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg bg-[var(--sa-navy-50)] px-3 py-2">
      <span className="truncate text-xs text-neutral-600">
        Created {new Date(token.created_at).toLocaleDateString()}
      </span>
      <button type="button" onClick={onCopy} className={SA.btnSecondary}>
        {copied === token.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        Copy link
      </button>
    </div>
  );
}
