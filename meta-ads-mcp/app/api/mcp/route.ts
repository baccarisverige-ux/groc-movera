import { createMcpHandler, withMcpAuth } from 'mcp-handler';
import type { AuthInfo } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { baseUrl, parseScopes, verifySignedToken } from '@/lib/oauth';
import { metaAccountCurrency, metaAccountId, metaRequest, moneyToMinorUnits } from '@/lib/meta';

export const runtime = 'nodejs';
export const maxDuration = 60;

const oauth = () => [
  { type: 'oauth2' as const, scopes: ['meta:read', 'meta:write', 'offline_access'] },
];

const readAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  openWorldHint: false,
};

const writeAnnotations = {
  readOnlyHint: false,
  destructiveHint: false,
  openWorldHint: true,
};

function result(value: unknown) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }],
  };
}

const statusSchema = z.enum(['ACTIVE', 'PAUSED']);
const objectiveSchema = z.enum([
  'OUTCOME_AWARENESS',
  'OUTCOME_ENGAGEMENT',
  'OUTCOME_LEADS',
  'OUTCOME_SALES',
  'OUTCOME_TRAFFIC',
  'OUTCOME_APP_PROMOTION',
]);

const handler = createMcpHandler(
  (server) => {
    server.registerTool(
      'meta_validate_connection',
      {
        title: 'Validate Meta Ads connection',
        description: 'Read-only. Confirms the configured Meta ad account is reachable and returns basic account metadata.',
        inputSchema: z.object({}),
        securitySchemes: oauth(),
        annotations: readAnnotations,
      },
      async () => {
        const data = await metaRequest(metaAccountId(), {
          params: {
            fields: 'id,account_id,name,account_status,currency,timezone_name,business',
          },
        });
        return result(data);
      },
    );

    server.registerTool(
      'meta_list_campaigns',
      {
        title: 'List Meta Ads campaigns',
        description: 'Read-only. Lists campaigns in the configured Meta ad account with status, objective, budget and timestamps.',
        inputSchema: z.object({
          limit: z.number().int().min(1).max(100).default(50),
        }),
        securitySchemes: oauth(),
        annotations: readAnnotations,
      },
      async ({ limit }) => {
        const data = await metaRequest(`${metaAccountId()}/campaigns`, {
          params: {
            fields: 'id,name,status,effective_status,objective,daily_budget,lifetime_budget,buying_type,created_time,updated_time',
            limit,
          },
        });
        return result(data);
      },
    );

    server.registerTool(
      'meta_get_insights',
      {
        title: 'Get Meta Ads insights',
        description: 'Read-only. Returns ad-account performance insights for a date range. Dates use YYYY-MM-DD.',
        inputSchema: z.object({
          since: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
          until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
          level: z.enum(['account', 'campaign', 'adset', 'ad']).default('campaign'),
          limit: z.number().int().min(1).max(100).default(50),
        }),
        securitySchemes: oauth(),
        annotations: readAnnotations,
      },
      async ({ since, until, level, limit }) => {
        const data = await metaRequest(`${metaAccountId()}/insights`, {
          params: {
            fields: 'account_id,campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,spend,impressions,reach,clicks,ctr,cpc,cpm,actions,action_values,purchase_roas',
            time_range: { since, until },
            level,
            limit,
          },
        });
        return result(data);
      },
    );

    server.registerTool(
      'meta_create_campaign',
      {
        title: 'Create Meta Ads campaign',
        description: 'Creates a Meta Ads campaign. Defaults to PAUSED. Select special_ad_categories correctly (for example HOUSING when Meta requires it). Budget inputs are account-currency units and are converted to Meta minor units.',
        inputSchema: z.object({
          name: z.string().min(1).max(400),
          objective: objectiveSchema,
          special_ad_categories: z
            .array(z.enum(['HOUSING', 'EMPLOYMENT', 'CREDIT', 'ISSUES_ELECTIONS_POLITICS']))
            .default([]),
          buying_type: z.enum(['AUCTION', 'RESERVED']).default('AUCTION'),
          daily_budget: z.number().positive().optional(),
          lifetime_budget: z.number().positive().optional(),
          status: statusSchema.default('PAUSED'),
        }),
        securitySchemes: oauth(),
        annotations: writeAnnotations,
      },
      async ({ name, objective, special_ad_categories, buying_type, daily_budget, lifetime_budget, status }) => {
        if (daily_budget && lifetime_budget) {
          throw new Error('Use either daily_budget or lifetime_budget, not both');
        }
        const currency = daily_budget || lifetime_budget ? await metaAccountCurrency() : undefined;
        const data = await metaRequest(`${metaAccountId()}/campaigns`, {
          method: 'POST',
          params: {
            name,
            objective,
            special_ad_categories,
            buying_type,
            daily_budget: daily_budget && currency ? moneyToMinorUnits(daily_budget, currency) : undefined,
            lifetime_budget: lifetime_budget && currency ? moneyToMinorUnits(lifetime_budget, currency) : undefined,
            status,
          },
        });
        return result(data);
      },
    );

    server.registerTool(
      'meta_create_adset',
      {
        title: 'Create Meta Ads ad set',
        description: 'Creates an ad set under an existing campaign. Defaults to PAUSED. Budget inputs are account-currency units. targeting and promoted_object are structured Meta payloads.',
        inputSchema: z.object({
          campaign_id: z.string().min(1),
          name: z.string().min(1).max(400),
          daily_budget: z.number().positive().optional(),
          lifetime_budget: z.number().positive().optional(),
          billing_event: z.string().default('IMPRESSIONS'),
          optimization_goal: z.string().min(1),
          bid_strategy: z.string().optional(),
          targeting: z.record(z.string(), z.unknown()),
          promoted_object: z.record(z.string(), z.unknown()).optional(),
          destination_type: z.string().optional(),
          start_time: z.string().optional(),
          end_time: z.string().optional(),
          status: statusSchema.default('PAUSED'),
        }),
        securitySchemes: oauth(),
        annotations: writeAnnotations,
      },
      async (args) => {
        if (args.daily_budget && args.lifetime_budget) {
          throw new Error('Use either daily_budget or lifetime_budget, not both');
        }
        const currency = args.daily_budget || args.lifetime_budget ? await metaAccountCurrency() : undefined;
        const data = await metaRequest(`${metaAccountId()}/adsets`, {
          method: 'POST',
          params: {
            campaign_id: args.campaign_id,
            name: args.name,
            daily_budget: args.daily_budget && currency ? moneyToMinorUnits(args.daily_budget, currency) : undefined,
            lifetime_budget: args.lifetime_budget && currency ? moneyToMinorUnits(args.lifetime_budget, currency) : undefined,
            billing_event: args.billing_event,
            optimization_goal: args.optimization_goal,
            bid_strategy: args.bid_strategy,
            targeting: args.targeting,
            promoted_object: args.promoted_object,
            destination_type: args.destination_type,
            start_time: args.start_time,
            end_time: args.end_time,
            status: args.status,
          },
        });
        return result(data);
      },
    );

    server.registerTool(
      'meta_upload_image_from_url',
      {
        title: 'Upload image to Meta Ads',
        description: 'Imports a publicly reachable image URL into the configured Meta ad account and returns the image hash for a creative.',
        inputSchema: z.object({
          url: z.string().url(),
          name: z.string().max(255).optional(),
        }),
        securitySchemes: oauth(),
        annotations: writeAnnotations,
      },
      async ({ url, name }) => {
        const data = await metaRequest(`${metaAccountId()}/adimages`, {
          method: 'POST',
          params: { url, name },
        });
        return result(data);
      },
    );

    server.registerTool(
      'meta_create_adcreative',
      {
        title: 'Create Meta Ads creative',
        description: 'Creates a Meta ad creative. object_story_spec is the structured Meta creative payload, typically containing page_id plus link_data or video_data. This does not create or publish an ad by itself.',
        inputSchema: z.object({
          name: z.string().min(1).max(400),
          object_story_spec: z.record(z.string(), z.unknown()),
          instagram_user_id: z.string().optional(),
          url_tags: z.string().optional(),
        }),
        securitySchemes: oauth(),
        annotations: writeAnnotations,
      },
      async ({ name, object_story_spec, instagram_user_id, url_tags }) => {
        const data = await metaRequest(`${metaAccountId()}/adcreatives`, {
          method: 'POST',
          params: { name, object_story_spec, instagram_user_id, url_tags },
        });
        return result(data);
      },
    );

    server.registerTool(
      'meta_create_ad',
      {
        title: 'Create Meta Ads ad',
        description: 'Creates an ad from an existing ad set and creative. Defaults to PAUSED so it cannot spend until explicitly activated.',
        inputSchema: z.object({
          name: z.string().min(1).max(400),
          adset_id: z.string().min(1),
          creative_id: z.string().min(1),
          status: statusSchema.default('PAUSED'),
          tracking_specs: z.array(z.unknown()).optional(),
        }),
        securitySchemes: oauth(),
        annotations: writeAnnotations,
      },
      async ({ name, adset_id, creative_id, status, tracking_specs }) => {
        const data = await metaRequest(`${metaAccountId()}/ads`, {
          method: 'POST',
          params: {
            name,
            adset_id,
            creative: { creative_id },
            status,
            tracking_specs,
          },
        });
        return result(data);
      },
    );

    server.registerTool(
      'meta_set_delivery_status',
      {
        title: 'Pause or activate Meta Ads object',
        description: 'Pauses or activates an existing campaign, ad set, or ad. ACTIVE can begin or resume spend when the object and its parents are eligible.',
        inputSchema: z.object({
          object_id: z.string().min(1),
          level: z.enum(['campaign', 'adset', 'ad']),
          status: statusSchema,
        }),
        securitySchemes: oauth(),
        annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
      },
      async ({ object_id, level, status }) => {
        const data = await metaRequest(object_id, { method: 'POST', params: { status } });
        return result({ level, object_id, status, meta: data });
      },
    );

    server.registerTool(
      'meta_update_budget',
      {
        title: 'Update Meta Ads budget',
        description: 'Updates a campaign or ad-set budget. Enter account-currency units; the server converts to Meta minor units. Exactly one of daily_budget or lifetime_budget is required.',
        inputSchema: z.object({
          object_id: z.string().min(1),
          level: z.enum(['campaign', 'adset']),
          daily_budget: z.number().positive().optional(),
          lifetime_budget: z.number().positive().optional(),
        }),
        securitySchemes: oauth(),
        annotations: writeAnnotations,
      },
      async ({ object_id, level, daily_budget, lifetime_budget }) => {
        if ((!daily_budget && !lifetime_budget) || (daily_budget && lifetime_budget)) {
          throw new Error('Provide exactly one of daily_budget or lifetime_budget');
        }
        const currency = await metaAccountCurrency();
        const data = await metaRequest(object_id, {
          method: 'POST',
          params: {
            daily_budget: daily_budget ? moneyToMinorUnits(daily_budget, currency) : undefined,
            lifetime_budget: lifetime_budget ? moneyToMinorUnits(lifetime_budget, currency) : undefined,
          },
        });
        return result({ level, object_id, meta: data });
      },
    );

    server.registerTool(
      'meta_get_structure',
      {
        title: 'Inspect Meta Ads object',
        description: 'Read-only. Reads a campaign, ad set, ad, or creative by Meta ID using a safe field list for Ads Manager inspection.',
        inputSchema: z.object({
          object_id: z.string().min(1),
          object_type: z.enum(['campaign', 'adset', 'ad', 'creative']),
        }),
        securitySchemes: oauth(),
        annotations: readAnnotations,
      },
      async ({ object_id, object_type }) => {
        const fieldsByType: Record<string, string> = {
          campaign: 'id,name,status,effective_status,objective,daily_budget,lifetime_budget,created_time,updated_time',
          adset: 'id,name,campaign_id,status,effective_status,daily_budget,lifetime_budget,billing_event,optimization_goal,targeting,start_time,end_time,created_time,updated_time',
          ad: 'id,name,adset_id,campaign_id,status,effective_status,creative,created_time,updated_time',
          creative: 'id,name,object_story_spec,thumbnail_url,image_url,video_id,url_tags',
        };
        const data = await metaRequest(object_id, {
          params: { fields: fieldsByType[object_type] },
        });
        return result(data);
      },
    );
  },
  {
    serverInfo: { name: 'movera-meta-ads-mcp', version: '0.1.0' },
    instructions: 'Private Meta Ads control plane. New spend-capable objects default to PAUSED; activating delivery is a separate explicit action.',
  },
);

const verifyToken = async (_req: Request, bearerToken?: string): Promise<AuthInfo | undefined> => {
  if (!bearerToken) return undefined;
  try {
    const claims = await verifySignedToken(bearerToken);
    if (claims.typ !== 'access_token') return undefined;
    const audience = Array.isArray(claims.aud) ? claims.aud[0] : claims.aud;
    if (audience !== baseUrl()) return undefined;
    const scopes = parseScopes(typeof claims.scope === 'string' ? claims.scope : undefined);
    const clientId = typeof claims.client_id === 'string' ? claims.client_id : 'chatgpt';
    return {
      token: bearerToken,
      scopes,
      clientId,
      extra: { sub: claims.sub ?? 'owner' },
    };
  } catch {
    return undefined;
  }
};

const authHandler = withMcpAuth(handler, verifyToken, {
  required: true,
  requiredScopes: ['meta:read', 'meta:write'],
  resourceMetadataPath: '/.well-known/oauth-protected-resource',
  resourceUrl: process.env.PUBLIC_BASE_URL ? baseUrl() : undefined,
});

export { authHandler as GET, authHandler as POST, authHandler as DELETE };
