import {
  assertResource,
  issueAuthorizationCode,
  parseScopes,
  securePasswordMatches,
  verifyChatGptClient,
} from '@/lib/oauth';

export const runtime = 'nodejs';

function esc(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function required(params: URLSearchParams, name: string): string {
  const value = params.get(name);
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function errorPage(message: string, status = 400): Response {
  return new Response(
    `<!doctype html><html><body style="font-family:system-ui;max-width:680px;margin:60px auto;padding:20px"><h1>Authorization error</h1><p>${esc(message)}</p></body></html>`,
    { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } },
  );
}

async function validate(params: URLSearchParams) {
  const responseType = required(params, 'response_type');
  const clientId = required(params, 'client_id');
  const redirectUri = required(params, 'redirect_uri');
  const resource = assertResource(required(params, 'resource'));
  const codeChallenge = required(params, 'code_challenge');
  const codeChallengeMethod = required(params, 'code_challenge_method');
  const state = params.get('state') ?? '';
  const scopes = parseScopes(params.get('scope'));

  if (responseType !== 'code') throw new Error('Only response_type=code is supported');
  if (codeChallengeMethod !== 'S256') throw new Error('PKCE S256 is required');
  if (!/^[A-Za-z0-9_-]{43,128}$/.test(codeChallenge)) throw new Error('Invalid PKCE code_challenge');

  const redirect = new URL(redirectUri);
  if (redirect.protocol !== 'https:') throw new Error('redirect_uri must use HTTPS');
  await verifyChatGptClient(clientId, redirectUri);

  return { clientId, redirectUri, resource, codeChallenge, state, scopes };
}

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const valid = await validate(params);

    const hidden = [...params.entries()]
      .filter(([key]) => key !== 'password')
      .map(([key, value]) => `<input type="hidden" name="${esc(key)}" value="${esc(value)}">`)
      .join('\n');

    return new Response(
      `<!doctype html>
<html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Authorize Meta Ads MCP</title></head>
<body style="font-family:system-ui;background:#f6f7f8;color:#111;margin:0">
  <main style="max-width:520px;margin:8vh auto;background:#fff;border:1px solid #ddd;border-radius:18px;padding:28px;box-shadow:0 10px 30px rgba(0,0,0,.08)">
    <h1 style="margin-top:0">Authorize Meta Ads control</h1>
    <p>ChatGPT is requesting <strong>${esc(valid.scopes.join(', '))}</strong> access to your private Meta Ads MCP server.</p>
    <p>Enter the separate owner password you configured for this server. Do not use your Meta or ChatGPT password.</p>
    <form method="post">
      ${hidden}
      <label style="display:block;margin:20px 0 8px">Owner password</label>
      <input name="password" type="password" autocomplete="current-password" required style="box-sizing:border-box;width:100%;padding:12px;border:1px solid #bbb;border-radius:10px;font-size:16px">
      <button type="submit" style="margin-top:18px;width:100%;padding:12px;border:0;border-radius:10px;background:#111;color:#fff;font-size:16px">Authorize</button>
    </form>
  </main>
</body></html>`,
      { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return errorPage(error instanceof Error ? error.message : 'Invalid request');
  }
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const params = new URLSearchParams();
    for (const [key, value] of form.entries()) {
      if (typeof value === 'string' && key !== 'password') params.append(key, value);
    }

    const valid = await validate(params);
    const password = String(form.get('password') ?? '');
    if (!securePasswordMatches(password)) return errorPage('Invalid owner password', 401);

    const code = await issueAuthorizationCode({
      client_id: valid.clientId,
      redirect_uri: valid.redirectUri,
      resource: valid.resource,
      scope: valid.scopes.join(' '),
      code_challenge: valid.codeChallenge,
    });

    const redirect = new URL(valid.redirectUri);
    redirect.searchParams.set('code', code);
    if (valid.state) redirect.searchParams.set('state', valid.state);

    return Response.redirect(redirect, 302);
  } catch (error) {
    return errorPage(error instanceof Error ? error.message : 'Authorization failed');
  }
}
