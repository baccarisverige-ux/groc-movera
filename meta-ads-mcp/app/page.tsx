const required = [
  'PUBLIC_BASE_URL',
  'META_GRAPH_VERSION',
  'META_ACCESS_TOKEN',
  'META_AD_ACCOUNT_ID',
  'MCP_OWNER_PASSWORD',
  'MCP_SIGNING_SECRET',
];

export const dynamic = 'force-dynamic';

export default function Home() {
  const missing = required.filter((name) => !process.env[name]);
  const configured = missing.length === 0;
  return (
    <main style={{ maxWidth: 720, margin: '8vh auto', background: '#fff', border: '1px solid #ddd', borderRadius: 18, padding: 28 }}>
      <h1 style={{ marginTop: 0 }}>Movera Meta Ads MCP</h1>
      <p>Private Meta Marketing API control plane for ChatGPT.</p>
      <p><strong>Status:</strong> {configured ? 'Configured' : 'Configuration incomplete'}</p>
      {!configured && <p>Missing environment variables: {missing.join(', ')}</p>}
      <p>The MCP endpoint is <code>/api/mcp</code>. Campaigns, ad sets, and ads created by this server default to <strong>PAUSED</strong>.</p>
    </main>
  );
}
