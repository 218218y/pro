import test from 'node:test';
import assert from 'node:assert/strict';

import { applySketchExternalDrawers } from '../esm/native/builder/render_interior_sketch_drawers.ts';
import { buildSketchInternalDrawerOps } from '../esm/native/builder/render_interior_sketch_drawers_internal.ts';
import {
  SHELF_GROUP_PART_ID,
  createSketchExternalDrawerBraceShelfPartId,
} from '../esm/native/features/shelf_part_identity.ts';
import { DRAWER_DIMENSIONS } from '../esm/shared/wardrobe_dimension_tokens_shared.ts';

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
  const doorVisualCalls: Array<{
    partId: string;
    faceMat: unknown;
    isMirror: boolean;
    faceH: number;
    style: unknown;
    options: unknown;
  }> = [];
  const drawerBoxCalls: unknown[][] = [];
  const shelfBoards: FakeMesh[] = [];
  const braceShelfMat = { id: 'brace-shelf-mat' };
  const group = new FakeGroup();
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
      createInternalDrawerBox: (...callArgs: unknown[]) => {
        drawerBoxCalls.push(callArgs);
        return new FakeMesh(new FakeBoxGeometry(1, 1, 1), { id: 'drawer-box-mat' });
      },
      createDoorVisual: (
        _faceW: number,
        faceH: number,
        _faceD: number,
        faceMat: unknown,
        style: unknown,
        _isOpen: boolean,
        isMirror: boolean,
        _curtainType: unknown,
        _baseMat: unknown,
        _hingeCount: number,
        _doubleDoor: boolean,
        _mirrorLayout: unknown,
        partId: string,
        options: unknown
      ) => {
        doorVisualCalls.push({ partId, faceMat, isMirror, faceH, style, options });
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
    group,
    effectiveBottomY: 0.3,
    effectiveTopY: 1.7,
    spanH: 1.4,
    innerW: 0.8,
    moduleDepth: 0.55,
    internalDepth: 0.5,
    internalCenterX: 0,
    internalZ: -0.05,
    moduleIndex: 2,
    moduleKeyStr: 'module_2',
    woodThick: 0.02,
    bodyMat: { id: 'body-mat' },
    currentBraceShelfMat: braceShelfMat,
    createBoard: (
      w: number,
      h: number,
      d: number,
      x: number,
      y: number,
      z: number,
      mat: unknown,
      partId: string
    ) => {
      const mesh = new FakeMesh(new FakeBoxGeometry(w, h, d), mat);
      mesh.position.set(x, y, z);
      mesh.userData.partId = partId;
      shelfBoards.push(mesh);
      group.add(mesh);
      return mesh;
    },
    getPartMaterial: (partId: string) => ({ id: `part:${partId}` }),
    getPartColorValue: () => undefined,
    moduleDoorFaceSpan: null,
    isFn: (value: unknown) => typeof value === 'function',
    renderOpsHandleCatch: (_app: unknown, _op: string, error: unknown) => {
      throw error;
    },
  };

  return {
    args,
    mirrorCallsRef: () => mirrorCalls,
    doorVisualCalls,
    drawerBoxCalls,
    shelfBoards,
    braceShelfMat,
    App,
    mirrorMat,
  };
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

test('render sketch external drawers emit one individually paintable brace shelf per stack', () => {
  const { args, shelfBoards, braceShelfMat } = createExternalDrawerArgs();
  args.extDrawers = [{ id: 'paintable', count: 2, yNormC: 0.5 }];

  applySketchExternalDrawers(args);

  const shelfPartId = createSketchExternalDrawerBraceShelfPartId('module_2', 'paintable');
  const shelf = shelfBoards.find(board => board.userData.partId === shelfPartId);
  assert.ok(shelf);
  assert.equal(shelfBoards.length, 1);
  assert.equal(shelf.material, braceShelfMat);
  assert.equal(shelf.userData.__wpShelfGroupPartId, SHELF_GROUP_PART_ID);
  assert.equal(shelf.userData.__wpShelfVariant, 'brace');
  assert.equal(shelf.userData.__wpShelfIsBrace, true);
  assert.equal(
    shelf.geometry.args[0],
    args.innerW - DRAWER_DIMENSIONS.external.separatorBoardWidthClearanceM
  );
  assert.equal(shelf.geometry.args[2], args.internalDepth);
  assert.equal(shelf.position.z, args.internalZ);
});

test('render sketch external drawers preserve bottom and top anchors after cabinet height changes', () => {
  const { args, App } = createExternalDrawerArgs();
  args.effectiveBottomY = 0;
  args.effectiveTopY = 1.4;
  args.spanH = 1.4;
  args.extDrawers = [
    { id: 'bottomLegacy', count: 2, yNormC: 0.3, yNorm: 0, drawerHeightM: 0.3 },
    { id: 'topLegacy', count: 2, yNormC: 0.7, yNorm: 0.4, drawerHeightM: 0.3 },
  ];

  applySketchExternalDrawers(args);

  const drawers = App.render?.drawersArray || [];
  assert.equal(drawers.length, 4);
  const bottomFaceMinY = Math.min(...drawers.map((entry: any) => Number(entry.group.userData.__wpFaceMinY)));
  const topFaceMaxY = Math.max(...drawers.map((entry: any) => Number(entry.group.userData.__wpFaceMaxY)));
  assert.ok(Math.abs(bottomFaceMinY - args.effectiveBottomY) < 1e-9);
  assert.ok(Math.abs(topFaceMaxY - (args.effectiveTopY + args.woodThick / 2)) < 1e-9);
});

test('render sketch external drawers skips exact custom-height stacks that do not fit', () => {
  const { args, App } = createExternalDrawerArgs();
  args.effectiveBottomY = 0;
  args.effectiveTopY = 0.9;
  args.spanH = 0.9;
  args.extDrawers = [{ id: 'tooTall', count: 4, yNormC: 0.5, drawerHeightM: 0.3 }];

  applySketchExternalDrawers(args);

  assert.equal((App.render?.drawersArray || []).length, 0);
});

test('render sketch glass drawers keep the selected frame style and remove hidden wood parts behind the glass', () => {
  const { args, doorVisualCalls, drawerBoxCalls, App } = createExternalDrawerArgs();
  args.input.cfg.doorSpecialMap = {
    sketch_ext_drawers_module_2_left_1: 'glass',
  };
  args.input.cfg.curtainMap = {
    sketch_ext_drawers_module_2_left_1: 'white',
  };
  args.input.cfg.doorStyleMap = {
    sketch_ext_drawers_module_2_left_1: 'double_profile',
  };
  args.extDrawers = [{ id: 'left', count: 1, yNormC: 0.5 }];

  applySketchExternalDrawers(args);

  assert.equal(doorVisualCalls.length, 1);
  assert.equal(doorVisualCalls[0]?.style, 'glass');
  assert.deepEqual(doorVisualCalls[0]?.options, { glassFrameStyle: 'double_profile' });
  assert.equal(drawerBoxCalls.length, 1);
  assert.deepEqual(drawerBoxCalls[0]?.[8], { omitFrontPanel: true });

  const drawers = App.render?.drawersArray || [];
  assert.equal(drawers.length, 1);
  const drawerGroup = drawers[0]?.group as FakeGroup;
  assert.equal(
    drawerGroup.children.length,
    2,
    'glass sketch drawer should omit the connector behind the glass'
  );
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

test('render sketch internal drawers skips exact custom-height stacks that do not fit', () => {
  const ops = buildSketchInternalDrawerOps({
    drawers: [{ id: 'tooTall', yNormC: 0.5, drawerHeightM: 0.3 }],
    input: {},
    moduleIndex: 1,
    moduleKeyStr: 'module_1',
    effectiveBottomY: 0,
    effectiveTopY: 0.55,
    spanH: 0.55,
    woodThick: 0.02,
    innerW: 0.8,
    internalDepth: 0.5,
    internalCenterX: 0,
    internalZ: -0.1,
  });

  assert.equal(ops.length, 0);
});

test('render sketch internal drawers skip stacks that collide with sketch external drawers', () => {
  const ops = buildSketchInternalDrawerOps({
    drawers: [{ id: 'internal', yNormC: 0.5, yNorm: 0.15, drawerHeightM: 0.3 }],
    extDrawers: [{ id: 'external', yNormC: 0.5, yNorm: 0.17, count: 2, drawerHeightM: 0.3 }],
    input: {},
    moduleIndex: 1,
    moduleKeyStr: 'module_1',
    effectiveBottomY: 0,
    effectiveTopY: 0.9,
    spanH: 0.9,
    woodThick: 0.02,
    innerW: 0.8,
    internalDepth: 0.5,
    internalCenterX: 0,
    internalZ: -0.1,
  });

  assert.equal(ops.length, 0);
});

test('render sketch external drawers applies drawer divider state from canonical divider map', () => {
  const { args, drawerBoxCalls, App } = createExternalDrawerArgs();
  args.input.cfg.drawerDividersMap = {
    sketch_ext_drawers_module_2_left_1: true,
  };
  args.extDrawers = [{ id: 'left', count: 1, yNormC: 0.5 }];

  applySketchExternalDrawers(args);

  assert.equal(drawerBoxCalls.length, 1);
  assert.equal(drawerBoxCalls[0]?.[6], true);
  const drawers = App.render?.drawersArray || [];
  assert.equal(drawers[0]?.dividerKey, 'sketch_ext_drawers_module_2_left_1');
});

test('render sketch internal drawer ops use independent divider keys for each physical drawer', () => {
  const ops = buildSketchInternalDrawerOps({
    drawers: [{ id: 'default', yNormC: 0.5 }],
    input: {
      cfg: {
        drawerDividersMap: { div_int_sketch_module_1_default_upper: true },
      },
    },
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
  assert.equal(ops[0]!.partId, 'div_int_sketch_module_1_default_lower');
  assert.equal(ops[1]!.partId, 'div_int_sketch_module_1_default_upper');
  assert.equal(ops[0]!.dividerKey, 'div_int_sketch_module_1_default_lower');
  assert.equal(ops[1]!.dividerKey, 'div_int_sketch_module_1_default_upper');
  assert.equal(ops[0]!.hasDivider, false);
  assert.equal(ops[1]!.hasDivider, true);
});

test('render sketch external drawers follow inset door mount depth', () => {
  const { args, App } = createExternalDrawerArgs();
  args.input.cfg.doorMountMode = 'inset';
  args.extDrawers = [{ id: 'inset', count: 1, yNormC: 0.5 }];

  applySketchExternalDrawers(args);

  const drawers = App.render?.drawersArray || [];
  assert.equal(drawers.length, 1);
  const drawerGroup = drawers[0]?.group as FakeGroup;
  const expectedZ = 0.55 / 2 - 0.02 / 2 - 0.003;
  assert.ok(Math.abs(drawerGroup.position.z - expectedZ) < 1e-9);
});
