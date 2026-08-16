import test from 'node:test';
import assert from 'node:assert/strict';

import {
  validateRuntimeConfig,
  validateRuntimeFlags,
} from '../esm/native/runtime/runtime_config_validation.ts';
import { validateReactBootDeps } from '../esm/native/runtime/runtime_boot_config.ts';
import { mergeRuntimeConfigModuleResults, parseRuntimeConfigModule } from '../esm/entry_pro_main_shared.ts';

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

test('runtime config overlays merge known nested owners without dropping common values', () => {
  const merged = mergeRuntimeConfigModuleResults(
    parseRuntimeConfigModule({
      flags: { common: true },
      config: {
        storageNamespace: 'common',
        orderPdf: { templateUrl: 'common.pdf' },
        supabaseCloudSync: { url: 'https://example.supabase.co', showRoomWidget: true },
      },
    }),
    parseRuntimeConfigModule({
      flags: { variant: true },
      config: {
        siteVariant: 'site2',
        orderPdf: { templateUrl: 'site2.pdf' },
        supabaseCloudSync: { showRoomWidget: false },
      },
    })
  );

  assert.deepEqual(merged.flags, { common: true, variant: true });
  assert.equal(merged.config?.siteVariant, 'site2');
  assert.equal(merged.config?.orderPdf?.templateUrl, 'site2.pdf');
  assert.equal(merged.config?.supabaseCloudSync?.url, 'https://example.supabase.co');
  assert.equal(merged.config?.supabaseCloudSync?.showRoomWidget, false);
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
      storeId: 'bargig',
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

test('runtime config validates typed tuning keys without borrowing product-state semantics', () => {
  const accepted = validateRuntimeConfig({
    DOOR_DELAY_MS: 750,
    ACTIVE_STATE_MS: 5000,
    RENDER_ANTIALIAS: false,
    PERSIST_EDIT_STATE: true,
    MIRROR_DISABLE_DURING_MOTION: false,
    MIRROR_REFLECTOR_MAX_COUNT: 12,
  });
  assert.deepEqual(accepted.issues, []);
  assert.equal(accepted.config.DOOR_DELAY_MS, 750);
  assert.equal(accepted.config.PERSIST_EDIT_STATE, true);
  assert.equal(accepted.config.MIRROR_REFLECTOR_MAX_COUNT, 12);

  const rejected = validateRuntimeConfig({
    DOOR_DELAY_MS: '750',
    PERSIST_EDIT_STATE: 'true',
    MIRROR_DISABLE_DURING_MOTION: 1,
    MIRROR_REFLECTOR_MAX_COUNT: Number.POSITIVE_INFINITY,
  });
  assert.equal(rejected.config.DOOR_DELAY_MS, undefined);
  assert.equal(rejected.config.PERSIST_EDIT_STATE, undefined);
  assert.equal(rejected.config.MIRROR_DISABLE_DURING_MOTION, undefined);
  assert.equal(rejected.config.MIRROR_REFLECTOR_MAX_COUNT, undefined);
  assert.deepEqual(
    rejected.issues.map(issue => issue.path),
    ['DOOR_DELAY_MS', 'MIRROR_REFLECTOR_MAX_COUNT', 'PERSIST_EDIT_STATE', 'MIRROR_DISABLE_DURING_MOTION']
  );
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

test('P9: validateRuntimeConfig requires canonical signed-room gateway identity', () => {
  const { config, issues } = validateRuntimeConfig({
    supabaseCloudSync: {
      url: 'https://example.supabase.co',
      anonKey: 'anon-key',
      storeId: 'bargig',
      gatewayFunction: 'wp-cloud-sync-room',
      roomTokenParam: 'roomToken',
    },
  });

  assert.deepEqual(issues, []);
  assert.equal(config.supabaseCloudSync.storeId, 'bargig');
  assert.equal(config.supabaseCloudSync.gatewayFunction, 'wp-cloud-sync-room');
  assert.equal(config.supabaseCloudSync.roomTokenParam, 'roomToken');
});

test('P9: validateRuntimeConfig rejects retired browser table and private-room configuration', () => {
  for (const retired of [{ table: 'wp_shared_state' }, { privateRoom: 'room_legacy' }]) {
    const { config, issues } = validateRuntimeConfig(
      {
        supabaseCloudSync: {
          url: 'https://example.supabase.co',
          anonKey: 'anon-key',
          storeId: 'bargig',
          ...retired,
        },
      },
      { failFast: true }
    );
    assert.equal(config.supabaseCloudSync, undefined);
    assert.ok(issues.some(issue => /is retired/u.test(issue.message)));
  }
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
