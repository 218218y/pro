import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import {
  buildRuntimeConfigSource,
  loadSiteProfile,
  parseSiteReleaseArgs,
  renderSiteReleaseTemplate,
  resolveProfileAsset,
} from '../tools/wp_site_profiles.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url))); // fileURLToPath keeps Windows drive-letter paths valid

test('multi-store profiles keep Supabase tables/channels isolated', async () => {
  const store1 = await loadSiteProfile(ROOT, 'store-1');
  const store2 = await loadSiteProfile(ROOT, 'store-2');

  assert.equal(store1.supabase.table, 'wp_shared_state_store_1');
  assert.equal(store2.supabase.table, 'wp_shared_state_store_2');
  assert.notEqual(store1.supabase.table, store2.supabase.table);
  assert.notEqual(store1.supabase.realtimeChannelPrefix, store2.supabase.realtimeChannelPrefix);
});

test('Bargig profile preserves legacy table, empty storage namespace and root assets', async () => {
  const bargig = await loadSiteProfile(ROOT, 'bargig');
  assert.equal(bargig.supabase.table, 'wp_shared_state');
  assert.equal(bargig.storageNamespace, '');
  assert.equal(resolveProfileAsset(ROOT, bargig, 'logoData'), path.join(ROOT, 'wp_logo_data.js'));
  assert.equal(
    resolveProfileAsset(ROOT, bargig, 'orderPdfTemplate'),
    path.join(ROOT, 'public', 'order_template.pdf')
  );
  assert.equal(fs.existsSync(path.join(ROOT, 'sites', 'bargig', 'wp_logo_data.js')), false);
  assert.equal(fs.existsSync(path.join(ROOT, 'sites', 'bargig', 'order_template.pdf')), false);
});

test('site runtime config includes store namespace, PDF template and site2 gates', async () => {
  const profile = await loadSiteProfile(ROOT, 'store-1');
  const source = buildRuntimeConfigSource(profile, 'site2');

  assert.match(source, /wp_store_1/);
  assert.match(source, /order_template\.pdf/);
  assert.match(source, /wp_shared_state_store_1/);
  assert.match(source, /site2EnabledTabs/);
});

test('site release template injects metadata without mutating shared template file', async () => {
  const profile = await loadSiteProfile(ROOT, 'store-1');
  const before = fs.readFileSync(path.join(ROOT, 'tools', 'index_release_bundle.html'), 'utf8');
  const html = renderSiteReleaseTemplate(ROOT, profile, 'site2');
  const after = fs.readFileSync(path.join(ROOT, 'tools', 'index_release_bundle.html'), 'utf8');

  assert.equal(after, before);
  assert.match(html, /<meta name="wp-store-id" content="store-1"/);
  assert.match(html, /<meta name="wp-site-variant" content="site2"/);
  assert.match(html, /<meta name="wp-site2-enabled-tabs"/);
});

test('site release CLI parser supports generic command shape', () => {
  const parsed = parseSiteReleaseArgs([
    '--store',
    'store-2',
    '--variant',
    'client',
    '--allow-draft',
    '--no-obfuscate',
  ]);
  assert.equal(parsed.store, 'store-2');
  assert.equal(parsed.variant, 'site2');
  assert.equal(parsed.allowDraft, true);
  assert.deepEqual(parsed.passthrough, ['--no-obfuscate']);
});
