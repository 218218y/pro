import test from 'node:test';
import assert from 'node:assert/strict';

import { renderSketchBoxContentShelves } from '../esm/native/builder/render_interior_sketch_boxes_contents_parts_shelves.ts';
import { createBuilderRenderInteriorLayoutHoverPreviewOps } from '../esm/native/builder/render_preview_interior_hover_ops.ts';
import { SHELF_GROUP_PART_ID } from '../esm/native/features/part_identity/api.ts';
import {
  INTERIOR_SHELF_CONTENT_CLEARANCE_POLICY,
  INTERIOR_SHELF_GEOMETRY_POLICY,
} from '../esm/shared/dimensions/interior_fittings_policy.ts';
import {
  INTERIOR_STORAGE_BARRIER_POLICY,
  INTERIOR_STORAGE_PREVIEW_POLICY,
} from '../esm/shared/dimensions/interior_storage_policy.ts';
import { MATERIAL_THICKNESS_POLICY } from '../esm/shared/dimensions/material_thickness_policy.ts';
import {
  SKETCH_BOX_DOOR_PREVIEW_POLICY,
  SKETCH_BOX_PREVIEW_CORE_POLICY,
  SKETCH_BOX_ROD_PREVIEW_POLICY,
  SKETCH_BOX_SHELF_PREVIEW_POLICY,
} from '../esm/shared/dimensions/sketch_box_preview_policy.ts';

type ShelfBoard = {
  args: unknown[];
  userData: Record<string, unknown>;
  castShadow: boolean;
  receiveShadow: boolean;
  renderOrder: number;
};

type ShelfHarnessOptions = {
  innerW?: number;
  innerD?: number;
  regularDepth?: number;
  woodThick?: number;
  boxPid?: string;
  cfgSnapshot?: unknown;
  dividers?: Array<{ id: string; xNorm: number }>;
};

function createShelfHarness(options: ShelfHarnessOptions = {}) {
  const boards: ShelfBoard[] = [];
  const pins: unknown[][] = [];
  const folded: unknown[][] = [];
  const woodThick = options.woodThick ?? 0.02;
  const innerW = options.innerW ?? 0.8;
  const innerD = options.innerD ?? 0.5;
  const regularDepth = options.regularDepth ?? 0.44;
  const boxPid = options.boxPid ?? 'sketch_box_free_0_sbf_1';
  const shell = {
    box: { shelves: [] as Array<Record<string, unknown>>, doors: [] },
    boxId: 'box-1',
    boxPid,
    isFreePlacement: false,
    height: 1.2,
    halfH: 0.6,
    centerY: 1,
    sideH: 1.16,
    boxMat: {},
    geometry: {
      outerW: innerW + woodThick * 2,
      innerW,
      centerX: 0,
      outerD: innerD + woodThick,
      centerZ: 0,
      innerBackZ: -innerD / 2,
      innerD,
    },
    hexGeometry: null,
    fullDepth: innerD + woodThick,
    backZ: -innerD / 2,
    innerBottomY: 0.4,
    innerTopY: 1.6,
    regularDepth,
    frontZ: innerD / 2,
  };
  const input = {
    cfgSnapshot: options.cfgSnapshot ?? {},
    showContentsEnabled: true,
    sketchMode: true,
    addOutlines: () => undefined,
    addFoldedClothes: (...args: unknown[]) => folded.push(args),
  };
  const context = {
    shell,
    boxDividers: options.dividers ?? [],
    boxHorizontalDividers: [],
    yFromBoxNorm(rawNorm: unknown, itemHalfH: number) {
      const norm = Number(rawNorm);
      return Number.isFinite(norm) ? shell.innerBottomY + itemHalfH + norm * (1.2 - itemHalfH * 2) : null;
    },
    resolveBoxDrawerSpan: () => null,
    args: {
      App: {},
      input,
      createBoard: (...args: unknown[]) => {
        const board: ShelfBoard = {
          args,
          userData: {},
          castShadow: true,
          receiveShadow: true,
          renderOrder: 0,
        };
        boards.push(board);
        return board;
      },
      group: {},
      woodThick,
      currentShelfMat: { id: 'shelf' },
      currentBraceShelfMat: { id: 'brace' },
      bodyMat: {},
      getPartMaterial: () => null,
      getPartColorValue: () => null,
      glassMat: { id: 'glass' },
      addShelfPins: (...args: unknown[]) => pins.push(args),
      isFn: (value: unknown) => typeof value === 'function',
    },
  };
  return { context, shell, input, boards, pins, folded, woodThick };
}

function renderShelves(
  harness: ReturnType<typeof createShelfHarness>,
  shelves: Array<Record<string, unknown>>
) {
  harness.shell.box.shelves = shelves;
  renderSketchBoxContentShelves(
    harness.context as unknown as Parameters<typeof renderSketchBoxContentShelves>[0]
  );
}

function removedSideConfig(boxPid: string, sides: Array<'left' | 'right'>, rounded = sides) {
  const removedDoorsMap: Record<string, boolean> = {};
  const roundedFrameSideShelvesMap: Record<string, boolean> = {};
  for (const side of sides) removedDoorsMap[`removed_${boxPid}_side_${side}`] = true;
  for (const side of rounded) roundedFrameSideShelvesMap[`${boxPid}_side_${side}`] = true;
  return { removedDoorsMap, roundedFrameSideShelvesMap };
}

const boardNumber = (board: ShelfBoard, index: number) => Number(board.args[index]);

test('focused shelf renderer preserves variants, owner widths, pins, glass flags, and identity', () => {
  const harness = createShelfHarness();
  renderShelves(harness, [
    { id: 'glass', yNorm: 0.1, variant: 'glass' },
    { id: 'double', yNorm: 0.25, variant: 'double' },
    { id: 'brace', yNorm: 0.4, variant: 'brace' },
    { id: 'regular', yNorm: 0.55, variant: 'regular' },
    { id: 'default', yNorm: 0.7 },
  ]);

  assert.equal(harness.boards.length, 5);
  const [glass, double, brace, regular, defaultShelf] = harness.boards;
  assert.equal(boardNumber(glass, 1), MATERIAL_THICKNESS_POLICY.glassShelf.thicknessM);
  assert.equal(boardNumber(double, 1), Math.max(harness.woodThick, harness.woodThick * 2));
  assert.equal(boardNumber(brace, 1), harness.woodThick);
  assert.equal(boardNumber(regular, 1), harness.woodThick);
  assert.equal(boardNumber(defaultShelf, 1), harness.woodThick);

  const regularWidth = Math.max(
    SKETCH_BOX_SHELF_PREVIEW_POLICY.shelfMinWidthM,
    harness.shell.geometry.innerW - SKETCH_BOX_SHELF_PREVIEW_POLICY.shelfRegularClearanceM
  );
  const braceWidth = Math.max(
    SKETCH_BOX_SHELF_PREVIEW_POLICY.shelfMinWidthM,
    harness.shell.geometry.innerW - SKETCH_BOX_SHELF_PREVIEW_POLICY.shelfBraceClearanceM
  );
  assert.equal(boardNumber(glass, 0), regularWidth);
  assert.equal(boardNumber(double, 0), regularWidth);
  assert.equal(boardNumber(brace, 0), braceWidth);
  assert.equal(boardNumber(regular, 0), regularWidth);
  assert.equal(boardNumber(defaultShelf, 0), regularWidth);
  assert.equal(boardNumber(brace, 2), harness.shell.geometry.innerD);
  assert.equal(boardNumber(regular, 2), harness.shell.regularDepth);
  assert.deepEqual(
    harness.pins.map(call => call[6]),
    [true, true, false, true, true]
  );

  assert.equal(glass.args[6], harness.context.args.glassMat);
  assert.equal(glass.userData.__keepMaterial, true);
  assert.equal(glass.castShadow, false);
  assert.equal(glass.receiveShadow, false);
  assert.equal(glass.renderOrder, 2);
  assert.equal(glass.userData.__wpShelfGroupPartId, SHELF_GROUP_PART_ID);
  assert.equal(glass.userData.__wpShelfIndex, 1);
  assert.equal(glass.userData.__wpShelfVariant, 'glass');
  assert.equal(glass.userData.__wpShelfIsBrace, false);
  assert.equal(defaultShelf.userData.__wpShelfVariant, 'regular');
});

test('focused shelf renderer preserves segment geometry, both clearances, minimum width, and depth override', () => {
  const harness = createShelfHarness({ innerW: 0.08, dividers: [{ id: 'mid', xNorm: 0.5 }] });
  renderShelves(harness, [
    { id: 'left-regular', yNorm: 0.25, xNorm: 0.25, variant: 'regular', depthM: 0.03 },
    { id: 'right-brace', yNorm: 0.5, xNorm: 0.75, variant: 'brace' },
  ]);

  const [regular, brace] = harness.boards;
  const segmentWidth = (harness.shell.geometry.innerW - harness.woodThick) / 2;
  const leftCenter = -harness.shell.geometry.innerW / 2 + segmentWidth / 2;
  const rightCenter = harness.shell.geometry.innerW / 2 - segmentWidth / 2;
  assert.equal(boardNumber(regular, 3), leftCenter);
  assert.equal(boardNumber(brace, 3), rightCenter);
  assert.equal(
    boardNumber(regular, 0),
    Math.max(
      SKETCH_BOX_SHELF_PREVIEW_POLICY.shelfMinWidthM,
      segmentWidth - SKETCH_BOX_SHELF_PREVIEW_POLICY.shelfRegularClearanceM
    )
  );
  assert.equal(
    boardNumber(brace, 0),
    Math.max(
      SKETCH_BOX_SHELF_PREVIEW_POLICY.shelfMinWidthM,
      segmentWidth - SKETCH_BOX_SHELF_PREVIEW_POLICY.shelfBraceClearanceM
    )
  );
  assert.equal(boardNumber(regular, 0), SKETCH_BOX_SHELF_PREVIEW_POLICY.shelfMinWidthM);
  assert.equal(boardNumber(regular, 2), 0.03);
  assert.equal(boardNumber(brace, 2), harness.shell.geometry.innerD);
});

test('focused shelf renderer preserves content clearances and next-shelf folded height', () => {
  const harness = createShelfHarness();
  renderShelves(harness, [
    { id: 'lower', yNorm: 0.2, variant: 'regular' },
    { id: 'upper', yNorm: 0.55, variant: 'double' },
  ]);

  assert.equal(harness.folded.length, 2);
  const lowerBoard = harness.boards[0];
  const upperBoard = harness.boards[1];
  const expectedWidth =
    boardNumber(lowerBoard, 0) - INTERIOR_SHELF_CONTENT_CLEARANCE_POLICY.contentsWidthClearanceM;
  const expectedMaxHeight =
    boardNumber(upperBoard, 4) -
    boardNumber(upperBoard, 1) / 2 -
    (boardNumber(lowerBoard, 4) + boardNumber(lowerBoard, 1) / 2) -
    INTERIOR_SHELF_CONTENT_CLEARANCE_POLICY.contentsHeightClearanceM;
  assert.equal(harness.folded[0][3], expectedWidth);
  assert.equal(harness.folded[0][5], expectedMaxHeight);
  assert.equal(harness.folded[0][6], boardNumber(lowerBoard, 2));
  assert.deepEqual(harness.folded[0][7], {
    showContentsEnabled: true,
    sketchMode: true,
    addOutlines: harness.input.addOutlines,
    cfgSnapshot: harness.input.cfgSnapshot,
  });
});

test('focused shelf renderer preserves removed-side force-brace and left/right/both rounding', () => {
  const boxPid = 'sketch_box_free_0_sbf_rounding';
  const split = createShelfHarness({
    boxPid,
    cfgSnapshot: removedSideConfig(boxPid, ['left', 'right']),
    dividers: [{ id: 'mid', xNorm: 0.5 }],
  });
  renderShelves(split, [
    { id: 'left', yNorm: 0.25, xNorm: 0.25, variant: 'regular' },
    { id: 'right', yNorm: 0.5, xNorm: 0.75, variant: 'regular' },
  ]);
  assert.equal(split.boards[0].userData.__wpShelfIsBrace, true);
  assert.equal(split.boards[1].userData.__wpShelfIsBrace, true);
  assert.deepEqual(split.boards[0].args[8], { shape: 'rounded_shelf', roundedShelfSide: 'left' });
  assert.deepEqual(split.boards[1].args[8], { shape: 'rounded_shelf', roundedShelfSide: 'right' });
  assert.deepEqual(
    split.pins.map(call => call[6]),
    [false, false]
  );

  const full = createShelfHarness({
    boxPid,
    cfgSnapshot: removedSideConfig(boxPid, ['left', 'right']),
  });
  renderShelves(full, [{ id: 'both', yNorm: 0.5, xNorm: 0.5, variant: 'regular' }]);
  assert.equal(full.boards[0].userData.__wpShelfIsBrace, true);
  assert.deepEqual(full.boards[0].args[8], { shape: 'rounded_shelf', roundedShelfSide: 'both' });
});

function createBoundaryShelfHarness(offset: number) {
  const boxPid = 'sketch_box_free_0_sbf_boundary';
  const harness = createShelfHarness({
    boxPid,
    cfgSnapshot: removedSideConfig(boxPid, ['left'], []),
  });
  let centerReads = 0;
  let widthReads = 0;
  const boundaryWidth = 0.02;
  // Stage the reference edge and resolved segment reads so the renderer itself exercises
  // the inclusive policy boundary without adding a production-only geometry hook.
  Object.defineProperty(harness.shell.geometry, 'centerX', {
    configurable: true,
    get() {
      centerReads += 1;
      return centerReads <= 2 ? 0 : boundaryWidth / 2 + offset;
    },
  });
  Object.defineProperty(harness.shell.geometry, 'innerW', {
    configurable: true,
    get() {
      widthReads += 1;
      return widthReads <= 2 ? 0 : boundaryWidth;
    },
  });
  return harness;
}

test('focused shelf renderer keeps the exact removed-edge epsilon boundary inclusive', () => {
  const exact = createBoundaryShelfHarness(SKETCH_BOX_DOOR_PREVIEW_POLICY.doorEdgeEpsilonM);
  renderShelves(exact, [{ id: 'exact', yNorm: 0.5, xNorm: 0.5, variant: 'regular' }]);
  assert.equal(exact.boards[0].userData.__wpShelfIsBrace, true);
  assert.equal(boardNumber(exact.boards[0], 2), exact.shell.geometry.innerD);

  const above = createBoundaryShelfHarness(SKETCH_BOX_DOOR_PREVIEW_POLICY.doorEdgeEpsilonM + Number.EPSILON);
  renderShelves(above, [{ id: 'above', yNorm: 0.5, xNorm: 0.5, variant: 'regular' }]);
  assert.equal(above.boards[0].userData.__wpShelfIsBrace, false);
  assert.equal(boardNumber(above.boards[0], 2), above.shell.regularDepth);
});

type PreviewVector = { x: number; y: number; z: number; set: (x: number, y: number, z: number) => void };
type PreviewNode = {
  parent: PreviewNode | null;
  geometry?: object;
  isGroup?: boolean;
  visible: boolean;
  position: PreviewVector;
  scale: PreviewVector;
  material?: unknown;
  userData: Record<string, unknown>;
  add: (...nodes: PreviewNode[]) => void;
  remove: (node: PreviewNode) => void;
};

function vector(): PreviewVector {
  return {
    x: 0,
    y: 0,
    z: 0,
    set(x, y, z) {
      this.x = x;
      this.y = y;
      this.z = z;
    },
  };
}

function node(isGroup = false): PreviewNode {
  const value: PreviewNode = {
    parent: null,
    ...(isGroup ? { isGroup: true } : { geometry: {} }),
    visible: false,
    position: vector(),
    scale: vector(),
    userData: {},
    add(...nodes) {
      for (const child of nodes) child.parent = value;
    },
    remove(child) {
      if (child.parent === value) child.parent = null;
    },
  };
  return value;
}

function createHoverHarness() {
  const App = {};
  const root = node(true);
  const group = node(true);
  const shelves = [node(), node()];
  const rods = [node(), node()];
  const storage = node();
  const materials = {
    shelf: { id: 'shelf' },
    glass: { id: 'glass' },
    brace: { id: 'brace' },
    rod: { id: 'rod' },
    storage: { id: 'storage' },
    remove: { id: 'remove' },
    lineShelf: { id: 'line-shelf' },
    lineGlass: { id: 'line-glass' },
    lineBrace: { id: 'line-brace' },
    lineRod: { id: 'line-rod' },
    lineStorage: { id: 'line-storage' },
    lineRemove: { id: 'line-remove' },
  };
  for (const mesh of [...shelves, ...rods, storage]) {
    const outline = node();
    mesh.userData.__outline = outline;
  }
  group.add(...shelves, ...rods, storage);
  Object.assign(group.userData, {
    __shelfList: shelves,
    __rodList: rods,
    __storage: storage,
    __matShelf: materials.shelf,
    __matGlass: materials.glass,
    __matBrace: materials.brace,
    __matRod: materials.rod,
    __matStorage: materials.storage,
    __matRemove: materials.remove,
    __lineShelf: materials.lineShelf,
    __lineGlass: materials.lineGlass,
    __lineBrace: materials.lineBrace,
    __lineRod: materials.lineRod,
    __lineStorage: materials.lineStorage,
    __lineRemove: materials.lineRemove,
  });
  root.add(group);
  const cache = new Map<string, unknown>([['interiorLayoutHoverPreview', group]]);
  const previewOps = createBuilderRenderInteriorLayoutHoverPreviewOps({
    app: () => App,
    ops: () => ({}),
    asObject: <T extends object>(value: unknown) =>
      value && typeof value === 'object' && !Array.isArray(value) ? (value as T) : null,
    cacheValue: <T = unknown>(_app: unknown, key: string) => (cache.get(key) as T | undefined) ?? null,
    writeCacheValue: <T = unknown>(_app: unknown, key: string, value: T | null) => {
      cache.set(key, value);
      return value;
    },
    wardrobeGroup: () => root,
    renderOpsHandleCatch: () => {
      throw new Error('unexpected preview catch');
    },
    assertTHREE: () => ({}),
    getThreeMaybe: () => ({}),
  } as unknown as Parameters<typeof createBuilderRenderInteriorLayoutHoverPreviewOps>[0]);
  return { previewOps, group, shelves, rods, storage, materials };
}

function hoverArgs(overrides: Record<string, unknown> = {}) {
  return {
    THREE: {},
    x: 2,
    internalZ: 1,
    internalDepth: 0.8,
    innerW: 1,
    shelfYs: [3],
    rodYs: [4],
    storageBarrier: { y: 5, h: 0.2, z: 6 },
    ...overrides,
  };
}

const outlineOf = (mesh: PreviewNode) => mesh.userData.__outline as PreviewNode;

test('focused hover renderer preserves regular, brace, glass, double, and minimum shelf scales', () => {
  const harness = createHoverHarness();
  const regularResult = harness.previewOps.setInteriorLayoutHoverPreview(hoverArgs());
  assert.equal(regularResult, harness.group);
  assert.equal(harness.group.visible, true);
  assert.equal(harness.shelves[0].visible, true);
  assert.equal(harness.shelves[1].visible, false);
  assert.deepEqual(harness.shelves[0].position, {
    x: 2,
    y: 3,
    z: 1 - 0.8 / 2 + INTERIOR_SHELF_GEOMETRY_POLICY.regularDepthM / 2,
    set: harness.shelves[0].position.set,
  });
  assert.equal(
    harness.shelves[0].scale.x,
    Math.max(
      SKETCH_BOX_SHELF_PREVIEW_POLICY.shelfHoverMinWidthM,
      1 - SKETCH_BOX_SHELF_PREVIEW_POLICY.shelfRegularClearanceM
    )
  );
  assert.equal(harness.shelves[0].scale.y, MATERIAL_THICKNESS_POLICY.wood.thicknessM);
  assert.equal(harness.shelves[0].scale.z, INTERIOR_SHELF_GEOMETRY_POLICY.regularDepthM);
  assert.equal(harness.shelves[0].material, harness.materials.shelf);

  harness.previewOps.setInteriorLayoutHoverPreview(hoverArgs({ shelfVariant: 'brace', woodThick: 0.02 }));
  assert.equal(
    harness.shelves[0].scale.x,
    Math.max(
      SKETCH_BOX_SHELF_PREVIEW_POLICY.shelfHoverMinWidthM,
      1 - SKETCH_BOX_SHELF_PREVIEW_POLICY.shelfBraceClearanceM
    )
  );
  assert.equal(harness.shelves[0].scale.z, 0.8);
  assert.equal(harness.shelves[0].position.z, 1);
  assert.equal(harness.shelves[0].material, harness.materials.brace);

  harness.previewOps.setInteriorLayoutHoverPreview(hoverArgs({ innerW: 0.01 }));
  assert.equal(harness.shelves[0].scale.x, SKETCH_BOX_SHELF_PREVIEW_POLICY.shelfHoverMinWidthM);

  harness.previewOps.setInteriorLayoutHoverPreview(hoverArgs({ shelfVariant: 'glass', woodThick: 0.02 }));
  assert.equal(harness.shelves[0].scale.y, MATERIAL_THICKNESS_POLICY.glassShelf.thicknessM);
  assert.equal(harness.shelves[0].material, harness.materials.glass);

  harness.previewOps.setInteriorLayoutHoverPreview(hoverArgs({ shelfVariant: 'double', woodThick: 0.02 }));
  assert.equal(harness.shelves[0].scale.y, Math.max(0.02, 0.02 * 2));

  harness.previewOps.setInteriorLayoutHoverPreview(hoverArgs({ woodThick: 0.00001 }));
  assert.equal(harness.shelves[0].scale.y, SKETCH_BOX_PREVIEW_CORE_POLICY.minScaleM);
});

test('focused hover renderer preserves rod and storage clamps, dimensions, and wood precedence', () => {
  const harness = createHoverHarness();
  harness.previewOps.setInteriorLayoutHoverPreview(
    hoverArgs({ innerW: 0.01, woodThick: 0.00001, storageBarrier: { y: 5, h: 0.00001, z: 6 } })
  );
  assert.equal(harness.rods[0].visible, true);
  assert.equal(harness.rods[0].position.x, 2);
  assert.equal(harness.rods[0].position.y, 4);
  assert.equal(harness.rods[0].position.z, 1);
  assert.equal(harness.rods[0].scale.x, SKETCH_BOX_ROD_PREVIEW_POLICY.rodMinLengthM);
  assert.equal(harness.rods[0].scale.y, SKETCH_BOX_ROD_PREVIEW_POLICY.rodPreviewHeightM);
  assert.equal(harness.rods[0].scale.z, SKETCH_BOX_ROD_PREVIEW_POLICY.rodPreviewDepthM);
  assert.equal(harness.storage.visible, true);
  assert.equal(harness.storage.scale.x, INTERIOR_STORAGE_BARRIER_POLICY.barrierWidthMinM);
  assert.equal(harness.storage.scale.y, SKETCH_BOX_PREVIEW_CORE_POLICY.minScaleM);
  assert.equal(harness.storage.scale.z, INTERIOR_STORAGE_PREVIEW_POLICY.previewThicknessMinM);

  harness.previewOps.setInteriorLayoutHoverPreview(hoverArgs({ woodThick: 0.02 }));
  assert.equal(
    harness.rods[0].scale.x,
    Math.max(
      SKETCH_BOX_ROD_PREVIEW_POLICY.rodMinLengthM,
      1 - SKETCH_BOX_ROD_PREVIEW_POLICY.rodWidthClearanceM
    )
  );
  assert.equal(
    harness.storage.scale.x,
    Math.max(
      INTERIOR_STORAGE_BARRIER_POLICY.barrierWidthMinM,
      1 - INTERIOR_STORAGE_BARRIER_POLICY.barrierWidthClearanceM
    )
  );
  assert.equal(harness.storage.scale.z, 0.02);
  assert.equal(harness.storage.position.x, 2);
  assert.equal(harness.storage.position.y, 5);
  assert.equal(harness.storage.position.z, 6);
});

test('focused hover renderer preserves invalid geometry, remove/blocked style, and hide cleanup', () => {
  const harness = createHoverHarness();
  const allMeshes = [...harness.shelves, ...harness.rods, harness.storage];
  for (const mesh of allMeshes) {
    mesh.visible = true;
    outlineOf(mesh).visible = true;
  }
  harness.group.visible = true;

  const invalidResult = harness.previewOps.setInteriorLayoutHoverPreview(hoverArgs({ x: undefined }));
  assert.equal(invalidResult, harness.group);
  assert.equal(harness.group.visible, false);
  assert.equal(
    allMeshes.every(mesh => mesh.visible === false),
    true
  );
  assert.equal(
    allMeshes.every(mesh => outlineOf(mesh).visible === false),
    true
  );

  harness.previewOps.setInteriorLayoutHoverPreview(hoverArgs({ op: 'remove' }));
  for (const mesh of [harness.shelves[0], harness.rods[0], harness.storage]) {
    assert.equal(mesh.material, harness.materials.remove);
    assert.equal(outlineOf(mesh).material, harness.materials.lineRemove);
    assert.equal(mesh.visible, true);
    assert.equal(outlineOf(mesh).visible, true);
  }

  harness.previewOps.setInteriorLayoutHoverPreview(hoverArgs({ op: 'blocked' }));
  for (const mesh of [harness.shelves[0], harness.rods[0], harness.storage]) {
    assert.equal(mesh.material, harness.materials.remove);
    assert.equal(outlineOf(mesh).material, harness.materials.lineRemove);
  }

  assert.equal(harness.previewOps.hideInteriorLayoutHoverPreview({}), undefined);
  assert.equal(harness.group.visible, false);
  assert.equal(
    allMeshes.every(mesh => mesh.visible === false),
    true
  );
  assert.equal(
    allMeshes.every(mesh => outlineOf(mesh).visible === false),
    true
  );
  assert.deepEqual(Object.keys(harness.previewOps).sort(), [
    'ensureInteriorLayoutHoverPreview',
    'hideInteriorLayoutHoverPreview',
    'setInteriorLayoutHoverPreview',
  ]);
});
