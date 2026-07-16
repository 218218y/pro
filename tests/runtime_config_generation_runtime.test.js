import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  buildCommonRuntimeConfigEnvelope,
  buildRuntimeConfigVariantOverlay,
  loadSiteProfile,
  mergeRuntimeConfigEnvelopes,
  normalizeSiteProfile,
} from '../tools/wp_site_profiles.mjs';
import {
  assertRootRuntimeConfigCurrent,
  readExpectedRootRuntimeConfig,
  writeRootRuntimeConfig,
} from '../tools/wp_runtime_config_generation.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

test('root runtime config is generated exactly from the Bargig profile', async () => {
  const profile = await loadSiteProfile(ROOT, 'bargig');
  const expectedSource = await readExpectedRootRuntimeConfig(ROOT);
  const actualSource = fs.readFileSync(path.join(ROOT, 'wp_runtime_config.mjs'), 'utf8');
  const runtimeModule = await import(new URL('../wp_runtime_config.mjs', import.meta.url));
  const expectedEnvelope = buildCommonRuntimeConfigEnvelope(profile);

  assert.equal(actualSource, expectedSource);
  assert.deepEqual(runtimeModule.default, expectedEnvelope);
  assert.deepEqual(runtimeModule.runtimeConfigOverlays, {
    main: buildRuntimeConfigVariantOverlay(profile, 'main'),
    site2: buildRuntimeConfigVariantOverlay(profile, 'site2'),
  });
  assert.equal('siteVariant' in runtimeModule.default.config, false);
  assert.equal('site2EnabledTabs' in runtimeModule.default.config, false);
  await assertRootRuntimeConfigCurrent(ROOT);
});

test('root common config and explicit variant overlays never leak main policy into site2', () => {
  const profile = normalizeSiteProfile({
    root: ROOT,
    profileDir: path.join(ROOT, 'sites', 'fixture'),
    requestedStoreId: 'fixture',
    profile: {
      id: 'fixture',
      displayName: 'Fixture',
      storageNamespace: 'common-storage',
      config: { commonOnly: true },
      flags: { commonFlag: true },
      supabase: {
        url: 'https://example.supabase.co',
        anonKey: 'anon',
        shareBaseUrl: 'https://common.example/',
        showRoomWidget: true,
      },
      variants: {
        main: {
          storageNamespace: 'main-storage',
          shareBaseUrl: 'https://main.example/',
          showRoomWidget: true,
          orderPdfTemplateUrl: 'main.pdf',
          config: { variantValue: 'main' },
          flags: { variantFlag: 'main' },
        },
        site2: {
          storageNamespace: 'site2-storage',
          shareBaseUrl: 'https://site2.example/',
          showRoomWidget: false,
          orderPdfTemplateUrl: 'site2.pdf',
          config: { variantValue: 'site2' },
          flags: { variantFlag: 'site2' },
        },
      },
    },
  });
  const common = buildCommonRuntimeConfigEnvelope(profile);
  const main = mergeRuntimeConfigEnvelopes(common, buildRuntimeConfigVariantOverlay(profile, 'main'));
  const site2 = mergeRuntimeConfigEnvelopes(common, buildRuntimeConfigVariantOverlay(profile, 'site2'));

  assert.equal(common.config.storageNamespace, 'common-storage');
  assert.equal(common.config.supabaseCloudSync.shareBaseUrl, 'https://common.example/');
  assert.equal(common.config.variantValue, undefined);
  assert.equal(main.config.storageNamespace, 'main-storage');
  assert.equal(main.config.supabaseCloudSync.shareBaseUrl, 'https://main.example/');
  assert.equal(main.config.orderPdf.templateUrl, 'main.pdf');
  assert.equal(main.config.variantValue, 'main');
  assert.equal(main.flags.variantFlag, 'main');
  assert.equal(site2.config.storageNamespace, 'site2-storage');
  assert.equal(site2.config.supabaseCloudSync.shareBaseUrl, 'https://site2.example/');
  assert.equal(site2.config.supabaseCloudSync.showRoomWidget, false);
  assert.equal(site2.config.orderPdf.templateUrl, 'site2.pdf');
  assert.equal(site2.config.variantValue, 'site2');
  assert.equal(site2.flags.variantFlag, 'site2');
});

test('root build and dev entrypoints fail fast on stale generated runtime config', () => {
  for (const file of [
    'tools/wp_build_dist.js',
    'tools/wp_bundle.js',
    'tools/wp_release.js',
    'vite.config.mjs',
  ]) {
    const source = fs.readFileSync(path.join(ROOT, file), 'utf8');
    assert.match(source, /assertRootRuntimeConfigCurrent/u, file);
  }
});

test('runtime config freshness check rejects drift and accepts generator output', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'wp-runtime-config-'));
  try {
    const profileDir = path.join(root, 'sites', 'bargig');
    fs.mkdirSync(profileDir, { recursive: true });
    fs.writeFileSync(
      path.join(profileDir, 'site.profile.mjs'),
      `export default {
        id: 'bargig',
        displayName: 'Bargig',
        releaseStatus: 'active',
        storageNamespace: '',
        supabase: { url: 'https://example.supabase.co', anonKey: 'public-key' },
        variants: { main: {}, site2: {} }
      };\n`,
      'utf8'
    );
    fs.writeFileSync(path.join(root, 'wp_runtime_config.mjs'), 'export default {};\n', 'utf8');

    await assert.rejects(() => assertRootRuntimeConfigCurrent(root), /missing or stale/u);
    await writeRootRuntimeConfig(root);
    await assert.doesNotReject(() => assertRootRuntimeConfigCurrent(root));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
