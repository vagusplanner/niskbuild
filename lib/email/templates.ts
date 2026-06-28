import { appUrl } from '@/lib/email/app-url';

function shell(title: string, body: string): string {
  return `
    <div style="font-family:system-ui,sans-serif;max-width:520px;color:#e2e8f0;background:#0B0F19;padding:32px;border-radius:12px;">
      <h2 style="color:#fff;margin:0 0 12px;">${title}</h2>
      ${body}
    </div>
  `;
}

function cta(href: string, label: string, primary = true): string {
  const style = primary
    ? 'display:inline-block;background:linear-gradient(135deg,#4F6EF7,#7C3AED);color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;'
    : 'display:inline-block;border:1px solid #4F6EF7;color:#4F6EF7;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;';
  return `<a href="${href}" style="${style}">${label}</a>`;
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

export function day14NpsHtml(): string {
  return shell(
    'How likely are you to recommend NiskBuild?',
    `<p style="color:#94a3b8;line-height:1.6;">Tap a score from 0 (not likely) to 10 (very likely). It takes five seconds.</p>
     <p style="margin:24px 0;">${cta(appUrl('/nps'), 'Rate 1–10')}</p>`
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
