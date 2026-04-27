import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ensureRenderMaterialSlot,
  readRenderMaterialSlot,
  writeRenderMaterialSlot,
  ensureRenderCacheMap,
  ensureRenderMetaMap,
} from '../esm/native/runtime/render_access.ts';

type AnyRecord = Record<string, unknown>;

test('render_access material/cache/meta helpers keep stable canonical maps and slots', () => {
  const App: AnyRecord = {};

  const mat = ensureRenderMaterialSlot(App, 'frontMat', () => ({ id: 'front-mat' }));
  assert.deepEqual(mat, { id: 'front-mat' });
  assert.equal(readRenderMaterialSlot(App, 'frontMat'), mat);

  const overridden = { id: 'front-mat-2' };
  assert.equal(writeRenderMaterialSlot(App, 'frontMat', overridden), overridden);
  assert.equal(readRenderMaterialSlot(App, 'frontMat'), overridden);

  const cacheMap = ensureRenderCacheMap<number>(App, 'buildHits');
  cacheMap.set('door-1', 3);
  assert.equal(ensureRenderCacheMap<number>(App, 'buildHits').get('door-1'), 3);

  const metaMap = ensureRenderMetaMap(App, 'timestamps');
  metaMap.set('frame', 17);
  assert.equal(ensureRenderMetaMap(App, 'timestamps').get('frame'), 17);
});
