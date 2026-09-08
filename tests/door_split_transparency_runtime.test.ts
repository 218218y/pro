import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MANUAL_DOOR_SPLIT_GHOST_OPACITY,
  isManualDoorSplitTransparencyEnabled,
  syncManualDoorSplitTransparency,
} from '../esm/native/runtime/door_split_transparency.ts';
import { readCanvasPickingMaterialHitPolicy } from '../esm/native/services/canvas_picking_transparent_hit_policy.ts';

function createMaterial(opacity = 1) {
  const material: any = {
    transparent: false,
    opacity,
    depthWrite: true,
    needsUpdate: false,
    disposed: false,
    clone() {
      const clone = createMaterial(this.opacity);
      clone.transparent = this.transparent;
      clone.depthWrite = this.depthWrite;
      return clone;
    },
    dispose() {
      this.disposed = true;
    },
  };
  return material;
}

function createDoorRoot(material: any) {
  const mesh: any = {
    material,
    children: [],
    parent: null,
    position: {},
    rotation: {},
    scale: {},
    userData: {},
  };
  const root: any = {
    children: [mesh],
    parent: null,
    position: {},
    rotation: {},
    scale: {},
    userData: {},
    traverse(visitor: (node: any) => void) {
      visitor(root);
      visitor(mesh);
    },
  };
  mesh.parent = root;
  return { root, mesh };
}

function createApp(root: any, transparent: boolean) {
  let mode = {
    primary: 'split',
    opts: { splitVariant: 'custom', splitDoorsTransparent: transparent },
  };
  const App: any = {
    render: { doorsArray: [{ group: root }] },
    store: {
      getState: () => ({ mode }),
    },
  };
  return {
    App,
    setTransparent(next: boolean) {
      mode = {
        primary: 'split',
        opts: { splitVariant: 'custom', splitDoorsTransparent: next },
      };
    },
    leaveMode() {
      mode = { primary: 'none', opts: {} } as any;
    },
  };
}

test('manual split transparency clones door materials without mutating shared originals', () => {
  const original = createMaterial(1);
  const { root, mesh } = createDoorRoot(original);
  const runtime = createApp(root, true);

  assert.equal(isManualDoorSplitTransparencyEnabled(runtime.App), true);
  assert.equal(syncManualDoorSplitTransparency(runtime.App), 1);

  const ghost = mesh.material;
  assert.notEqual(ghost, original);
  assert.equal(original.opacity, 1);
  assert.equal(original.transparent, false);
  assert.equal(original.depthWrite, true);
  assert.equal(ghost.opacity, MANUAL_DOOR_SPLIT_GHOST_OPACITY);
  assert.equal(ghost.transparent, true);
  assert.equal(ghost.depthWrite, false);
  assert.equal(ghost.needsUpdate, true);
  assert.deepEqual(readCanvasPickingMaterialHitPolicy(ghost), {
    visible: true,
    fullyTransparent: false,
  });

  runtime.setTransparent(false);
  assert.equal(syncManualDoorSplitTransparency(runtime.App), 1);
  assert.equal(mesh.material, original);
  assert.equal(ghost.disposed, true);
});

test('manual split transparency preserves already-zero-opacity hit/restore materials as zero', () => {
  const original = createMaterial(0);
  const { root, mesh } = createDoorRoot(original);
  const runtime = createApp(root, true);

  syncManualDoorSplitTransparency(runtime.App);
  assert.equal(mesh.material.opacity, 0);
  assert.equal(readCanvasPickingMaterialHitPolicy(mesh.material).fullyTransparent, true);
});

test('leaving custom split mode restores the original door material', () => {
  const original = createMaterial(0.65);
  const { root, mesh } = createDoorRoot(original);
  const runtime = createApp(root, true);

  syncManualDoorSplitTransparency(runtime.App);
  const ghost = mesh.material;
  runtime.leaveMode();

  assert.equal(isManualDoorSplitTransparencyEnabled(runtime.App), false);
  assert.equal(syncManualDoorSplitTransparency(runtime.App), 1);
  assert.equal(mesh.material, original);
  assert.equal(ghost.disposed, true);
});

test('transparency restore never overwrites a material replaced by another subsystem', () => {
  const original = createMaterial(1);
  const replacement = createMaterial(0.4);
  const { root, mesh } = createDoorRoot(original);
  const runtime = createApp(root, true);

  syncManualDoorSplitTransparency(runtime.App);
  const ghost = mesh.material;
  mesh.material = replacement;
  runtime.setTransparent(false);

  assert.equal(syncManualDoorSplitTransparency(runtime.App), 0);
  assert.equal(mesh.material, replacement);
  assert.equal(ghost.disposed, true);
});
