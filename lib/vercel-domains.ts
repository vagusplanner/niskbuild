/**
 * Optional Vercel Domains API integration for custom domain SSL.
 *
 * Required env (all must be set for attach to run):
 *   VERCEL_TOKEN       — Vercel API token with domain write access
 *   VERCEL_PROJECT_ID  — Project ID that serves niskbuild.com
 *   VERCEL_TEAM_ID     — Optional; required for team-owned projects
 *
 * Without these, DNS verification still works and routing is prepared in-app,
 * but TLS will not be issued until the domain is added to the Vercel project
 * (dashboard or API).
 */

export type VercelDomainAttachResult =
  | { ok: true; attached: true; detail: string }
  | { ok: true; attached: false; skipped: true; reason: string }
  | { ok: false; error: string };

export function vercelDomainEnvConfigured(): boolean {
  return Boolean(process.env.VERCEL_TOKEN && process.env.VERCEL_PROJECT_ID);
}

export function vercelDnsCnameTarget(): string {
  return process.env.VERCEL_DNS_CNAME_TARGET?.trim() || 'cname.vercel-dns.com';
}

/**
 * Add a hostname to the Vercel project so Vercel can issue SSL and route traffic.
 * No-ops with skipped=true when env is not configured.
 */
export async function attachDomainToVercelProject(
  hostname: string
): Promise<VercelDomainAttachResult> {
  const token = process.env.VERCEL_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  const teamId = process.env.VERCEL_TEAM_ID;

  if (!token || !projectId) {
    return {
      ok: true,
      attached: false,
      skipped: true,
      reason:
        'VERCEL_TOKEN / VERCEL_PROJECT_ID not configured. DNS can be verified in-app; add the domain in the Vercel dashboard (or set these env vars) for SSL.',
    };
  }

  const teamQuery = teamId ? `?teamId=${encodeURIComponent(teamId)}` : '';
  const url = `https://api.vercel.com/v10/projects/${encodeURIComponent(projectId)}/domains${teamQuery}`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: hostname }),
    });

    const body = (await res.json().catch(() => ({}))) as {
      error?: { message?: string; code?: string };
      name?: string;
      verified?: boolean;
    };

    if (res.ok) {
      return {
        ok: true,
        attached: true,
        detail: body.verified
          ? 'Domain added to Vercel; certificate provisioning started.'
          : 'Domain added to Vercel; awaiting Vercel DNS/SSL verification.',
      };
    }

    // Already on project is success for our purposes
    const msg = body.error?.message || `Vercel API ${res.status}`;
    if (
      res.status === 409 ||
      /already|exists|configured/i.test(msg) ||
      body.error?.code === 'domain_already_in_use'
    ) {
      return {
        ok: true,
        attached: true,
        detail: 'Domain already present on Vercel project.',
      };
    }

    return { ok: false, error: msg };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Vercel domain attach failed',
    };
  }
}
