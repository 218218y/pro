import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ensureRenderNamespace,
  getViewportSurface,
  setRenderSlot,
  getRenderSlot,
  writeRenderCacheValue,
  readRenderCacheValue,
  setAutoLightBuildKey,
  getAutoLightBuildKey,
  setAutoCameraBuildKey,
  getAutoCameraBuildKey,
  setAnimateFn,
  getAnimateFn,
  setLoopRaf,
  getLoopRaf,
  setRoomGroup,
  getRoomGroup,
  getDoorsArray,
  getDrawersArray,
  clearRenderArrays,
} from '../esm/native/runtime/render_access.ts';

type AnyRecord = Record<string, unknown>;

test('render_access owns viewport slots, cache values, arrays, and loop metadata on one canonical seam', () => {
  const App: AnyRecord = {};

  const render = ensureRenderNamespace(App);
  assert.ok(render);

  (render as AnyRecord).renderer = { kind: 'renderer' };
  (render as AnyRecord).scene = { kind: 'scene' };
  (render as AnyRecord).camera = { kind: 'camera' };
  (render as AnyRecord).controls = { kind: 'controls' };
  (render as AnyRecord).wardrobeGroup = { kind: 'wardrobe' };
  (render as AnyRecord).roomGroup = { kind: 'room' };

  assert.equal(getViewportSurface(App).renderer, (render as AnyRecord).renderer);
  assert.equal(getViewportSurface(App).roomGroup, (render as AnyRecord).roomGroup);

  assert.equal(setRenderSlot(App, 'customSlot', 17), 17);
  assert.equal(getRenderSlot<number>(App, 'customSlot'), 17);

  assert.equal(writeRenderCacheValue(App, 'sceneKey', 'scene:1'), 'scene:1');
  assert.equal(readRenderCacheValue(App, 'sceneKey'), 'scene:1');

  assert.equal(setAutoLightBuildKey(App, 'corner:right'), 'corner:right');
  assert.equal(getAutoLightBuildKey(App), 'corner:right');
  assert.equal(setAutoCameraBuildKey(App, 'normal'), 'normal');
  assert.equal(getAutoCameraBuildKey(App), 'normal');

  const animate = () => undefined;
  assert.equal(setAnimateFn(App, animate), animate);
  assert.equal(getAnimateFn(App), animate);
  assert.equal(setLoopRaf(App, 42), 42);
  assert.equal(getLoopRaf(App), 42);

  const roomGroup = { id: 'room' };
  assert.equal(setRoomGroup(App, roomGroup), roomGroup);
  assert.equal(getRoomGroup(App), roomGroup);

  const doors = getDoorsArray(App) as AnyRecord[];
  const drawers = getDrawersArray(App) as AnyRecord[];
  doors.push({ id: 'door-1' });
  drawers.push({ id: 'drawer-1' });
  assert.equal(getDoorsArray(App).length, 1);
  assert.equal(getDrawersArray(App).length, 1);

  clearRenderArrays(App);
  assert.equal(getDoorsArray(App).length, 0);
  assert.equal(getDrawersArray(App).length, 0);
});
