import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ensureTexturesCacheService,
  getCustomUploadedTextureMaybe,
  hasCustomUploadedTexture,
  setCustomUploadedTextureViaService,
} from '../esm/native/runtime/textures_cache_access.ts';
import {
  getCustomUploadedTexture,
  installTexturesCacheService,
  setCustomUploadedTexture,
} from '../esm/native/services/textures_cache.ts';

test('textures cache service uses a canonical typed service slot and disposes previous textures only when requested', () => {
  const disposed: string[] = [];
  const texA = {
    id: 'A',
    dispose() {
      disposed.push('A');
    },
  };
  const texB = {
    id: 'B',
    dispose() {
      disposed.push('B');
    },
  };
  const App: { services?: Record<string, unknown> } = {};

  const cache = installTexturesCacheService(App as never);
  assert.ok(cache);
  assert.equal(App.services?.texturesCache, cache);
  assert.equal(Object.getPrototypeOf(App.services ?? null), null);
  assert.equal(Object.getPrototypeOf(cache ?? null), null);
  assert.equal(cache?.customUploadedTexture ?? null, null);
  assert.equal(typeof cache?.getCustomUploadedTexture, 'function');
  assert.equal(typeof cache?.setCustomUploadedTexture, 'function');

  assert.equal(getCustomUploadedTexture(App as never), null);
  assert.equal(getCustomUploadedTextureMaybe(App), null);
  assert.equal(hasCustomUploadedTexture(App), false);

  assert.equal(setCustomUploadedTexture(App as never, texA), texA);
  assert.equal(getCustomUploadedTexture(App as never), texA);
  assert.equal(getCustomUploadedTextureMaybe(App), texA);
  assert.equal(hasCustomUploadedTexture(App), true);
  assert.deepEqual(disposed, []);

  assert.equal(setCustomUploadedTexture(App as never, texB), texB);
  assert.equal(getCustomUploadedTexture(App as never), texB);
  assert.deepEqual(disposed, []);

  assert.equal(setCustomUploadedTexture(App as never, null, { disposePrev: true }), null);
  assert.deepEqual(disposed, ['B']);
  assert.equal(getCustomUploadedTextureMaybe(App), null);
  assert.equal(hasCustomUploadedTexture(App), false);

  setCustomUploadedTextureViaService(App, texA);
  assert.equal(getCustomUploadedTextureMaybe(App), texA);
  assert.equal(ensureTexturesCacheService(App).customUploadedTexture, texA);

  assert.equal(cache?.setCustomUploadedTexture?.(texA, { disposePrev: true }), texA);
  assert.deepEqual(disposed, ['B']);
  assert.equal(cache?.getCustomUploadedTexture?.(), texA);
});

test('installTexturesCacheService heals damaged public accessors without churning healthy refs', () => {
  const App: { services?: Record<string, unknown> } = {};

  const cache = installTexturesCacheService(App as never);
  assert.ok(cache);

  const firstGet = cache?.getCustomUploadedTexture;
  const firstSet = cache?.setCustomUploadedTexture;

  assert.equal(typeof firstGet, 'function');
  assert.equal(typeof firstSet, 'function');

  (cache as any).getCustomUploadedTexture = () => 'stale';
  delete (cache as any).setCustomUploadedTexture;

  const healed = installTexturesCacheService(App as never);

  assert.equal(healed, cache);
  assert.equal(healed?.getCustomUploadedTexture, firstGet);
  assert.equal(healed?.setCustomUploadedTexture, firstSet);
});
