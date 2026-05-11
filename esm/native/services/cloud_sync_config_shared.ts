// Cloud Sync config shared helpers.
//
// Keeps raw config shapes and pure coercion/URL helpers separate from env/DI
// reads and browser URL mutation flows.

import type { UnknownRecord, WardrobeProSupabaseCloudSyncConfig } from '../../../types';

import { asRecord } from './cloud_sync_support.js';

// Raw config as it may appear from runtime config / env (untrusted).
export type SupabaseCfgRaw = { [K in keyof WardrobeProSupabaseCloudSyncConfig]?: unknown };

export type SupabaseImportMetaEnvLike = UnknownRecord & {
  VITE_WP_SUPABASE_URL?: unknown;
  VITE_WP_SUPABASE_ANON_KEY?: unknown;
  VITE_WP_SUPABASE_TABLE?: unknown;
  VITE_WP_SUPABASE_PUBLIC_ROOM?: unknown;
  VITE_WP_SUPABASE_PRIVATE_ROOM?: unknown;
  VITE_WP_SUPABASE_ROOM_PARAM?: unknown;
  VITE_WP_SUPABASE_POLL_MS?: unknown;
  VITE_WP_SUPABASE_SHARE_BASE_URL?: unknown;
  VITE_WP_SUPABASE_REALTIME?: unknown;
  VITE_WP_SUPABASE_REALTIME_MODE?: unknown;
  VITE_WP_SUPABASE_REALTIME_CHANNEL_PREFIX?: unknown;
  VITE_WP_SUPABASE_SITE2_SKETCH_INITIAL_AUTOLOAD?: unknown;
  VITE_WP_SUPABASE_SITE2_SKETCH_INITIAL_MAX_AGE_HOURS?: unknown;
  VITE_WP_SUPABASE_DIAGNOSTICS?: unknown;
};

declare global {
  interface ImportMeta {
    readonly env?: SupabaseImportMetaEnvLike;
  }
}

export type SupabaseCfg = {
  url: string;
  anonKey: string;
  table: string;
  publicRoom: string;
  privateRoom: string;
  roomParam: string;
  pollMs: number;
  shareBaseUrl: string;
  realtime: boolean;
  realtimeMode: 'broadcast';
  realtimeChannelPrefix: string;
  site2SketchInitialAutoLoad: boolean;
  site2SketchInitialMaxAgeHours: number;
  diagnostics: boolean;
};

export function asSupabaseCfgRaw(v: unknown): SupabaseCfgRaw | null {
  const rec = asRecord(v);
  if (!rec) return null;
  const next: SupabaseCfgRaw = {
    url: rec.url,
    anonKey: rec.anonKey,
    table: rec.table,
    publicRoom: rec.publicRoom,
    privateRoom: rec.privateRoom,
    roomParam: rec.roomParam,
    pollMs: rec.pollMs,
    shareBaseUrl: rec.shareBaseUrl,
    realtime: rec.realtime,
    realtimeMode: rec.realtimeMode,
    realtimeChannelPrefix: rec.realtimeChannelPrefix,
    site2SketchInitialAutoLoad: rec.site2SketchInitialAutoLoad,
    site2SketchInitialMaxAgeHours: rec.site2SketchInitialMaxAgeHours,
    diagnostics: rec.diagnostics,
  };
  return next;
}

export function asString(v: unknown): string | null {
  return typeof v === 'string' ? v : null;
}

export function asNumber(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

export function asBool(v: unknown): boolean | null {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v === 1 ? true : v === 0 ? false : null;
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase();
    if (s === 'true' || s === '1' || s === 'yes' || s === 'y' || s === 'on') return true;
    if (s === 'false' || s === '0' || s === 'no' || s === 'n' || s === 'off') return false;
  }
  return null;
}

export function mergeCfgRaw(
  base: SupabaseCfgRaw | null,
  override: SupabaseCfgRaw | null
): SupabaseCfgRaw | null {
  if (!base && !override) return null;
  const next: SupabaseCfgRaw = { ...(base || {}), ...(override || {}) };
  return next;
}

export function hasAnySupabaseCfgKey(rec: SupabaseCfgRaw | null): boolean {
  if (!rec) return false;
  return (
    rec.url !== undefined ||
    rec.anonKey !== undefined ||
    rec.table !== undefined ||
    rec.publicRoom !== undefined ||
    rec.privateRoom !== undefined ||
    rec.roomParam !== undefined ||
    rec.pollMs !== undefined ||
    rec.shareBaseUrl !== undefined ||
    rec.realtime !== undefined ||
    rec.realtimeMode !== undefined ||
    rec.realtimeChannelPrefix !== undefined ||
    rec.site2SketchInitialAutoLoad !== undefined ||
    rec.site2SketchInitialMaxAgeHours !== undefined ||
    rec.diagnostics !== undefined
  );
}

function readCryptoRandomBytes(length: number): Uint8Array | null {
  try {
    // Keep this helper free of globalThis/Function-eval style access. In browsers, `crypto`
    // is an ambient global; in non-browser tests this branch may simply be unavailable.
    if (typeof crypto === 'undefined' || typeof crypto.getRandomValues !== 'function') return null;
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    return bytes;
  } catch {
    return null;
  }
}

function encodeRoomBytes(bytes: Uint8Array): string {
  const alphabet = '0123456789abcdefghijklmnopqrstuvwxyz';
  let out = '';
  for (const byte of bytes) out += alphabet[byte % alphabet.length];
  return out;
}

export function randomRoomId(): string {
  const bytes = readCryptoRandomBytes(16);
  if (bytes) return `room_${encodeRoomBytes(bytes)}`;

  // Non-browser test runtime path only. Runtime private-room mode persists the first
  // generated room, so this does not rotate unexpectedly.
  const a = Math.random().toString(36).slice(2, 10);
  const b = Math.random().toString(36).slice(2, 10);
  return `room_${a}${b}`;
}

export function normalizeRealtimeMode(v: unknown): 'broadcast' {
  const s = (asString(v) || '').trim().toLowerCase();
  return s === 'broadcast' ? 'broadcast' : 'broadcast';
}

export function buildRestUrl(baseUrl: string, table: string): string {
  const u = String(baseUrl || '').replace(/\/+$/, '');
  const t = encodeURIComponent(String(table || 'wp_shared_state'));
  return `${u}/rest/v1/${t}`;
}

export function makeHeaders(anonKey: string): HeadersInit {
  return {
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`,
    'Content-Type': 'application/json',
  };
}
