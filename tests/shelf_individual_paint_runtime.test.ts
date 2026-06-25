import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CORNER_SHELF_GROUP_PART_ID,
  SHELF_GROUP_PART_ID,
  createCornerShelfPartId,
  createModuleExternalDrawerBraceShelfPartId,
  createModuleShelfPartId,
  createSketchExternalDrawerBraceShelfPartId,
  createSketchShelfPartId,
  isShelfBoardPartId,
  resolveShelfGroupPartId,
} from '../esm/native/features/shelf_part_identity.ts';
import { createPartMaterialResolver } from '../esm/native/builder/materials_apply_color_policy.ts';
import { readPartColorEntry } from '../esm/native/builder/material_color_lookup.ts';
import { makeMaterialResolver } from '../esm/native/builder/material_resolver.ts';
import { resolvePaintTargetKeys } from '../esm/native/services/canvas_picking_paint_targets.ts';
import { resolvePaintPreviewGroupBox } from '../esm/native/services/canvas_picking_generic_paint_hover_preview.ts';
import { createCornerWingMaterials } from '../esm/native/builder/corner_materials.ts';
import { collectPaintPreviewPartObjects } from '../esm/native/services/canvas_picking_generic_paint_hover_preview_objects.ts';
import { applyExternalDrawersForModule } from '../esm/native/builder/external_drawers_pipeline.ts';

function makeBoxObject(partId: string, kind?: string) {
  return {
    userData: kind ? { partId, __kind: kind } : { partId },
    children: [],
    geometry: {
      parameters: { width: 1, height: 0.04, depth: 0.5 },
      boundingBox: {
        min: { x: -0.5, y: -0.02, z: -0.25 },
        max: { x: 0.5, y: 0.02, z: 0.25 },
      },
    },
    position: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
  };
}

function makeCornerShelfPolicyTestRuntime() {
  const App = {
    deps: {},
    services: {
      builder: {
        renderOps: {
          getCommonMats: () => ({ masoniteMat: 'masonite', whiteMat: 'white', shadowMat: 'shadow' }),
        },
      },
    },
    util: { str: (value: unknown) => String(value ?? '') },
  };
  class MeshBasicMaterial {
    params: unknown;
    constructor(params: unknown) {
      this.params = params;
    }
  }
  const THREE = {
    Group: class {},
    Mesh: class {},
    Vector3: class {},
    BoxGeometry: class {},
    MeshBasicMaterial,
    MeshStandardMaterial: MeshBasicMaterial,
    DoubleSide: 'double-side',
  };
  const getMaterial = (color: unknown, kind = 'front', useTexture = false) =>
    `${kind}:${String(color)}:${useTexture ? 'texture' : 'flat'}`;
  return { App, THREE, getMaterial };
}

test('module and sketch shelves expose stable individual paint part ids', () => {
  const moduleShelf = createModuleShelfPartId('2', 4);
  const lowerShelf = createModuleShelfPartId('lower_1', 3);
  const sketchShelf = createSketchShelfPartId('0', 2);
  const cornerShelf = createCornerShelfPartId('corner cell 1', 3);
  const moduleDrawerShelf = createModuleExternalDrawerBraceShelfPartId('2');
  const sketchDrawerShelf = createSketchExternalDrawerBraceShelfPartId('0', 'drawer stack');
  const sketchBoxDrawerShelf = createSketchExternalDrawerBraceShelfPartId('0', 'drawer stack', 'box 1');

  assert.equal(moduleShelf, 'module_shelf_2_g4');
  assert.equal(lowerShelf, 'module_shelf_lower_1_g3');
  assert.equal(sketchShelf, 'sketch_shelf_0_2');
  assert.equal(cornerShelf, 'corner_shelf_corner_cell_1_g3');
  assert.equal(moduleDrawerShelf, 'module_shelf_2_gexternal_drawers');
  assert.equal(sketchDrawerShelf, 'sketch_shelf_0_external_drawers_drawer_stack');
  assert.equal(sketchBoxDrawerShelf, 'sketch_shelf_0_box_box_1_external_drawers_drawer_stack');
  assert.equal(isShelfBoardPartId(moduleShelf), true);
  assert.equal(isShelfBoardPartId(sketchShelf), true);
  assert.equal(isShelfBoardPartId(cornerShelf), true);
  assert.equal(isShelfBoardPartId(moduleDrawerShelf), true);
  assert.equal(isShelfBoardPartId(sketchDrawerShelf), true);
  assert.equal(isShelfBoardPartId(sketchBoxDrawerShelf), true);
  assert.equal(isShelfBoardPartId(`lower_${cornerShelf}`), true);
  assert.equal(isShelfBoardPartId('corner_pent_int_left_shelf_1'), true);
  assert.equal(isShelfBoardPartId('corner_pent_int_shelf_180'), true);
  assert.equal(isShelfBoardPartId('lower_corner_pent_int_shelf_210'), true);
  assert.equal(resolveShelfGroupPartId('corner_pent_int_left_shelf_1'), CORNER_SHELF_GROUP_PART_ID);
  assert.equal(resolveShelfGroupPartId('corner_pent_int_shelf_180'), CORNER_SHELF_GROUP_PART_ID);
  assert.equal(resolveShelfGroupPartId(moduleDrawerShelf), SHELF_GROUP_PART_ID);
  assert.equal(resolveShelfGroupPartId(sketchDrawerShelf), SHELF_GROUP_PART_ID);
});

test('regular external drawer separator is emitted as an individually paintable brace shelf', () => {
  const boardCalls: unknown[][] = [];
  const board: { userData: Record<string, unknown> } = { userData: {} };
  let appliedOps = 0;
  const App = {
    services: {
      builder: {
        renderOps: {
          applyExternalDrawersOps: () => {
            appliedOps += 1;
          },
        },
      },
    },
  };
  const createBoard = (
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    mat: unknown,
    partId?: unknown
  ) => {
    boardCalls.push([w, h, d, x, y, z, mat, partId]);
    return board as never;
  };

  const ok = applyExternalDrawersForModule({
    App: App as never,
    THREE: {} as never,
    cfg: { wardrobeType: 'hinged' },
    config: {},
    moduleIndex: 2,
    startDoorId: 1,
    externalCenterX: 0,
    externalW: 0.8,
    depth: 0.6,
    startY: 0,
    woodThick: 0.02,
    hasShoe: false,
    regCount: 2,
    bodyMat: 'body-default',
    braceShelfMat: 'brace-default',
    createBoard,
    innerW: 0.8,
    internalDepth: 0.5,
    internalCenterX: 0,
    internalZ: -0.05,
    effectiveBottomY: 0.46,
    getPartColorValue: partId => (partId === SHELF_GROUP_PART_ID ? '#224466' : undefined),
    getPartMaterial: partId => `part-material:${partId}`,
  });

  const shelfPartId = createModuleExternalDrawerBraceShelfPartId(2);
  assert.equal(ok, true);
  assert.equal(appliedOps, 1);
  assert.equal(boardCalls.length, 1);
  assert.equal(boardCalls[0]?.[6], `part-material:${SHELF_GROUP_PART_ID}`);
  assert.equal(boardCalls[0]?.[7], shelfPartId);
  assert.equal(board.userData.partId, shelfPartId);
  assert.equal(board.userData.__wpShelfGroupPartId, SHELF_GROUP_PART_ID);
  assert.equal(board.userData.__wpShelfVariant, 'brace');
  assert.equal(board.userData.__wpShelfIsBrace, true);
});

test('individual shelf color wins, while legacy all_shelves still falls back for old projects', () => {
  const shelfPartId = createModuleShelfPartId('1', 2);
  const inherited = readPartColorEntry({
    individualColors: { [SHELF_GROUP_PART_ID]: '#aaaaaa' },
    isMulti: true,
    partId: shelfPartId,
    stackKey: null,
  });
  assert.equal(inherited, '#aaaaaa');

  const exact = readPartColorEntry({
    individualColors: { [SHELF_GROUP_PART_ID]: '#aaaaaa', [shelfPartId]: '#333333' },
    isMulti: true,
    partId: shelfPartId,
    stackKey: null,
  });
  assert.equal(exact, '#333333');
});

test('corner shelf colors inherit only the legacy corner shelf group when no exact shelf color exists', () => {
  const cornerShelfPartId = createCornerShelfPartId('corner-1', 2);
  const inherited = readPartColorEntry({
    individualColors: { [SHELF_GROUP_PART_ID]: '#aaaaaa', [CORNER_SHELF_GROUP_PART_ID]: '#bbbbbb' },
    isMulti: true,
    partId: cornerShelfPartId,
    stackKey: null,
  });
  assert.equal(inherited, '#bbbbbb');

  const exactLower = readPartColorEntry({
    individualColors: {
      [CORNER_SHELF_GROUP_PART_ID]: '#bbbbbb',
      [`lower_${cornerShelfPartId}`]: '#222222',
    },
    isMulti: true,
    partId: cornerShelfPartId,
    stackKey: 'bottom',
  });
  assert.equal(exactLower, '#222222');
});

test('paint target resolution treats an individual shelf as a single part, not the whole shelf group', () => {
  const shelfPartId = createModuleShelfPartId('0', 5);
  assert.deepEqual(resolvePaintTargetKeys(shelfPartId, 'top'), [shelfPartId]);
});

test('external drawer brace shelf remains a separate click target and thin-board hover preview', () => {
  const shelfPartId = createModuleExternalDrawerBraceShelfPartId('0');
  const board = makeBoxObject(shelfPartId);
  const wardrobeGroup = { children: [board] };

  assert.deepEqual(resolvePaintTargetKeys(shelfPartId, 'top'), [shelfPartId]);
  const preview = resolvePaintPreviewGroupBox({
    App: {} as never,
    wardrobeGroup: wardrobeGroup as never,
    partKeys: [shelfPartId],
    anchorObject: board as never,
    anchorParent: wardrobeGroup as never,
  });

  assert.equal(preview?.kind, 'object_boxes');
  assert.deepEqual(preview?.previewObjects, [board]);
});

test('paint preview for a shelf part ignores shelf pins and brace seams that share the shelf id', () => {
  const shelfPartId = createModuleShelfPartId('0', 2);
  const board = makeBoxObject(shelfPartId);
  const pin = makeBoxObject(shelfPartId, 'shelf_pin');
  const seam = makeBoxObject(shelfPartId, 'brace_seam');
  const wardrobeGroup = { children: [board, pin, seam] };

  const objects = collectPaintPreviewPartObjects({
    App: {} as never,
    wardrobeGroup: wardrobeGroup as never,
    partKeys: [shelfPartId],
  });

  assert.deepEqual(objects, [board]);
});

test('paint hover preview uses object-box mode for individual shelves so thin board hovers stay visible', () => {
  const shelfPartId = createModuleShelfPartId('0', 2);
  const board = makeBoxObject(shelfPartId);
  const wardrobeGroup = { children: [board] };

  const preview = resolvePaintPreviewGroupBox({
    App: {} as never,
    wardrobeGroup: wardrobeGroup as never,
    partKeys: [shelfPartId],
    anchorObject: board as never,
    anchorParent: wardrobeGroup as never,
  });

  assert.equal(preview?.kind, 'object_boxes');
  assert.deepEqual(preview?.previewObjects, [board]);
});

test('brace edge front color mode keeps regular shelves white while brace shelves keep a white shelf with cabinet-colored front edge until individually painted', () => {
  const shelfPartId = createModuleShelfPartId('1', 2);
  const requestedMaterials: string[] = [];
  const getMaterial = (color: string, kind = 'front', useTexture = false) => {
    const key = `${kind}:${color}:${useTexture ? 'texture' : 'flat'}`;
    requestedMaterials.push(key);
    return key;
  };

  const resolveDefault = createPartMaterialResolver({
    ui: { frontColorShelfInheritanceMode: 'brace' },
    cfg: { isMultiColorMode: false },
    getMaterial,
    globalFrontMat: 'front:main',
  });

  assert.equal(
    resolveDefault(shelfPartId, null, { __wpShelfGroupPartId: SHELF_GROUP_PART_ID }),
    'body:#ffffff:flat'
  );
  assert.deepEqual(
    resolveDefault(shelfPartId, null, {
      __wpShelfGroupPartId: SHELF_GROUP_PART_ID,
      __wpShelfIsBrace: true,
    }),
    [
      'body:#ffffff:flat',
      'body:#ffffff:flat',
      'body:#ffffff:flat',
      'body:#ffffff:flat',
      'front:main',
      'body:#ffffff:flat',
    ]
  );

  const resolvePainted = createPartMaterialResolver({
    ui: { frontColorShelfInheritanceMode: 'brace' },
    cfg: { isMultiColorMode: true, individualColors: { [SHELF_GROUP_PART_ID]: '#202020' } },
    getMaterial,
    globalFrontMat: 'front:main',
  });

  assert.equal(
    resolvePainted(shelfPartId, null, { __wpShelfGroupPartId: SHELF_GROUP_PART_ID }),
    'front:#202020:flat'
  );
  assert.ok(requestedMaterials.includes('body:#ffffff:flat'));
});

test('full build material resolver uses the shared shelf and cornice color lookup', () => {
  const requestedMaterials: string[] = [];
  const moduleShelfPartId = createModuleShelfPartId('1', 2);
  const cornerShelfPartId = createCornerShelfPartId('corner-1', 3);
  const resolver = makeMaterialResolver({
    App: {} as never,
    THREE: {} as never,
    cfg: {
      isMultiColorMode: true,
      individualColors: {
        [SHELF_GROUP_PART_ID]: '#202020',
        [CORNER_SHELF_GROUP_PART_ID]: '#303030',
        corner_cornice: '#404040',
        lower_corner_cornice: '#505050',
      },
    },
    getMaterial(color, kind) {
      const material = `${kind}:${String(color)}`;
      requestedMaterials.push(material);
      return material;
    },
    globalFrontMat: 'front:main',
  });

  assert.equal(resolver.getPartColorValue(moduleShelfPartId), '#202020');
  assert.equal(resolver.getPartMaterial(moduleShelfPartId), 'front:#202020');
  assert.equal(resolver.getPartColorValue(cornerShelfPartId), '#303030');
  assert.equal(resolver.getPartMaterial(cornerShelfPartId), 'front:#303030');
  assert.equal(resolver.getPartColorValue('corner_cornice_side_left'), '#404040');
  assert.equal(resolver.getPartMaterial('corner_cornice_side_left'), 'front:#404040');
  assert.equal(resolver.getPartColorValue('lower_corner_cornice_front'), '#505050');
  assert.equal(resolver.getPartMaterial('lower_corner_cornice_front'), 'front:#505050');
  assert.deepEqual(requestedMaterials, ['front:#202020', 'front:#303030', 'front:#404040', 'front:#505050']);
});

test('corner wing shelf material policy keeps regular shelves on the shelf default while brace shelves use the configured front-edge shelf material', () => {
  const { App, THREE, getMaterial } = makeCornerShelfPolicyTestRuntime();
  const mats = createCornerWingMaterials({
    App: App as never,
    THREE: THREE as never,
    ro: null,
    materials: {
      body: 'front:main',
      front: 'front:main',
      defaultShelfMat: 'body:#ffffff:flat',
      braceShelfMat: [
        'body:#ffffff:flat',
        'body:#ffffff:flat',
        'body:#ffffff:flat',
        'body:#ffffff:flat',
        'front:main',
        'body:#ffffff:flat',
      ],
    },
    getMaterial: getMaterial as never,
    cfgSnapshot: { isMultiColorMode: false },
    sketchMode: false,
    readMap: () => ({}),
    stackKey: 'top',
    stackSplitEnabled: false,
  });

  assert.equal(mats.getCornerShelfMat('corner_shelf_cell_1_g2', false), 'body:#ffffff:flat');
  assert.deepEqual(mats.getCornerShelfMat('corner_shelf_cell_1_g2', true), [
    'body:#ffffff:flat',
    'body:#ffffff:flat',
    'body:#ffffff:flat',
    'body:#ffffff:flat',
    'front:main',
    'body:#ffffff:flat',
  ]);
});

test('corner wing shelf group paint still overrides the brace-only shelf defaults', () => {
  const { App, THREE, getMaterial } = makeCornerShelfPolicyTestRuntime();
  const mats = createCornerWingMaterials({
    App: App as never,
    THREE: THREE as never,
    ro: null,
    materials: {
      body: 'front:main',
      front: 'front:main',
      defaultShelfMat: 'body:#ffffff:flat',
      braceShelfMat: 'front:main',
    },
    getMaterial: getMaterial as never,
    cfgSnapshot: { isMultiColorMode: true },
    sketchMode: false,
    readMap: (name: string) =>
      name === 'individualColors' ? { [CORNER_SHELF_GROUP_PART_ID]: '#202020' } : {},
    stackKey: 'top',
    stackSplitEnabled: false,
  });

  assert.equal(mats.getCornerShelfMat('corner_shelf_cell_1_g2', false), 'front:#202020:flat');
  assert.equal(mats.getCornerShelfMat('corner_shelf_cell_1_g2', true), 'front:#202020:flat');
});

test('corner wing materials resolve saved texture paint with explicit texture data', () => {
  const { App, THREE } = makeCornerShelfPolicyTestRuntime();
  const calls: unknown[][] = [];
  const mats = createCornerWingMaterials({
    App: App as never,
    THREE: THREE as never,
    ro: null,
    materials: {
      body: 'front:main',
      front: 'front:main',
      defaultShelfMat: 'body:#ffffff:flat',
      braceShelfMat: 'front:main',
    },
    getMaterial(color: unknown, kind = 'front', useTexture = false, textureDataURL?: unknown) {
      calls.push([color, kind, !!useTexture, textureDataURL ?? null]);
      return `${kind}:${String(color)}:${useTexture ? 'texture' : 'flat'}:${String(textureDataURL ?? '')}`;
    },
    cfgSnapshot: {
      isMultiColorMode: true,
      savedColors: [{ id: 'saved_tex', type: 'texture', value: 'oak', textureData: 'data:saved' }],
    },
    sketchMode: false,
    readMap: (name: string) => (name === 'individualColors' ? { corner_body: 'saved_tex' } : {}),
    stackKey: 'top',
    stackSplitEnabled: false,
  });

  assert.equal(mats.bodyMat, 'front:saved_tex:texture:data:saved');
  assert.deepEqual(calls[0], ['saved_tex', 'front', true, 'data:saved']);
});

test('corner wing materials require a build config snapshot instead of reading live App config', () => {
  const { App, THREE, getMaterial } = makeCornerShelfPolicyTestRuntime();

  assert.throws(
    () =>
      createCornerWingMaterials({
        App: App as never,
        THREE: THREE as never,
        ro: null,
        materials: {
          body: 'front:main',
          front: 'front:main',
        },
        getMaterial: getMaterial as never,
        cfgSnapshot: null as never,
        sketchMode: false,
        readMap: () => ({}),
        stackKey: 'top',
        stackSplitEnabled: false,
      }),
    /cfgSnapshot is required/
  );
});
