import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';

import { INTERIOR_SHELF_PIN_BORING_POLICY } from '../esm/shared/dimensions/interior_fittings_policy.ts';
import {
  addFullShelfPinBoring,
  planFullShelfPinBoring,
} from '../esm/native/builder/render_interior_shelf_pin_boring.ts';
import { tryHandleCanvasLayoutEditClick } from '../esm/native/services/canvas_picking_layout_edit_flow.ts';
import { INTERIOR_LAYOUT_TYPES } from '../esm/native/ui/react/tabs/interior_tab_local_state_shared.ts';
import { readLayoutTypeId } from '../esm/native/ui/react/tabs/interior_tab_view_state_shared.ts';
import { createTestRoomArchitecturePlan } from './room_architecture_test_helpers.ts';
import { loadTsRuntimeModule } from './_ts_runtime_module_loader.mjs';
import { normalizeTopModuleConfigTyped } from '../esm/native/features/modules_configuration/modules_config_structure.ts';
import { normalizeLowerModuleConfig } from '../esm/native/features/stack_split/module_config.ts';

const base = {
  bottomY: 0,
  topY: 2.4,
  leftInnerX: -0.5,
  rightInnerX: 0.5,
  internalZ: 0,
  internalDepth: 0.55,
  regularDepth: 0.45,
};

test('3 cm pin-boring rows cover all four side corners but respect end clearance and removed walls', () => {
  const points = planFullShelfPinBoring(base);
  assert.equal(INTERIOR_SHELF_PIN_BORING_POLICY.pitchM, 0.03);
  assert.equal(points.length, 320);
  assert.deepEqual([...new Set(points.map(point => Number(point.z.toFixed(6))))], [-0.235, 0.135]);
  assert.equal(points[0]?.y, 0.015);
  assert.ok(Math.abs(points.at(-1)!.y - 2.385) < 1e-10);
  assert.ok(Math.abs(points[4]!.y - points[0]!.y - 0.03) < 1e-10);
  assert.equal(planFullShelfPinBoring({ ...base, exposedSide: 'left' }).length, 160);
  assert.equal(planFullShelfPinBoring({ ...base, exposedSide: 'both' }).length, 0);
  assert.deepEqual(planFullShelfPinBoring({ ...base, topY: 0.02 }), []);
  assert.deepEqual(planFullShelfPinBoring({ ...base, internalDepth: 0 }), []);
});

test('full boring is a selectable layout tool while toggling does not overwrite shelves or layout', () => {
  assert.equal(INTERIOR_LAYOUT_TYPES.find(option => option.id === 'full_boring')?.label, 'חירור מלא');
  assert.equal(readLayoutTypeId('full_boring'), 'full_boring');

  const cfg = {
    layout: 'mixed',
    isCustom: true,
    customData: { shelves: [true, false, true], rods: [false, true] },
    fullShelfPinBoring: false,
  };
  const savedContents = structuredClone(cfg.customData);
  const writes: { key: unknown; meta: Record<string, unknown> }[] = [];
  const state = { ui: { currentLayoutType: 'full_boring' }, config: {}, mode: {}, runtime: {}, meta: {} };
  const args = {
    App: { store: { getState: () => state, patch() {} } },
    foundModuleIndex: 2,
    __activeModuleKey: 2,
    __isBottomStack: false,
    __isLayoutEditMode: true,
    __isManualLayoutMode: false,
    __isBraceShelvesMode: false,
    moduleHitY: 1,
    intersects: [{ object: { userData: { isModuleSelector: true, moduleIndex: 2 } } }],
    __patchConfigForKey: (
      key: unknown,
      patch: (value: typeof cfg) => void,
      meta: Record<string, unknown>
    ) => {
      writes.push({ key, meta });
      patch(cfg);
      return true;
    },
    __getActiveConfigRef: () => cfg,
  };
  assert.equal(tryHandleCanvasLayoutEditClick(args as never), true);
  assert.equal(cfg.fullShelfPinBoring, true);
  assert.equal(tryHandleCanvasLayoutEditClick(args as never), true);
  assert.equal(cfg.fullShelfPinBoring, false);
  assert.equal(cfg.layout, 'mixed');
  assert.equal(cfg.isCustom, true);
  assert.deepEqual(cfg.customData, savedContents);
  assert.deepEqual(
    writes.map(write => write.key),
    [2, 2]
  );
  assert.deepEqual(writes[0]?.meta, { source: 'fullShelfPinBoring.toggle', immediate: true });
  assert.equal(
    normalizeTopModuleConfigTyped({ ...cfg, fullShelfPinBoring: true }, 0, 2).fullShelfPinBoring,
    true
  );
  assert.equal(normalizeLowerModuleConfig({ ...cfg, fullShelfPinBoring: true }, 0).fullShelfPinBoring, true);
});

test('hover previews add or remove for the selected saved cell without invoking preset placement', () => {
  let enabled = false;
  let freeBoxCalls = 0;
  const target = {
    hitModuleKey: 3,
    isBottom: true,
    bottomY: 0.8,
    topY: 2.1,
  };
  const loaded = loadTsRuntimeModule(
    path.join(process.cwd(), 'esm/native/services/canvas_picking_interior_hover_layout_mode.ts'),
    {
      mocks: {
        './canvas_picking_local_helpers.js': {
          __wp_resolveInteriorHoverTarget: () => target,
          __wp_readInteriorModuleConfigRef: (_app: unknown, key: unknown, bottom: unknown) => {
            assert.equal(key, 3);
            assert.equal(bottom, true);
            return { fullShelfPinBoring: enabled };
          },
        },
        './canvas_picking_manual_layout_free_box_content.js': {
          tryHandlePresetLayoutFreeBoxHover() {
            freeBoxCalls++;
            return true;
          },
        },
        './canvas_picking_interior_hover_layout_family_shared.js': {
          buildLayoutPreviewPayload: () => ({ op: 'add', anchor: null }),
        },
      },
    }
  ) as { tryHandleCanvasPresetLayoutHover(args: Record<string, unknown>): boolean };
  const state = {
    mode: { opts: { layoutType: 'full_boring' } },
    ui: { currentLayoutType: 'full_boring' },
    config: {},
    runtime: {},
    meta: {},
  };
  const previews: Record<string, unknown>[] = [];
  const args = {
    App: { store: { getState: () => state, patch() {} } },
    setLayoutPreview: (payload: Record<string, unknown>) => previews.push(payload),
    hideLayoutPreview: () => undefined,
    hideSketchPreview: () => undefined,
  };
  assert.equal(loaded.tryHandleCanvasPresetLayoutHover(args), true);
  assert.equal((previews[0]?.boringBounds as { bottomY: number }).bottomY, 0.8);
  assert.equal((previews[0]?.boringBounds as { topY: number }).topY, 2.1);
  assert.equal(previews[0]?.op, 'add');
  enabled = true;
  assert.equal(loaded.tryHandleCanvasPresetLayoutHover(args), true);
  assert.equal(previews[1]?.op, 'remove');
  assert.equal(freeBoxCalls, 0);
});

test('renderer batches the complete hole pattern into one non-pickable instanced mesh', () => {
  class Matrix {
    rotation = 0;
    position = { x: 0, y: 0, z: 0 };
    makeRotationZ(angle: number) {
      this.rotation = angle;
    }
    setPosition(x: number, y: number, z: number) {
      this.position = { x, y, z };
    }
  }
  class Mesh {
    userData: Record<string, unknown> = {};
    castShadow = true;
    receiveShadow = true;
    raycast: unknown;
    constructor(
      public geometry: unknown,
      public material: unknown
    ) {}
  }
  class InstancedMesh extends Mesh {
    matrices: Array<{ rotation: number; position: { x: number; y: number; z: number } }> = [];
    instanceMatrix = { needsUpdate: false };
    constructor(
      geometry: unknown,
      material: unknown,
      public count: number
    ) {
      super(geometry, material);
    }
    setMatrixAt(index: number, matrix: Matrix) {
      this.matrices[index] = { rotation: matrix.rotation, position: { ...matrix.position } };
    }
  }
  class CylinderGeometry {
    constructor(
      public radiusTop: number,
      public radiusBottom: number,
      public height: number
    ) {}
  }
  class Material {
    __keepMaterial = false;
    constructor(public props: Record<string, unknown>) {}
  }
  const added: InstancedMesh[] = [];
  const options = {
    ...base,
    enabled: true,
    moduleKey: 'module-2',
    group: {
      add(mesh: InstancedMesh) {
        added.push(mesh);
      },
    },
    threeSurface: {
      InstancedMesh,
      Matrix4: Matrix,
      Mesh,
      CylinderGeometry,
      MeshBasicMaterial: Material,
    },
    roomArchitecturePlan: createTestRoomArchitecturePlan({ widthM: 1, heightM: 2.4, depthM: 0.6 }),
  };
  addFullShelfPinBoring(options as never);
  assert.equal(added.length, 1);
  assert.equal(added[0]?.count, 320);
  assert.equal(added[0]?.userData.__kind, 'shelf_pin_bore');
  assert.equal(added[0]?.userData.__ignoreRaycast, true);
  assert.equal(added[0]?.instanceMatrix.needsUpdate, true);
  assert.equal(added[0]?.matrices[0]?.rotation, Math.PI / 2);
  assert.deepEqual(added[0]?.matrices[0]?.position, planFullShelfPinBoring(base)[0]);
  assert.equal((added[0]?.geometry as CylinderGeometry).radiusTop, 0.0025);
  assert.equal((added[0]?.material as Material).props.color, 0x242424);
  addFullShelfPinBoring({ ...options, enabled: false } as never);
  assert.equal(added.length, 1);
});
