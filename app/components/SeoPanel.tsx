"use client";

import { useMemo } from 'react';
import {
  computeSeoScore,
  seoScoreColor,
  seoScoreTip,
} from '@/lib/seo-score';
import { buildSchemaJson } from '@/lib/seo-schema';
import {
  DEFAULT_SEO_SETTINGS,
  SEO_SCHEMA_OPTIONS,
  type ProjectSeoSettings,
  type SeoSchemaType,
} from '@/lib/seo-types';
import {
  canGenerateSeoAi,
  canSaveSeoSettings,
  canUseSeoSchema,
} from '@/lib/tier-config';

type SeoPanelProps = {
  settings: ProjectSeoSettings;
  onChange: (settings: ProjectSeoSettings) => void;
  subscriptionTier: string;
  subscriptionStatus: string;
  activeProjectId: string | null;
  onSave: () => Promise<void>;
  onGenerateAi: () => Promise<void>;
  saving: boolean;
  generating: boolean;
  message?: string;
};

function counterColor(len: number, good: number, max: number): string {
  if (len === 0) return 'text-nisk-muted';
  if (len > max) return 'text-[var(--error)]';
  if (len >= good) return 'text-[var(--success)]';
  return 'text-amber-400';
}

function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-1">
      <label className="text-[10px] uppercase tracking-wider text-nisk-muted">{children}</label>
      {hint && <p className="text-[10px] text-nisk-muted mt-0.5">{hint}</p>}
    </div>
  );
}

export default function SeoPanel({
  settings,
  onChange,
  subscriptionTier,
  subscriptionStatus,
  activeProjectId,
  onSave,
  onGenerateAi,
  saving,
  generating,
  message,
}: SeoPanelProps) {
  const canSave = canSaveSeoSettings(subscriptionTier, subscriptionStatus);
  const canAi = canGenerateSeoAi(subscriptionTier, subscriptionStatus);
  const canSchema = canUseSeoSchema(subscriptionTier, subscriptionStatus);

  const breakdown = useMemo(() => computeSeoScore(settings), [settings]);
  const scoreColor = seoScoreColor(breakdown.total);
  const scoreRing =
    scoreColor === 'green'
      ? 'text-[var(--success)] border-[var(--success)]/40'
      : scoreColor === 'amber'
        ? 'text-amber-400 border-amber-400/40'
        : 'text-[var(--error)] border-[var(--error)]/40';

  const patch = (partial: Partial<ProjectSeoSettings>) => {
    const next = { ...settings, ...partial };
    next.seoScore = computeSeoScore(next).total;
    onChange(next);
  };

  const onSchemaTypeChange = (schemaType: SeoSchemaType) => {
    const schemaJson = canSchema
      ? buildSchemaJson(schemaType, {
          name: settings.title || 'My App',
          description: settings.metaDescription,
          url: settings.canonicalUrl,
          image: settings.ogImageUrl,
        })
      : settings.schemaJson;
    patch({ schemaType, schemaJson });
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-5 text-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white">SEO</h3>
          <p className="text-[11px] text-nisk-muted mt-0.5">
            Optimise how your app appears on Google and social media.
          </p>
        </div>
        <div
          className={`shrink-0 w-14 h-14 rounded-full border-2 flex flex-col items-center justify-center ${scoreRing}`}
        >
          <span className="text-lg font-bold leading-none">{breakdown.total}</span>
          <span className="text-[9px] uppercase">/ 100</span>
        </div>
      </div>

      <p className="text-[11px] text-nisk-muted">{seoScoreTip(breakdown)}</p>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onGenerateAi}
          disabled={!canAi || generating}
          className="btn-primary px-3 py-1.5 text-xs rounded-lg disabled:opacity-40"
        >
          {generating ? 'Generating…' : '✨ AI Generate SEO'}
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={!canSave || saving || !activeProjectId}
          className="btn-secondary px-3 py-1.5 text-xs rounded-lg disabled:opacity-40"
        >
          {saving ? 'Saving…' : 'Save SEO'}
        </button>
      </div>

      {!canSave && (
        <p className="text-[10px] text-amber-400/90">Upgrade to Pro to save SEO settings.</p>
      )}
      {!activeProjectId && (
        <p className="text-[10px] text-nisk-muted">Save your project first to persist SEO.</p>
      )}
      {message && <p className="text-[11px] text-[var(--accent-cyan)]">{message}</p>}

      <section className="space-y-3">
        <h4 className="text-xs font-semibold text-white">A — Page title &amp; meta</h4>
        <div>
          <FieldLabel hint="This is what you want to rank for on Google">Focus keyword</FieldLabel>
          <input
            value={settings.focusKeyword}
            onChange={(e) => patch({ focusKeyword: e.target.value })}
            className="w-full bg-nisk border border-nisk rounded-lg px-3 py-2 text-sm text-white"
            placeholder="e.g. fitness tracking app"
          />
        </div>
        <div>
          <div className="flex justify-between items-center mb-1">
            <FieldLabel>Page title</FieldLabel>
            <span className={`text-[10px] ${counterColor(settings.title.length, 30, 60)}`}>
              {settings.title.length}/60
            </span>
          </div>
          <input
            value={settings.title}
            onChange={(e) => patch({ title: e.target.value.slice(0, 80) })}
            className="w-full bg-nisk border border-nisk rounded-lg px-3 py-2 text-sm text-white"
            placeholder="Page title"
          />
        </div>
        <div>
          <div className="flex justify-between items-center mb-1">
            <FieldLabel>Meta description</FieldLabel>
            <span
              className={`text-[10px] ${counterColor(settings.metaDescription.length, 120, 160)}`}
            >
              {settings.metaDescription.length}/160
            </span>
          </div>
          <textarea
            value={settings.metaDescription}
            onChange={(e) => patch({ metaDescription: e.target.value.slice(0, 200) })}
            rows={3}
            className="w-full bg-nisk border border-nisk rounded-lg px-3 py-2 text-sm text-white resize-none"
            placeholder="Short description for search results"
          />
        </div>
        <div>
          <FieldLabel>Canonical URL</FieldLabel>
          <input
            value={settings.canonicalUrl}
            onChange={(e) => patch({ canonicalUrl: e.target.value })}
            className="w-full bg-nisk border border-nisk rounded-lg px-3 py-2 text-sm text-white"
            placeholder="https://yourdomain.com"
          />
        </div>
      </section>

      <section className="space-y-3">
        <h4 className="text-xs font-semibold text-white">B — Open Graph</h4>
        <div>
          <FieldLabel>OG title</FieldLabel>
          <input
            value={settings.ogTitle}
            onChange={(e) => patch({ ogTitle: e.target.value })}
            className="w-full bg-nisk border border-nisk rounded-lg px-3 py-2 text-sm text-white"
          />
        </div>
        <div>
          <FieldLabel>OG description</FieldLabel>
          <textarea
            value={settings.ogDescription}
            onChange={(e) => patch({ ogDescription: e.target.value })}
            rows={2}
            className="w-full bg-nisk border border-nisk rounded-lg px-3 py-2 text-sm text-white resize-none"
          />
        </div>
        <div>
          <FieldLabel hint="1200×630px recommended — paste a public image URL">
            OG image URL
          </FieldLabel>
          <input
            value={settings.ogImageUrl}
            onChange={(e) => patch({ ogImageUrl: e.target.value })}
            className="w-full bg-nisk border border-nisk rounded-lg px-3 py-2 text-sm text-white"
            placeholder="https://…"
          />
        </div>
        <div className="rounded-xl border border-nisk bg-nisk-surface p-3">
          <p className="text-[10px] text-nisk-muted mb-2">Social preview</p>
          {settings.ogImageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={settings.ogImageUrl}
              alt=""
              className="w-full h-24 object-cover rounded-lg mb-2 bg-nisk"
            />
          )}
          <p className="text-sm font-medium text-white truncate">
            {settings.ogTitle || settings.title || 'Your app title'}
          </p>
          <p className="text-[11px] text-nisk-muted line-clamp-2 mt-1">
            {settings.ogDescription || settings.metaDescription || 'Description preview'}
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <h4 className="text-xs font-semibold text-white">C — Schema markup</h4>
        {!canSchema && (
          <p className="text-[10px] text-amber-400/90">Agency plan required for schema markup.</p>
        )}
        <select
          value={settings.schemaType}
          onChange={(e) => onSchemaTypeChange(e.target.value as SeoSchemaType)}
          disabled={!canSchema}
          className="w-full bg-nisk border border-nisk rounded-lg px-3 py-2 text-sm text-white disabled:opacity-50"
        >
          {SEO_SCHEMA_OPTIONS.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>
        <pre className="text-[10px] font-mono text-gray-400 bg-nisk p-3 rounded-lg overflow-auto max-h-40 whitespace-pre-wrap">
          {settings.schemaJson
            ? JSON.stringify(settings.schemaJson, null, 2)
            : 'Generate or select a business type'}
        </pre>
      </section>

      <section className="space-y-2">
        <h4 className="text-xs font-semibold text-white">D — Sitemap &amp; robots</h4>
        <label className="flex items-center gap-2 text-xs text-gray-300">
          <input
            type="checkbox"
            checked={settings.sitemapEnabled}
            onChange={(e) => patch({ sitemapEnabled: e.target.checked })}
          />
          Auto-generate sitemap.xml on export
        </label>
        <label className="flex items-center gap-2 text-xs text-gray-300">
          <input
            type="checkbox"
            checked={settings.robotsEnabled}
            onChange={(e) => patch({ robotsEnabled: e.target.checked })}
          />
          Allow search engines (robots.txt)
        </label>
        <label className="flex items-center gap-2 text-xs text-gray-300">
          <input
            type="checkbox"
            checked={settings.noindex}
            onChange={(e) => patch({ noindex: e.target.checked })}
          />
          Noindex — hide from search engines
        </label>
      </section>
    </div>
  );
}

export { DEFAULT_SEO_SETTINGS };
