# Movera Meta Ads MCP

A private remote MCP server that wraps the Meta Marketing API with explicit read/write tools for a single ad account. It is designed to be deployed on Vercel and connected to ChatGPT as a custom MCP app.

## Safety defaults

- New campaigns, ad sets, and ads default to `PAUSED`.
- Activating delivery is a separate `meta_set_delivery_status` action.
- Meta access tokens and app secrets are **never** committed to Git. Put them only in Vercel encrypted environment variables.
- The MCP endpoint is protected by OAuth 2.1-style authorization code + PKCE S256 and a separate owner password. The current server authorizes both `meta:read` and `meta:write` at connection time because the deployed `mcp-handler` version enforces scopes globally.
- The OAuth server accepts only ChatGPT Client ID Metadata Document (`chatgpt.com`) clients.
- Meta `appsecret_proof` is automatically added when `META_APP_SECRET` is configured.

## Tools

Read:
- `meta_validate_connection`
- `meta_list_campaigns`
- `meta_get_insights`
- `meta_get_structure`

Write:
- `meta_create_campaign`
- `meta_create_adset`
- `meta_upload_image_from_url`
- `meta_create_adcreative`
- `meta_create_ad`
- `meta_set_delivery_status`
- `meta_update_budget`

## Environment variables

Copy `.env.example` and configure these in Vercel:

- `PUBLIC_BASE_URL`: production HTTPS origin, e.g. `https://your-project.vercel.app`
- `META_GRAPH_VERSION`: Graph API version enabled for your Meta app, e.g. the version shown in the Meta developer dashboard
- `META_ACCESS_TOKEN`: long-lived Meta system-user token with the permissions/assets required for the ad account
- `META_APP_SECRET`: Meta app secret; strongly recommended so requests include `appsecret_proof`
- `META_AD_ACCOUNT_ID`: numeric ad account ID, with or without `act_`
- `MCP_OWNER_PASSWORD`: unique password used only to authorize this MCP server; do not reuse Meta/ChatGPT credentials
- `MCP_SIGNING_SECRET`: random secret of at least 32 characters (`openssl rand -base64 48` is suitable)

Optional context variables: `META_BUSINESS_ID`, `META_PAGE_ID`, `META_PIXEL_ID`.

## Meta setup that the account owner must approve

1. In Meta for Developers, create or select a Business app that belongs to the Business Portfolio that owns or has access to the ad account.
2. Add the Marketing API product/use case as required by Meta's current UI.
3. In Business Settings, create/select a system user and assign only the required assets: ad account, Facebook Page, Instagram account, Pixel/dataset as applicable.
4. Generate a system-user access token for the app with `ads_management` plus any additional permissions Meta requires for the assets/creative flow you use. Keep the token private.
5. Put the token and IDs in Vercel environment variables; never paste them into repository files.
6. Start with a test campaign in `PAUSED` state and validate the structure in Ads Manager before activating delivery.

Meta changes permissions, review requirements, objectives, and API versions over time. Use the current values shown in the Meta developer/business interfaces for the account.

## Deploy to Vercel

This is a standard Next.js App Router project using `mcp-handler` and Streamable HTTP.

```bash
npm install
npm run build
vercel --prod
```

After deployment, set `PUBLIC_BASE_URL` to the production URL and redeploy. Health checks:

- `/` — setup status without exposing secret values
- `/health` — JSON setup status
- `/.well-known/oauth-protected-resource`
- `/.well-known/oauth-authorization-server`
- `/api/mcp` — MCP endpoint

## ChatGPT connection

Create a custom MCP app in a ChatGPT workspace that supports custom MCP write actions, set the server URL to:

`https://YOUR-DOMAIN/api/mcp`

ChatGPT will discover the OAuth metadata, open the authorization page, and require the separate `MCP_OWNER_PASSWORD`. The connection uses PKCE S256.

## Security note

The bundled OAuth implementation is intentionally narrow and single-owner. It is suitable as a private control-plane starting point, but an established OAuth identity provider is preferable for a larger multi-user production deployment. The authorization code is short-lived and PKCE-protected, but a production multi-user service should add persistent one-time authorization-code storage, revocation, audit logging, rate limiting, and stronger user/session management.
