import test from 'node:test';
import assert from 'node:assert/strict';

import { addStackSplitDecorativeSeparatorIfNeeded } from '../esm/native/builder/build_stack_split_decorative_separator.ts';
import { prepareStackSplitLowerSetup } from '../esm/native/builder/build_stack_split_lower_setup.ts';
import { CARCASS_INTERIOR_DIMENSIONS } from '../esm/shared/dimensions/carcass_interior_policy.ts';
import { CARCASS_INTERIOR_GRID_POLICY } from '../esm/shared/dimensions/carcass_interior_grid_policy.ts';
import { EDGE_HANDLE_VERTICAL_PLACEMENT_POLICY } from '../esm/shared/dimensions/handle_policy.ts';
import { DEFAULT_STACK_SPLIT_LOWER_HEIGHT } from '../esm/shared/dimensions/stack_split_policy.ts';
import { EXTERNAL_DRAWER_SIZE_POLICY } from '../esm/shared/dimensions/external_drawer_policy.ts';

class FakeMeshBasicMaterial {
  userData: Record<string, unknown> = {};
  constructor(public params: Record<string, unknown>) {
    Object.assign(this, params);
  }
}

class FakeBoxGeometry {
  userData: Record<string, unknown> = {};
  constructor(
    public width: number,
    public height: number,
    public depth: number
  ) {}
}

class FakeMesh {
  children: unknown[] = [];
  userData: Record<string, unknown> = {};
  renderOrder = 0;
  position = {
    x: 0,
    y: 0,
    z: 0,
    set: (x: number, y: number, z: number) => {
      this.position.x = x;
      this.position.y = y;
      this.position.z = z;
    },
  };

  constructor(
    public geometry: unknown,
    public material: unknown
  ) {}

  add(child: unknown) {
    this.children.push(child);
  }
}

const FAKE_THREE = {
  MeshBasicMaterial: FakeMeshBasicMaterial,
  BoxGeometry: FakeBoxGeometry,
  Mesh: FakeMesh,
};

function makeArgs(enabled: boolean, calls: unknown[][]) {
  return {
    buildArgs: {
      App: {},
      THREE: FAKE_THREE,
      sketchMode: false,
      stackSplitDecorativeSeparatorEnabled: enabled,
      createBoard: (...args: unknown[]) => {
        const mesh = new FakeMesh(
          new FakeBoxGeometry(Number(args[0]), Number(args[1]), Number(args[2])),
          args[6]
        );
        mesh.userData = { partId: args[7] };
        calls.push(args.concat(mesh));
        return mesh;
      },
      widthCm: 180,
      lowerWidthCm: 120,
      depthCm: 60,
      lowerDepthCm: 50,
      carcassDepthM: 0.6,
      splitSeamGapM: 0.002,
      bodyMat: 'body-material',
      cfg: { isMultiColorMode: true },
      getPartColorValue: (partId: string) => (partId === 'stack_split_separator' ? 'oak' : null),
      getPartMaterial: (partId: string) => `part-material:${partId}`,
    },
    prepared: {
      bottomWidthCm: 120,
      bottomD: 0.5,
      bottomH: 0.7,
    },
  } as any;
}

function roundGeometryCall(call: unknown[]): number[] {
  return call.slice(0, 6).map(value => Number(Number(value).toFixed(6)));
}

function makeStackSplitLowerSetupArgs(
  options: {
    lowerHeightCm?: number;
    heightCm?: number;
    lowerDepthCm?: number;
    depthCm?: number;
    carcassDepthM?: number;
    unifiedFrame?: boolean;
    hingedOps?: boolean;
    baseTypeBottom?: string;
    basePlinthHeightCm?: number;
    woodThick?: number;
    lowerModuleConfigs?: unknown[];
    cfg?: Record<string, unknown>;
  } = {}
) {
  const wardrobeGroup = { children: [] as unknown[] };
  const renderOps: Record<string, unknown> = {
    applyCarcassOps() {
      return true;
    },
  };
  if (options.hingedOps) {
    renderOps.applyHingedDoorsOps = () => true;
  }
  const lowerModuleConfigs = options.lowerModuleConfigs ?? [{}, {}];
  const cfg = {
    wardrobeType: 'hinged',
    stackSplitLowerModulesConfiguration: lowerModuleConfigs,
    ...options.cfg,
  };
  const App = {
    render: { wardrobeGroup },
    services: { builder: { renderOps } },
  } as any;

  return {
    App,
    THREE: FAKE_THREE,
    state: {},
    ui: { singleDoorPos: 'center' },
    runtime: {},
    cfg,
    label: 'stack-split-lower-focused-test',
    splitSeamGapM: 0.002,
    carcassDepthM: options.carcassDepthM ?? 0.6,
    lowerHeightCm: options.lowerHeightCm,
    lowerDepthCm: options.lowerDepthCm ?? 60,
    lowerWidthCm: 180,
    lowerDoorsCount: Math.max(1, lowerModuleConfigs.length * 2),
    widthCm: 180,
    heightCm: options.heightCm ?? 240,
    depthCm: options.depthCm ?? 60,
    doorsCount: 4,
    chestDrawersCount: 0,
    woodThick: options.woodThick ?? 0.018,
    shelfThick: 0.018,
    depthReduction: 0.07,
    baseTypeBottom: options.baseTypeBottom ?? 'none',
    baseLegStyle: 'round',
    baseLegColor: 'metal',
    baseLegPlatformMode: 'none',
    baseLegPlatformSideMode: 'flush',
    basePlinthHeightCm: options.basePlinthHeightCm ?? 10,
    baseLegHeightCm: 12,
    baseLegWidthCm: 5,
    doorStyle: 'flat',
    stackSplitEnabled: true,
    stackSplitDecorativeSeparatorEnabled: false,
    stackSplitUnifiedFrame: options.unifiedFrame ?? false,
    handleControlEnabled: false,
    showHangerEnabled: false,
    showContentsEnabled: false,
    splitDoors: false,
    isGroovesEnabled: false,
    isInternalDrawersEnabled: false,
    isCornerMode: false,
    sketchMode: false,
    globalClickMode: false,
    hadEditHold: false,
    hasCornice: false,
    colorHex: null,
    useTexture: false,
    textureDataURL: null,
    globalFrontMat: 'front',
    bodyMat: 'body',
    masoniteMat: 'masonite',
    whiteMat: 'white',
    shadowMat: 'shadow',
    legMat: 'leg',
    defaultShelfMat: 'shelf',
    braceShelfMat: 'brace',
    createBoard: () => ({}),
    createDoorVisual: () => ({}),
    createInternalDrawerBox: () => ({}),
    createHandleMesh: () => ({}),
    doorState: {},
    getPartMaterial: (partId: string) => `mat:${partId}`,
    getPartColorValue: () => null,
    getHandleType: () => 'bar',
    isDoorRemoved: () => false,
    isRemoveDoorMode: false,
    removeDoorsEnabled: false,
    getMaterial: () => null,
    addOutlines: null,
    addOutlinesMesh: null,
    buildCornerWing: null,
    addDimensionLine: null,
    restoreNotesFromSave: null,
    addHangingClothes: null,
    addFoldedClothes: null,
    addRealisticHanger: null,
    rebuildDrawerMeta: null,
    pruneCachesSafe: null,
    triggerRender: null,
    showToast: null,
    calculateModuleStructure: () => lowerModuleConfigs.map(() => ({ doors: 2 })),
    notesToPreserve: null,
  } as any;
}

function almostEqual(actual: number, expected: number, epsilon = 1e-9): void {
  assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} should equal ${expected}`);
}

test('stack split decorative separator renders an overhanging slab plus front lip as one paint target', () => {
  const calls: unknown[][] = [];
  addStackSplitDecorativeSeparatorIfNeeded(makeArgs(true, calls));

  assert.equal(calls.length, 2);
  assert.equal(calls[0][7], 'stack_split_separator');
  assert.equal(calls[1][7], 'stack_split_separator');
  assert.equal(calls[0][6], 'part-material:stack_split_separator');
  assert.equal(calls[1][6], 'part-material:stack_split_separator');
  assert.deepEqual(roundGeometryCall(calls[0]), [1.83, 0.039, 0.62, 0, 0.7085, 0.01]);
  assert.deepEqual(roundGeometryCall(calls[1]), [1.83, 0.039, 0.014, 0, 0.7085, 0.314]);
  assert.ok(Number(calls[0][0]) > 1.8, 'separator slab should overhang the wider unit');
  assert.ok(Number(calls[0][2]) > 0.6, 'separator slab should protrude beyond the front depth');
  assert.equal(
    Number(calls[0][5]) - Number(calls[0][2]) / 2,
    -0.3,
    'separator slab should stay flush with the cabinet back and protrude only forward'
  );
  assert.ok(Number(calls[1][5]) > Number(calls[0][5]), 'front lip should sit on the visible/front side');
  assert.ok(Number(calls[1][1]) > 0.038, 'front lip should be tall enough to make the separator visible');
  assert.equal(
    Number(calls[0][1]),
    Number(calls[1][1]),
    'separator slab and front lip should share one uniform visible height'
  );
  const slabBottomY = Number(calls[0][4]) - Number(calls[0][1]) / 2;
  const apronBottomY = Number(calls[1][4]) - Number(calls[1][1]) / 2;
  assert.equal(apronBottomY, slabBottomY, 'front lip should not hang lower than the separator sides');

  const slabMesh = calls[0][8] as FakeMesh;
  const apronMesh = calls[1][8] as FakeMesh;
  assert.equal(slabMesh.children.length, 4, 'separator front face should get a subtle edge accent border');
  assert.equal(apronMesh.children.length, 0, 'front lip itself should not carry a duplicate accent border');
  for (const child of slabMesh.children as FakeMesh[]) {
    assert.equal(child.userData.partId, 'stack_split_separator');
    assert.equal(child.userData.__wpStackSplitSeparatorAccent, true);
    assert.equal(child.userData.__keepMaterial, true);
  }

  const slabWidth = Number(calls[0][0]);
  const slabHeight = Number(calls[0][1]);
  for (const child of slabMesh.children as FakeMesh[]) {
    const geometry = child.geometry as FakeBoxGeometry;
    const reachesHorizontalEdge = Math.abs(child.position.x) + geometry.width / 2 >= slabWidth / 2 - 0.000001;
    const reachesVerticalEdge = Math.abs(child.position.y) + geometry.height / 2 >= slabHeight / 2 - 0.000001;
    assert.ok(
      reachesHorizontalEdge || reachesVerticalEdge,
      'separator accent strips should sit on the outer separator face edges, not as an inset inner rectangle'
    );
  }
});

test('stack split decorative separator uses custom side and front overhang values', () => {
  const calls: unknown[][] = [];
  const args = makeArgs(true, calls) as any;
  args.buildArgs.stackSplitDecorativeSeparatorSideOverhangCm = 4;
  args.buildArgs.stackSplitDecorativeSeparatorFrontOverhangCm = 6;

  addStackSplitDecorativeSeparatorIfNeeded(args);

  assert.equal(calls.length, 2);
  assert.ok(
    Math.abs(Number(calls[0][0]) - 1.88) < 0.000001,
    'custom side overhang should apply to both sides'
  );
  assert.ok(
    Math.abs(Number(calls[0][2]) - 0.66) < 0.000001,
    'custom front overhang should apply to the front'
  );
  assert.ok(Math.abs(Number(calls[0][5]) - (-0.6 / 2 + 0.66 / 2)) < 0.000001);
});

test('decorative stack split lower carcass keeps the bottom leg stage and suppresses the seam top stage', () => {
  const renderedOps: any[] = [];
  const wardrobeGroup = { children: [] as unknown[] };
  const App = {
    render: { wardrobeGroup },
    services: {
      builder: {
        renderOps: {
          applyCarcassOps(ops: unknown) {
            renderedOps.push(ops);
            return true;
          },
        },
      },
    },
  } as any;

  const prepared = prepareStackSplitLowerSetup({
    App,
    THREE: FAKE_THREE,
    state: {},
    ui: { singleDoorPos: 'center' },
    runtime: {},
    cfg: { wardrobeType: 'hinged', stackSplitLowerModulesConfiguration: [{}, {}] },
    label: 'test',
    splitSeamGapM: 0.002,
    carcassDepthM: 0.6,
    lowerHeightCm: 100,
    lowerDepthCm: 60,
    lowerWidthCm: 180,
    lowerDoorsCount: 4,
    widthCm: 180,
    heightCm: 240,
    depthCm: 60,
    doorsCount: 4,
    chestDrawersCount: 0,
    woodThick: 0.018,
    shelfThick: 0.018,
    depthReduction: 0.07,
    baseTypeBottom: 'legs',
    baseLegStyle: 'round',
    baseLegColor: 'metal',
    baseLegPlatformMode: 'stage',
    baseLegPlatformSideMode: 'overhang',
    basePlinthHeightCm: 10,
    baseLegHeightCm: 12,
    baseLegWidthCm: 5,
    doorStyle: 'flat',
    stackSplitEnabled: true,
    stackSplitDecorativeSeparatorEnabled: true,
    stackSplitUnifiedFrame: false,
    handleControlEnabled: false,
    showHangerEnabled: false,
    showContentsEnabled: false,
    splitDoors: false,
    isGroovesEnabled: false,
    isInternalDrawersEnabled: false,
    isCornerMode: false,
    sketchMode: false,
    globalClickMode: false,
    hadEditHold: false,
    hasCornice: false,
    colorHex: null,
    useTexture: false,
    textureDataURL: null,
    globalFrontMat: 'front',
    bodyMat: 'body',
    masoniteMat: 'masonite',
    whiteMat: 'white',
    shadowMat: 'shadow',
    legMat: 'leg',
    defaultShelfMat: 'shelf',
    braceShelfMat: 'brace',
    createBoard: () => ({}),
    createDoorVisual: () => ({}),
    createInternalDrawerBox: () => ({}),
    createHandleMesh: () => ({}),
    doorState: {},
    getPartMaterial: (partId: string) => `mat:${partId}`,
    getPartColorValue: () => null,
    getHandleType: () => 'bar',
    isDoorRemoved: () => false,
    isRemoveDoorMode: false,
    removeDoorsEnabled: false,
    getMaterial: () => null,
    addOutlines: null,
    addOutlinesMesh: null,
    buildCornerWing: null,
    addDimensionLine: null,
    restoreNotesFromSave: null,
    addHangingClothes: null,
    addFoldedClothes: null,
    addRealisticHanger: null,
    rebuildDrawerMeta: null,
    pruneCachesSafe: null,
    triggerRender: null,
    showToast: null,
    calculateModuleStructure: (doorsCount: number) => [{ doors: doorsCount / 2 }, { doors: doorsCount / 2 }],
    notesToPreserve: null,
  } as any);

  const roundGeometry = (value: number): number => Math.round(value * 1_000_000) / 1_000_000;
  assert.deepEqual(
    {
      splitY: roundGeometry(prepared.splitY),
      bottomStartY: roundGeometry(prepared.bottomStartY),
      bottomCabinetBodyHeight: roundGeometry(prepared.bottomCabinetBodyHeight),
      bottomCabinetTopY: roundGeometry(prepared.bottomCabinetTopY),
      bottomInternalDepth: roundGeometry(prepared.bottomInternalDepth),
      bottomInternalZ: roundGeometry(prepared.bottomInternalZ),
      bottomSplitLineY: roundGeometry(prepared.bottomSplitLineY),
    },
    {
      splitY: 1.002,
      bottomStartY: 0.148,
      bottomCabinetBodyHeight: 0.852,
      bottomCabinetTopY: 1,
      bottomInternalDepth: 0.53,
      bottomInternalZ: -0.03,
      bottomSplitLineY: 0.71,
    }
  );

  assert.equal(renderedOps.length, 1);
  const platforms = renderedOps[0]?.base?.platforms || [];
  assert.equal(platforms.length, 1);
  assert.equal(platforms[0]?.partId, 'lower_base_leg_platform_bottom');
  assert.equal(
    platforms.some((platform: any) => platform?.partId === 'lower_base_leg_platform_top'),
    false
  );
});

test('Stack Split Lower preserves explicit heights and clamps invalid defaults to wardrobe height', () => {
  assert.equal(
    prepareStackSplitLowerSetup(makeStackSplitLowerSetupArgs({ lowerHeightCm: 85 })).splitBottomHeightCm,
    85
  );

  for (const lowerHeightCm of [0, -10, Number.NaN, undefined]) {
    const prepared = prepareStackSplitLowerSetup(
      makeStackSplitLowerSetupArgs({ lowerHeightCm, heightCm: 240 })
    );
    assert.equal(prepared.splitBottomHeightCm, DEFAULT_STACK_SPLIT_LOWER_HEIGHT);
  }

  const shortWardrobe = prepareStackSplitLowerSetup(
    makeStackSplitLowerSetupArgs({ lowerHeightCm: 0, heightCm: 42 })
  );
  assert.equal(shortWardrobe.splitBottomHeightCm, 42);
});

test('Stack Split Lower preserves interior depth, back inset, grid ratio, and split geometry', () => {
  const prepared = prepareStackSplitLowerSetup(
    makeStackSplitLowerSetupArgs({
      lowerHeightCm: 100,
      lowerDepthCm: 60,
      carcassDepthM: 0.7,
    })
  );
  almostEqual(prepared.bottomDefaultD, 0.6);
  almostEqual(prepared.bottomD, 0.6);
  almostEqual(prepared.bottomInternalDepth, 0.53);
  almostEqual(
    prepared.bottomInternalZ,
    -prepared.bottomD / 2 + prepared.bottomInternalDepth / 2 + CARCASS_INTERIOR_DIMENSIONS.internalBackInsetM
  );
  almostEqual(prepared.splitDzBottom, -0.05);
  almostEqual(prepared.splitDzTop, 0);
  almostEqual(prepared.splitY, 1.002);

  const internalHeight = prepared.bottomCabinetBodyHeight - 2 * 0.018;
  const expectedGridStep = internalHeight / CARCASS_INTERIOR_GRID_POLICY.divisions;
  almostEqual(
    prepared.bottomSplitLineY,
    prepared.bottomStartY + 0.018 + CARCASS_INTERIOR_GRID_POLICY.drawerSplitLineIndex * expectedGridStep
  );
  almostEqual(
    (prepared.bottomSplitLineY - prepared.bottomStartY - 0.018) / internalHeight,
    CARCASS_INTERIOR_GRID_POLICY.drawerSplitLineIndex / CARCASS_INTERIOR_GRID_POLICY.divisions
  );

  const unified = prepareStackSplitLowerSetup(
    makeStackSplitLowerSetupArgs({ lowerHeightCm: 100, unifiedFrame: true })
  );
  almostEqual(unified.splitY, 1 - 0.018);

  const depthFallback = prepareStackSplitLowerSetup(
    makeStackSplitLowerSetupArgs({ lowerHeightCm: 100, lowerDepthCm: 0, depthCm: 55 })
  );
  almostEqual(depthFallback.bottomDefaultD, 0.55);
  almostEqual(depthFallback.bottomD, 0.55);
});

test('Stack Split Lower handle placement preserves inactive, threshold, lift, and best-effort paths', () => {
  const inactive = prepareStackSplitLowerSetup(
    makeStackSplitLowerSetupArgs({
      lowerHeightCm: 120,
      hingedOps: false,
      lowerModuleConfigs: [{ hasShoeDrawer: true }],
    })
  );
  almostEqual(inactive.lowerGlobalHingedHandleAbsY, EDGE_HANDLE_VERTICAL_PLACEMENT_POLICY.defaultGlobalAbsYM);

  const below = prepareStackSplitLowerSetup(
    makeStackSplitLowerSetupArgs({
      lowerHeightCm: 120,
      hingedOps: true,
      baseTypeBottom: 'plinth',
      basePlinthHeightCm: 60,
      woodThick: 0.099,
      lowerModuleConfigs: [{ hasShoeDrawer: true }],
    })
  );
  almostEqual(below.lowerGlobalHingedHandleAbsY, EDGE_HANDLE_VERTICAL_PLACEMENT_POLICY.defaultGlobalAbsYM);

  const equal = prepareStackSplitLowerSetup(
    makeStackSplitLowerSetupArgs({
      lowerHeightCm: 120,
      hingedOps: true,
      baseTypeBottom: 'plinth',
      basePlinthHeightCm: 60,
      woodThick: 0.1,
      lowerModuleConfigs: [{ hasShoeDrawer: true }],
    })
  );
  almostEqual(
    equal.bottomStartY + 0.1 + EXTERNAL_DRAWER_SIZE_POLICY.shoeHeightM,
    EDGE_HANDLE_VERTICAL_PLACEMENT_POLICY.drawerLiftThresholdYM
  );
  almostEqual(equal.lowerGlobalHingedHandleAbsY, EDGE_HANDLE_VERTICAL_PLACEMENT_POLICY.defaultGlobalAbsYM);

  const longLift = prepareStackSplitLowerSetup(
    makeStackSplitLowerSetupArgs({
      lowerHeightCm: 180,
      hingedOps: true,
      baseTypeBottom: 'plinth',
      basePlinthHeightCm: 10,
      lowerModuleConfigs: [{ hasShoeDrawer: true, extDrawersCount: 4 }],
      cfg: {
        globalHandleType: 'edge',
        handlesMap: { __wp_edge_handle_variant_global: 'long' },
      },
    })
  );
  const maxDoorBottom =
    longLift.bottomStartY +
    0.018 +
    EXTERNAL_DRAWER_SIZE_POLICY.shoeHeightM +
    4 * EXTERNAL_DRAWER_SIZE_POLICY.regularHeightM;
  almostEqual(
    longLift.lowerGlobalHingedHandleAbsY,
    maxDoorBottom +
      EDGE_HANDLE_VERTICAL_PLACEMENT_POLICY.drawerLiftClearanceM +
      EDGE_HANDLE_VERTICAL_PLACEMENT_POLICY.longLiftExtraM
  );

  assert.doesNotThrow(() =>
    prepareStackSplitLowerSetup(
      makeStackSplitLowerSetupArgs({
        lowerHeightCm: 120,
        hingedOps: true,
        lowerModuleConfigs: [null, 'malformed'],
      })
    )
  );
});

test('stack split decorative separator is a no-op while disabled', () => {
  const calls: unknown[][] = [];
  addStackSplitDecorativeSeparatorIfNeeded(makeArgs(false, calls));
  assert.equal(calls.length, 0);
});
