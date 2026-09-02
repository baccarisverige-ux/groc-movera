import { baseUrl } from '@/lib/oauth';

export const runtime = 'nodejs';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function GET() {
  const base = baseUrl();
  return Response.json(
    {
      resource: base,
      authorization_servers: [base],
      scopes_supported: ['meta:read', 'meta:write', 'offline_access'],
      resource_documentation: `${base}/health`,
    },
    { headers: cors },
  );
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: cors });
}
