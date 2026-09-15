import 'server-only';

import { createSign } from 'node:crypto';
import http2 from 'node:http2';

function base64UrlEncode(input: Buffer | string): string {
  const buf = typeof input === 'string' ? Buffer.from(input) : input;
  return buf.toString('base64url');
}

function getApnsPrivateKey(): string | null {
  const raw = process.env.APNS_KEY;
  if (!raw) return null;
  return raw.includes('BEGIN PRIVATE KEY') ? raw.replace(/\\n/g, '\n') : raw.replace(/\\n/g, '\n');
}

export function isApnsConfigured(): boolean {
  return !!(
    process.env.APNS_TEAM_ID &&
    process.env.APNS_KEY_ID &&
    getApnsPrivateKey() &&
    (process.env.APNS_BUNDLE_ID || 'com.niskbuild.vagusplanner')
  );
}

function createApnsJwt(): string {
  const teamId = process.env.APNS_TEAM_ID;
  const keyId = process.env.APNS_KEY_ID;
  const privateKey = getApnsPrivateKey();

  if (!teamId || !keyId || !privateKey) {
    throw new Error('APNs credentials not configured (APNS_TEAM_ID, APNS_KEY_ID, APNS_KEY)');
  }

  const header = base64UrlEncode(JSON.stringify({ alg: 'ES256', kid: keyId }));
  const payload = base64UrlEncode(
    JSON.stringify({ iss: teamId, iat: Math.floor(Date.now() / 1000) })
  );
  const unsigned = `${header}.${payload}`;

  const sign = createSign('SHA256');
  sign.update(unsigned);
  const signature = sign.sign({ key: privateKey, format: 'pem', dsaEncoding: 'ieee-p1363' });
  return `${unsigned}.${base64UrlEncode(signature)}`;
}

export interface ApnsSendResult {
  ok: boolean;
  status?: number;
  error?: string;
  apnsId?: string;
}

export async function sendApnsPush(options: {
  deviceToken: string;
  title: string;
  body: string;
  reminderId?: string;
}): Promise<ApnsSendResult> {
  if (!isApnsConfigured()) {
    return { ok: false, error: 'APNs not configured' };
  }

  const bundleId = process.env.APNS_BUNDLE_ID || 'com.niskbuild.vagusplanner';
  const production = process.env.APNS_PRODUCTION === 'true';
  const host = production ? 'api.push.apple.com' : 'api.sandbox.push.apple.com';

  let jwt: string;
  try {
    jwt = createApnsJwt();
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'APNs JWT failed' };
  }

  const payload = JSON.stringify({
    aps: {
      alert: { title: options.title, body: options.body },
      sound: 'default',
    },
    reminderId: options.reminderId,
  });

  const tokenPrefix = options.deviceToken.slice(0, 8);

  return new Promise((resolve) => {
    const client = http2.connect(`https://${host}`);
    let settled = false;

    const finish = (result: ApnsSendResult) => {
      if (settled) return;
      settled = true;
      try {
        client.close();
      } catch {
        /* ignore */
      }
      resolve(result);
    };

    client.on('error', (err) => {
      console.error('[APNs] connection error', {
        host,
        topic: bundleId,
        tokenPrefix,
        reminderId: options.reminderId,
        error: err.message,
      });
      finish({ ok: false, error: err.message });
    });

    const req = client.request({
      ':method': 'POST',
      ':path': `/3/device/${options.deviceToken}`,
      authorization: `bearer ${jwt}`,
      'apns-topic': bundleId,
      'apns-push-type': 'alert',
      'content-type': 'application/json',
    });

    let status = 0;
    let apnsId: string | undefined;
    let responseBody = '';

    req.on('response', (headers) => {
      status = Number(headers[':status'] ?? 0);
      const rawId = headers['apns-id'];
      apnsId = Array.isArray(rawId) ? rawId[0] : rawId;
    });

    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      responseBody += chunk;
    });

    req.on('end', () => {
      const ok = status === 200;
      const logPayload = {
        host,
        topic: bundleId,
        status,
        apnsId: apnsId ?? null,
        responseBody: responseBody || '(empty)',
        tokenPrefix,
        reminderId: options.reminderId ?? null,
        ok,
      };
      if (ok) {
        console.log('[APNs] send result', logPayload);
      } else {
        console.error('[APNs] send failed', logPayload);
      }
      finish({
        ok,
        status,
        apnsId,
        error: ok
          ? undefined
          : responseBody
            ? responseBody.slice(0, 500)
            : `APNs HTTP ${status || 'unknown'}`,
      });
    });

    req.on('error', (err) => {
      console.error('[APNs] request error', {
        host,
        topic: bundleId,
        tokenPrefix,
        reminderId: options.reminderId,
        error: err.message,
      });
      finish({ ok: false, error: err.message });
    });

    req.write(payload);
    req.end();
  });
}
