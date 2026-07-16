import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { buildRuntimeConfigEnvelope, loadSiteProfile } from '../tools/wp_site_profiles.mjs';
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
  const expectedEnvelope = buildRuntimeConfigEnvelope(profile, 'main', {
    includeVariantIdentity: false,
  });

  assert.equal(actualSource, expectedSource);
  assert.deepEqual(runtimeModule.default, expectedEnvelope);
  assert.equal('siteVariant' in runtimeModule.default.config, false);
  assert.equal('site2EnabledTabs' in runtimeModule.default.config, false);
  await assertRootRuntimeConfigCurrent(ROOT);
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
