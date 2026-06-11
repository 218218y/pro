import test from 'node:test';
import assert from 'node:assert/strict';

import {
  validateRuntimeConfig,
  validateRuntimeFlags,
} from '../esm/native/runtime/runtime_config_validation.ts';

test('P9: validateRuntimeFlags keeps only valid known keys (preserves unknown)', () => {
  const { flags, issues } = validateRuntimeFlags({
    uiFramework: 'vue',
    enableThreeGeometryCachePatch: 'yes',
    x: 1,
  });
  assert.ok(Array.isArray(issues));
  assert.equal(flags.uiFramework, undefined);
  assert.equal(flags.enableThreeGeometryCachePatch, true);
  assert.equal(flags.x, 1);
});

test('P9: validateRuntimeConfig normalizes numbers/bools, siteVariant, and site2EnabledTabs', () => {
  const input = {
    cacheBudgetMb: '2048',
    cacheMaxItems: '3000',
    debugBootTimings: 'true',
    siteVariant: 'SITE2',
    site2EnabledTabs: 'export,render,invalid,EXPORT',
    supabaseCloudSync: {
      url: ' ',
      anonKey: 123,
      pollMs: '999999',
      diagnostics: 'yes',
    },
    extra: { ok: true },
  };

  const { config, issues } = validateRuntimeConfig(input, { failFast: false });
  assert.ok(Array.isArray(issues));

  assert.equal(config.cacheBudgetMb, 2048);
  assert.equal(config.cacheMaxItems, 3000);
  assert.equal(config.debugBootTimings, true);
  assert.equal(config.siteVariant, 'site2');
  assert.deepEqual(config.site2EnabledTabs, ['export', 'render']);

  // Invalid supabase config is dropped (non-strict) to avoid runtime crashes.
  assert.equal(config.supabaseCloudSync, undefined);

  // Unknown keys are preserved.
  assert.deepEqual(config.extra, { ok: true });
});

test('P9: validateRuntimeConfig failFast flags missing supabase keys as error', () => {
  const { config, issues } = validateRuntimeConfig(
    {
      supabaseCloudSync: { url: 'https://example.supabase.co' },
    },
    { failFast: true }
  );

  assert.ok(issues.some(i => i.kind === 'error'));
  // In strict mode we still drop invalid config rather than returning partially broken objects.
  assert.equal(config.supabaseCloudSync, undefined);
});

test('P9: validateRuntimeConfig accepts empty privateRoom for generated private rooms', () => {
  const { config, issues } = validateRuntimeConfig({
    supabaseCloudSync: {
      url: 'https://example.supabase.co',
      anonKey: 'anon-key',
      privateRoom: '   ',
    },
  });

  assert.equal(config.supabaseCloudSync.privateRoom, '');
  assert.equal(
    issues.some(i => i.path === 'supabaseCloudSync.privateRoom'),
    false
  );
});
