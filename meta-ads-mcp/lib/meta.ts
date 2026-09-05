import { createHmac } from 'node:crypto';
type Primitive = string | number | boolean;
type MetaValue = Primitive | null | undefined | Record<string, unknown> | unknown[];

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

export function metaAccountId(): string {
  const raw = requiredEnv('META_AD_ACCOUNT_ID');
  return raw.startsWith('act_') ? raw : `act_${raw}`;
}

function graphVersion(): string {
  const version = requiredEnv('META_GRAPH_VERSION');
  if (!/^v\d+\.\d+$/.test(version)) {
    throw new Error('META_GRAPH_VERSION must look like vXX.X');
  }
  return version;
}

function graphUrl(path: string): URL {
  const clean = path.replace(/^\/+/, '');
  return new URL(`https://graph.facebook.com/${graphVersion()}/${clean}`);
}

function encodeValue(value: MetaValue): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export async function metaRequest<T = unknown>(
  path: string,
  options: {
    method?: 'GET' | 'POST' | 'DELETE';
    params?: Record<string, MetaValue>;
  } = {},
): Promise<T> {
  const method = options.method ?? 'GET';
  const url = graphUrl(path);
  const accessToken = requiredEnv('META_ACCESS_TOKEN');
  const appSecret = process.env.META_APP_SECRET?.trim();
  const appsecretProof = appSecret
    ? createHmac('sha256', appSecret).update(accessToken).digest('hex')
    : undefined;
  const params: Record<string, MetaValue> = { ...options.params };
  if (appsecretProof) params.appsecret_proof = appsecretProof;
  const headers = new Headers({
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/json',
  });

  let body: URLSearchParams | undefined;
  if (method === 'GET') {
    for (const [key, value] of Object.entries(params)) {
      const encoded = encodeValue(value);
      if (encoded !== undefined) url.searchParams.set(key, encoded);
    }
  } else {
    body = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      const encoded = encodeValue(value);
      if (encoded !== undefined) body.set(key, encoded);
    }
    headers.set('Content-Type', 'application/x-www-form-urlencoded');
  }

  const response = await fetch(url, {
    method,
    headers,
    body,
    cache: 'no-store',
  });

  const text = await response.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    const message =
      typeof data === 'object' && data && 'error' in data
        ? JSON.stringify((data as { error: unknown }).error)
        : JSON.stringify(data);
    throw new Error(`Meta API ${response.status}: ${message}`);
  }

  return data as T;
}

export async function metaAccountCurrency(): Promise<string> {
  const data = await metaRequest<{ currency?: string }>(metaAccountId(), {
    params: { fields: 'currency' },
  });
  if (!data.currency || !/^[A-Z]{3}$/.test(data.currency)) {
    throw new Error('Meta ad account did not return a valid currency code');
  }
  return data.currency;
}

export function moneyToMinorUnits(amount: number, currency: string): number {
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Budget must be greater than 0');
  const digits = new Intl.NumberFormat('en', {
    style: 'currency',
    currency,
  }).resolvedOptions().maximumFractionDigits;
  const factor = 10 ** digits;
  return Math.round(amount * factor);
}
