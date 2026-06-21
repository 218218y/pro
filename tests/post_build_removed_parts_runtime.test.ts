import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { applyRemovedPartsAfterBuild } from '../esm/native/builder/post_build_removed_parts.ts';

type NodeLike = Record<string, any>;

function createNode(partId: string): NodeLike {
  return {
    type: 'Mesh',
    visible: true,
    material: { name: 'body' },
    userData: { partId },
    children: [],
  };
}

function createAppWithRemovedPartNode(node: NodeLike, liveRemovedDoorsMap: Record<string, unknown> = {}) {
  return {
    store: {
      getState() {
        return {
          config: { removedDoorsMap: liveRemovedDoorsMap },
          mode: { primary: 'none' },
        };
      },
    },
    render: {
      wardrobeGroup: {
        type: 'Group',
        userData: {},
        children: [node],
      },
    },
  } as any;
}

function createThreeMock() {
  return {
    DoubleSide: 'double-side',
    MeshBasicMaterial: class MeshBasicMaterial {
      opts: Record<string, unknown>;
      constructor(opts: Record<string, unknown>) {
        this.opts = opts;
      }
    },
  } as any;
}

test('post-build removed parts requires an explicit config snapshot when a render tree exists', () => {
  const node = createNode('body_left');
  const App = createAppWithRemovedPartNode(node, { removed_body_left: true });

  assert.throws(
    () =>
      applyRemovedPartsAfterBuild({ App, THREE: createThreeMock(), cfgSnapshot: null, primaryMode: 'none' }),
    /cfgSnapshot is required/
  );
});

test('post-build removed parts requires an explicit config snapshot before render-tree lookup', () => {
  const App = { render: {} } as any;

  assert.throws(
    () =>
      applyRemovedPartsAfterBuild({
        App,
        THREE: createThreeMock(),
        cfgSnapshot: undefined,
        primaryMode: 'none',
      }),
    /cfgSnapshot is required/
  );
});

test('post-build removed parts uses the snapshot and does not fall back to live App config', () => {
  const node = createNode('body_left');
  const App = createAppWithRemovedPartNode(node, { removed_body_left: true });

  applyRemovedPartsAfterBuild({
    App,
    THREE: createThreeMock(),
    cfgSnapshot: { removedDoorsMap: {} },
    primaryMode: 'none',
  });

  assert.equal(node.userData.__wpRemovablePartRemoved, undefined);
  assert.equal(node.material.name, 'body');
});

test('post-build removed parts applies removals from the explicit snapshot', () => {
  const node = createNode('body_left');
  const App = createAppWithRemovedPartNode(node, {});

  applyRemovedPartsAfterBuild({
    App,
    THREE: createThreeMock(),
    cfgSnapshot: { removedDoorsMap: { removed_body_left: true } },
    primaryMode: 'none',
  });

  assert.equal(node.userData.__wpRemovablePartRemoved, true);
  assert.equal(node.userData.__wpRemovedPartRestoreTarget, false);
  assert.equal(node.visible, true);
  assert.equal(node.material.opts.transparent, true);
  assert.equal(node.material.opts.opacity, 0);
});

test('post-build removed parts uses the captured primary mode instead of live App mode', () => {
  const node = createNode('body_left');
  const App = createAppWithRemovedPartNode(node, {});
  App.store.getState = () => ({ mode: { primary: 'none' } });

  applyRemovedPartsAfterBuild({
    App,
    THREE: createThreeMock(),
    cfgSnapshot: { removedDoorsMap: { removed_body_left: true } },
    primaryMode: 'remove_door',
  });

  assert.equal(node.userData.__wpRemovedPartRestoreTarget, true);
});

test('post-build removed parts source keeps config reads snapshot-only', () => {
  const source = readFileSync('esm/native/builder/post_build_removed_parts.ts', 'utf8');

  assert.match(source, /cfgSnapshot is required/);
  assert.match(source, /export function requireRemovedPartsConfigSnapshot\(/);
  assert.match(source, /cfgSnapshot:\s*unknown/);
  assert.match(source, /primaryMode:\s*string/);
  assert.doesNotMatch(source, /getCfg\(/);
  assert.doesNotMatch(source, /cfgIn/);
  assert.doesNotMatch(source, /cfgIn\s*\|\|/);
  assert.doesNotMatch(source, /cfg:\s*unknown/);
  assert.doesNotMatch(source, /getBuildStateMaybe|getState\(App\)|getMode\(App\)/);

  const overlays = readFileSync('esm/native/builder/post_build_visual_overlays.ts', 'utf8');
  assert.match(overlays, /const cfgSnapshot = requireRemovedPartsConfigSnapshot\(args\.cfgSnapshot\);/);
  assert.match(overlays, /applyRemovedPartsAfterBuild\(\{ App, THREE, cfgSnapshot, primaryMode \}\);/);
  assert.doesNotMatch(overlays, /applyRemovedPartsAfterBuild\(\{ App, THREE, cfg \}\);/);
  assert.doesNotMatch(overlays, /asRecord\(cfg\) \|\| \{\}/);
});
