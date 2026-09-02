import { createHash, timingSafeEqual } from 'node:crypto';
import { SignJWT, jwtVerify, type JWTPayload } from 'jose';

const ALLOWED_SCOPES = new Set(['meta:read', 'meta:write', 'offline_access']);

export function baseUrl(): string {
  const value = process.env.PUBLIC_BASE_URL?.replace(/\/$/, '');
  if (!value) throw new Error('PUBLIC_BASE_URL is not configured');
  const url = new URL(value);
  if (url.protocol !== 'https:' && url.hostname !== 'localhost') {
    throw new Error('PUBLIC_BASE_URL must use HTTPS');
  }
  return url.toString().replace(/\/$/, '');
}

function signingKey(): Uint8Array {
  const secret = process.env.MCP_SIGNING_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('MCP_SIGNING_SECRET must be at least 32 characters');
  }
  return new TextEncoder().encode(secret);
}

export function parseScopes(value?: string | null): string[] {
  const requested = (value ?? 'meta:read meta:write offline_access')
    .split(/\s+/)
    .filter(Boolean);
  const unique = [...new Set(requested)];
  for (const scope of unique) {
    if (!ALLOWED_SCOPES.has(scope)) throw new Error(`Unsupported scope: ${scope}`);
  }
  if (!unique.includes('meta:read')) unique.push('meta:read');
  return unique;
}

export function securePasswordMatches(input: string): boolean {
  const expected = process.env.MCP_OWNER_PASSWORD;
  if (!expected || expected.length < 12) {
    throw new Error('MCP_OWNER_PASSWORD must be at least 12 characters');
  }
  const a = Buffer.from(input);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function pkceS256(verifier: string): string {
  return createHash('sha256').update(verifier).digest('base64url');
}

async function sign(payload: JWTPayload, expiresInSeconds: number): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuer(baseUrl())
    .setIssuedAt(now)
    .setExpirationTime(now + expiresInSeconds)
    .sign(signingKey());
}

export async function verifySignedToken(token: string): Promise<JWTPayload> {
  const { payload } = await jwtVerify(token, signingKey(), {
    issuer: baseUrl(),
    algorithms: ['HS256'],
  });
  return payload;
}

export async function verifyChatGptClient(clientId: string, redirectUri: string): Promise<void> {
  const clientUrl = new URL(clientId);
  if (clientUrl.protocol !== 'https:' || clientUrl.hostname !== 'chatgpt.com') {
    throw new Error('Only ChatGPT CIMD clients are accepted');
  }

  const response = await fetch(clientUrl, {
    headers: { accept: 'application/json' },
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`Unable to validate ChatGPT client metadata (${response.status})`);

  const metadata = (await response.json()) as { redirect_uris?: string[] };
  if (!Array.isArray(metadata.redirect_uris) || !metadata.redirect_uris.includes(redirectUri)) {
    throw new Error('redirect_uri is not registered in ChatGPT client metadata');
  }
}

export type AuthorizationCodeClaims = JWTPayload & {
  typ: 'authorization_code';
  client_id: string;
  redirect_uri: string;
  resource: string;
  scope: string;
  code_challenge: string;
};

export async function issueAuthorizationCode(input: {
  client_id: string;
  redirect_uri: string;
  resource: string;
  scope: string;
  code_challenge: string;
}): Promise<string> {
  return sign({ typ: 'authorization_code', ...input }, 90);
}

export async function issueAccessToken(input: {
  clientId: string;
  resource: string;
  scopes: string[];
}): Promise<string> {
  return sign(
    {
      typ: 'access_token',
      sub: 'owner',
      client_id: input.clientId,
      aud: input.resource,
      scope: input.scopes.join(' '),
    },
    3600,
  );
}

export async function issueRefreshToken(input: {
  clientId: string;
  resource: string;
  scopes: string[];
}): Promise<string> {
  return sign(
    {
      typ: 'refresh_token',
      sub: 'owner',
      client_id: input.clientId,
      aud: input.resource,
      scope: input.scopes.join(' '),
    },
    60 * 60 * 24 * 30,
  );
}

export function assertResource(value: string | null | undefined): string {
  const expected = baseUrl();
  const actual = (value ?? '').replace(/\/$/, '');
  if (actual !== expected) throw new Error('Invalid OAuth resource');
  return expected;
}

export function tokenJson(body: Record<string, unknown>, status = 200): Response {
  return Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      Pragma: 'no-cache',
    },
  });
}
