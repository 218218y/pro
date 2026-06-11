import test from 'node:test';
import assert from 'node:assert/strict';

import {
  trackMirrorSurface,
  getMirrorHideScratch,
  invalidateMirrorTracking,
  readAutoHideFloorCache,
  writeAutoHideFloorCache,
  readRendererCompatDefaults,
  writeRendererCompatDefaults,
  ensureRenderMetaArray,
} from '../esm/native/runtime/render_access.ts';

type AnyRecord = Record<string, unknown>;

test('render_access owns mirror tracking metadata + floor cache + renderer compat defaults on one seam', () => {
  const App: AnyRecord = {};

  const mirrorMesh = { id: 'mirror-1' };
  assert.equal(trackMirrorSurface(App, mirrorMesh), true);

  const mirrors = ensureRenderMetaArray<AnyRecord>(App, 'mirrors');
  assert.equal(mirrors.length, 1);
  assert.equal(mirrors[0], mirrorMesh);

  const scratch = getMirrorHideScratch(App) as unknown[];
  assert.equal(Array.isArray(scratch), true);
  scratch.push(mirrorMesh);
  assert.equal((getMirrorHideScratch(App) as unknown[]).length, 1);

  writeAutoHideFloorCache(App, { id: 'floor-1' }, 'room-key', 'scene-key');
  assert.deepEqual(readAutoHideFloorCache(App), {
    floor: { id: 'floor-1' },
    roomKey: 'room-key',
    sceneKey: 'scene-key',
  });

  const compat = { toneMapping: 'neutral', shadowAutoUpdate: true };
  assert.deepEqual(writeRendererCompatDefaults(App, compat as AnyRecord), compat);
  assert.deepEqual(readRendererCompatDefaults(App), compat);

  invalidateMirrorTracking(App);
  assert.equal(ensureRenderMetaArray<AnyRecord>(App, 'mirrors').length, 0);
  assert.equal((App.render as AnyRecord).__mirrorDirty, true);
});
