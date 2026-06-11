import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('P2: wp_runtime_config.mjs exports DI config (no window globals)', async () => {
  // Ensure we do not accidentally create legacy globals in Node.
  // (In the browser we also avoid using window globals for config.)
  assert.equal(globalThis /** @type {any} */.__WARDROBE_PRO_CONFIG__, undefined);

  const mod = /** @type {any} */ (
    await import(new URL('../wp_runtime_config.mjs', import.meta.url).toString())
  );
  const raw = mod && typeof mod === 'object' && 'default' in mod ? mod.default : mod;

  assert.ok(raw && typeof raw === 'object', 'Expected default export object from wp_runtime_config.mjs');

  const cfgRoot = raw && typeof raw === 'object' && 'config' in raw ? raw.config : null;

  const cfg =
    cfgRoot &&
    typeof cfgRoot === 'object' &&
    cfgRoot.supabaseCloudSync &&
    typeof cfgRoot.supabaseCloudSync === 'object'
      ? cfgRoot.supabaseCloudSync
      : null;
  assert.ok(cfg && typeof cfg === 'object', 'Expected config.supabaseCloudSync');

  // Minimal sanity keys (url + anonKey are required for Cloud Sync).
  assert.equal(typeof cfg.url, 'string');
  assert.equal(typeof cfg.anonKey, 'string');
});

test('P2: legacy supabase_config.js was removed (no window globals surface)', () => {
  const p = new URL('../supabase_config.js', import.meta.url);
  assert.equal(fs.existsSync(p), false, 'supabase_config.js should not exist after P2');
});
