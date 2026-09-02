# Security

Do not commit Meta tokens, Meta app secrets, owner passwords, Vercel tokens, or signing secrets.

Operational rules:

1. Keep all newly created spend-capable objects `PAUSED` until explicitly reviewed.
2. Use a dedicated Meta system user rather than a personal access token where possible.
3. Restrict the system user to the required Business assets.
4. Rotate `META_ACCESS_TOKEN`, `META_APP_SECRET`, `MCP_OWNER_PASSWORD`, and `MCP_SIGNING_SECRET` if exposure is suspected.
5. Treat `meta_set_delivery_status(..., ACTIVE)` and budget increases as spend-impacting actions.
6. Review Meta Ads Manager after the first creation of every new campaign architecture.
