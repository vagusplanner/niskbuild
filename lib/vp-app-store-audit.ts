import 'server-only';

import fs from 'fs/promises';
import path from 'path';
import { VP_BUILDER_TARGETS } from '@/lib/vagus-planner-builder';
import { readVpSourceForUser, listVpSourceOverrides } from '@/lib/vp-builder-source-store';

import {
  formatAuditReport,
  isFullAppAuditPrompt,
  summarizeChecks,
  type AuditCheck,
} from '@/lib/builder-audit-shared';

export type VpAppStoreAuditResult = {
  appId: string;
  generatedAt: string;
  summary: { pass: number; warn: number; fail: number; info: number };
  checks: AuditCheck[];
  editedPages: string[];
  exportNotes: string[];
};

export { isFullAppAuditPrompt };

export function formatVpAuditReport(result: VpAppStoreAuditResult): string {
  return formatAuditReport('Vagus Planner App Store audit', result.checks, result.exportNotes);
}

const CALENDAR_AI_MARKERS = [
  'AIEventCategorizer',
  'AIMeetingAssistant',
  'AITaskScheduler',
  'AISchedulePlanner',
  'UnifiedAIPanel',
  'AICalendarSummaryCard',
];

const NOTIFICATION_MARKERS = ['NotificationPreferencesManager', 'vp_notifications'];

async function fileExists(root: string, relative: string): Promise<boolean> {
  try {
    await fs.access(path.join(root, relative));
    return true;
  } catch {
    return false;
  }
}

async function readBaseOrUser(userId: string, relative: string): Promise<string> {
  try {
    return await readVpSourceForUser(userId, relative);
  } catch {
    return '';
  }
}

export async function runVpAppStoreAudit(userId: string): Promise<VpAppStoreAuditResult> {
  const checks: AuditCheck[] = [];
  const srcRoot = path.join(process.cwd(), 'apps/vagus-planner/src');
  const editedPages = await listVpSourceOverrides(userId);

  const push = (
    id: string,
    area: string,
    label: string,
    status: AuditCheck['status'],
    detail: string
  ) => {
    checks.push({ id, area, label, status, detail });
  };

  // Pages in builder
  for (const target of VP_BUILDER_TARGETS) {
    const src = await readBaseOrUser(userId, target.file);
    const ok = src.length > 80 && /(export|import)/.test(src);
    push(
      `page-${target.id}`,
      'Pages',
      target.label,
      ok ? 'pass' : 'fail',
      ok ? `${target.file} loads (${src.length} chars)` : `Missing or empty: ${target.file}`
    );
  }

  // Calendar AI
  const calendarSrc = await readBaseOrUser(userId, 'pages/Calendar.jsx');
  const calendarAiHits = CALENDAR_AI_MARKERS.filter((m) => calendarSrc.includes(m));
  push(
    'calendar-ai',
    'Calendar AI',
    'Calendar AI components',
    calendarAiHits.length >= 4 ? 'pass' : calendarAiHits.length > 0 ? 'warn' : 'fail',
    calendarAiHits.length
      ? `Found: ${calendarAiHits.join(', ')}`
      : 'Calendar.jsx missing AI assistant imports'
  );

  // Notifications
  const notifPage = await readBaseOrUser(userId, 'pages/Notifications.jsx');
  const notifComponent = await fileExists(
    srcRoot,
    'components/notifications/NotificationPreferencesManager.jsx'
  );
  push(
    'notifications-page',
    'Notifications',
    'Notifications page',
    notifPage.length > 80 ? 'pass' : 'warn',
    notifPage.length > 80 ? 'Notifications.jsx present' : 'Notifications page thin or missing content'
  );
  push(
    'notifications-prefs',
    'Notifications',
    'Notification preferences UI',
    notifComponent || NOTIFICATION_MARKERS.some((m) => notifPage.includes(m)) ? 'pass' : 'warn',
    notifComponent
      ? 'NotificationPreferencesManager component exists'
      : 'Verify notification preferences in app'
  );

  // AI assistant
  const assistantPanel = await fileExists(srcRoot, 'components/assistant/UnifiedAIPanel.jsx');
  const superAgent = await fileExists(srcRoot, 'components/ai/SuperAgent.jsx');
  push(
    'ai-assistant',
    'AI Assistant',
    'Unified AI panel',
    assistantPanel ? 'pass' : 'warn',
    assistantPanel ? 'UnifiedAIPanel.jsx found' : 'UnifiedAIPanel missing from src'
  );
  push(
    'ai-super-agent',
    'AI Assistant',
    'Super agent',
    superAgent ? 'pass' : 'info',
    superAgent ? 'SuperAgent.jsx found' : 'SuperAgent optional — not blocking'
  );

  // Integrations / links
  const settingsSrc = await readBaseOrUser(userId, 'pages/Settings.jsx');
  push(
    'integrations',
    'Integrations',
    'Settings / integrations entry',
    /integration|google|calendar|gmail/i.test(settingsSrc) ? 'pass' : 'warn',
    /integration|google|calendar|gmail/i.test(settingsSrc)
      ? 'Settings references integrations'
      : 'Add Google Calendar / Gmail links in Settings before App Store review'
  );

  // Islam / edition
  const islamSrc = await readBaseOrUser(userId, 'pages/Islam.jsx');
  push(
    'islam-module',
    'Islamic edition',
    'Islam hub page',
    islamSrc.length > 200 ? 'pass' : 'info',
    islamSrc.length > 200 ? 'Islam.jsx present' : 'Islamic edition pages optional for standard export'
  );

  // Preview / deploy connectivity
  const vpUrl = process.env.NEXT_PUBLIC_VAGUS_PLANNER_URL?.trim() || '';
  push(
    'vp-preview-url',
    'Preview',
    'VP preview URL configured',
    vpUrl && !vpUrl.includes('localhost') ? 'pass' : 'warn',
    vpUrl
      ? `NEXT_PUBLIC_VAGUS_PLANNER_URL=${vpUrl}`
      : 'Set NEXT_PUBLIC_VAGUS_PLANNER_URL to your deployed VP (e.g. https://vp.niskbuild.com) — localhost will not work in production preview'
  );

  if (vpUrl && !vpUrl.includes('localhost')) {
    try {
      const res = await fetch(vpUrl.replace(/\/$/, '') + '/Dashboard', {
        method: 'HEAD',
        signal: AbortSignal.timeout(8000),
      });
      push(
        'vp-preview-reach',
        'Preview',
        'VP dev server reachable',
        res.ok || res.status === 304 ? 'pass' : 'fail',
        res.ok ? `VP responded ${res.status}` : `VP URL not reachable (${res.status}) — preview iframe will be blank`
      );
    } catch (e) {
      push(
        'vp-preview-reach',
        'Preview',
        'VP dev server reachable',
        'fail',
        `Cannot reach VP URL: ${e instanceof Error ? e.message : 'network error'}`
      );
    }
  }

  // App Store export prerequisites
  push(
    'export-macos',
    'App Store',
    'Export environment',
    process.platform === 'darwin' ? 'pass' : 'info',
    process.platform === 'darwin'
      ? 'Running on macOS — Xcode export available from this host'
      : 'App Store export runs on your Mac (npm run dev), not on Vercel'
  );

  push(
    'export-edits-saved',
    'App Store',
    'Builder edits persisted',
    editedPages.length > 0 ? 'pass' : 'info',
    editedPages.length > 0
      ? `${editedPages.length} file(s) customized: ${editedPages.slice(0, 5).join(', ')}${editedPages.length > 5 ? '…' : ''}`
      : 'No custom edits yet — using stock Vagus Planner sources'
  );

  const summary = summarizeChecks(checks);

  const exportNotes = [
    'Run this audit on each page you changed before exporting.',
    'Use Deploy to publish your customized bundle — preview iframe shows stock VP until deployed.',
    'App Store export: Mac + Xcode + Apple Developer Program ($99/yr).',
    'Test push notifications on a physical iPhone before submission.',
    'Prepare privacy policy URL, 1024×1024 icon, and iPhone screenshots.',
  ];

  return {
    appId: 'vagus-planner',
    generatedAt: new Date().toISOString(),
    summary,
    checks,
    editedPages,
    exportNotes,
  };
}

