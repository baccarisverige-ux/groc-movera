import {
  assertResource,
  issueAccessToken,
  issueRefreshToken,
  parseScopes,
  pkceS256,
  tokenJson,
  verifySignedToken,
} from '@/lib/oauth';

export const runtime = 'nodejs';

function fail(error: string, description: string, status = 400): Response {
  return tokenJson({ error, error_description: description }, status);
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const grantType = String(form.get('grant_type') ?? '');
    const clientId = String(form.get('client_id') ?? '');
    const resource = assertResource(String(form.get('resource') ?? ''));

    if (!clientId) return fail('invalid_request', 'client_id is required');

    if (grantType === 'authorization_code') {
      const code = String(form.get('code') ?? '');
      const verifier = String(form.get('code_verifier') ?? '');
      const redirectUri = String(form.get('redirect_uri') ?? '');
      if (!code || !verifier || !redirectUri) {
        return fail('invalid_request', 'code, code_verifier and redirect_uri are required');
      }

      const claims = await verifySignedToken(code);
      if (claims.typ !== 'authorization_code') return fail('invalid_grant', 'Wrong token type');
      if (claims.client_id !== clientId || claims.redirect_uri !== redirectUri || claims.resource !== resource) {
        return fail('invalid_grant', 'Authorization code does not match this request');
      }
      if (typeof claims.code_challenge !== 'string' || pkceS256(verifier) !== claims.code_challenge) {
        return fail('invalid_grant', 'PKCE verification failed');
      }

      const scopes = parseScopes(typeof claims.scope === 'string' ? claims.scope : undefined);
      const accessToken = await issueAccessToken({ clientId, resource, scopes });
      const response: Record<string, unknown> = {
        access_token: accessToken,
        token_type: 'Bearer',
        expires_in: 3600,
        scope: scopes.join(' '),
      };
      if (scopes.includes('offline_access')) {
        response.refresh_token = await issueRefreshToken({ clientId, resource, scopes });
      }
      return tokenJson(response);
    }

    if (grantType === 'refresh_token') {
      const refreshToken = String(form.get('refresh_token') ?? '');
      if (!refreshToken) return fail('invalid_request', 'refresh_token is required');

      const claims = await verifySignedToken(refreshToken);
      if (claims.typ !== 'refresh_token') return fail('invalid_grant', 'Wrong token type');
      if (claims.client_id !== clientId) return fail('invalid_grant', 'refresh_token client mismatch');
      const audience = Array.isArray(claims.aud) ? claims.aud[0] : claims.aud;
      if (audience !== resource) return fail('invalid_grant', 'refresh_token resource mismatch');

      const originalScopes = parseScopes(typeof claims.scope === 'string' ? claims.scope : undefined);
      const requestedScope = form.get('scope');
      const scopes = requestedScope ? parseScopes(String(requestedScope)) : originalScopes;
      if (scopes.some((scope) => !originalScopes.includes(scope))) {
        return fail('invalid_scope', 'Refresh cannot add scopes');
      }

      const accessToken = await issueAccessToken({ clientId, resource, scopes });
      return tokenJson({
        access_token: accessToken,
        token_type: 'Bearer',
        expires_in: 3600,
        scope: scopes.join(' '),
        refresh_token: await issueRefreshToken({ clientId, resource, scopes }),
      });
    }

    return fail('unsupported_grant_type', 'Supported grant types: authorization_code, refresh_token');
  } catch (error) {
    return fail('invalid_request', error instanceof Error ? error.message : 'Token request failed');
  }
}
