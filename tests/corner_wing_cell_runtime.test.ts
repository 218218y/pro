import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createCornerWingInteriorCellRuntime,
  getCornerCellInnerFacesX,
} from '../esm/native/builder/corner_wing_cell_interiors_cell.ts';
import {
  addCornerWingGridShelf,
  createCornerWingInteriorShelfRuntime,
} from '../esm/native/builder/corner_wing_cell_interiors_shelves.ts';
import { CORNER_WING_DIMENSIONS } from '../esm/shared/wardrobe_dimension_tokens_shared.ts';
import { createCornerWingCellCfgResolver } from '../esm/native/builder/corner_wing_extension_cells_config.ts';

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

class FakeBoxGeometry {
  parameters: { width: number; height: number; depth: number };
  constructor(width: number, height: number, depth: number) {
    this.parameters = { width, height, depth };
  }
}

class FakeMesh {
  position = new FakeVector3();
  rotation = new FakeVector3();
  userData: Record<string, unknown> = {};
  material: any;
  geometry: FakeBoxGeometry;
  castShadow = true;
  receiveShadow = true;
  renderOrder = 0;
  constructor(geometry: FakeBoxGeometry, material: unknown) {
    this.geometry = geometry;
    this.material = material;
  }
}

function createCornerCell(
  idx: number,
  startX: number,
  width: number,
  overrides: Record<string, unknown> = {}
) {
  return {
    idx,
    key: `corner-cell-${idx}`,
    startX,
    width,
    centerX: startX + width / 2,
    depth: 0.62,
    effectiveBottomY: 0.12,
    effectiveTopY: 2.18,
    gridDivisions: 6,
    localGridStep: 0.34,
    cfg: {},
    __hasActiveSpecialDims: false,
    ...overrides,
  } as any;
}

test('corner wing cell runtime: inner faces use full divider thickness next to active special-dims neighbors', () => {
  const runtime: any = {
    cornerCells: [
      createCornerCell(0, 0.0, 0.46),
      createCornerCell(1, 0.46, 0.48, { __hasActiveSpecialDims: true }),
      createCornerCell(2, 0.94, 0.5),
    ],
    woodThick: 0.018,
    blindWidth: 0.14,
    wingW: 1.44,
    wingD: 0.6,
    startY: 0.1,
  };

  const firstFaces = getCornerCellInnerFacesX(runtime, 0);
  assert.equal(Number(firstFaces.leftX.toFixed(3)), 0.158);
  assert.equal(Number(firstFaces.rightX.toFixed(3)), 0.442);

  const middleRuntime = createCornerWingInteriorCellRuntime(runtime, runtime.cornerCells[1]);
  assert.equal(Number(middleRuntime.cellInnerLeftX.toFixed(3)), 0.478);
  assert.equal(Number(middleRuntime.cellInnerRightX.toFixed(3)), 0.922);
  assert.equal(Number(middleRuntime.cellShelfW.toFixed(3)), 0.439);
  assert.equal(Number(middleRuntime.__regularDepth.toFixed(3)), 0.45);
  assert.equal(Number(middleRuntime.__backFaceZ.toFixed(3)), -0.59);
});

test('corner wing grid shelves keep brace shelves full-width and regular shelves clearanced', () => {
  const wingChildren: FakeMesh[] = [];
  const cell = createCornerCell(0, 0, 0.6, {
    cfg: {
      braceShelves: [2],
      customData: { shelfVariants: ['regular', 'brace'] },
    },
  });
  const runtime: any = {
    cornerCells: [cell],
    woodThick: 0.018,
    blindWidth: 0,
    wingW: 0.6,
    wingD: 0.55,
    startY: 0,
    App: {},
    THREE: {
      BoxGeometry: FakeBoxGeometry,
      CylinderGeometry: FakeBoxGeometry,
      Mesh: FakeMesh,
      MeshStandardMaterial: class {},
      DoubleSide: 'double-side',
    },
    wingGroup: {
      add(mesh: FakeMesh) {
        wingChildren.push(mesh);
        return mesh;
      },
    },
    getCornerShelfMat: (_partId: unknown, isBrace: boolean) =>
      isBrace ? { id: 'brace' } : { id: 'regular' },
    getMaterial: () => ({ id: 'pin' }),
    getOrCreateCacheRecord: () => ({}),
    addOutlines: () => undefined,
    showContentsEnabled: false,
    isRecord: (value: unknown) => !!value && typeof value === 'object' && !Array.isArray(value),
    asRecord: (value: unknown) =>
      value && typeof value === 'object' ? (value as Record<string, unknown>) : {},
    __stackKey: 'top',
    __stackScopePartKey: (partId: string) => `lower_${partId}`,
  };
  const cellRuntime = createCornerWingInteriorCellRuntime(runtime, cell);
  const shelfRuntime = createCornerWingInteriorShelfRuntime(runtime);

  addCornerWingGridShelf(cellRuntime, shelfRuntime, 1);
  addCornerWingGridShelf(cellRuntime, shelfRuntime, 2);

  const shelfBoards = wingChildren.filter(child => child.userData.__wpShelfGroupPartId);
  const regular = shelfBoards.find(child => child.userData.__wpShelfVariant === 'regular');
  const brace = shelfBoards.find(child => child.userData.__wpShelfVariant === 'brace');

  assert.equal(regular?.geometry.parameters.width, cellRuntime.cellShelfW);
  assert.equal(
    regular?.geometry.parameters.width,
    cellRuntime.cellInnerW - CORNER_WING_DIMENSIONS.interior.shelfWidthClearanceM
  );
  assert.equal(brace?.geometry.parameters.width, cellRuntime.cellInnerW);
});

test('corner wing extension-cell config runtime: bottom stack defaults stay shelf-scoped and use lower-cell canonical actions when present', () => {
  const calls: Array<{ stack: string; moduleKey: string }> = [];
  const resolver = createCornerWingCellCfgResolver(
    {
      App: {
        actions: {
          modules: {
            ensureForStack(stack: string, moduleKey: string) {
              calls.push({ stack, moduleKey });
              return stack === 'bottom' && moduleKey === 'corner:0'
                ? {
                    layout: 'hanging_top2',
                    customData: { shelves: [], rods: [true, false], storage: false },
                  }
                : null;
            },
          },
        },
      },
      config: {
        modulesConfiguration: [{}, null],
      },
      __stackSplitEnabled: true,
      __stackKey: 'bottom',
      __mirrorX: 1,
    } as any,
    2
  );

  const first = resolver(0);
  const second = resolver(1);

  assert.deepEqual(calls, [{ stack: 'bottom', moduleKey: 'corner:1' }]);
  assert.equal(first.layout, 'shelves');
  assert.equal(first.isCustom, true);
  assert.deepEqual(first.customData?.shelves, [false, true, false, true, false, false]);
  assert.deepEqual(first.customData?.rods, []);
  assert.equal(first.extDrawersCount, 0);
  assert.equal(first.gridDivisions, 6);

  assert.equal(second.layout, 'shelves');
  assert.equal(second.isCustom, true);
  assert.deepEqual(second.customData?.shelves, [false, true, false, true, false, false]);
  assert.deepEqual(second.customData?.rods, []);
});

test('corner wing extension-cell config ignores string numeric runtime values', () => {
  const resolver = createCornerWingCellCfgResolver(
    {
      App: {},
      config: {
        modulesConfiguration: [
          {
            layout: 'shelves',
            extDrawersCount: '2',
            gridDivisions: '8',
            isCustom: true,
            customData: {},
          },
        ],
      },
      __stackSplitEnabled: false,
      __stackKey: 'top',
      __mirrorX: 1,
    } as any,
    1
  );

  const cfg = resolver(0);

  assert.equal(cfg.extDrawersCount, 0);
  assert.equal(cfg.gridDivisions, CORNER_WING_DIMENSIONS.cells.defaultGridDivisions);
});

test('corner wing brace shelves ignore string-encoded shelf indexes', () => {
  const cell = createCornerCell(0, 0, 0.6, {
    cfg: {
      braceShelves: ['2', 3],
    },
  });
  const runtime: any = {
    cornerCells: [cell],
    woodThick: 0.018,
    blindWidth: 0,
    wingW: 0.6,
    wingD: 0.55,
    startY: 0,
  };

  const cellRuntime = createCornerWingInteriorCellRuntime(runtime, cell) as any;

  assert.equal(cellRuntime.__braceSet[2], undefined);
  assert.equal(cellRuntime.__braceSet[3], true);
});
