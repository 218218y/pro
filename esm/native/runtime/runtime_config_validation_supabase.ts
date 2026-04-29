import type { WardrobeProSupabaseCloudSyncConfig } from '../../../types';

import {
  asString,
  clampNumber,
  cloneSupabaseCloudSync,
  deleteOwn,
  isPlainObject,
  readOwn,
  toBool,
  toFiniteNumber,
  type RuntimeConfigIssue,
  type ValidateOpts,
  writeOwn,
} from './runtime_config_validation_shared.js';

type SupabaseStringKey = keyof Pick<
  WardrobeProSupabaseCloudSyncConfig,
  'table' | 'publicRoom' | 'privateRoom' | 'roomParam' | 'shareBaseUrl' | 'realtimeChannelPrefix'
>;
type SupabaseBooleanKey = keyof Pick<
  WardrobeProSupabaseCloudSyncConfig,
  'realtime' | 'diagnostics' | 'showRoomWidget' | 'site2SketchInitialAutoLoad'
>;

const SUPABASE_STRING_KEYS: readonly SupabaseStringKey[] = [
  'table',
  'publicRoom',
  'privateRoom',
  'roomParam',
  'shareBaseUrl',
  'realtimeChannelPrefix',
];
const SUPABASE_BOOLEAN_KEYS: readonly SupabaseBooleanKey[] = [
  'realtime',
  'diagnostics',
  'showRoomWidget',
  'site2SketchInitialAutoLoad',
];

function normalizeRealtimeMode(
  v: unknown
): NonNullable<WardrobeProSupabaseCloudSyncConfig['realtimeMode']> | null {
  const mode = asString(v);
  if (!mode) return null;
  return mode === 'broadcast' ? 'broadcast' : null;
}

export function validateSupabaseCloudSync(
  raw: unknown,
  issues: RuntimeConfigIssue[],
  opts: ValidateOpts
): WardrobeProSupabaseCloudSyncConfig | null {
  if (!isPlainObject(raw)) {
    issues.push({
      kind: 'warn',
      path: 'supabaseCloudSync',
      message: 'supabaseCloudSync must be an object (ignored)',
    });
    return null;
  }

  const cfg = cloneSupabaseCloudSync(raw);

  const url = asString(cfg.url);
  const anonKey = asString(cfg.anonKey);
  if (!url || !anonKey) {
    const msg = 'supabaseCloudSync requires both url and anonKey';
    issues.push({ kind: opts.failFast ? 'error' : 'warn', path: 'supabaseCloudSync', message: msg });
    if (opts.failFast) return null;
    return null;
  }
  cfg.url = url;
  cfg.anonKey = anonKey;

  for (const key of SUPABASE_STRING_KEYS) {
    const value = readOwn(cfg, key);
    if (typeof value === 'undefined' || value === null) continue;
    if (key === 'privateRoom' && typeof value === 'string') {
      writeOwn(cfg, key, value.trim());
      continue;
    }
    const next = asString(value);
    if (!next) {
      issues.push({
        kind: 'warn',
        path: `supabaseCloudSync.${key}`,
        message: `${key} must be a string (ignored)`,
      });
      deleteOwn(cfg, key);
      continue;
    }
    writeOwn(cfg, key, next);
  }

  if (typeof cfg.realtimeMode !== 'undefined') {
    const mode = normalizeRealtimeMode(cfg.realtimeMode);
    if (!mode) {
      issues.push({
        kind: 'warn',
        path: 'supabaseCloudSync.realtimeMode',
        message: 'realtimeMode must be "broadcast" (ignored)',
      });
      deleteOwn(cfg, 'realtimeMode');
    } else {
      cfg.realtimeMode = mode;
    }
  }

  for (const key of SUPABASE_BOOLEAN_KEYS) {
    const value = readOwn(cfg, key);
    if (typeof value === 'undefined') continue;
    const next = toBool(value);
    if (next == null) {
      issues.push({
        kind: 'warn',
        path: `supabaseCloudSync.${key}`,
        message: `${key} must be boolean (ignored)`,
      });
      deleteOwn(cfg, key);
      continue;
    }
    writeOwn(cfg, key, next);
  }

  if (typeof cfg.pollMs !== 'undefined') {
    const n = toFiniteNumber(cfg.pollMs);
    if (n == null) {
      issues.push({
        kind: 'warn',
        path: 'supabaseCloudSync.pollMs',
        message: 'pollMs must be a number (ignored)',
      });
      delete cfg.pollMs;
    } else {
      cfg.pollMs = clampNumber(n, 1000, 60000);
    }
  }

  const site2SketchInitialMaxAgeHours = readOwn(cfg, 'site2SketchInitialMaxAgeHours');
  if (typeof site2SketchInitialMaxAgeHours !== 'undefined') {
    const n = toFiniteNumber(site2SketchInitialMaxAgeHours);
    if (n == null) {
      issues.push({
        kind: 'warn',
        path: 'supabaseCloudSync.site2SketchInitialMaxAgeHours',
        message: 'site2SketchInitialMaxAgeHours must be a number (ignored)',
      });
      deleteOwn(cfg, 'site2SketchInitialMaxAgeHours');
    } else {
      writeOwn(cfg, 'site2SketchInitialMaxAgeHours', clampNumber(n, 1, 168));
    }
  }

  return cfg;
}
