import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ensureRenderNamespace,
  addToWardrobeGroup,
  addToScene,
  removeFromSceneByName,
  setRoomGroup,
  getRoomGroup,
} from '../esm/native/runtime/render_access.ts';

type AnyRecord = Record<string, unknown>;

test('render_access scene/group helpers centralize room and wardrobe mutations', () => {
  const sceneChildren: AnyRecord[] = [];
  const wardrobeChildren: AnyRecord[] = [];

  const App: AnyRecord = {};
  const render = ensureRenderNamespace(App) as AnyRecord;
  render.scene = {
    children: sceneChildren,
    add(node: AnyRecord) {
      this.children.push(node);
      node.parent = this;
    },
    remove(node: AnyRecord) {
      const idx = this.children.indexOf(node);
      if (idx >= 0) this.children.splice(idx, 1);
      node.parent = null;
    },
    getObjectByName(name: string) {
      return this.children.find(x => x && x.name === name) || null;
    },
  };
  render.wardrobeGroup = {
    children: wardrobeChildren,
    add(node: AnyRecord) {
      this.children.push(node);
      node.parent = this;
    },
  };

  const roomGroup = { name: 'room-group' };
  assert.equal(setRoomGroup(App, roomGroup), roomGroup);
  assert.equal(getRoomGroup(App), roomGroup);

  const sceneNode = { name: 'to-remove' };
  const wardrobeNode = { name: 'wardrobe-piece' };

  assert.equal(addToScene(App, sceneNode), true);
  assert.equal(addToWardrobeGroup(App, wardrobeNode), true);
  assert.equal(sceneChildren.length, 1);
  assert.equal(wardrobeChildren.length, 1);

  const removed = removeFromSceneByName(App, 'to-remove');
  assert.equal(removed, sceneNode);
  assert.equal(sceneChildren.length, 0);
});
