'use client';

import { useCallback, useEffect, useState } from 'react';
import Layout from '@/app/components/Layout';
import AdminPlatformShell from '@/app/components/admin/AdminPlatformShell';
import { SHIFT_CURRICULA, SHIFT_CURRICULUM_LABELS } from '@/lib/shift-ai/constants';
import type { CurriculumPack, CurriculumPackContent } from '@/lib/shift-ai/curriculum-packs-shared';

const EMPTY_SECTION = { title: '', content: '', key_points: [] as string[], exam_tip: '' };

function emptyContent(): CurriculumPackContent {
  return { overview: '', sections: [{ ...EMPTY_SECTION }] };
}

export default function AdminCurriculumPacksClient() {
  const [packs, setPacks] = useState<CurriculumPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const [subject, setSubject] = useState('Biology');
  const [curriculum, setCurriculum] = useState('uk');
  const [yearGroup, setYearGroup] = useState('GCSE');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState<CurriculumPackContent>(emptyContent);
  const [isPublished, setIsPublished] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/admin/shift-ai/curriculum-packs', { credentials: 'include' });
    const data = (await res.json()) as { packs?: CurriculumPack[]; error?: string };
    if (res.ok) setPacks(data.packs ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setContent(emptyContent());
    setIsPublished(true);
  };

  const startEdit = (pack: CurriculumPack) => {
    setEditingId(pack.id);
    setSubject(pack.subject);
    setCurriculum(pack.curriculum);
    setYearGroup(pack.year_group);
    setTitle(pack.title);
    setContent(pack.content);
    setIsPublished(pack.is_published);
  };

  const savePack = async () => {
    setSaving(true);
    setMessage('');
    try {
      const payload = { subject, curriculum, year_group: yearGroup, title, content, is_published: isPublished };
      const res = await fetch(
        editingId
          ? `/api/admin/shift-ai/curriculum-packs/${editingId}`
          : '/api/admin/shift-ai/curriculum-packs',
        {
          method: editingId ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        }
      );
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setMessage(editingId ? 'Pack updated.' : 'Pack created.');
      resetForm();
      void load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async (pack: CurriculumPack) => {
    const res = await fetch(`/api/admin/shift-ai/curriculum-packs/${pack.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ is_published: !pack.is_published }),
    });
    if (res.ok) void load();
  };

  const updateSection = (index: number, field: string, value: string) => {
    setContent((prev) => {
      const sections = [...prev.sections];
      const section = { ...sections[index] };
      if (field === 'key_points') {
        section.key_points = value.split('\n').map((l) => l.trim()).filter(Boolean);
      } else if (field === 'title' || field === 'content' || field === 'exam_tip') {
        section[field] = value;
      }
      sections[index] = section;
      return { ...prev, sections };
    });
  };

  return (
    <Layout>
      <AdminPlatformShell
        title="Shift AI · Curriculum packs"
        description="Author shared revision packs for students by subject, curriculum, and year group"
        stats={[
          { label: 'Total packs', value: packs.length },
          { label: 'Published', value: packs.filter((p) => p.is_published).length },
          { label: 'Admin-authored', value: packs.filter((p) => p.source === 'admin').length },
          { label: 'AI-generated', value: packs.filter((p) => p.source === 'ai').length },
        ]}
      >
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="bg-nisk-card border border-nisk rounded-xl p-5 space-y-4">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">
              {editingId ? 'Edit pack' : 'Create pack'}
            </h2>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-nisk-muted mb-1">Subject</label>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full rounded-lg border border-nisk bg-[var(--background)] px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-nisk-muted mb-1">Year group</label>
                <input
                  value={yearGroup}
                  onChange={(e) => setYearGroup(e.target.value)}
                  className="w-full rounded-lg border border-nisk bg-[var(--background)] px-3 py-2 text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-nisk-muted mb-1">Curriculum</label>
                <select
                  value={curriculum}
                  onChange={(e) => setCurriculum(e.target.value)}
                  className="w-full rounded-lg border border-nisk bg-[var(--background)] px-3 py-2 text-sm"
                >
                  {SHIFT_CURRICULA.map((c) => (
                    <option key={c} value={c}>
                      {SHIFT_CURRICULUM_LABELS[c]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-nisk-muted mb-1">Title / topic</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-lg border border-nisk bg-[var(--background)] px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-nisk-muted mb-1">Overview</label>
              <textarea
                value={content.overview}
                onChange={(e) => setContent((p) => ({ ...p, overview: e.target.value }))}
                rows={3}
                className="w-full rounded-lg border border-nisk bg-[var(--background)] px-3 py-2 text-sm"
              />
            </div>

            {content.sections.map((section, index) => (
              <div key={index} className="rounded-lg border border-nisk p-3 space-y-2">
                <p className="text-xs font-bold text-nisk-muted">Section {index + 1}</p>
                <input
                  value={section.title}
                  onChange={(e) => updateSection(index, 'title', e.target.value)}
                  placeholder="Section title"
                  className="w-full rounded-lg border border-nisk bg-[var(--background)] px-3 py-2 text-sm"
                />
                <textarea
                  value={section.content}
                  onChange={(e) => updateSection(index, 'content', e.target.value)}
                  placeholder="Content"
                  rows={3}
                  className="w-full rounded-lg border border-nisk bg-[var(--background)] px-3 py-2 text-sm"
                />
                <textarea
                  value={(section.key_points ?? []).join('\n')}
                  onChange={(e) => updateSection(index, 'key_points', e.target.value)}
                  placeholder="Key points (one per line)"
                  rows={2}
                  className="w-full rounded-lg border border-nisk bg-[var(--background)] px-3 py-2 text-sm"
                />
                <input
                  value={section.exam_tip ?? ''}
                  onChange={(e) => updateSection(index, 'exam_tip', e.target.value)}
                  placeholder="Exam tip"
                  className="w-full rounded-lg border border-nisk bg-[var(--background)] px-3 py-2 text-sm"
                />
              </div>
            ))}

            <button
              type="button"
              onClick={() =>
                setContent((p) => ({ ...p, sections: [...p.sections, { ...EMPTY_SECTION }] }))
              }
              className="text-sm text-[var(--primary)] hover:underline"
            >
              + Add section
            </button>

            <label className="flex items-center gap-2 text-sm text-nisk-muted">
              <input
                type="checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
              />
              Published
            </label>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void savePack()}
                disabled={saving || !title.trim()}
                className="px-4 py-2 rounded-lg bg-[var(--primary)] text-white text-sm font-medium disabled:opacity-60"
              >
                {saving ? 'Saving…' : editingId ? 'Update pack' : 'Create pack'}
              </button>
              {editingId ? (
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 rounded-lg border border-nisk text-sm"
                >
                  Cancel
                </button>
              ) : null}
            </div>
            {message ? <p className="text-sm text-nisk-muted">{message}</p> : null}
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">Existing packs</h2>
            {loading ? (
              <p className="text-sm text-nisk-muted">Loading…</p>
            ) : packs.length === 0 ? (
              <p className="text-sm text-nisk-muted">No packs yet.</p>
            ) : (
              packs.map((pack) => (
                <div key={pack.id} className="bg-nisk-card border border-nisk rounded-xl p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-[var(--foreground)]">{pack.title}</p>
                      <p className="text-xs text-nisk-muted mt-1">
                        {pack.subject} · {pack.curriculum.toUpperCase()} · {pack.year_group} ·{' '}
                        {pack.source}
                        {!pack.is_published ? ' · unpublished' : ''}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(pack)}
                        className="text-xs text-[var(--primary)] hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void togglePublish(pack)}
                        className="text-xs text-nisk-muted hover:underline"
                      >
                        {pack.is_published ? 'Unpublish' : 'Publish'}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </AdminPlatformShell>
    </Layout>
  );
}
