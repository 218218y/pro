import test from 'node:test';
import assert from 'node:assert/strict';

import { installDirtyFlag } from '../esm/native/platform/dirty_flag.ts';
import { installPickingPrimitives } from '../esm/native/platform/picking_primitives.ts';

function createRaycaster(tag: string) {
  return {
    tag,
    setFromCamera() {},
    intersectObjects() {
      return [];
    },
  };
}

function createMouse(tag: string) {
  return { tag, x: 0, y: 0 };
}

test('installDirtyFlag heals a drifted public setDirty seam back to the canonical live implementation', () => {
  const metaCalls: Array<{ value: boolean; meta: any }> = [];
  const App: any = {
    actions: { meta: {} },
    store: {
      getState() {
        return { meta: { dirty: false } };
      },
      setDirty(value: boolean, meta: any) {
        metaCalls.push({ value, meta });
      },
    },
  };

  installDirtyFlag(App);
  const firstSetDirty = App.actions.meta.setDirty;
  assert.equal(typeof firstSetDirty, 'function');
  assert.equal(App.actions.meta.__wpCanonicalSetDirty, firstSetDirty);

  App.actions.meta.setDirty = () => {
    throw new Error('stale setDirty');
  };

  installDirtyFlag(App);

  assert.equal(App.actions.meta.setDirty, firstSetDirty);
  App.actions.meta.setDirty(true, { source: 'test:dirty' });
  assert.equal(App.__dirtyFallback, true);
  assert.equal(metaCalls.length, 1);
  assert.equal(metaCalls[0].value, true);
  assert.equal(metaCalls[0].meta?.source, 'test:dirty');
  assert.equal(metaCalls[0].meta?.uiOnly, true);
});

test('installDirtyFlag preserves a preexisting live non-stub setDirty seam as canonical', () => {
  const liveCalls: Array<{ value: boolean; meta: any }> = [];
  const liveSetDirty = (value: boolean, meta: any) => {
    liveCalls.push({ value, meta });
  };
  const App: any = {
    actions: { meta: { setDirty: liveSetDirty } },
    store: {},
  };

  installDirtyFlag(App);
  assert.equal(App.actions.meta.setDirty, liveSetDirty);

  App.actions.meta.setDirty = () => {
    throw new Error('stale');
  };

  installDirtyFlag(App);
  assert.equal(App.actions.meta.setDirty, liveSetDirty);
  App.actions.meta.setDirty(false, { source: 'test:live' });
  assert.deepEqual(liveCalls, [{ value: false, meta: { source: 'test:live' } }]);
});

test('installPickingPrimitives heals drifted public seams back to canonical raycaster and mouse refs', () => {
  let raycasterCreates = 0;
  let mouseCreates = 0;
  const App: any = {
    deps: {
      THREE: {
        Raycaster: function Raycaster(this: any) {
          raycasterCreates += 1;
          return createRaycaster(`ray:${raycasterCreates}`);
        },
        Vector2: function Vector2(this: any) {
          mouseCreates += 1;
          return createMouse(`mouse:${mouseCreates}`);
        },
      },
    },
  };

  const first = installPickingPrimitives(App);
  const firstRaycaster = first.raycaster;
  const firstMouse = first.mouse;
  assert.equal(raycasterCreates, 1);
  assert.equal(mouseCreates, 1);

  App.picking.raycaster = createRaycaster('stale-ray');
  App.picking.mouse = createMouse('stale-mouse');

  const second = installPickingPrimitives(App);
  assert.equal(second, first);
  assert.equal(second.raycaster, firstRaycaster);
  assert.equal(second.mouse, firstMouse);
  assert.equal(App.picking.__wpCanonicalRaycaster, firstRaycaster);
  assert.equal(App.picking.__wpCanonicalMouse, firstMouse);
  assert.equal(raycasterCreates, 1);
  assert.equal(mouseCreates, 1);
});

test('installPickingPrimitives adopts preexisting healthy picking seams as canonical when no canonical ref exists yet', () => {
  const legacyRaycaster = createRaycaster('legacy-ray');
  const legacyMouse = createMouse('legacy-mouse');
  let raycasterCreates = 0;
  let mouseCreates = 0;
  const App: any = {
    picking: {
      raycaster: legacyRaycaster,
      mouse: legacyMouse,
    },
    deps: {
      THREE: {
        Raycaster: function Raycaster(this: any) {
          raycasterCreates += 1;
          return createRaycaster(`ray:${raycasterCreates}`);
        },
        Vector2: function Vector2(this: any) {
          mouseCreates += 1;
          return createMouse(`mouse:${mouseCreates}`);
        },
      },
    },
  };

  const picking = installPickingPrimitives(App);
  assert.equal(picking.raycaster, legacyRaycaster);
  assert.equal(picking.mouse, legacyMouse);
  assert.equal(raycasterCreates, 0);
  assert.equal(mouseCreates, 0);

  App.picking.raycaster = createRaycaster('stale-ray');
  App.picking.mouse = createMouse('stale-mouse');
  installPickingPrimitives(App);

  assert.equal(App.picking.raycaster, legacyRaycaster);
  assert.equal(App.picking.mouse, legacyMouse);
});
