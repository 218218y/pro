import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

import { readSource, assertMatchesAll, assertLacksAll } from './_source_bundle.js';
import { loadTsRuntimeModule } from './_ts_runtime_module_loader.mjs';

const facade = readSource('../esm/native/services/cloud_sync_realtime.ts', import.meta.url);
const shared = readSource('../esm/native/services/cloud_sync_realtime_shared.ts', import.meta.url);
const mod = readSource('../esm/native/services/cloud_sync_realtime_module.ts', import.meta.url);

test('cloud sync realtime keeps a thin facade over shared/module seams', () => {
  assertMatchesAll(
    assert,
    facade,
    [
      /cloud_sync_realtime_shared\.js/,
      /cloud_sync_realtime_module\.js/,
      /export type \{ CloudSyncRealtimeFactory \}/,
      /export \{[\s\S]*getRealtimeChannel[\s\S]*resolveRealtimeCreateClient[\s\S]*\}/,
    ],
    'cloud sync realtime facade'
  );

  assertLacksAll(
    assert,
    facade,
    [
      /function getRealtimeChannel\(/,
      /function removeRealtimeChannel\(/,
      /function disconnectRealtimeClient\(/,
      /async function resolveRealtimeCreateClient\(/,
    ],
    'cloud sync realtime facade'
  );

  assertMatchesAll(
    assert,
    shared,
    [
      /export type CloudSyncRealtimeFactory = \(/,
      /export function hasLiveRealtimeSubscriptionStatus\(/,
      /export function getRealtimeChannel\(/,
      /export function removeRealtimeChannel\(/,
      /export function disconnectRealtimeClient\(/,
      /export function getRealtimeCreateClientHook\(/,
    ],
    'cloud sync realtime shared'
  );

  assertMatchesAll(
    assert,
    mod,
    [
      /function isRealtimeClientLike\(/,
      /function asRealtimeCreateClient\(/,
      /function asRealtimeModule\(/,
      /export async function resolveRealtimeCreateClient\(/,
      /getRealtimeCreateClientHook\(/,
    ],
    'cloud sync realtime module'
  );
});

test('cloud sync realtime shares one Supabase module load across concurrent callers', async () => {
  let moduleLoads = 0;
  const createClient = () => ({ channel() {} });
  const runtime = loadTsRuntimeModule(
    fileURLToPath(new URL('../esm/native/services/cloud_sync_realtime_module.ts', import.meta.url)),
    {
      mocks: {
        './cloud_sync_support.js': {
          asRecord(value) {
            return value && typeof value === 'object' ? value : null;
          },
        },
        './cloud_sync_realtime_shared.js': {
          getRealtimeCreateClientHook() {
            return null;
          },
        },
      },
      mock() {
        return undefined;
      },
    }
  );
  const loadModule = runtime.createRealtimeModuleLoader(async () => {
    await Promise.resolve();
    moduleLoads += 1;
    return { createClient };
  });

  const [first, second, third] = await Promise.all([loadModule(), loadModule(), loadModule()]);

  assert.equal(first.createClient, second.createClient);
  assert.equal(second.createClient, third.createClient);
  assert.equal(moduleLoads, 1);
});

test('cloud sync realtime retries a failed module load without duplicating one inflight attempt', async () => {
  let moduleLoads = 0;
  const runtime = loadTsRuntimeModule(
    fileURLToPath(new URL('../esm/native/services/cloud_sync_realtime_module.ts', import.meta.url)),
    {
      mocks: {
        './cloud_sync_support.js': {
          asRecord(value) {
            return value && typeof value === 'object' ? value : null;
          },
        },
        './cloud_sync_realtime_shared.js': {
          getRealtimeCreateClientHook() {
            return null;
          },
        },
      },
    }
  );
  const loadModule = runtime.createRealtimeModuleLoader(async () => {
    moduleLoads += 1;
    if (moduleLoads === 1) throw new Error('offline');
    return { createClient() {} };
  });

  const firstAttempt = loadModule();
  const concurrentAttempt = loadModule();
  await assert.rejects(firstAttempt, /offline/);
  await assert.rejects(concurrentAttempt, /offline/);

  const recovered = await loadModule();
  assert.equal(typeof recovered.createClient, 'function');
  assert.equal(moduleLoads, 2);
});
