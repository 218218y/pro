import type { AppContainer, CloudSyncRealtimeClientLike, CloudSyncRealtimeModuleLike } from '../../../types';

import { asRecord } from './cloud_sync_support.js';
import { getRealtimeCreateClientHook, type CloudSyncRealtimeFactory } from './cloud_sync_realtime_shared.js';

function isRealtimeClientLike(v: unknown): v is CloudSyncRealtimeClientLike {
  const rec = asRecord(v);
  return (
    !!rec &&
    (typeof rec.channel === 'undefined' || typeof rec.channel === 'function') &&
    (typeof rec.removeChannel === 'undefined' || typeof rec.removeChannel === 'function')
  );
}

function asRealtimeCreateClient(v: unknown): CloudSyncRealtimeFactory | null {
  if (typeof v !== 'function') return null;
  return (url: string, key: string, opt?: Record<string, unknown>) => {
    const next = v(url, key, opt);
    return isRealtimeClientLike(next) ? next : {};
  };
}

function asRealtimeModule(v: unknown): CloudSyncRealtimeModuleLike | null {
  const rec = asRecord(v);
  if (!rec) return null;
  const defaultRec = asRecord(rec.default);
  const createClient = asRealtimeCreateClient(rec.createClient);
  const defaultCreateClient = asRealtimeCreateClient(defaultRec?.createClient);
  if (!createClient && !defaultCreateClient) return null;
  const defaultModule: CloudSyncRealtimeModuleLike['default'] = defaultRec
    ? { ...defaultRec, ...(defaultCreateClient ? { createClient: defaultCreateClient } : {}) }
    : undefined;
  return {
    createClient: createClient || undefined,
    default: defaultModule,
  };
}

export async function resolveRealtimeCreateClient(
  App: AppContainer
): Promise<CloudSyncRealtimeFactory | null> {
  const injected = getRealtimeCreateClientHook(App);
  if (typeof injected === 'function') return injected;
  const mod = asRealtimeModule(await import('@supabase/supabase-js'));
  if (typeof mod?.createClient === 'function') return mod.createClient;
  if (mod?.default && typeof mod.default.createClient === 'function') return mod.default.createClient;
  return null;
}
