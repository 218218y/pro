import test from 'node:test';
import assert from 'node:assert/strict';

import { applySketchExternalDrawers } from '../esm/native/builder/render_interior_sketch_drawers.ts';
import { buildSketchInternalDrawerOps } from '../esm/native/builder/render_interior_sketch_drawers_internal.ts';

class FakeVector3 {
  x = 0;
  y = 0;
  z = 0;
  set(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
}

class FakeGroup {
  children: unknown[] = [];
  position = new FakeVector3();
  rotation = new FakeVector3();
  userData: Record<string, unknown> = {};
  add(child: unknown) {
    this.children.push(child);
    return child;
  }
}

class FakeMesh {
  position = new FakeVector3();
  rotation = new FakeVector3();
  userData: Record<string, unknown> = {};
  children: unknown[] = [];
  castShadow = true;
  receiveShadow = true;
  geometry: unknown;
  material: unknown;
  constructor(geometry: unknown, material: unknown) {
    this.geometry = geometry;
    this.material = material;
  }
  add(child: unknown) {
    this.children.push(child);
    return child;
  }
}

class FakeBoxGeometry {
  args: number[];
  constructor(...args: number[]) {
    this.args = args;
  }
}

class FakeMeshStandardMaterial {
  opts: Record<string, unknown>;
  constructor(opts: Record<string, unknown>) {
    this.opts = opts;
  }
}

function createExternalDrawerArgs() {
  const mirrorMat = { id: 'mirror-mat' };
  let mirrorCalls = 0;
  const doorVisualCalls: Array<{ partId: string; faceMat: unknown; isMirror: boolean; faceH: number }> = [];
  const App: any = {
    services: {
      builder: {
        materials: {
          getMirrorMaterial: () => {
            mirrorCalls += 1;
            return mirrorMat;
          },
        },
      },
    },
  };

  const args: any = {
    App,
    input: {
      cfg: {
        isMultiColorMode: true,
        doorSpecialMap: {
          sketch_ext_drawers_module_2_left_1: 'mirror',
          sketch_ext_drawers_module_2_right_1: 'mirror',
        },
      },
      addOutlines: () => {},
      createInternalDrawerBox: () => new FakeMesh(new FakeBoxGeometry(1, 1, 1), { id: 'drawer-box-mat' }),
      createDoorVisual: (
        _faceW: number,
        faceH: number,
        _faceD: number,
        faceMat: unknown,
        _style: unknown,
        _isOpen: boolean,
        isMirror: boolean,
        _curtainType: unknown,
        _baseMat: unknown,
        _hingeCount: number,
        _doubleDoor: boolean,
        _mirrorLayout: unknown,
        partId: string
      ) => {
        doorVisualCalls.push({ partId, faceMat, isMirror, faceH });
        return new FakeMesh(new FakeBoxGeometry(1, 1, 1), faceMat);
      },
    },
    extDrawers: [
      { id: 'left', count: 1, yNormC: 0.25 },
      { id: 'right', count: 1, yNormC: 0.75 },
    ],
    THREE: {
      Group: FakeGroup,
      Mesh: FakeMesh,
      BoxGeometry: FakeBoxGeometry,
      MeshStandardMaterial: FakeMeshStandardMaterial,
      Vector3: class {
        constructor(
          public x: number,
          public y: number,
          public z: number
        ) {}
      },
    },
    group: new FakeGroup(),
    effectiveBottomY: 0.3,
    effectiveTopY: 1.7,
    spanH: 1.4,
    innerW: 0.8,
    moduleDepth: 0.55,
    internalDepth: 0.5,
    internalCenterX: 0,
    moduleIndex: 2,
    moduleKeyStr: 'module_2',
    woodThick: 0.02,
    bodyMat: { id: 'body-mat' },
    getPartMaterial: (partId: string) => ({ id: `part:${partId}` }),
    moduleDoorFaceSpan: null,
    isFn: (value: unknown) => typeof value === 'function',
    renderOpsHandleCatch: (_app: unknown, _op: string, error: unknown) => {
      throw error;
    },
  };

  return { args, mirrorCallsRef: () => mirrorCalls, doorVisualCalls, App, mirrorMat };
}

test('render sketch external drawer fronts flush their outer edge to adjacent full-height door fronts', () => {
  const { args, App } = createExternalDrawerArgs();
  args.extDrawers = [
    { id: 'bottom', count: 1, yNormC: 0 },
    { id: 'top', count: 1, yNormC: 1 },
  ];

  applySketchExternalDrawers(args);

  const drawers = App.render?.drawersArray || [];
  assert.equal(drawers.length, 2);
  const bottomGroup = drawers[0]?.group as FakeGroup;
  const topGroup = drawers[1]?.group as FakeGroup;
  const bottomVisual = bottomGroup.children[0] as FakeMesh;
  const topVisual = topGroup.children[0] as FakeMesh;

  const expectedDoorFaceTopY = args.effectiveTopY + args.woodThick / 2;

  assert.ok(Math.abs(Number(bottomGroup.userData.__wpFaceMinY) - args.effectiveBottomY) < 1e-9);
  assert.ok(Math.abs(Number(topGroup.userData.__wpFaceMaxY) - expectedDoorFaceTopY) < 1e-9);
  assert.ok(Math.abs(Number(bottomGroup.userData.__doorHeight) - 0.216) < 1e-9);
  assert.ok(Math.abs(Number(topGroup.userData.__doorHeight) - 0.226) < 1e-9);
  assert.ok(Math.abs(bottomVisual.position.y - -0.002) < 1e-9);
  assert.ok(Math.abs(topVisual.position.y - 0.007) < 1e-9);
});

test('render sketch drawers reuses one mirror material across mirrored external drawer fronts', () => {
  const { args, mirrorCallsRef, doorVisualCalls, App, mirrorMat } = createExternalDrawerArgs();

  applySketchExternalDrawers(args);

  assert.equal(mirrorCallsRef(), 1);
  assert.equal(doorVisualCalls.length, 2);
  assert.equal(doorVisualCalls[0]?.isMirror, true);
  assert.equal(doorVisualCalls[1]?.isMirror, true);
  assert.equal(doorVisualCalls[0]?.faceMat, mirrorMat);
  assert.equal(doorVisualCalls[1]?.faceMat, mirrorMat);
  assert.equal((App.render?.drawersArray || []).length, 2);
});

test('render sketch external drawers honors per-stack custom drawer height', () => {
  const { args, App } = createExternalDrawerArgs();
  args.extDrawers = [{ id: 'custom', count: 2, yNormC: 0.5, drawerHeightM: 0.3 }];

  applySketchExternalDrawers(args);

  const drawers = App.render?.drawersArray || [];
  assert.equal(drawers.length, 2);
  const firstGroup = drawers[0]?.group as FakeGroup;
  const secondGroup = drawers[1]?.group as FakeGroup;
  assert.ok(Math.abs(Number(firstGroup.userData.__doorHeight) - 0.292) < 1e-9);
  assert.ok(Math.abs(Number(secondGroup.userData.__doorHeight) - 0.292) < 1e-9);
});

test('render sketch internal drawers keeps the default sketch height independent of local span', () => {
  const ops = buildSketchInternalDrawerOps({
    drawers: [{ id: 'default', yNormC: 0.5 }],
    input: {},
    moduleIndex: 1,
    moduleKeyStr: 'module_1',
    effectiveBottomY: 0,
    effectiveTopY: 2.4,
    spanH: 1,
    woodThick: 0.02,
    innerW: 0.8,
    internalDepth: 0.5,
    internalCenterX: 0,
    internalZ: -0.1,
  });

  assert.equal(ops.length, 2);
  assert.ok(Math.abs(ops[0]!.height - 0.165) < 1e-9);
  assert.ok(Math.abs(ops[1]!.height - 0.165) < 1e-9);
});
