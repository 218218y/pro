import test from 'node:test';
import assert from 'node:assert/strict';

import { addStackSplitDecorativeSeparatorIfNeeded } from '../esm/native/builder/build_stack_split_decorative_separator.ts';
import { prepareStackSplitLowerSetup } from '../esm/native/builder/build_stack_split_lower_setup.ts';

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

test('stack split decorative separator renders an overhanging slab plus front lip as one paint target', () => {
  const calls: unknown[][] = [];
  addStackSplitDecorativeSeparatorIfNeeded(makeArgs(true, calls));

  assert.equal(calls.length, 2);
  assert.equal(calls[0][7], 'stack_split_separator');
  assert.equal(calls[1][7], 'stack_split_separator');
  assert.equal(calls[0][6], 'part-material:stack_split_separator');
  assert.equal(calls[1][6], 'part-material:stack_split_separator');
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

  prepareStackSplitLowerSetup({
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

  assert.equal(renderedOps.length, 1);
  const platforms = renderedOps[0]?.base?.platforms || [];
  assert.equal(platforms.length, 1);
  assert.equal(platforms[0]?.partId, 'lower_base_leg_platform_bottom');
  assert.equal(
    platforms.some((platform: any) => platform?.partId === 'lower_base_leg_platform_top'),
    false
  );
});

test('stack split decorative separator is a no-op while disabled', () => {
  const calls: unknown[][] = [];
  addStackSplitDecorativeSeparatorIfNeeded(makeArgs(false, calls));
  assert.equal(calls.length, 0);
});
