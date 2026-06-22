import test from 'node:test';
import assert from 'node:assert/strict';

import {
  validateRuntimeConfig,
  validateRuntimeFlags,
} from '../esm/native/runtime/runtime_config_validation.ts';
import { validateReactBootDeps } from '../esm/native/runtime/runtime_boot_config.ts';
import { parseRuntimeConfigModule } from '../esm/entry_pro_main_shared.ts';

test('runtime config module accepts only the canonical flags/config envelope', () => {
  assert.deepEqual(parseRuntimeConfigModule({ flags: {}, config: {} }), {
    flags: {},
    config: {},
  });
  assert.deepEqual(parseRuntimeConfigModule({}), { flags: null, config: null });

  assert.throws(
    () => parseRuntimeConfigModule({ cacheBudgetMb: 128 }),
    /Unexpected top-level key\(s\): cacheBudgetMb/
  );
  assert.throws(() => parseRuntimeConfigModule({ config: null }), /config must be an object/);
});

test('runtime flags accept canonical known values and preserve unknown feature keys', () => {
  const { flags, issues } = validateRuntimeFlags({
    uiFramework: 'react',
    enableThreeGeometryCachePatch: true,
    x: 1,
  });
  assert.deepEqual(issues, []);
  assert.equal(flags.uiFramework, 'react');
  assert.equal(flags.enableThreeGeometryCachePatch, true);
  assert.equal(flags.x, 1);
});

test('runtime flags reject non-canonical framework and boolean values', () => {
  const { flags, issues } = validateRuntimeFlags({
    uiFramework: 'vue',
    enableThreeGeometryCachePatch: 'yes',
  });
  assert.equal(flags.uiFramework, undefined);
  assert.equal(flags.enableThreeGeometryCachePatch, undefined);
  assert.deepEqual(
    issues.map(issue => issue.path),
    ['flags.uiFramework', 'flags.enableThreeGeometryCachePatch']
  );
});

test('runtime config accepts canonical typed values', () => {
  const input = {
    cacheBudgetMb: 2048,
    cacheMaxItems: 3000,
    debugBootTimings: true,
    siteVariant: 'site2',
    site2EnabledTabs: ['settings', 'sketch'],
    supabaseCloudSync: {
      url: 'https://example.supabase.co',
      anonKey: 'anon-key',
      pollMs: 1500,
      diagnostics: true,
    },
    extra: { ok: true },
  };

  const { config, issues } = validateRuntimeConfig(input, { failFast: true });
  assert.deepEqual(issues, []);

  assert.equal(config.cacheBudgetMb, 2048);
  assert.equal(config.cacheMaxItems, 3000);
  assert.equal(config.debugBootTimings, true);
  assert.equal(config.siteVariant, 'site2');
  assert.deepEqual(config.site2EnabledTabs, ['settings', 'sketch']);
  assert.equal(config.supabaseCloudSync.pollMs, 1500);
  assert.equal(config.supabaseCloudSync.diagnostics, true);
  assert.deepEqual(config.extra, { ok: true });
});

test('runtime config rejects historical string coercions and out-of-range values', () => {
  const { config, issues } = validateRuntimeConfig({
    cacheBudgetMb: '2048',
    cacheMaxItems: 99,
    debugBootTimings: 'true',
    siteVariant: 'SITE2',
    site2EnabledTabs: 'settings,sketch',
  });

  assert.equal(config.cacheBudgetMb, undefined);
  assert.equal(config.cacheMaxItems, undefined);
  assert.equal(config.debugBootTimings, undefined);
  assert.equal(config.siteVariant, undefined);
  assert.equal(config.site2EnabledTabs, undefined);
  assert.deepEqual(
    issues.map(issue => issue.path),
    ['cacheBudgetMb', 'cacheMaxItems', 'debugBootTimings', 'siteVariant', 'site2EnabledTabs']
  );
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

test('React boot validation rejects every config issue and stamps the canonical UI framework', () => {
  const validDeps = {
    flags: { enableThreeGeometryCachePatch: false },
    config: { cacheBudgetMb: 128, cacheMaxItems: 2000, debugBootTimings: false },
  };
  validateReactBootDeps(validDeps, 'unit');
  assert.equal(validDeps.flags.uiFramework, 'react');

  assert.throws(
    () => validateReactBootDeps({ flags: { enableThreeGeometryCachePatch: 'false' }, config: {} }, 'unit'),
    /flags\.enableThreeGeometryCachePatch.*must be boolean/
  );
});
