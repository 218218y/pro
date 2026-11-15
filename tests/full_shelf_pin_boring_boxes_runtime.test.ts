import assert from 'node:assert/strict';
import test from 'node:test';

import {
  previewFullBoringSketchBox,
  resolveFullBoringBoxHit,
  tryToggleFullBoringSketchBox,
} from '../esm/native/services/canvas_picking_full_boring_box.ts';
import { renderSketchBoxBoring } from '../esm/native/builder/render_interior_sketch_boxes_boring.ts';
import { planFullShelfPinBoring } from '../esm/native/builder/render_interior_shelf_pin_boring.ts';
import { createTestRoomArchitecturePlan } from './room_architecture_test_helpers.ts';

type Row = Record<string, unknown>;

type MockModule = Row & {
  sketchExtras: { boxes: Array<Row & { id: string; fullShelfPinBoring?: boolean }> };
};

function createApp(args: { top: MockModule; bottom?: MockModule; noMain?: boolean }) {
  const cfg: Row = {
    wardrobeType: 'hinged',
    modulesConfiguration: [args.top],
    stackSplitLowerModulesConfiguration: args.bottom ? [args.bottom] : [],
  };
  const state = {
    config: cfg,
    ui: { raw: { doors: args.noMain ? 0 : 2 } },
    mode: {},
    runtime: {},
    meta: {},
  };
  const patches: Array<{ stack: string; moduleKey: unknown; meta: unknown }> = [];
  const App = {
    store: { getState: () => state, patch: () => null },
    actions: {
      modules: {
        patchForStack(stack: string, moduleKey: unknown, mutate: (value: MockModule) => void, meta: unknown) {
          const list =
            stack === 'bottom'
              ? (cfg.stackSplitLowerModulesConfiguration as MockModule[])
              : (cfg.modulesConfiguration as MockModule[]);
          const target = list[Number(moduleKey)];
          assert.ok(target, `missing module for stack ${stack} key ${String(moduleKey)}`);
          patches.push({ stack, moduleKey, meta });
          mutate(target);
          return true;
        },
      },
    },
  };
  return { App: App as never, patches };
}

function makeBoxHit(boxId: string, moduleKey: string, bounds?: Row) {
  const boxPart = {
    userData: {
      __wpSketchBoxId: boxId,
      __wpSketchModuleKey: moduleKey,
      __wpFullBoringBox: bounds ?? {
        bottomY: 0.14,
        topY: 1.62,
        centerX: 0.3,
        innerW: 0.68,
        internalZ: -0.22,
        internalDepth: 0.46,
        woodThick: 0.018,
      },
    },
  };
  const hostSelector = { userData: { moduleIndex: 0, isModuleSelector: true } };
  return { boxPart, intersects: [{ object: boxPart }, { object: hostSelector }] as never };
}

function mockCfg(...boxes: Array<MockModule['sketchExtras']['boxes'][number]>): MockModule {
  return { layout: 'mixed', fullShelfPinBoring: false, sketchExtras: { boxes } };
}

test('full boring targets an embedded box rather than the wardrobe module behind it', () => {
  const embedded = { id: 'embedded', fullShelfPinBoring: false };
  const free = { id: 'free', freePlacement: true, fullShelfPinBoring: false };
  const top = mockCfg(embedded, free);
  const { App, patches } = createApp({ top });
  const { intersects } = makeBoxHit('embedded', '0');
  const hit = resolveFullBoringBoxHit({ App, intersects });
  assert.equal(hit.isBoxHit, true);
  if (!hit.isBoxHit) return;
  assert.equal(hit.target?.moduleKey, 0);
  assert.equal(hit.target?.isBottom, false);
  assert.equal(hit.target?.bounds?.topY, 1.62);

  assert.equal(tryToggleFullBoringSketchBox({ App, intersects }), true);
  assert.equal(embedded.fullShelfPinBoring, true);
  assert.equal(free.fullShelfPinBoring, false);
  assert.equal(top.fullShelfPinBoring, false);
  assert.equal(tryToggleFullBoringSketchBox({ App, intersects }), true);
  assert.equal(embedded.fullShelfPinBoring, false);
  assert.equal(patches.length, 2);
  assert.deepEqual(
    patches.map(patch => [patch.stack, patch.moduleKey]),
    [
      ['top', 0],
      ['top', 0],
    ]
  );
});

test('standalone free box in a zero-door scene receives its own full-boring state', () => {
  const free = { id: 'free-standalone', freePlacement: true, fullShelfPinBoring: false };
  const top = mockCfg(free);
  const { App, patches } = createApp({ top, noMain: true });
  const { intersects } = makeBoxHit('free-standalone', '0');
  assert.equal(tryToggleFullBoringSketchBox({ App, intersects }), true);
  assert.equal(free.fullShelfPinBoring, true);
  assert.equal(top.fullShelfPinBoring, false);
  assert.deepEqual(
    patches.map(p => p.stack),
    ['top']
  );

  const previews: Row[] = [];
  const parent = { name: 'wardrobe-root' };
  assert.equal(
    previewFullBoringSketchBox({
      App,
      intersects,
      wardrobeGroup: parent,
      setLayoutPreview: payload => previews.push(payload),
    }),
    true
  );
  assert.equal(previews[0]?.anchorParent, parent);
  assert.deepEqual(previews[0]?.boringBounds, { bottomY: 0.14, topY: 1.62 });
  assert.equal(previews[0]?.op, 'remove');
  assert.equal(previews[0]?.innerW, 0.68);
  assert.equal(previews[0]?.internalDepth, 0.46);
  assert.equal(tryToggleFullBoringSketchBox({ App, intersects }), true);
  assert.equal(free.fullShelfPinBoring, false);
});

test('lower_0 pick metadata targets the split bottom box, even when top has the same box ID', () => {
  const topBox = { id: 'same-id', fullShelfPinBoring: false };
  const bottomBox = { id: 'same-id', fullShelfPinBoring: false };
  const top = mockCfg(topBox);
  const bottom = mockCfg(bottomBox);
  const { App, patches } = createApp({ top, bottom });
  const { intersects } = makeBoxHit('same-id', 'lower_0');
  const hit = resolveFullBoringBoxHit({ App, intersects, preferredBottom: false });
  assert.equal(hit.isBoxHit, true);
  if (!hit.isBoxHit) return;
  assert.equal(hit.target?.moduleKey, 0);
  assert.equal(hit.target?.isBottom, true);
  assert.equal(tryToggleFullBoringSketchBox({ App, intersects, preferredBottom: false }), true);
  assert.equal(bottomBox.fullShelfPinBoring, true);
  assert.equal(topBox.fullShelfPinBoring, false);
  assert.equal(top.fullShelfPinBoring, false);
  assert.deepEqual(
    patches.map(p => [p.stack, p.moduleKey]),
    [['bottom', 0]]
  );
});

test('preview follows the rotated side-wall free-box frame instead of the enclosing wardrobe', () => {
  const free = { id: 'free-side', freePlacement: true, fullShelfPinBoring: false };
  const { App } = createApp({ top: mockCfg(free), noMain: true });
  const { boxPart, intersects } = makeBoxHit('free-side', '0');
  const frame = {
    userData: {
      __wpSketchFreePlacementWall: 'left',
      __wpSketchFreePlacementRotationY: Math.PI / 2,
      __wpSketchFreePlacementPivotX: 0.2,
      __wpSketchFreePlacementPivotZ: -0.1,
      __wpSketchFreePlacementAlong: 0.5,
      __wpSketchFreePlacementLogicalCenterZ: 0.25,
    },
  };
  (boxPart as Row).parent = frame;
  const previews: Row[] = [];
  assert.equal(
    previewFullBoringSketchBox({
      App,
      intersects,
      wardrobeGroup: { name: 'wrong-frame' },
      setLayoutPreview: payload => previews.push(payload),
    }),
    true
  );
  assert.equal(previews[0]?.anchorParent, frame);
  assert.ok(Math.abs(Number(previews[0]?.x) - 0.1) < 1e-8);
  assert.ok(Math.abs(Number(previews[0]?.internalZ) - -0.12) < 1e-8);
});

test('stale box pick is consumed and clears stale preview; module behind it remains untouched', () => {
  const top = mockCfg({ id: 'keep', fullShelfPinBoring: false });
  const { App, patches } = createApp({ top });
  const { intersects } = makeBoxHit('removed-box', '0');
  let clearCount = 0;
  let previewCount = 0;
  assert.equal(
    previewFullBoringSketchBox({
      App,
      intersects,
      wardrobeGroup: {},
      setLayoutPreview: () => previewCount++,
      hideLayoutPreview: () => clearCount++,
    }),
    true
  );
  assert.equal(clearCount, 1);
  assert.equal(previewCount, 0);
  assert.equal(tryToggleFullBoringSketchBox({ App, intersects }), true);
  assert.equal(patches.length, 0);
  assert.equal(top.fullShelfPinBoring, false);
});

test('boring renderer uses box inner height/width/depth rather than module bounds', () => {
  class Geometry {
    constructor(..._args: unknown[]) {}
  }
  class Material {
    __keepMaterial = false;
    constructor(_args: Row) {}
  }
  class Mesh {
    userData: Row = {};
    castShadow = true;
    receiveShadow = true;
    raycast: unknown;
    constructor(_geo: unknown, _material: unknown) {}
  }
  class Matrix {
    value = { x: 0, y: 0, z: 0 };
    makeRotationZ(_rad: number) {}
    setPosition(x: number, y: number, z: number) {
      this.value = { x, y, z };
    }
  }
  class InstancedMesh extends Mesh {
    positions: Array<{ x: number; y: number; z: number }> = [];
    instanceMatrix = { needsUpdate: false };
    constructor(
      geo: unknown,
      mat: unknown,
      public count: number
    ) {
      super(geo, mat);
    }
    setMatrixAt(index: number, matrix: Matrix) {
      this.positions[index] = { ...matrix.value };
    }
  }
  const group = {
    children: [] as Array<{ userData: Row }>,
    add(value: { userData: Row }) {
      this.children.push(value);
    },
  };
  const boxPart = { userData: { __wpSketchBoxId: 'box-a', __wpSketchModuleKey: '0' } };
  group.add(boxPart);
  const options = {
    renderArgs: {
      group,
      moduleKeyStr: '0',
      woodThick: 0.018,
      THREE: {
        InstancedMesh,
        Matrix4: Matrix,
        Mesh,
        CylinderGeometry: Geometry,
        MeshBasicMaterial: Material,
      },
      input: { roomArchitecturePlan: createTestRoomArchitecturePlan({ widthM: 4, heightM: 3, depthM: 1 }) },
    },
    shell: {
      box: { id: 'box-a', fullShelfPinBoring: true },
      boxId: 'box-a',
      isFreePlacement: false,
      geometry: { centerX: 0.2, innerW: 0.63, innerBackZ: -0.2, innerD: 0.42 },
      innerBottomY: 0.4,
      innerTopY: 1.4,
      regularDepth: 0.4,
    },
    startChildCount: 0,
  };
  renderSketchBoxBoring(options as never);
  assert.equal(group.children.length, 2);
  assert.deepEqual(boxPart.userData.__wpFullBoringBox, {
    boxId: 'box-a',
    moduleKey: '0',
    freePlacement: false,
    bottomY: 0.4,
    topY: 1.4,
    centerX: 0.2,
    innerW: 0.63,
    internalZ: -0.2 + 0.42 / 2,
    internalDepth: 0.42,
    regularDepth: 0.4,
    woodThick: 0.018,
  });
  const boring = group.children[1] as InstancedMesh;
  const points = planFullShelfPinBoring({
    bottomY: 0.4,
    topY: 1.4,
    leftInnerX: 0.2 - 0.63 / 2,
    rightInnerX: 0.2 + 0.63 / 2,
    internalZ: 0.01,
    internalDepth: 0.42,
    regularDepth: 0.4,
  });
  assert.equal(boring.count, points.length);
  assert.equal(boring.userData.__ignoreRaycast, true);
  assert.ok(boring.positions.every(position => position.y >= 0.4 && position.y <= 1.4));
  assert.ok(boring.positions.every(position => position.x > -0.2 && position.x < 0.6));
  assert.ok(boring.positions.every(position => position.z >= -0.2 && position.z <= 0.22));

  const noBoringGroup = {
    children: [] as unknown[],
    add(mesh: unknown) {
      this.children.push(mesh);
    },
  };
  renderSketchBoxBoring({
    ...options,
    renderArgs: { ...options.renderArgs, group: noBoringGroup },
    shell: { ...options.shell, box: { id: 'box-a', fullShelfPinBoring: false } },
  } as never);
  assert.equal(noBoringGroup.children.length, 0);
});
