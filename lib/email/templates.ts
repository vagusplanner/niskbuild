import { appUrl, vpAppUrl } from '@/lib/email/app-url';
import { npsScoreUrl } from '@/lib/nps-link';

function shell(title: string, body: string): string {
  return `
    <div style="font-family:system-ui,sans-serif;max-width:520px;color:#e2e8f0;background:#0B0F19;padding:32px;border-radius:12px;">
      <h2 style="color:#fff;margin:0 0 12px;">${title}</h2>
      ${body}
    </div>
  `;
}

function vpShell(title: string, body: string): string {
  return `
    <div style="font-family:system-ui,sans-serif;max-width:520px;color:#e2e8f0;background:#0c1a24;padding:32px;border-radius:12px;">
      <div style="margin-bottom:20px;">
        <div style="font-size:12px;letter-spacing:0.14em;font-weight:800;color:#E8B84B;text-transform:uppercase;">Vagus Planner</div>
        <div style="height:3px;width:48px;background:#1D6FB8;border-radius:2px;margin-top:8px;"></div>
      </div>
      <h2 style="color:#fff;margin:0 0 12px;">${title}</h2>
      ${body}
      <p style="color:#64748b;font-size:12px;margin-top:28px;">Sent by Vagus Planner · <a href="https://vagusplanner.com" style="color:#29ABE2;">vagusplanner.com</a></p>
    </div>
  `;
}

function cta(href: string, label: string, primary = true): string {
  const style = primary
    ? 'display:inline-block;background:linear-gradient(135deg,#4F6EF7,#7C3AED);color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;'
    : 'display:inline-block;border:1px solid #4F6EF7;color:#4F6EF7;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;';
  return `<a href="${href}" style="${style}">${label}</a>`;
}

function vpCta(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:#1D6FB8;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">${label}</a>`;
}

export function welcomeEmailHtml(): string {
  return shell(
    'Welcome to NiskBuild',
    `<p style="color:#94a3b8;line-height:1.6;">Welcome to NiskBuild. Here is how to build your first app in 5 minutes — describe what you want, generate, and preview in the browser.</p>
     <p style="margin:24px 0;">${cta(appUrl('/builder'), 'Start Building')}</p>`
  );
}

export function day1NoBuildHtml(): string {
  return shell(
    'Your first build is one prompt away',
    `<p style="color:#94a3b8;line-height:1.6;">You signed up yesterday but have not built anything yet. Open the Builder, describe your app in one sentence, and hit Generate.</p>
     <p style="margin:24px 0;">${cta(appUrl('/builder'), 'Open Builder')}</p>`
  );
}

export function day3FeatureTipHtml(): string {
  return shell(
    'Did you know NiskBuild can build 2D games?',
    `<p style="color:#94a3b8;line-height:1.6;">Try the Game Builder on Pro+ — Phaser.js templates and AI-generated game logic in minutes.</p>
     <p style="margin:24px 0;">${cta(appUrl('/templates/games'), 'Try Game Builder')}</p>`
  );
}

export function day7SocialProofHtml(): string {
  return shell(
    'Builders are shipping with NiskBuild',
    `<p style="color:#94a3b8;line-height:1.6;">Freelancers and agencies use NiskBuild to deliver client apps faster — web, PWA, and native export on Agency plans.</p>
     <p style="margin:24px 0;">${cta(appUrl('/docs'), 'Read success guides')}</p>`
  );
}

export function day14NpsHtml(userId: string): string {
  const buttons = Array.from({ length: 10 }, (_, i) => {
    const score = i + 1;
    const href = npsScoreUrl(userId, score);
    return `<a href="${href}" style="display:inline-block;width:36px;height:36px;line-height:36px;text-align:center;margin:4px;background:#1e293b;color:#e2e8f0;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;">${score}</a>`;
  }).join('');

  return shell(
    'Quick question about NiskBuild (30 seconds)',
    `<p style="color:#94a3b8;line-height:1.6;">How likely are you to recommend NiskBuild to a freelancer or agency?</p>
     <p style="color:#64748b;font-size:13px;margin:16px 0 8px;">Tap a number from 1 (not likely) to 10 (very likely):</p>
     <div style="margin:8px 0 24px;">${buttons}</div>
     <p style="color:#64748b;font-size:12px;">Or open the <a href="${appUrl('/nps')}" style="color:#818cf8;">survey page</a>.</p>`
  );
}

export function credit80Html(params: {
  creditsUsed: number;
  allowance: number;
  tierName: string;
  daysLeft: number;
  upgradeBlock: string;
  byocNote: string;
}): string {
  const usagePct = Math.min(Math.round((params.creditsUsed / params.allowance) * 100), 100);
  return shell(
    'You have used 80% of your NiskBuild builds this month',
    `<p style="color:#94a3b8;line-height:1.6;">
      You have used <strong style="color:#22d3ee;">${params.creditsUsed}</strong> of your
      <strong style="color:#fff;">${params.allowance}</strong> monthly builds on ${params.tierName}.
      At this rate you will run out in <strong style="color:#fff;">${params.daysLeft}</strong> day${params.daysLeft === 1 ? '' : 's'}.
    </p>
    <div style="width:100%;background:#1e293b;border-radius:10px;height:8px;margin:20px 0;">
      <div style="width:${usagePct}%;background:#6366F1;height:8px;border-radius:10px;"></div>
    </div>
    <p style="color:#94a3b8;font-size:14px;">Options:</p>
    ${params.upgradeBlock}
    <p style="color:#94a3b8;margin:12px 0;"><strong style="color:#fff;">(2) Top up</strong> with a build pack.</p>
    <p style="color:#94a3b8;margin:12px 0;"><strong style="color:#fff;">(3)</strong> ${params.byocNote}</p>
    <p style="margin:24px 0;">
      ${cta(appUrl('/pricing'), 'View plans')}
      &nbsp;
      ${cta(appUrl('/dashboard/settings?tab=billing'), 'Reload packs', false)}
    </p>`
  );
}

export function credit0Html(): string {
  return shell(
    'Your monthly builds are exhausted',
    `<p style="color:#94a3b8;line-height:1.6;">Your monthly builds are exhausted. Top up now to continue building — or upgrade for more builds every month.</p>
     <p style="margin:24px 0;">
       ${cta(appUrl('/dashboard/settings?tab=billing'), 'Buy Top-Up')}
       &nbsp;
       ${cta(appUrl('/pricing'), 'Upgrade Plan', false)}
     </p>`
  );
}

export function inactive14dHtml(): string {
  return shell(
    'We miss you at NiskBuild',
    `<p style="color:#94a3b8;line-height:1.6;">Here is what is new this month — faster exports, docs hub, and improved marketplace templates.</p>
     <p style="margin:24px 0;">${cta(appUrl('/docs'), "See What's New")}</p>`
  );
}

export function reengagementManualHtml(): string {
  return inactive14dHtml();
}

export function cancelWarningHtml(): string {
  return shell(
    'Before you go — here is what you will lose',
    `<p style="color:#94a3b8;line-height:1.6;">If you cancel, your preview links go offline and cloud AI credits stop renewing. Your projects stay saved — reactivate anytime.</p>
     <p style="margin:24px 0;">${cta(appUrl('/dashboard/settings?tab=billing'), 'Keep my plan')}</p>`
  );
}

/** Vagus Planner cancel-at-period-end — never reuse NiskBuild builder copy. */
export function cancelWarningVpHtml(opts?: { islamic?: boolean }): string {
  const islamicLine = opts?.islamic
    ? '<li>Islamic Edition extras (full prayer tools, Quran, Zakat, Ramadan/Hajj features) revert to Free</li>'
    : '';
  return vpShell(
    'Before you go — your Vagus Planner data stays saved',
    `<p style="color:#94a3b8;line-height:1.6;">
      Your subscription will stay active until the end of the current billing period.
      Canceling does <strong style="color:#fff;">not</strong> delete your calendar, events, tasks, goals,
      journal entries, or prayer logs.
    </p>
    <p style="color:#94a3b8;line-height:1.6;">After this period ends, paid-tier features step down to the Free plan, including:</p>
    <ul style="color:#94a3b8;line-height:1.8;padding-left:20px;">
      <li>Higher monthly AI limits (trip planner, scheduling help, and other Pro AI)</li>
      <li>Google Calendar sync and other paid integrations</li>
      ${islamicLine}
    </ul>
    <p style="color:#94a3b8;line-height:1.6;">Resubscribe anytime and those features come back. Your existing data is still there.</p>
    <p style="margin:24px 0;">${vpCta(vpAppUrl('/Billing'), 'Keep my plan')}</p>`
  );
}

export function winback7dVpHtml(): string {
  return vpShell(
    'Your Vagus Planner data is still saved',
    `<p style="color:#94a3b8;line-height:1.6;">Your events, goals, and logs were not deleted when the subscription ended. Reactivate Pro to restore higher AI limits, Google Calendar sync, and other paid features.</p>
     <p style="margin:24px 0;">${vpCta(vpAppUrl('/Billing'), 'Resubscribe')}</p>`
  );
}

export function winback30dVpHtml(): string {
  return vpShell(
    'Come back to Vagus Planner',
    `<p style="color:#94a3b8;line-height:1.6;">Your planner data is still here. Resubscribe to unlock Pro AI, calendar sync, and the rest of your paid plan.</p>
     <p style="margin:24px 0;">${vpCta(vpAppUrl('/Billing'), 'View plans')}</p>`
  );
}

export function winback7dHtml(): string {
  return shell(
    'Your preview links are still saved',
    `<p style="color:#94a3b8;line-height:1.6;">Come back and they will be live again in one click. Reactivate your subscription to restore exports and cloud builds.</p>
     <p style="margin:24px 0;">${cta(appUrl('/pricing'), 'Reactivate')}</p>`
  );
}

export function winback30dHtml(promoCode?: string | null): string {
  const discountBlock = promoCode
    ? `<p style="color:#94a3b8;line-height:1.6;margin:16px 0;">
         Use code <strong style="color:#22d3ee;font-size:18px;letter-spacing:1px;">${promoCode}</strong>
         for 20% off your next month when you reactivate.
       </p>
       <p style="margin:24px 0;">${cta(appUrl('/pricing'), 'Reactivate with 20% off')}</p>`
    : `<p style="margin:24px 0;">${cta(appUrl('/pricing'), 'View plans')}</p>`;

  return shell(
    'Come back to NiskBuild — 20% off',
    `<p style="color:#94a3b8;line-height:1.6;">New in NiskBuild: storage-backed exports, docs hub, and import pipeline. We would love to have you back.</p>
     ${discountBlock}`
  );
}

export function paymentFailedHtml(): string {
  return shell(
    'Your payment failed',
    `<p style="color:#94a3b8;line-height:1.6;">Update your card to keep your preview links live and cloud builds running.</p>
     <p style="margin:24px 0;">${cta(appUrl('/dashboard/settings?tab=billing'), 'Update payment method')}</p>`
  );
}

export function upgradeConfirmedHtml(planName: string): string {
  return shell(
    `Welcome to ${planName}`,
    `<p style="color:#94a3b8;line-height:1.6;">Your upgrade is active. Explore exports, cloud credits, and everything your plan unlocks.</p>
     <p style="margin:24px 0;">${cta(appUrl('/dashboard'), 'Explore features')}</p>`
  );
}

export function monthlyReportHtml(params: {
  builds: number;
  projects: number;
  creditsRemaining: number;
  monthLabel: string;
}): string {
  return shell(
    `Your NiskBuild month in numbers — ${params.monthLabel}`,
    `<ul style="color:#94a3b8;line-height:1.8;padding-left:20px;">
      <li><strong style="color:#fff;">${params.builds}</strong> builds this month</li>
      <li><strong style="color:#fff;">${params.projects}</strong> saved projects</li>
      <li><strong style="color:#fff;">${params.creditsRemaining}</strong> cloud credits remaining</li>
    </ul>
    <p style="margin:24px 0;">${cta(appUrl('/dashboard'), 'View Dashboard')}</p>`
  );
}

export function teamInviteHtml(params: {
  orgName: string;
  inviterName: string;
  role: string;
  acceptUrl: string;
  expiresAt: string;
}): string {
  const expiresLabel = new Date(params.expiresAt).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  const roleLabel = params.role === 'admin' ? 'Admin' : 'Member';
  return shell(
    `You're invited to ${params.orgName}`,
    `<p style="color:#94a3b8;line-height:1.6;">
      <strong style="color:#fff;">${params.inviterName}</strong> invited you to join
      <strong style="color:#fff;">${params.orgName}</strong> on NiskBuild as
      <strong style="color:#fff;">${roleLabel}</strong>.
    </p>
    <p style="color:#94a3b8;line-height:1.6;">
      Accept with the same email this invite was sent to. This link expires on ${expiresLabel}.
    </p>
    <p style="color:#94a3b8;line-height:1.6;font-size:13px;">
      Joining this organization gives its owners and admins visibility into projects created
      within it — including their prompts and generated code. Personal projects outside this
      organization stay private to you.
    </p>
    <p style="color:#64748b;font-size:11px;line-height:1.5;">
      (Wording subject to final legal review.)
    </p>
    <p style="margin:24px 0;">${cta(params.acceptUrl, 'Accept invite')}</p>
    <p style="color:#64748b;font-size:12px;">If the button does not work, open:<br/>
      <a href="${params.acceptUrl}" style="color:#818cf8;word-break:break-all;">${params.acceptUrl}</a>
    </p>`
  );
}

export function teamPlanLapsedHtml(params: {
  orgName: string;
  ownerName: string;
  settingsUrl: string;
}): string {
  return shell(
    `${params.orgName}: team generation paused`,
    `<p style="color:#94a3b8;line-height:1.6;">
      The plan for <strong style="color:#fff;">${params.orgName}</strong> no longer includes
      multi-seat teams (Agency Studio or higher). You can still open and view team projects,
      but generation and edits are paused for members.
    </p>
    <p style="color:#94a3b8;line-height:1.6;">
      Ask <strong style="color:#fff;">${params.ownerName}</strong> (the organization owner) to
      restore an Agency Studio or higher plan. You cannot upgrade the team subscription yourself.
    </p>
    <p style="margin:24px 0;">${cta(params.settingsUrl, 'Open team settings')}</p>`
  );
}

export function teamSeatOverageHtml(params: {
  orgName: string;
  members: number;
  limit: number;
  tierName: string;
  settingsUrl: string;
}): string {
  return shell(
    `${params.orgName}: seat limit exceeded`,
    `<p style="color:#94a3b8;line-height:1.6;">
      Your <strong style="color:#fff;">${params.tierName}</strong> plan allows
      <strong style="color:#fff;">${params.limit}</strong> seat${params.limit === 1 ? '' : 's'},
      but <strong style="color:#fff;">${params.orgName}</strong> currently has
      <strong style="color:#fff;">${params.members}</strong> members.
    </p>
    <p style="color:#94a3b8;line-height:1.6;">
      Existing members keep access. New invites are blocked until you remove members or
      upgrade to a plan with a higher seat cap. Nobody was removed automatically.
    </p>
    <p style="margin:24px 0;">${cta(params.settingsUrl, 'Manage team seats')}</p>`
  );
}
