// Cloud Sync config source readers and final normalized config.

import type { AppContainer } from '../../../types';
import type { SupabaseCfg, SupabaseCfgRaw, SupabaseImportMetaEnvLike } from './cloud_sync_config_shared.js';

import { getDepsNamespaceMaybe } from '../runtime/deps_access.js';
import { _cloudSyncReportNonFatal, asRecord } from './cloud_sync_support.js';
import {
  asBool,
  asNumber,
  asString,
  asSupabaseCfgRaw,
  hasAnySupabaseCfgKey,
  mergeCfgRaw,
  normalizeRealtimeMode,
} from './cloud_sync_config_shared.js';

export function readCfgFromDepsConfig(App: AppContainer): SupabaseCfgRaw | null {
  try {
    const cfgRec = asRecord(getDepsNamespaceMaybe(App, 'config'));
    return asSupabaseCfgRaw(cfgRec?.supabaseCloudSync);
  } catch (e) {
    _cloudSyncReportNonFatal(App, 'readCfgFromDepsConfig.read', e, { throttleMs: 8000 });
    return null;
  }
}

export function readCfgFromImportMetaEnv(): SupabaseCfgRaw | null {
  try {
    const envRec = asRecord(import.meta.env);
    if (!envRec) return null;
    const env: SupabaseImportMetaEnvLike = {
      VITE_WP_SUPABASE_URL: envRec.VITE_WP_SUPABASE_URL,
      VITE_WP_SUPABASE_ANON_KEY: envRec.VITE_WP_SUPABASE_ANON_KEY,
      VITE_WP_SUPABASE_TABLE: envRec.VITE_WP_SUPABASE_TABLE,
      VITE_WP_SUPABASE_PUBLIC_ROOM: envRec.VITE_WP_SUPABASE_PUBLIC_ROOM,
      VITE_WP_SUPABASE_PRIVATE_ROOM: envRec.VITE_WP_SUPABASE_PRIVATE_ROOM,
      VITE_WP_SUPABASE_ROOM_PARAM: envRec.VITE_WP_SUPABASE_ROOM_PARAM,
      VITE_WP_SUPABASE_POLL_MS: envRec.VITE_WP_SUPABASE_POLL_MS,
      VITE_WP_SUPABASE_SHARE_BASE_URL: envRec.VITE_WP_SUPABASE_SHARE_BASE_URL,
      VITE_WP_SUPABASE_REALTIME: envRec.VITE_WP_SUPABASE_REALTIME,
      VITE_WP_SUPABASE_REALTIME_MODE: envRec.VITE_WP_SUPABASE_REALTIME_MODE,
      VITE_WP_SUPABASE_REALTIME_CHANNEL_PREFIX: envRec.VITE_WP_SUPABASE_REALTIME_CHANNEL_PREFIX,
      VITE_WP_SUPABASE_SITE2_SKETCH_INITIAL_AUTOLOAD: envRec.VITE_WP_SUPABASE_SITE2_SKETCH_INITIAL_AUTOLOAD,
      VITE_WP_SUPABASE_SITE2_SKETCH_INITIAL_MAX_AGE_HOURS:
        envRec.VITE_WP_SUPABASE_SITE2_SKETCH_INITIAL_MAX_AGE_HOURS,
      VITE_WP_SUPABASE_DIAGNOSTICS: envRec.VITE_WP_SUPABASE_DIAGNOSTICS,
    };
    const rec: SupabaseCfgRaw = {
      url: env.VITE_WP_SUPABASE_URL,
      anonKey: env.VITE_WP_SUPABASE_ANON_KEY,
      table: env.VITE_WP_SUPABASE_TABLE,
      publicRoom: env.VITE_WP_SUPABASE_PUBLIC_ROOM,
      privateRoom: env.VITE_WP_SUPABASE_PRIVATE_ROOM,
      roomParam: env.VITE_WP_SUPABASE_ROOM_PARAM,
      pollMs: env.VITE_WP_SUPABASE_POLL_MS,
      shareBaseUrl: env.VITE_WP_SUPABASE_SHARE_BASE_URL,
      realtime: env.VITE_WP_SUPABASE_REALTIME,
      realtimeMode: env.VITE_WP_SUPABASE_REALTIME_MODE,
      realtimeChannelPrefix: env.VITE_WP_SUPABASE_REALTIME_CHANNEL_PREFIX,
      site2SketchInitialAutoLoad: env.VITE_WP_SUPABASE_SITE2_SKETCH_INITIAL_AUTOLOAD,
      site2SketchInitialMaxAgeHours: env.VITE_WP_SUPABASE_SITE2_SKETCH_INITIAL_MAX_AGE_HOURS,
      diagnostics: env.VITE_WP_SUPABASE_DIAGNOSTICS,
    };
    return hasAnySupabaseCfgKey(rec) ? rec : null;
  } catch {
    return null;
  }
}

export function readCfg(App: AppContainer): SupabaseCfg {
  // Precedence (lowest -> highest):
  // 1) Vite build-time env (VITE_WP_SUPABASE_*)
  // 2) injected runtime config deps.config.supabaseCloudSync (preferred DI surface)
  const rec = mergeCfgRaw(readCfgFromImportMetaEnv(), readCfgFromDepsConfig(App));

  const url = asString(rec?.url) || '';
  const anonKey = asString(rec?.anonKey) || '';
  const table = asString(rec?.table) || 'wp_shared_state';
  const publicRoom = asString(rec?.publicRoom) || 'public';
  const privateRoom = asString(rec?.privateRoom) || '';
  const roomParam = asString(rec?.roomParam) || 'room';
  const pollMs = asNumber(rec?.pollMs) ?? 2000;
  const shareBaseUrl = asString(rec?.shareBaseUrl) || 'https://bargig218.netlify.app/';
  const realtime = asBool(rec?.realtime) ?? true;
  const realtimeMode = normalizeRealtimeMode(rec?.realtimeMode);
  const realtimeChannelPrefix = asString(rec?.realtimeChannelPrefix) || 'wp_cloud_sync';
  const site2SketchInitialAutoLoad = asBool(rec?.site2SketchInitialAutoLoad) ?? true;
  const site2SketchInitialMaxAgeHoursRaw = asNumber(rec?.site2SketchInitialMaxAgeHours) ?? 12;
  const site2SketchInitialMaxAgeHours = Math.max(0, Math.min(168, site2SketchInitialMaxAgeHoursRaw));
  const diagnostics = asBool(rec?.diagnostics) ?? false;
  return {
    url,
    anonKey,
    table,
    publicRoom,
    privateRoom,
    roomParam,
    pollMs,
    shareBaseUrl,
    realtime,
    realtimeMode,
    realtimeChannelPrefix,
    site2SketchInitialAutoLoad,
    site2SketchInitialMaxAgeHours,
    diagnostics,
  };
}
