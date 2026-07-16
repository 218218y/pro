import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadSiteProfile } from '../tools/wp_site_profiles.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MAIN_URL = 'https://pro.bargig-furniture.com/';
const CLIENT_URL = 'https://pro218.bargig-furniture.com/';

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

test('[cloudflare-pages-domains] Bargig runtime config copies customer links to the Cloudflare customer site', async () => {
  const runtimeConfig = await import(new URL('../wp_runtime_config.mjs', import.meta.url));
  assert.equal(runtimeConfig.default.config.supabaseCloudSync.shareBaseUrl, CLIENT_URL);
  assert.doesNotMatch(JSON.stringify(runtimeConfig.default), /bargig218\.netlify\.app/);

  const profile = await loadSiteProfile(ROOT, 'bargig');
  assert.equal(profile.supabase.shareBaseUrl, CLIENT_URL);
  assert.equal(profile.variants.main.shareBaseUrl, CLIENT_URL);
  assert.equal(profile.variants.site2.shareBaseUrl, CLIENT_URL);
});

test('[cloudflare-pages-domains] share-link fallback in source points to the Cloudflare customer site', () => {
  const commandSource = read('esm/native/services/cloud_sync_room_commands_shared.ts');
  const configSource = read('esm/native/services/cloud_sync_config_sources.ts');
  const siteProfileSource = read('tools/wp_site_profiles.mjs');

  for (const source of [commandSource, configSource, siteProfileSource]) {
    assert.match(source, /https:\/\/pro218\.bargig-furniture\.com\//);
    assert.doesNotMatch(source, /bargig218\.netlify\.app/);
  }
});

test('[cloudflare-pages-domains] documented production domains are explicit', () => {
  assert.equal(MAIN_URL, 'https://pro.bargig-furniture.com/');
  assert.equal(CLIENT_URL, 'https://pro218.bargig-furniture.com/');
});
