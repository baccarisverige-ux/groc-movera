export const runtime = 'nodejs';

export async function GET() {
  const required = [
    'PUBLIC_BASE_URL',
    'META_GRAPH_VERSION',
    'META_ACCESS_TOKEN',
    'META_AD_ACCOUNT_ID',
    'MCP_OWNER_PASSWORD',
    'MCP_SIGNING_SECRET',
  ];

  const missing = required.filter((name) => !process.env[name]);

  return Response.json(
    {
      ok: missing.length === 0,
      service: 'movera-meta-ads-mcp',
      configured: missing.length === 0,
      missing,
    },
    { status: missing.length === 0 ? 200 : 503 },
  );
}
