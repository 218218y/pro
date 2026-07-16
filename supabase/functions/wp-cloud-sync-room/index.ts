import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.97.0';

import { isCloudSyncRoomAuthorized } from './room_scope.ts';

type JsonRecord = Record<string, unknown>;

type RoomClaims = {
  v: 1;
  tenantId: string;
  storeId: string;
  room: string;
  permissions: 'rw';
  iat: number;
  exp: number;
};

type RoomRow = {
  room: string;
  payload: JsonRecord;
  revision: number;
  updated_at: string;
  updated_by: string;
};

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const ROOM_PATTERN = /^[a-zA-Z0-9_-]{1,128}(?:::[a-zA-Z0-9_-]{1,64})*$/;
const STORE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CLIENT_PATTERN = /^[a-zA-Z0-9:_-]{1,160}$/;
const MAX_REQUEST_BYTES = 2_100_000;
const MAX_PAYLOAD_BYTES = 2_000_000;
const ROW_SELECT = 'room,payload,revision,updated_at,updated_by';
const ACTIONS = new Set(['issue-public', 'create-room', 'renew-room', 'read', 'write']);

function getRequiredEnv(name: string): string {
  const value = String(Deno.env.get(name) || '').trim();
  if (!value) throw new Error(`Missing required Edge Function secret: ${name}`);
  return value;
}

function readJsonEnv(name: string): JsonRecord {
  const raw = String(Deno.env.get(name) || '').trim();
  if (!raw) return {};
  const parsed: unknown = JSON.parse(raw);
  if (!isRecord(parsed)) throw new Error(`${name} must be a JSON object`);
  return parsed;
}

function readOriginStoreMap(): Map<string, string> {
  const configured = readJsonEnv('WP_CLOUD_SYNC_ORIGIN_STORES');
  const entries = Object.entries(configured);
  if (!entries.length) {
    throw new Error('WP_CLOUD_SYNC_ORIGIN_STORES must map each exact origin to one store id');
  }
  const result = new Map<string, string>();
  for (const [origin, storeId] of entries) {
    let normalizedOrigin = '';
    try {
      normalizedOrigin = new URL(origin).origin;
    } catch {
      throw new Error('WP_CLOUD_SYNC_ORIGIN_STORES contains an invalid origin');
    }
    if (normalizedOrigin !== origin || typeof storeId !== 'string' || !STORE_PATTERN.test(storeId)) {
      throw new Error('WP_CLOUD_SYNC_ORIGIN_STORES contains an invalid origin/store binding');
    }
    result.set(origin, storeId);
  }
  return result;
}

function isRecord(value: unknown): value is JsonRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');
}

function base64UrlDecode(value: string): ArrayBuffer {
  const normalized = value.replaceAll('-', '+').replaceAll('_', '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
}

async function importSigningKey(secret: string): Promise<CryptoKey> {
  if (secret.length < 32) {
    throw new Error('WP_CLOUD_SYNC_ROOM_TOKEN_SECRET must contain at least 32 characters');
  }
  return await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

async function signRoomToken(claims: RoomClaims, secret: string): Promise<string> {
  const header = base64UrlEncode(encoder.encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const payload = base64UrlEncode(encoder.encode(JSON.stringify(claims)));
  const input = `${header}.${payload}`;
  const signature = await crypto.subtle.sign('HMAC', await importSigningKey(secret), encoder.encode(input));
  return `${input}.${base64UrlEncode(new Uint8Array(signature))}`;
}

type RoomTokenVerification = { ok: true; claims: RoomClaims } | { ok: false; reason: 'expired' | 'invalid' };

async function verifyRoomToken(token: string, secret: string): Promise<RoomTokenVerification> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return { ok: false, reason: 'invalid' };
    const [header, payload, signature] = parts;
    const headerValue: unknown = JSON.parse(decoder.decode(base64UrlDecode(header)));
    if (!isRecord(headerValue) || headerValue.alg !== 'HS256' || headerValue.typ !== 'JWT') {
      return { ok: false, reason: 'invalid' };
    }
    const valid = await crypto.subtle.verify(
      'HMAC',
      await importSigningKey(secret),
      base64UrlDecode(signature),
      encoder.encode(`${header}.${payload}`)
    );
    if (!valid) return { ok: false, reason: 'invalid' };
    const value: unknown = JSON.parse(decoder.decode(base64UrlDecode(payload)));
    if (!isRecord(value)) return { ok: false, reason: 'invalid' };
    const claims = value as Partial<RoomClaims>;
    if (
      claims.v !== 1 ||
      typeof claims.tenantId !== 'string' ||
      typeof claims.storeId !== 'string' ||
      typeof claims.room !== 'string' ||
      claims.permissions !== 'rw' ||
      typeof claims.iat !== 'number' ||
      typeof claims.exp !== 'number' ||
      !STORE_PATTERN.test(claims.tenantId) ||
      !STORE_PATTERN.test(claims.storeId) ||
      !ROOM_PATTERN.test(claims.room) ||
      claims.iat > Math.floor(Date.now() / 1000) + 60
    ) {
      return { ok: false, reason: 'invalid' };
    }
    if (claims.exp <= Math.floor(Date.now() / 1000)) {
      return { ok: false, reason: 'expired' };
    }
    return { ok: true, claims: claims as RoomClaims };
  } catch {
    return { ok: false, reason: 'invalid' };
  }
}

function resolveTenantId(storeId: string): string {
  const map = readJsonEnv('WP_CLOUD_SYNC_STORE_TENANTS');
  const configured = map[storeId];
  if (typeof configured === 'undefined') return storeId;
  if (typeof configured === 'string' && STORE_PATTERN.test(configured)) {
    return configured;
  }
  throw new Error('WP_CLOUD_SYNC_STORE_TENANTS contains an invalid tenant id');
}

function resolvePublicRoom(storeId: string): string {
  const map = readJsonEnv('WP_CLOUD_SYNC_PUBLIC_ROOMS');
  const configured = map[storeId];
  if (typeof configured === 'undefined') return 'public';
  if (typeof configured === 'string' && ROOM_PATTERN.test(configured)) {
    return configured;
  }
  throw new Error('WP_CLOUD_SYNC_PUBLIC_ROOMS contains an invalid room id');
}

function corsHeaders(origin: string): HeadersInit {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function jsonResponse(
  origin: string,
  status: number,
  body: JsonRecord,
  extraHeaders: HeadersInit = {}
): Response {
  return Response.json(body, {
    status,
    headers: {
      ...corsHeaders(origin),
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...extraHeaders,
    },
  });
}

function readClientIp(request: Request): string {
  return String(
    request.headers.get('cf-connecting-ip') ||
      request.headers.get('x-forwarded-for')?.split(',')[0] ||
      'unknown'
  ).trim();
}

async function hashRateLimitKey(value: string, secret: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(`${secret}:${value}`));
  return base64UrlEncode(new Uint8Array(digest));
}

async function consumeRateLimit(args: {
  client: SupabaseClient;
  request: Request;
  action: string;
  secret: string;
  limit: number;
  windowSeconds: number;
}): Promise<boolean> {
  const key = await hashRateLimitKey(`${readClientIp(args.request)}:${args.action}`, args.secret);
  const { data, error } = await args.client.rpc('wp_cloud_sync_consume_rate_limit', {
    p_bucket_key: key,
    p_limit: args.limit,
    p_window_seconds: args.windowSeconds,
  });
  if (error) throw error;
  return data === true;
}

async function touchRoomLease(args: {
  client: SupabaseClient;
  tenantId: string;
  storeId: string;
  room: string;
  publicRoom: string;
}): Promise<void> {
  const { error } = await args.client.rpc('wp_cloud_sync_touch_room_lease', {
    p_tenant_id: args.tenantId,
    p_store_id: args.storeId,
    p_room: args.room,
    p_public_room: args.publicRoom,
  });
  if (error) throw error;
}

function normalizeRow(value: unknown): RoomRow | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.room !== 'string' ||
    !isRecord(value.payload) ||
    typeof value.revision !== 'number' ||
    typeof value.updated_at !== 'string' ||
    typeof value.updated_by !== 'string'
  ) {
    return null;
  }
  return value as RoomRow;
}

async function readRow(
  client: SupabaseClient,
  tenantId: string,
  storeId: string,
  room: string
): Promise<RoomRow | null> {
  const { data, error } = await client
    .from('wp_cloud_sync_rooms')
    .select(ROW_SELECT)
    .eq('tenant_id', tenantId)
    .eq('store_id', storeId)
    .eq('room', room)
    .maybeSingle();
  if (error) throw error;
  return normalizeRow(data);
}

async function writeRow(args: {
  client: SupabaseClient;
  tenantId: string;
  storeId: string;
  room: string;
  payload: JsonRecord;
  expectedRevision: number;
  clientId: string;
}): Promise<{ ok: true; row: RoomRow } | { ok: false; row: RoomRow | null }> {
  if (args.expectedRevision === 0) {
    const { data, error } = await args.client
      .from('wp_cloud_sync_rooms')
      .insert({
        tenant_id: args.tenantId,
        store_id: args.storeId,
        room: args.room,
        payload: args.payload,
        revision: 1,
        updated_by: args.clientId,
      })
      .select(ROW_SELECT)
      .single();
    if (!error) {
      const row = normalizeRow(data);
      if (!row) throw new Error('Gateway insert returned an invalid row');
      return { ok: true, row };
    }
    if (error.code !== '23505') throw error;
    return {
      ok: false,
      row: await readRow(args.client, args.tenantId, args.storeId, args.room),
    };
  }

  const { data, error } = await args.client
    .from('wp_cloud_sync_rooms')
    .update({
      payload: args.payload,
      revision: args.expectedRevision + 1,
      updated_by: args.clientId,
    })
    .eq('tenant_id', args.tenantId)
    .eq('store_id', args.storeId)
    .eq('room', args.room)
    .eq('revision', args.expectedRevision)
    .select(ROW_SELECT)
    .maybeSingle();
  if (error) throw error;
  const row = normalizeRow(data);
  return row
    ? { ok: true, row }
    : {
        ok: false,
        row: await readRow(args.client, args.tenantId, args.storeId, args.room),
      };
}

function readTokenTtlSeconds(): number {
  const raw = Number(Deno.env.get('WP_CLOUD_SYNC_ROOM_TOKEN_TTL_SECONDS') || 604_800);
  return Number.isInteger(raw) && raw >= 3600 && raw <= 2_592_000 ? raw : 604_800;
}

async function issueCredential(args: {
  tenantId: string;
  storeId: string;
  room: string;
  secret: string;
}): Promise<{ room: string; token: string; expiresAt: string }> {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + readTokenTtlSeconds();
  const token = await signRoomToken(
    {
      v: 1,
      tenantId: args.tenantId,
      storeId: args.storeId,
      room: args.room,
      permissions: 'rw',
      iat,
      exp,
    },
    args.secret
  );
  return {
    room: args.room,
    token,
    expiresAt: new Date(exp * 1000).toISOString(),
  };
}

Deno.serve(async request => {
  const requestId = crypto.randomUUID();
  const origin = String(request.headers.get('origin') || '').trim();
  try {
    const originStores = readOriginStoreMap();
    const originStoreId = originStores.get(origin) || '';
    if (!originStoreId) {
      return jsonResponse('null', 403, { ok: false, code: 'origin' });
    }
    const responseOrigin = origin;
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(responseOrigin),
      });
    }
    if (request.method !== 'POST') {
      return jsonResponse(responseOrigin, 405, { ok: false, code: 'method' });
    }

    const contentLength = Number(request.headers.get('content-length') || 0);
    if (contentLength > MAX_REQUEST_BYTES) {
      return jsonResponse(responseOrigin, 413, {
        ok: false,
        code: 'request_too_large',
      });
    }
    const rawBody = await request.text();
    if (encoder.encode(rawBody).byteLength > MAX_REQUEST_BYTES) {
      return jsonResponse(responseOrigin, 413, {
        ok: false,
        code: 'request_too_large',
      });
    }
    let body: unknown = null;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return jsonResponse(responseOrigin, 400, { ok: false, code: 'body' });
    }
    if (!isRecord(body)) {
      return jsonResponse(responseOrigin, 400, { ok: false, code: 'body' });
    }

    const action = typeof body.action === 'string' ? body.action : '';
    if (!ACTIONS.has(action)) {
      return jsonResponse(responseOrigin, 400, { ok: false, code: 'action' });
    }
    const storeId = typeof body.storeId === 'string' ? body.storeId.trim() : '';
    if (!STORE_PATTERN.test(storeId) || storeId !== originStoreId) {
      return jsonResponse(responseOrigin, 403, { ok: false, code: 'store' });
    }

    const secret = getRequiredEnv('WP_CLOUD_SYNC_ROOM_TOKEN_SECRET');
    const tenantId = resolveTenantId(storeId);
    const publicRoom = resolvePublicRoom(storeId);
    const supabase = createClient(
      getRequiredEnv('SUPABASE_URL'),
      getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    const rate =
      action === 'create-room'
        ? { limit: 20, windowSeconds: 3600 }
        : action === 'write'
          ? { limit: 120, windowSeconds: 60 }
          : { limit: 300, windowSeconds: 60 };
    if (
      !(await consumeRateLimit({
        client: supabase,
        request,
        action,
        secret,
        limit: rate.limit,
        windowSeconds: rate.windowSeconds,
      }))
    ) {
      return jsonResponse(
        responseOrigin,
        429,
        {
          ok: false,
          code: 'rate_limit',
          retryAfterSeconds: rate.windowSeconds,
        },
        { 'Retry-After': String(rate.windowSeconds) }
      );
    }

    if (action === 'issue-public') {
      const room = publicRoom;
      await touchRoomLease({ client: supabase, tenantId, storeId, room, publicRoom });
      return jsonResponse(responseOrigin, 200, {
        ok: true,
        credential: await issueCredential({ tenantId, storeId, room, secret }),
      });
    }

    if (action === 'create-room') {
      const room = `room_${crypto.randomUUID().replaceAll('-', '')}`;
      await touchRoomLease({ client: supabase, tenantId, storeId, room, publicRoom });
      return jsonResponse(responseOrigin, 201, {
        ok: true,
        credential: await issueCredential({ tenantId, storeId, room, secret }),
      });
    }

    const room = typeof body.room === 'string' ? body.room.trim() : '';
    const roomToken = typeof body.roomToken === 'string' ? body.roomToken.trim() : '';
    if (!ROOM_PATTERN.test(room) || !roomToken) {
      return jsonResponse(responseOrigin, 400, { ok: false, code: 'room' });
    }
    const verification = await verifyRoomToken(roomToken, secret);
    if (!verification.ok) {
      return jsonResponse(responseOrigin, 403, {
        ok: false,
        code: verification.reason === 'expired' ? 'room_token_expired' : 'room_token',
      });
    }
    const claims = verification.claims;
    if (!isCloudSyncRoomAuthorized(claims, room, storeId, tenantId)) {
      return jsonResponse(responseOrigin, 403, {
        ok: false,
        code: 'room_token',
      });
    }
    await touchRoomLease({
      client: supabase,
      tenantId,
      storeId,
      room: claims.room,
      publicRoom,
    });

    if (action === 'renew-room') {
      if (room !== claims.room) {
        return jsonResponse(responseOrigin, 403, { ok: false, code: 'room_token' });
      }
      return jsonResponse(responseOrigin, 200, {
        ok: true,
        credential: await issueCredential({ tenantId, storeId, room: claims.room, secret }),
      });
    }

    if (action === 'read') {
      return jsonResponse(responseOrigin, 200, {
        ok: true,
        row: await readRow(supabase, tenantId, storeId, room),
      });
    }

    if (action === 'write') {
      const payload = body.payload;
      const expectedRevision = body.expectedRevision;
      const clientId = typeof body.clientId === 'string' ? body.clientId.trim() : '';
      if (
        !isRecord(payload) ||
        typeof expectedRevision !== 'number' ||
        !Number.isInteger(expectedRevision) ||
        expectedRevision < 0 ||
        !CLIENT_PATTERN.test(clientId)
      ) {
        return jsonResponse(responseOrigin, 400, {
          ok: false,
          code: 'write_contract',
        });
      }
      if (encoder.encode(JSON.stringify(payload)).byteLength > MAX_PAYLOAD_BYTES) {
        return jsonResponse(responseOrigin, 413, {
          ok: false,
          code: 'payload_too_large',
        });
      }
      const result = await writeRow({
        client: supabase,
        tenantId,
        storeId,
        room,
        payload,
        expectedRevision,
        clientId,
      });
      return result.ok
        ? jsonResponse(responseOrigin, 200, { ok: true, row: result.row })
        : jsonResponse(responseOrigin, 409, {
            ok: false,
            code: 'revision_conflict',
            row: result.row,
          });
    }

    return jsonResponse(responseOrigin, 400, { ok: false, code: 'action' });
  } catch (error) {
    console.error(
      JSON.stringify({
        event: 'wp_cloud_sync_gateway_error',
        requestId,
        message: error instanceof Error ? error.message : String(error),
      })
    );
    const responseOrigin = origin || 'null';
    return jsonResponse(responseOrigin, 500, {
      ok: false,
      code: 'internal',
      requestId,
    });
  }
});
