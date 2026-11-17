import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import type { AppContainer, ModuleConfigLike } from '../types/index.ts';
import { __coreHandleCanvasClickNDC } from '../esm/native/services/canvas_picking_click_flow.ts';
import { installCanvasPickingInteriorExtension } from '../esm/native/services/canvas_picking_interior_extension.ts';
import { tryHandleCanvasNonSplitSketchHover } from '../esm/native/services/canvas_picking_hover_flow_nonsplit_sketch.ts';
import { __wp_readSketchHover } from '../esm/native/services/canvas_picking_local_helpers.ts';

function createScene(
  tool: string,
  cameraX = 0,
  extra: NonNullable<ModuleConfigLike['sketchExtras']> = { rods: [{ id: 'rod', yNorm: 0.5 }] }
) {
  const cfg: ModuleConfigLike = {
    isCustom: true,
    gridDivisions: 6,
    customData: { shelves: [], rods: [], storage: false },
    sketchExtras: extra,
  };
  const state = {
    mode: { primary: 'manual_layout', opts: { manualTool: tool } },
    ui: {},
    config: { modulesConfiguration: [cfg, { ...structuredClone(cfg), sketchExtras: {} }] },
  };
  const wardrobeGroup = new THREE.Group();
  const selector = new THREE.Mesh(new THREE.BoxGeometry(1, 2, 0.5), new THREE.MeshBasicMaterial());
  selector.position.set(0, 1, 0);
  selector.userData = { isModuleSelector: true, moduleIndex: 0, __wpStack: 'top' };
  wardrobeGroup.add(selector);
  const camera = new THREE.PerspectiveCamera(40, 1.6, 0.1, 100);
  camera.position.set(cameraX, 1.5, 5);
  camera.lookAt(0, 1, 0);
  camera.updateMatrixWorld(true);
  wardrobeGroup.updateMatrixWorld(true);
  const previews: Array<Record<string, unknown>> = [];
  const writes: string[] = [];
  const App = {
    deps: { THREE },
    store: {
      getState: () => state,
      patch: () => {
        throw new Error('Unexpected raw store write');
      },
    },
    render: { camera, wardrobeGroup, renderer: {}, scene: new THREE.Scene() },
    actions: {
      modules: {
        ensureForStack: (_stack: string, key: number) => state.config.modulesConfiguration[key],
        patchForStack: (_stack: string, _key: unknown, mutate: (cfg: ModuleConfigLike) => void) => {
          mutate(state.config.modulesConfiguration[Number(_key)]);
          writes.push(_stack);
          return true;
        },
      },
    },
    services: {
      runtimeCache: {
        internalGridMap: {
          '0': {
            effectiveBottomY: 0,
            effectiveTopY: 2,
            innerW: 0.964,
            internalCenterX: 0,
            internalDepth: 0.45,
            internalZ: 0,
            woodThick: 0.018,
            gridDivisions: 6,
          },
        },
      },
      builder: {
        renderOps: { setSketchPlacementPreview: (args: Record<string, unknown>) => previews.push(args) },
      },
    },
  } as unknown as AppContainer;
  installCanvasPickingInteriorExtension();
  function hover(x: number, y = 1) {
    const point = new THREE.Vector3(x, y, 0.25).project(camera);
    assert.equal(
      tryHandleCanvasNonSplitSketchHover({
        App,
        ndcX: point.x,
        ndcY: point.y,
        primaryMode: 'manual_layout',
        raycaster: new THREE.Raycaster(),
        mouse: new THREE.Vector2(),
        hideLayoutPreview: null,
      }),
      true
    );
    return point;
  }
  return { App, cfg, state, previews, writes, hover, wardrobeGroup };
}

test('a stationary red rod removal hover still removes the rod after the hover TTL', t => {
  const { App, cfg, previews, hover, writes } = createScene('sketch_shelf:regular');
  const point = hover(0);
  assert.equal(previews.at(-1)?.op, 'remove');
  assert.equal(__wp_readSketchHover(App)?.kind, 'rod');
  const now = Date.now();
  t.mock.method(Date, 'now', () => now + 1500);
  __coreHandleCanvasClickNDC(App, point.x, point.y);
  assert.equal(writes.length, 1);
  assert.deepEqual(cfg.sketchExtras?.shelves ?? [], []);
  assert.deepEqual(cfg.sketchExtras?.rods, []);
});

test('removal stays aligned across tools, fittings, viewing angles and both rod ends', t => {
  const now = Date.now();
  let clock = now;
  t.mock.method(Date, 'now', () => clock);
  for (const tool of [
    'sketch_shelf:regular',
    'sketch_rod',
    'sketch_storage:50',
    'sketch_box:80:45:35',
    'sketch_int_drawers',
    'sketch_ext_drawers:3',
  ]) {
    for (const kind of ['rod', 'shelf', 'storage'] as const) {
      for (const cameraX of [-2, 0, 2]) {
        for (const x of [-0.46, 0, 0.46]) {
          const extra =
            kind === 'rod'
              ? { rods: [{ id: 'rod', yNorm: 0.5 }] }
              : kind === 'shelf'
                ? { shelves: [{ id: 'shelf', yNorm: 0.5, variant: 'regular' }] }
                : { storageBarriers: [{ id: 'storage', yNorm: 0.5, heightM: 0.5 }] };
          const { App, cfg, previews, hover, wardrobeGroup } = createScene(tool, cameraX, extra);
          if (kind === 'shelf') {
            const board = new THREE.Mesh(
              new THREE.BoxGeometry(0.964, 0.018, 0.45),
              new THREE.MeshBasicMaterial()
            );
            board.position.set(0, 1, 0.025);
            board.userData = { partId: 'sketch_shelf_0_1', moduleIndex: 0 };
            wardrobeGroup.add(board);
            wardrobeGroup.updateMatrixWorld(true);
          }
          const point = hover(x);
          const label = JSON.stringify({ tool, kind, cameraX, x });
          assert.equal(previews.at(-1)?.op, 'remove', label);
          assert.equal(__wp_readSketchHover(App)?.kind, kind, label);
          clock += 1500;
          __coreHandleCanvasClickNDC(App, point.x, point.y);
          assert.deepEqual(
            cfg.sketchExtras,
            { [kind === 'rod' ? 'rods' : kind === 'shelf' ? 'shelves' : 'storageBarriers']: [] },
            label
          );
        }
      }
    }
  }
});

test('click coordinates replace a stale removal after the pointer moves without another hover event', () => {
  const { App, cfg, hover } = createScene('sketch_shelf:regular');
  const target = hover(0, 1.5);
  hover(0);
  assert.equal(__wp_readSketchHover(App)?.op, 'remove');
  __coreHandleCanvasClickNDC(App, target.x, target.y);
  assert.equal(cfg.sketchExtras?.rods?.length, 1);
  assert.equal(cfg.sketchExtras?.shelves?.length, 1);
});

test('a stale free-box rod removal cannot fall through to adding a module shelf', t => {
  const { App, cfg, hover } = createScene('sketch_shelf:regular', 0, {
    boxes: [
      {
        id: 'free',
        freePlacement: true,
        absX: 0,
        absY: 1,
        widthM: 0.8,
        heightM: 1,
        depthM: 0.5,
        rods: [{ id: 'box-rod', yNorm: 0.5 }],
      },
    ],
  });
  const point = hover(0);
  const command = __wp_readSketchHover(App);
  assert.equal(command?.kind, 'box_structural_command');
  const now = Date.now();
  t.mock.method(Date, 'now', () => now + 1500);
  __coreHandleCanvasClickNDC(App, point.x, point.y);
  assert.deepEqual(cfg.sketchExtras?.boxes?.[0].rods, []);
  assert.deepEqual(cfg.sketchExtras?.shelves ?? [], []);
});

test('a missing current hover target cannot consume the previous removal or build behind it', () => {
  const { App, cfg, hover, writes } = createScene('sketch_shelf:regular');
  hover(0);
  __coreHandleCanvasClickNDC(App, 0.95, 0.95);
  assert.equal(writes.length, 0);
  assert.equal(cfg.sketchExtras?.rods?.length, 1);
  assert.deepEqual(cfg.sketchExtras?.shelves ?? [], []);
  assert.equal(__wp_readSketchHover(App), null);
});

test('a rod removal hover near a module edge commits to the selector host instead of a nearer side', () => {
  const { App, cfg, state, previews, hover, wardrobeGroup } = createScene('sketch_shelf:regular');
  const side = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2, 0.04), new THREE.MeshBasicMaterial());
  side.position.set(0.46, 1, 0.4);
  side.userData = { partId: 'side', moduleIndex: 1 };
  wardrobeGroup.add(side);
  wardrobeGroup.updateMatrixWorld(true);
  const point = hover(0.46);
  assert.equal(previews.at(-1)?.op, 'remove');
  assert.equal(__wp_readSketchHover(App)?.hostModuleKey, 0);
  __coreHandleCanvasClickNDC(App, point.x, point.y);
  assert.deepEqual(cfg.sketchExtras?.rods, []);
  assert.deepEqual(cfg.sketchExtras?.shelves ?? [], []);
  assert.deepEqual(state.config.modulesConfiguration[1].sketchExtras, {});
});
