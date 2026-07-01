export type AuditStatus = 'pass' | 'warn' | 'fail' | 'info';

export type AuditCheck = {
  id: string;
  area: string;
  label: string;
  status: AuditStatus;
  detail: string;
};

export type AuditSummary = {
  pass: number;
  warn: number;
  fail: number;
  info: number;
};

export function isFullAppAuditPrompt(prompt: string): boolean {
  const lower = prompt.toLowerCase();
  return (
    (lower.includes('audit') ||
      lower.includes('check') ||
      lower.includes('review') ||
      lower.includes('inspect')) &&
    (lower.includes('entire') ||
      lower.includes('full app') ||
      lower.includes('whole app') ||
      lower.includes('every') ||
      lower.includes('everything') ||
      lower.includes('all page') ||
      lower.includes('apple store') ||
      lower.includes('app store') ||
      lower.includes('before export') ||
      lower.includes('exporting'))
  );
}

export function summarizeChecks(checks: AuditCheck[]): AuditSummary {
  return {
    pass: checks.filter((c) => c.status === 'pass').length,
    warn: checks.filter((c) => c.status === 'warn').length,
    fail: checks.filter((c) => c.status === 'fail').length,
    info: checks.filter((c) => c.status === 'info').length,
  };
}

export function formatAuditReport(
  title: string,
  checks: AuditCheck[],
  exportNotes: string[]
): string {
  const summary = summarizeChecks(checks);
  const lines: string[] = [
    `📋 ${title} (${summary.pass} pass · ${summary.warn} warn · ${summary.fail} fail)`,
    '',
  ];

  let lastArea = '';
  for (const c of checks) {
    if (c.area !== lastArea) {
      lines.push(`## ${c.area}`);
      lastArea = c.area;
    }
    const icon =
      c.status === 'pass' ? '✅' : c.status === 'warn' ? '⚠️' : c.status === 'fail' ? '❌' : 'ℹ️';
    lines.push(`${icon} ${c.label}: ${c.detail}`);
  }

  lines.push('', '### Before you export');
  for (const n of exportNotes) {
    lines.push(`• ${n}`);
  }

  if (summary.fail > 0) {
    lines.push('', 'Fix ❌ items first, then export or deploy.');
  } else if (summary.warn > 0) {
    lines.push('', 'Review ⚠️ warnings before shipping to clients or the App Store.');
  } else {
    lines.push('', 'No blocking failures — you can export when ready.');
  }

  return lines.join('\n');
}
