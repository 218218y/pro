import test from 'node:test';
import assert from 'node:assert/strict';

import { makeDrawerBoxPartId } from '../esm/native/features/drawer_box_identity.ts';
import { buildChestOnly } from '../esm/native/builder/visuals_chest_mode.ts';
import {
  createChestModePartMaterialResolver,
  createChestModePartColorValueResolver,
  resolveChestModeBodyMaterialState,
  resolveChestModeDrawerBoxMaterial,
  resolveChestModeMaterialPalette,
} from '../esm/native/builder/visuals_chest_mode_materials.ts';
import { resolveChestModeBuildInputs } from '../esm/native/builder/visuals_chest_mode_inputs.ts';
import {
  CARCASS_BASE_DIMENSIONS,
  CHEST_MODE_DIMENSIONS,
  MATERIAL_DIMENSIONS,
} from '../esm/shared/wardrobe_dimension_tokens_shared.ts';

class FakeVector3 {
  x: number;
  y: number;
  z: number;
  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
  set(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  }
}

class FakeObject3D {
  children: any[] = [];
  position = new FakeVector3();
  rotation = {};
  scale = {};
  userData: Record<string, unknown> = {};
  add(child: unknown) {
    this.children.push(child);
    return child;
  }
  remove(child: unknown) {
    this.children = this.children.filter(entry => entry !== child);
  }
}

class FakeGroup extends FakeObject3D {}
class FakeMesh extends FakeObject3D {
  geometry: unknown;
  material: unknown;
  renderOrder = 0;
  constructor(geometry: unknown, material: unknown) {
    super();
    this.geometry = geometry;
    this.material = material;
  }
}
class FakeBoxGeometry {
  type = 'BoxGeometry';
  args: number[];
  constructor(...args: number[]) {
    this.args = args;
  }
}
class FakeCylinderGeometry {
  type = 'CylinderGeometry';
  args: number[];
  constructor(...args: number[]) {
    this.args = args;
  }
}
class FakeMaterial {
  userData: Record<string, unknown> = {};
  opts: Record<string, unknown>;
  constructor(opts: Record<string, unknown> = {}) {
    this.opts = opts;
  }
}
class FakeMeshStandardMaterial extends FakeMaterial {}
class FakeMeshBasicMaterial extends FakeMaterial {}

function createChestCfg(overrides: Record<string, unknown> = {}) {
  return {
    showDimensions: true,
    isMultiColorMode: true,
    individualColors: { chest_drawer_1: 'mirror' },
    savedColors: [{ id: 'saved_tex', type: 'texture', value: 'oak', textureData: 'data:saved' }],
    ...overrides,
  };
}

function assertChestDimensionScales(
  actual: unknown[],
  expectedKinds: Array<'total' | 'segment'>,
  message: string
) {
  const expected = expectedKinds.map(kind =>
    kind === 'total'
      ? CHEST_MODE_DIMENSIONS.dimensionGuideTextScale.total
      : CHEST_MODE_DIMENSIONS.dimensionGuideTextScale.segment
  );
  assert.deepEqual(actual, expected, message);
}

function createChestApp(opts: { createDoorVisual?: (...args: any[]) => unknown } = {}) {
  const dimensionCalls: any[] = [];
  const outlined: unknown[] = [];
  let renderCalls = 0;
  let updateCalls = 0;
  const wardrobeGroup = new FakeGroup();
  const App: any = {
    services: {
      builder: {
        modules: opts.createDoorVisual ? { createDoorVisual: opts.createDoorVisual } : {},
        contents: {},
        materials: {
          getMaterial(color: unknown, part: unknown, useTexture?: unknown) {
            return { color, part, useTexture: !!useTexture };
          },
          getMirrorMaterial() {
            return { mirror: true };
          },
        },
        renderOps: {
          addOutlines(mesh: unknown) {
            outlined.push(mesh);
          },
          addDimensionLine(...args: unknown[]) {
            dimensionCalls.push(args);
          },
        },
      },
      platform: {
        getBuildUI() {
          return {
            baseType: 'legs',
            baseLegStyle: 'square',
            baseLegColor: 'nickel',
            baseLegHeightCm: 16,
            baseLegWidthCm: 6,
            colorChoice: '#cccccc',
            customColor: '#00ff00',
            raw: {
              width: 160,
              height: 90,
              depth: 45,
              chestDrawersCount: 3,
              chestCommodeMirrorHeightCm: 100,
              chestCommodeMirrorWidthCm: 160,
            },
          };
        },
      },
    },
    deps: {
      THREE: {
        Group: FakeGroup,
        Mesh: FakeMesh,
        BoxGeometry: FakeBoxGeometry,
        CylinderGeometry: FakeCylinderGeometry,
        MeshStandardMaterial: FakeMeshStandardMaterial,
        MeshBasicMaterial: FakeMeshBasicMaterial,
        Vector3: FakeVector3,
      },
    },
    render: {
      wardrobeGroup,
      drawersArray: [],
      renderer: {
        render() {
          renderCalls += 1;
        },
      },
      scene: { name: 'scene' },
      camera: { name: 'camera' },
      controls: {
        update() {
          updateCalls += 1;
        },
      },
    },
    store: {
      getState() {
        return {
          config: {
            ...createChestCfg(),
          },
          ui: {},
          runtime: {},
          mode: {},
          meta: {},
        };
      },
    },
  };
  App.__outlineRenderPolicy = {
    sketchMode: true,
    addOutlines(mesh: unknown) {
      outlined.push(mesh);
    },
  };
  return {
    App,
    wardrobeGroup,
    dimensionCalls,
    outlined,
    getRenderCalls: () => renderCalls,
    getUpdateCalls: () => updateCalls,
  };
}

test('visuals chest mode input/material helpers normalize chest-only UI and texture state', () => {
  const { App } = createChestApp();
  assert.deepEqual(
    resolveChestModeBuildInputs({
      H: 0.9,
      totalW: 1.6,
      D: 0.45,
      drawersCount: 3,
      baseType: 'legs',
      baseLegStyle: 'square',
      baseLegColor: 'nickel',
      baseLegHeightCm: 16,
      baseLegWidthCm: 6,
      colorChoice: '#cccccc',
      customColor: '#00ff00',
      chestCommodeMirrorHeightCm: 100,
      chestCommodeMirrorWidthCm: 160,
      cfgSnapshot: createChestCfg(),
      renderPolicy: App.__outlineRenderPolicy,
    }),
    {
      H: 0.9,
      totalW: 1.6,
      D: 0.45,
      drawersCount: 3,
      effectiveBaseType: 'legs',
      baseLegStyle: 'square',
      baseLegColor: 'nickel',
      basePlinthHeightCm: 8,
      basePlinthHeightM: 0.08,
      baseLegHeightCm: 16,
      baseLegWidthCm: 6,
      baseLegHeightM: 0.16,
      baseLegPlatformMode: 'stage',
      baseLegPlatformSideMode: 'overhang',
      baseLegPlatformSideOverhangM: CARCASS_BASE_DIMENSIONS.legs.platform.sideOverhangM,
      baseLegPlatformFrontOverhangM: CARCASS_BASE_DIMENSIONS.legs.platform.frontOverhangM,
      baseLegBottomPlatformHeightM: CARCASS_BASE_DIMENSIONS.legs.platform.heightM,
      baseLegTopPlatformHeightM: CARCASS_BASE_DIMENSIONS.legs.platform.heightM,
      colorChoice: '#cccccc',
      customColor: '#00ff00',
      chestCommodeEnabled: false,
      chestCommodeMirrorHeightCm: 100,
      chestCommodeMirrorWidthCm: 160,
      chestCommodeMirrorHeightM: 1,
      chestCommodeMirrorWidthM: 1.6,
      doorStyle: 'flat',
      isGroovesEnabled: false,
    }
  );

  assert.throws(() => resolveChestModeBuildInputs(undefined as never), /build options snapshot is required/);

  assert.throws(
    () =>
      resolveChestModeBuildInputs({
        H: '0.9',
        totalW: 1.6,
        D: 0.45,
        drawersCount: 3,
        cfgSnapshot: createChestCfg(),
        renderPolicy: App.__outlineRenderPolicy,
      } as any),
    /positive finite H is required/
  );

  assert.throws(
    () =>
      resolveChestModeBuildInputs({
        H: 0.9,
        totalW: 1.6,
        D: 0.45,
        drawersCount: '3',
        cfgSnapshot: createChestCfg(),
        renderPolicy: App.__outlineRenderPolicy,
      } as any),
    /positive finite drawersCount is required/
  );

  assert.throws(
    () =>
      resolveChestModeBuildInputs({
        H: 0.9,
        totalW: 1.6,
        D: 0.45,
        drawersCount: 2.5,
        cfgSnapshot: createChestCfg(),
        renderPolicy: App.__outlineRenderPolicy,
      } as any),
    /positive integer drawersCount is required/
  );

  const stringMirrorInputs = resolveChestModeBuildInputs({
    H: 0.9,
    totalW: 1.6,
    D: 0.45,
    drawersCount: 3,
    chestCommodeMirrorHeightCm: '110',
    chestCommodeMirrorWidthCm: '180',
    cfgSnapshot: createChestCfg(),
    renderPolicy: App.__outlineRenderPolicy,
  } as any);
  assert.equal(
    stringMirrorInputs.chestCommodeMirrorHeightCm,
    CHEST_MODE_DIMENSIONS.commode.defaultMirrorHeightCm
  );
  assert.equal(stringMirrorInputs.chestCommodeMirrorWidthCm, 160);

  assert.deepEqual(
    resolveChestModeBodyMaterialState({
      colorChoice: 'custom',
      customColor: '#123456',
      cfg: {} as any,
    }),
    { colorHex: '#123456', useTexture: false, textureDataURL: null }
  );
  assert.deepEqual(
    resolveChestModeBodyMaterialState({
      colorChoice: 'saved_tex',
      customColor: '#123456',
      cfg: {
        savedColors: [{ id: 'saved_tex', type: 'texture', value: 'oak', textureData: 'data:saved' }],
      } as any,
    }),
    { colorHex: 'saved_tex', useTexture: true, textureDataURL: 'data:saved' }
  );

  assert.throws(
    () =>
      resolveChestModeBodyMaterialState({
        colorChoice: '#ffffff',
        customColor: '#ffffff',
      } as any),
    /cfgSnapshot is required/
  );
});

test('visuals chest mode color resolver reads only from the active cfg snapshot', () => {
  const { App } = createChestApp();
  App.store.getState = () => ({
    config: {
      showDimensions: false,
      isMultiColorMode: true,
      individualColors: { chest_drawer_0: '#000000' },
    },
    ui: {},
    runtime: {},
    mode: {},
    meta: {},
  });

  const emptySnapshotResolver = createChestModePartColorValueResolver({
    cfg: createChestCfg({ individualColors: {} }) as any,
  });
  assert.equal(emptySnapshotResolver('chest_drawer_0'), undefined);

  const activeSnapshotResolver = createChestModePartColorValueResolver({
    cfg: createChestCfg({ individualColors: { chest_drawer_0: '#123456' } }) as any,
  });
  assert.equal(activeSnapshotResolver('chest_drawer_0'), '#123456');
});

test('visuals chest mode material palette keeps drawer boxes on independent white body material', () => {
  const calls: any[] = [];
  const palette = resolveChestModeMaterialPalette({
    App: {} as any,
    bodyState: { colorHex: '#445566', useTexture: false, textureDataURL: null },
    legColor: 'nickel',
    cfg: createChestCfg() as any,
    sketchMode: false,
    getMaterial(color: unknown, part: unknown, useTexture?: unknown) {
      const material = { color, part, useTexture: !!useTexture };
      calls.push(material);
      return material as any;
    },
  });

  assert.deepEqual(palette.globalBodyMat, { color: '#445566', part: 'front', useTexture: false });
  assert.deepEqual(palette.drawerBoxMat, { color: '#ffffff', part: 'body', useTexture: false });
  assert.notEqual(palette.drawerBoxMat, palette.globalBodyMat);
  assert.deepEqual(calls[0], { color: '#445566', part: 'front', useTexture: false });
  assert.deepEqual(calls[1], { color: '#ffffff', part: 'body', useTexture: false });
});

test('visuals chest mode part material resolver passes saved texture data explicitly', () => {
  const calls: unknown[][] = [];
  const cfg = createChestCfg({
    individualColors: { chest_drawer_0: 'saved_tex' },
    savedColors: [{ id: 'saved_tex', type: 'texture', value: 'oak', textureData: 'data:saved' }],
  });
  const resolver = createChestModePartMaterialResolver({
    App: {} as any,
    THREE: {} as any,
    globalBodyMat: { id: 'global-body' },
    drawerBoxMat: { id: 'drawer-box' },
    cfg: cfg as any,
    sketchMode: false,
    getMaterial(color: unknown, part: unknown, useTexture?: unknown, textureDataURL?: unknown) {
      const material = { color, part, useTexture: !!useTexture, textureDataURL: textureDataURL ?? null };
      calls.push([color, part, !!useTexture, textureDataURL ?? null]);
      return material as any;
    },
    resolveMirrorMaterial: () => ({ mirror: true }),
  });

  assert.deepEqual(resolver('chest_drawer_0'), {
    color: 'saved_tex',
    part: 'front',
    useTexture: true,
    textureDataURL: 'data:saved',
  });
  assert.deepEqual(calls, [['saved_tex', 'front', true, 'data:saved']]);
});

test('visuals chest mode drawer box material follows only explicit drawer-box paint', () => {
  const globalMat = { id: 'global' };
  const drawerPaintMat = { id: 'drawer-paint' };

  assert.equal(
    resolveChestModeDrawerBoxMaterial({
      globalDrawerBoxMat: globalMat,
      drawerBoxMaterial: drawerPaintMat,
      drawerBoxColorValue: '#123456',
    }),
    drawerPaintMat
  );
  assert.equal(
    resolveChestModeDrawerBoxMaterial({
      globalDrawerBoxMat: globalMat,
      drawerBoxMaterial: { id: 'mirror' },
      drawerBoxColorValue: 'mirror',
    }),
    globalMat
  );
  assert.equal(
    resolveChestModeDrawerBoxMaterial({
      globalDrawerBoxMat: globalMat,
      drawerBoxMaterial: { id: 'glass' },
      drawerBoxColorValue: 'glass',
    }),
    globalMat
  );
});

test('visuals chest mode drawer fronts consume door-special mirror and glass maps', () => {
  const createDoorVisualCalls: any[][] = [];
  const { App } = createChestApp({
    createDoorVisual: (...args: any[]) => {
      createDoorVisualCalls.push(args);
      return new FakeGroup();
    },
  });

  buildChestOnly(App, {
    renderPolicy: App.__outlineRenderPolicy,
    H: 0.9,
    totalW: 1.6,
    D: 0.45,
    drawersCount: 3,
    baseType: 'legs',
    baseLegStyle: 'square',
    baseLegColor: 'nickel',
    baseLegHeightCm: 15,
    baseLegWidthCm: 5,
    colorChoice: '#ffffff',
    doorStyle: 'flat',
    cfgSnapshot: createChestCfg({
      individualColors: {},
      doorSpecialMap: { chest_drawer_0: 'mirror', chest_drawer_1: 'glass' },
      curtainMap: { chest_drawer_1: 'linen' },
      doorStyleMap: { chest_drawer_1: 'double_profile' },
    }),
  });

  assert.equal(createDoorVisualCalls.length, 3);
  assert.equal(createDoorVisualCalls[0][6], true);
  assert.deepEqual(createDoorVisualCalls[0][3], { mirror: true });
  assert.equal(createDoorVisualCalls[0][12], 'chest_drawer_0');
  assert.equal(createDoorVisualCalls[1][4], 'glass');
  assert.equal(createDoorVisualCalls[1][6], false);
  assert.equal(createDoorVisualCalls[1][7], 'linen');
  assert.equal(createDoorVisualCalls[1][12], 'chest_drawer_1');
  assert.equal(createDoorVisualCalls[1][13].glassFrameStyle, 'double_profile');
  assert.equal(createDoorVisualCalls[1][13].renderPolicy, App.__outlineRenderPolicy);
});

test('visuals chest mode build creates wide-leg chest drawers, mirror override, and dimensions via focused owners', () => {
  const { App, wardrobeGroup, dimensionCalls, outlined, getRenderCalls, getUpdateCalls } = createChestApp();
  buildChestOnly(App, {
    renderPolicy: App.__outlineRenderPolicy,
    H: 0.9,
    totalW: 1.6,
    D: 0.45,
    drawersCount: 3,
    baseType: 'legs',
    baseLegStyle: 'round',
    baseLegColor: 'gold',
    baseLegHeightCm: 15,
    baseLegWidthCm: 5,
    colorChoice: '#ffffff',
    cfgSnapshot: createChestCfg(),
  });

  assert.equal(App.render.drawersArray.length, 3);
  assert.equal(dimensionCalls.length, 2);
  assert.equal(getRenderCalls(), 1);
  assert.equal(getUpdateCalls(), 1);

  const legCount = wardrobeGroup.children.filter(
    (child: any) => child?.geometry?.type === 'CylinderGeometry'
  ).length;
  assert.equal(legCount, 6);

  const mirrorDrawer = wardrobeGroup.children.find(
    (child: any) => child?.userData?.partId === 'chest_drawer_1'
  );
  assert.ok(mirrorDrawer);
  assert.deepEqual(mirrorDrawer.children[0].material, { mirror: true });
  const mirrorDrawerBox = mirrorDrawer.children[1];
  assert.deepEqual(
    mirrorDrawerBox.children[0].material,
    { color: '#ffffff', part: 'body', useTexture: false },
    'mirror drawer boxes should keep the independent white drawer-box material instead of becoming mirror material'
  );

  const labels = dimensionCalls.map(call => call[3]);
  assert.deepEqual(labels, ['160', '90']);
  assertChestDimensionScales(
    dimensionCalls.map(call => call[4]),
    ['total', 'total'],
    'chest-only total width and height dimensions should use the compact black total style'
  );
  assert.ok(outlined.length >= 10);
});

test('visuals chest mode builds the rear panel as an inset paintable body board', () => {
  const { App, wardrobeGroup } = createChestApp();
  buildChestOnly(App, {
    renderPolicy: App.__outlineRenderPolicy,
    H: 0.9,
    totalW: 1.6,
    D: 0.45,
    drawersCount: 3,
    baseType: 'legs',
    baseLegStyle: 'square',
    baseLegColor: 'nickel',
    baseLegHeightCm: 15,
    baseLegWidthCm: 5,
    colorChoice: '#cccccc',
    cfgSnapshot: createChestCfg({
      showDimensions: false,
      isMultiColorMode: true,
      individualColors: {
        chest_left: '#224466',
        chest_right: '#224466',
        chest_ceil: '#224466',
        chest_floor: '#224466',
        chest_back: '#224466',
      },
    }),
  });

  const back = wardrobeGroup.children.find((child: any) => child?.userData?.partId === 'chest_back');
  assert.ok(back);

  const baseH = 0.15 + CARCASS_BASE_DIMENSIONS.legs.platform.heightM;
  const thick = MATERIAL_DIMENSIONS.wood.thicknessM;
  const sideH = 0.9 - baseH - 2 * thick;
  assert.deepEqual(back.geometry.args, [
    1.6 - 2 * thick - CARCASS_BASE_DIMENSIONS.chest.backPanelWidthClearanceM,
    sideH - CARCASS_BASE_DIMENSIONS.chest.backPanelHeightClearanceM,
    CARCASS_BASE_DIMENSIONS.chest.backThicknessM,
  ]);
  assert.equal(back.position.y, baseH + thick + sideH / 2);
  assert.equal(back.position.z, -0.45 / 2 + CARCASS_BASE_DIMENSIONS.chest.backInsetM);
  assert.deepEqual(back.material, { color: '#224466', part: 'front', useTexture: false });

  const bottomPlatform = wardrobeGroup.children.find(
    (child: any) => child?.userData?.partId === 'chest_leg_platform_bottom'
  );
  const topPlatform = wardrobeGroup.children.find(
    (child: any) => child?.userData?.partId === 'chest_leg_platform_top'
  );
  assert.ok(bottomPlatform);
  assert.ok(topPlatform);
  assert.equal(
    bottomPlatform.position.z - bottomPlatform.geometry.args[2] / 2,
    -0.45 / 2,
    'chest leg platform should not protrude backward'
  );
});

test('visuals chest mode build adds commode back panel, tracked mirror surface, and commode dimensions', () => {
  const { App, wardrobeGroup, dimensionCalls } = createChestApp();
  buildChestOnly(App, {
    renderPolicy: App.__outlineRenderPolicy,
    H: 0.9,
    totalW: 1.6,
    D: 0.45,
    drawersCount: 3,
    baseType: 'legs',
    baseLegStyle: 'square',
    baseLegColor: 'nickel',
    baseLegHeightCm: 15,
    baseLegWidthCm: 5,
    colorChoice: '#ffffff',
    chestCommodeEnabled: true,
    chestCommodeMirrorHeightCm: 110,
    chestCommodeMirrorWidthCm: 150,
    cfgSnapshot: createChestCfg({ individualColors: {} }),
  });

  const back = wardrobeGroup.children.find((child: any) => child?.userData?.partId === 'chest_commode_back');
  const mirror = wardrobeGroup.children.find(
    (child: any) => child?.userData?.partId === 'chest_commode_mirror'
  );

  assert.ok(back);
  assert.ok(mirror);
  assert.deepEqual(back.geometry.args, [1.5, 1.1, 0.018]);
  assert.equal(Math.round(back.position.z * 1000), -214);
  assert.equal(Math.round(mirror.position.z * 1000), -202);
  assert.equal(mirror.material.mirror, true);
  assert.equal(mirror.userData.__wpMirrorSurface, true);
  assert.equal(App.render.meta.mirrors.includes(mirror), true);

  const labels = dimensionCalls.map(call => call[3]);
  assert.deepEqual(labels, ['160', '150', '90', '110', '200']);
  assertChestDimensionScales(
    dimensionCalls.map(call => call[4]),
    ['total', 'segment', 'segment', 'segment', 'total'],
    'commode total width and combined total height should use the compact black total style; segment dimensions stay blue'
  );
  const heightLines = dimensionCalls.filter(call => call[0].x === call[1].x);
  assert.equal(heightLines.length, 3);
  assert.equal(heightLines[0][0].x < heightLines[2][0].x, true);
});

test('visuals chest mode commode dimensions do not duplicate mirror width when it follows the chest width', () => {
  const { App, dimensionCalls } = createChestApp();
  buildChestOnly(App, {
    renderPolicy: App.__outlineRenderPolicy,
    H: 0.9,
    totalW: 1.6,
    D: 0.45,
    drawersCount: 3,
    baseType: 'legs',
    baseLegStyle: 'square',
    baseLegColor: 'nickel',
    baseLegHeightCm: 15,
    baseLegWidthCm: 5,
    colorChoice: '#ffffff',
    chestCommodeEnabled: true,
    chestCommodeMirrorHeightCm: 110,
    chestCommodeMirrorWidthCm: 160,
    cfgSnapshot: createChestCfg({ individualColors: {} }),
  });

  const labels = dimensionCalls.map(call => call[3]);
  assert.deepEqual(labels, ['160', '90', '110', '200']);
  assertChestDimensionScales(
    dimensionCalls.map(call => call[4]),
    ['total', 'segment', 'segment', 'total'],
    'matching-width commode dimensions should keep chest width and combined height compact-emphasized'
  );
});

test('visuals chest mode build keeps drawer boxes white unless the drawer box is painted directly', () => {
  const { App, wardrobeGroup } = createChestApp();
  const secondDrawerBoxId = makeDrawerBoxPartId('chest_drawer_1');
  App.store.getState = () => ({
    config: {
      showDimensions: false,
      isMultiColorMode: true,
      individualColors: { chest_drawer_0: '#884422', [secondDrawerBoxId]: '#226688' },
    },
    ui: {},
    runtime: {},
    mode: {},
    meta: {},
  });

  buildChestOnly(App, {
    renderPolicy: App.__outlineRenderPolicy,
    H: 0.9,
    totalW: 1.6,
    D: 0.45,
    drawersCount: 2,
    baseType: 'legs',
    baseLegStyle: 'square',
    baseLegColor: 'nickel',
    baseLegHeightCm: 15,
    baseLegWidthCm: 5,
    colorChoice: '#ffffff',
    cfgSnapshot: createChestCfg({
      showDimensions: false,
      isMultiColorMode: true,
      individualColors: { chest_drawer_0: '#884422', [secondDrawerBoxId]: '#226688' },
    }),
  });

  const firstDrawer = wardrobeGroup.children.find(
    (child: any) => child?.userData?.partId === 'chest_drawer_0'
  );
  const secondDrawer = wardrobeGroup.children.find(
    (child: any) => child?.userData?.partId === 'chest_drawer_1'
  );
  assert.ok(firstDrawer);
  assert.ok(secondDrawer);

  const firstDrawerBoxId = makeDrawerBoxPartId('chest_drawer_0');
  const expectedFrontPaintMat = { color: '#884422', part: 'front', useTexture: false };
  const expectedWhiteBoxMat = { color: '#ffffff', part: 'body', useTexture: false };
  const expectedBoxPaintMat = { color: '#226688', part: 'front', useTexture: false };
  assert.deepEqual(firstDrawer.children[0].material, expectedFrontPaintMat);
  assert.deepEqual(firstDrawer.children[1].children[0].material, expectedWhiteBoxMat);
  assert.deepEqual(firstDrawer.children[2].material, expectedWhiteBoxMat);
  assert.equal(firstDrawer.children[1].userData.partId, firstDrawerBoxId);
  assert.equal(firstDrawer.children[2].userData.partId, firstDrawerBoxId);
  assert.deepEqual(secondDrawer.children[1].children[0].material, expectedBoxPaintMat);
  assert.deepEqual(secondDrawer.children[2].material, expectedBoxPaintMat);
  assert.equal(secondDrawer.children[1].userData.partId, secondDrawerBoxId);
});

test('visuals chest mode build routes chest drawer fronts through regular door visual style and groove pipeline', () => {
  const calls: any[] = [];
  const { App, wardrobeGroup } = createChestApp({
    createDoorVisual(
      w: number,
      h: number,
      thickness: number,
      mat: unknown,
      style: unknown,
      hasGrooves: unknown,
      isMirror: unknown,
      curtainType: unknown,
      baseMaterial: unknown,
      frontFaceSign: unknown,
      forceCurtainFix: unknown,
      mirrorLayout: unknown,
      groovePartId: unknown
    ) {
      calls.push({
        w,
        h,
        thickness,
        mat,
        style,
        hasGrooves,
        isMirror,
        curtainType,
        baseMaterial,
        frontFaceSign,
        forceCurtainFix,
        mirrorLayout,
        groovePartId,
      });
      const group = new FakeGroup();
      group.userData = { fromDoorVisualFactory: true };
      const leaf = new FakeMesh(new FakeBoxGeometry(w, h, thickness), mat);
      leaf.userData = { partId: String(groovePartId || '') };
      group.add(leaf);
      return group;
    },
  });
  App.store.getState = () => ({
    config: {
      showDimensions: false,
      isMultiColorMode: true,
      individualColors: {},
      groovesMap: { groove_chest_drawer_0: true },
      doorStyleMap: { chest_drawer_1: 'double_profile' },
    },
    ui: {},
    runtime: {},
    mode: {},
    meta: {},
  });

  buildChestOnly(App, {
    renderPolicy: App.__outlineRenderPolicy,
    H: 0.9,
    totalW: 1.6,
    D: 0.45,
    drawersCount: 2,
    baseType: 'legs',
    baseLegStyle: 'square',
    baseLegColor: 'nickel',
    baseLegHeightCm: 15,
    baseLegWidthCm: 5,
    colorChoice: '#ffffff',
    doorStyle: 'profile',
    isGroovesEnabled: true,
    cfgSnapshot: createChestCfg({
      showDimensions: false,
      isMultiColorMode: true,
      individualColors: {},
      groovesMap: { groove_chest_drawer_0: true },
      doorStyleMap: { chest_drawer_1: 'double_profile' },
    }),
  });

  assert.equal(calls.length, 2);
  assert.equal(calls[0].style, 'profile');
  assert.equal(calls[0].hasGrooves, true);
  assert.equal(calls[0].groovePartId, 'chest_drawer_0');
  assert.equal(calls[1].style, 'double_profile');
  assert.equal(calls[1].hasGrooves, false);
  assert.equal(calls[1].groovePartId, 'chest_drawer_1');

  const firstDrawer = wardrobeGroup.children.find(
    (child: any) => child?.userData?.partId === 'chest_drawer_0'
  );
  assert.ok(firstDrawer);
  const frontVisual = firstDrawer.children[0];
  assert.equal(frontVisual.userData.partId, 'chest_drawer_0');
  assert.equal(typeof frontVisual.userData.__doorWidth, 'number');
  assert.equal(typeof frontVisual.userData.__doorHeight, 'number');
});

test('visuals chest mode renders saved door trims on chest drawer fronts', () => {
  const { App, wardrobeGroup } = createChestApp();
  App.store.getState = () => ({
    config: {
      showDimensions: false,
      isMultiColorMode: false,
      individualColors: {},
      doorTrimMap: {
        chest_drawer_0: [
          {
            id: 'trim_chest_drawer_0_center',
            axis: 'horizontal',
            color: 'gold',
            span: 'half',
            centerXNorm: 0.5,
            centerYNorm: 0.5,
          },
        ],
      },
    },
    ui: {},
    runtime: {},
    mode: {},
    meta: {},
  });

  buildChestOnly(App, {
    renderPolicy: App.__outlineRenderPolicy,
    H: 0.9,
    totalW: 1.6,
    D: 0.45,
    drawersCount: 2,
    baseType: 'legs',
    baseLegStyle: 'square',
    baseLegColor: 'nickel',
    baseLegHeightCm: 15,
    baseLegWidthCm: 5,
    colorChoice: '#ffffff',
    cfgSnapshot: createChestCfg({
      showDimensions: false,
      isMultiColorMode: false,
      individualColors: {},
      doorTrimMap: {
        chest_drawer_0: [
          {
            id: 'trim_chest_drawer_0_center',
            axis: 'horizontal',
            color: 'gold',
            span: 'half',
            centerXNorm: 0.5,
            centerYNorm: 0.5,
          },
        ],
      },
    }),
  });

  const firstDrawer = wardrobeGroup.children.find(
    (child: any) => child?.userData?.partId === 'chest_drawer_0'
  );
  const secondDrawer = wardrobeGroup.children.find(
    (child: any) => child?.userData?.partId === 'chest_drawer_1'
  );
  assert.ok(firstDrawer);
  assert.ok(secondDrawer);

  const trim = firstDrawer.children.find((child: any) => child?.userData?.__wpDoorTrim === true);
  assert.ok(trim, 'expected a trim mesh to be appended to the chest drawer group');
  assert.equal(trim.userData.partId, 'chest_drawer_0');
  assert.equal(trim.userData.__wpDoorTrimId, 'trim_chest_drawer_0_center');
  assert.equal(trim.geometry.args[0], Number(firstDrawer.userData.__doorWidth) * 0.5);
  assert.equal(trim.geometry.args[2], 0.01);
  assert.equal(trim.position.z > Number(firstDrawer.userData.__frontMaxZ), true);
  assert.equal(
    secondDrawer.children.some((child: any) => child?.userData?.__wpDoorTrim === true),
    false
  );
});

test('visuals chest mode applies custom overlay frame thickness to the chest carcass and drawers', () => {
  const { App, wardrobeGroup } = createChestApp();
  App.store.getState = () => ({
    config: {
      showDimensions: false,
      isMultiColorMode: false,
      doorMountMode: 'overlay',
      overlayFrameThicknessCm: 2.6,
      individualColors: {},
    },
    ui: {},
    runtime: {},
    mode: {},
    meta: {},
  });

  buildChestOnly(App, {
    renderPolicy: App.__outlineRenderPolicy,
    H: 0.9,
    totalW: 1.6,
    D: 0.45,
    drawersCount: 2,
    baseType: 'legs',
    baseLegStyle: 'square',
    baseLegColor: 'nickel',
    baseLegHeightCm: 15,
    baseLegWidthCm: 5,
    colorChoice: '#ffffff',
    cfgSnapshot: createChestCfg({
      showDimensions: false,
      isMultiColorMode: false,
      doorMountMode: 'overlay',
      overlayFrameThicknessCm: 2.6,
      individualColors: {},
    }),
  });

  const leftSide = wardrobeGroup.children.find((child: any) => child?.userData?.partId === 'chest_left');
  assert.ok(leftSide);
  assert.ok(Math.abs(leftSide.geometry.args[0] - 0.026) < 1e-9);

  const floor = wardrobeGroup.children.find((child: any) => child?.userData?.partId === 'chest_floor');
  assert.ok(floor);
  assert.ok(Math.abs(floor.geometry.args[1] - 0.026) < 1e-9);

  const firstDrawer = wardrobeGroup.children.find(
    (child: any) => child?.userData?.partId === 'chest_drawer_0'
  );
  assert.ok(firstDrawer);
  assert.ok(Math.abs(Number(firstDrawer.userData.__doorWidth) - (1.6 - 2 * 0.026 - 0.004)) < 1e-9);
  assert.equal(firstDrawer.userData.__frontMaxZ, 0.45 / 2 + 0.018);
});

test('visuals chest mode uses custom inset door mount thickness and sinks drawer fronts inside the frame', () => {
  const { App, wardrobeGroup } = createChestApp();
  App.store.getState = () => ({
    config: {
      showDimensions: false,
      isMultiColorMode: false,
      doorMountMode: 'inset',
      insetFrameThicknessCm: 4.2,
      individualColors: {},
    },
    ui: {},
    runtime: {},
    mode: {},
    meta: {},
  });

  buildChestOnly(App, {
    renderPolicy: App.__outlineRenderPolicy,
    H: 0.9,
    totalW: 1.6,
    D: 0.45,
    drawersCount: 2,
    baseType: 'legs',
    baseLegStyle: 'square',
    baseLegColor: 'nickel',
    baseLegHeightCm: 15,
    baseLegWidthCm: 5,
    colorChoice: '#ffffff',
    cfgSnapshot: createChestCfg({
      showDimensions: false,
      isMultiColorMode: false,
      doorMountMode: 'inset',
      insetFrameThicknessCm: 4.2,
      individualColors: {},
    }),
  });

  const leftSide = wardrobeGroup.children.find((child: any) => child?.userData?.partId === 'chest_left');
  assert.ok(leftSide);
  assert.equal(leftSide.geometry.args[0], 0.042);

  const firstDrawer = wardrobeGroup.children.find(
    (child: any) => child?.userData?.partId === 'chest_drawer_0'
  );
  assert.ok(firstDrawer);
  assert.equal(firstDrawer.userData.__doorWidth, 1.6 - 2 * 0.042 - 0.004);
  assert.equal(firstDrawer.userData.__frontMaxZ, 0.45 / 2 - 0.003);
  const front = firstDrawer.children[0];
  assert.equal(front.position.z, 0.45 / 2 - 0.018 / 2 - 0.003);
  const connector = firstDrawer.children[2];
  const connectorDepth = CARCASS_BASE_DIMENSIONS.chest.connectorDepthM;
  const expectedFrontBackZ = front.position.z - 0.018 / 2;
  assert.equal(
    connector.position.z,
    expectedFrontBackZ - CARCASS_BASE_DIMENSIONS.chest.connectorBackInsetM - connectorDepth / 2
  );
  assert.equal(
    connector.position.z + connectorDepth / 2 <=
      expectedFrontBackZ - CARCASS_BASE_DIMENSIONS.chest.connectorBackInsetM,
    true
  );
});

test('visuals chest mode wheels base creates four compact casters without leg platforms', () => {
  const { App, wardrobeGroup } = createChestApp();
  const inputs = resolveChestModeBuildInputs({
    H: 0.9,
    totalW: 1.2,
    D: 0.45,
    drawersCount: 3,
    baseType: 'legs',
    baseLegStyle: 'wheels',
    baseLegColor: 'black',
    baseLegHeightCm: 15,
    baseLegWidthCm: 5,
    baseLegPlatformMode: 'stage',
    colorChoice: '#ffffff',
    cfgSnapshot: createChestCfg(),
    renderPolicy: App.__outlineRenderPolicy,
  });

  assert.equal(inputs.baseLegStyle, 'wheels');
  assert.equal(inputs.baseLegPlatformMode, 'plain');
  assert.equal(inputs.baseLegBottomPlatformHeightM, 0);
  assert.equal(inputs.baseLegHeightM, CARCASS_BASE_DIMENSIONS.chest.wheels.heightM);

  buildChestOnly(App, {
    renderPolicy: App.__outlineRenderPolicy,
    H: 0.9,
    totalW: 1.2,
    D: 0.45,
    drawersCount: 3,
    baseType: 'legs',
    baseLegStyle: 'wheels',
    baseLegColor: 'black',
    baseLegHeightCm: 15,
    baseLegWidthCm: 5,
    baseLegPlatformMode: 'stage',
    colorChoice: '#ffffff',
    cfgSnapshot: createChestCfg(),
  });

  const wheels = wardrobeGroup.children.filter(
    (child: any) => child?.userData?.__kind === 'chest_caster_wheel'
  );
  const plates = wardrobeGroup.children.filter(
    (child: any) => child?.userData?.__kind === 'chest_caster_plate'
  );
  const forks = wardrobeGroup.children.filter(
    (child: any) => child?.userData?.__kind === 'chest_caster_fork'
  );
  const platforms = wardrobeGroup.children.filter((child: any) =>
    String(child?.userData?.partId || '').startsWith('chest_leg_platform')
  );

  assert.equal(wheels.length, 4);
  assert.equal(plates.length, 4);
  assert.equal(forks.length, 8);
  assert.equal(platforms.length, 0);
  assert.ok(wheels.every((wheel: any) => wheel?.geometry?.type === 'CylinderGeometry'));
});
