import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createBuilderRegistry,
  finalizeRegistry,
  getRegistered,
  installBuilderRegistry,
  registerModuleHitBox,
  registerPartObject,
  resetRegistry,
} from '../esm/native/builder/registry.ts';

test('builder registry runtime: tracks parts, hit-boxes, and installs stable service surface', () => {
  const hitBox = {
    children: [],
    position: {},
    rotation: {},
    scale: {},
    userData: { partId: 'module-hit' },
    add() {},
    remove() {},
  };
  const partObj = {
    children: [],
    position: {},
    rotation: {},
    scale: {},
    userData: { partId: 'body_1' },
    add() {},
    remove() {},
  };
  const App: any = {
    services: {},
    render: {
      doorsArray: [{ id: 'door_1', group: hitBox, closed: { x: 0, y: 0, z: 0 }, open: { x: 0, y: 0, z: 0 } }],
      drawersArray: [
        { id: 'drawer_1', group: hitBox, closed: { x: 0, y: 0, z: 0 }, open: { x: 0, y: 0, z: 0 } },
      ],
      moduleHitBoxes: [],
      _partObjects: [],
    },
  };

  const registry = installBuilderRegistry(App);
  assert.equal(typeof registry.reset, 'function');
  assert.equal(typeof registry.finalize, 'function');

  resetRegistry(App);
  registerModuleHitBox(App, 2, hitBox);
  registerPartObject(App, 'body_1', partObj, 'part');
  App.render.doorsArray.push({
    id: 'door_1',
    group: hitBox,
    closed: { x: 0, y: 0, z: 0 },
    open: { x: 0, y: 0, z: 0 },
  });
  App.render.drawersArray.push({
    id: 'drawer_1',
    group: hitBox,
    closed: { x: 0, y: 0, z: 0 },
    open: { x: 0, y: 0, z: 0 },
  });

  finalizeRegistry(App);

  assert.equal(getRegistered(App, 'door_1') != null, true);
  assert.equal(getRegistered(App, 'drawer_1') != null, true);
  assert.equal(getRegistered(App, 'body_1'), partObj);
  assert.equal(getRegistered(App, 'module:2'), hitBox);

  const created = createBuilderRegistry(App);
  assert.equal(typeof created.get, 'function');
  assert.equal(created.get?.('body_1'), partObj);
});

test('builder registry runtime: reinstall keeps canonical registry slot stable and heals missing methods', () => {
  const App: any = { services: {}, render: {} };

  const registry = installBuilderRegistry(App);
  const resetRef = registry.reset;
  const getRef = registry.get;

  assert.equal(App.services.builder.registry, registry);
  assert.equal(typeof resetRef, 'function');
  assert.equal(typeof getRef, 'function');

  delete App.services.builder.registry.get;

  const repaired = installBuilderRegistry(App);
  assert.equal(repaired, registry);
  assert.equal(repaired.reset, resetRef);
  assert.equal(typeof repaired.get, 'function');
  assert.notEqual(repaired.get, undefined);
  assert.equal(App.services.builder.registry, registry);
});
