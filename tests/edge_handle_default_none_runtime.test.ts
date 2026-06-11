import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ensureEdgeHandleDefaultNoneCacheMap,
  isEdgeHandleDefaultNone,
  markEdgeHandleDefaultNone,
  readEdgeHandleDefaultNoneCacheKey,
  resetEdgeHandleDefaultNoneCacheMaps,
} from '../esm/native/builder/edge_handle_default_none_runtime.ts';

function createApp(): any {
  return { services: {} };
}

test('edge handle default-none runtime: reset creates canonical cache maps for all scopes/stacks', () => {
  const App = createApp();
  const maps = resetEdgeHandleDefaultNoneCacheMaps(App);

  assert.equal(typeof maps.__edgeHandleDefaultNoneTop, 'object');
  assert.equal(typeof maps.__edgeHandleDefaultNoneBottom, 'object');
  assert.equal(typeof maps.__edgeHandleDefaultNoneCornerTop, 'object');
  assert.equal(typeof maps.__edgeHandleDefaultNoneCornerBottom, 'object');
  assert.equal(typeof maps.__edgeHandleDefaultNonePentTop, 'object');
  assert.equal(typeof maps.__edgeHandleDefaultNonePentBottom, 'object');

  assert.equal(ensureEdgeHandleDefaultNoneCacheMap(App, 'top', 'module'), maps.__edgeHandleDefaultNoneTop);
  assert.equal(
    ensureEdgeHandleDefaultNoneCacheMap(App, 'bottom', 'corner'),
    maps.__edgeHandleDefaultNoneCornerBottom
  );
  assert.equal(ensureEdgeHandleDefaultNoneCacheMap(App, 'top', 'pent'), maps.__edgeHandleDefaultNonePentTop);
});

test('edge handle default-none runtime: mark/read stays unified across module, corner, and pent scopes per stack', () => {
  const App = createApp();
  resetEdgeHandleDefaultNoneCacheMaps(App);

  markEdgeHandleDefaultNone(App, 'top', 'd2');
  markEdgeHandleDefaultNone(App, 'top', 'corner_door_5', 'corner');
  markEdgeHandleDefaultNone(App, 'bottom', 'corner_pent_door_7', 'pent');

  assert.equal(isEdgeHandleDefaultNone(App, 'top', 'd2'), true);
  assert.equal(isEdgeHandleDefaultNone(App, 'top', 'corner_door_5'), true);
  assert.equal(isEdgeHandleDefaultNone(App, 'bottom', 'corner_pent_door_7'), true);

  assert.equal(isEdgeHandleDefaultNone(App, 'bottom', 'd2'), false);
  assert.equal(isEdgeHandleDefaultNone(App, 'top', 'corner_pent_door_7'), false);
});

test('edge handle default-none runtime: cache-key helper stays canonical for each scope/stack combination', () => {
  assert.equal(readEdgeHandleDefaultNoneCacheKey('top', 'module'), '__edgeHandleDefaultNoneTop');
  assert.equal(readEdgeHandleDefaultNoneCacheKey('bottom', 'module'), '__edgeHandleDefaultNoneBottom');
  assert.equal(readEdgeHandleDefaultNoneCacheKey('top', 'corner'), '__edgeHandleDefaultNoneCornerTop');
  assert.equal(readEdgeHandleDefaultNoneCacheKey('bottom', 'corner'), '__edgeHandleDefaultNoneCornerBottom');
  assert.equal(readEdgeHandleDefaultNoneCacheKey('top', 'pent'), '__edgeHandleDefaultNonePentTop');
  assert.equal(readEdgeHandleDefaultNoneCacheKey('bottom', 'pent'), '__edgeHandleDefaultNonePentBottom');
});
