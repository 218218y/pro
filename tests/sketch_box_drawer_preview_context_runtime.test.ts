import test from 'node:test';
import assert from 'node:assert/strict';

import { DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY } from '../esm/shared/dimensions/drawer_sketch_policy.ts';
import { SKETCH_BOX_DRAWER_PREVIEW_POLICY } from '../esm/shared/dimensions/sketch_box_preview_policy.ts';
import { createSketchBoxExternalDrawersContext } from '../esm/native/builder/render_interior_sketch_boxes_fronts_drawers_context.ts';
import { createSketchExternalDrawerRenderContext } from '../esm/native/builder/render_interior_sketch_drawers_external_context.ts';

type UnknownRecord = Record<string, unknown>;

class FakeMeshStandardMaterial {
  readonly options: UnknownRecord;

  constructor(options: UnknownRecord) {
    this.options = options;
  }
}

const THREE = {
  MeshStandardMaterial: FakeMeshStandardMaterial,
};

const isFn = (value: unknown): value is (...args: unknown[]) => unknown => typeof value === 'function';

function createApp(
  args: {
    drawersArray?: unknown[];
    getMaterial?: (...args: unknown[]) => unknown;
    getMirrorMaterial?: (...args: unknown[]) => unknown;
  } = {}
) {
  const materials: UnknownRecord = {};
  if (args.getMaterial) materials.getMaterial = args.getMaterial;
  if (args.getMirrorMaterial) materials.getMirrorMaterial = args.getMirrorMaterial;
  return {
    render: { drawersArray: args.drawersArray ?? [] },
    services: { builder: { materials } },
  };
}

function createBoxContextArgs(
  overrides: {
    box?: UnknownRecord;
    outerD?: number;
    centerZ?: number;
    frontZ?: number;
    innerBottomY?: number;
    innerTopY?: number;
    woodThick?: number;
    App?: UnknownRecord;
    input?: UnknownRecord;
    THREE?: UnknownRecord | null;
    getPartColorValue?: ((partId: string) => unknown) | null;
    resolvePartMaterial?: (partId: string, fallbackMaterial: unknown) => unknown;
  } = {}
) {
  const drawersArray: unknown[] = [];
  const App = overrides.App ?? createApp({ drawersArray });
  const createInternalDrawerBox = () => 'drawer-box';
  const input = {
    cfgSnapshot: {},
    sketchMode: false,
    createInternalDrawerBox,
    ...(overrides.input ?? {}),
  };
  const group = { id: 'group' };
  const createDoorVisual = () => 'door';
  const resolveBoxDrawerSpan = () => ({ id: 'span' });
  const shell = {
    box: overrides.box ?? { extDrawers: [{ id: 'external' }] },
    geometry: {
      outerD: overrides.outerD ?? 0.4,
      centerZ: overrides.centerZ ?? 0.3,
    },
    innerBottomY: overrides.innerBottomY ?? 0,
    innerTopY: overrides.innerTopY ?? 1,
    frontZ: overrides.frontZ ?? 0.52,
    boxMat: { id: 'shell-material' },
  };
  const frontsArgs = {
    shell,
    resolveBoxDrawerSpan,
    args: {
      App,
      input,
      group,
      woodThick: overrides.woodThick ?? 0.1,
      shelfThick: 0.02,
      moduleIndex: 4,
      moduleKeyStr: 'module-4',
      createDoorVisual,
      THREE: overrides.THREE === undefined ? THREE : overrides.THREE,
      isFn,
      getPartColorValue: overrides.getPartColorValue ?? null,
    },
  };
  const doorStyleMap = Object.assign(Object.create(null), { drawer: 'flat' });
  const resolvePartMaterial =
    overrides.resolvePartMaterial ?? ((_partId: string, fallbackMaterial: unknown) => fallbackMaterial);
  const args = {
    frontsArgs,
    doorStyle: 'profile',
    doorStyleMap,
    resolvePartMaterial,
  };
  return {
    args,
    App,
    drawersArray,
    input,
    group,
    createInternalDrawerBox,
    createDoorVisual,
    resolveBoxDrawerSpan,
    shell,
    doorStyleMap,
    resolvePartMaterial,
  };
}

function createExternalContextArgs(
  overrides: {
    extDrawers?: UnknownRecord[];
    innerW?: number;
    moduleDepth?: number;
    internalDepth?: number;
    effectiveTopY?: number;
    woodThick?: number;
    externalFrontZ?: unknown;
    App?: UnknownRecord;
    input?: UnknownRecord;
    THREE?: UnknownRecord | null;
    bodyMat?: unknown;
    getPartMaterial?: ((partId: string) => unknown) | null;
    getPartColorValue?: ((partId: string) => unknown) | null;
  } = {}
) {
  const drawersArray: unknown[] = [];
  const App = overrides.App ?? createApp({ drawersArray });
  const outlineFn = () => 'outline';
  const input = {
    cfgSnapshot: { doorStyleMap: { drawer_a: 'double_profile' } },
    sketchMode: false,
    doorStyle: 'profile',
    addOutlines: outlineFn,
    createInternalDrawerBox: () => 'drawer-box',
    externalFrontZ: overrides.externalFrontZ,
    ...(overrides.input ?? {}),
  };
  const bodyMat = overrides.bodyMat ?? { id: 'body-material' };
  const args = {
    App,
    input,
    drawers: [],
    extDrawers: overrides.extDrawers ?? [{ id: 'drawer-a' }],
    THREE: overrides.THREE === undefined ? THREE : overrides.THREE,
    group: { id: 'group' },
    effectiveBottomY: 0,
    effectiveTopY: overrides.effectiveTopY ?? 2,
    spanH: 2,
    innerW: overrides.innerW ?? 0.8,
    moduleDepth: overrides.moduleDepth ?? 0.6,
    internalDepth: overrides.internalDepth ?? 0.5,
    internalCenterX: 0.1,
    internalZ: 0.2,
    moduleIndex: 3,
    moduleKeyStr: 'module-3',
    woodThick: overrides.woodThick ?? 0.02,
    shelfThick: 0.018,
    bodyMat,
    currentBraceShelfMat: { id: 'brace' },
    createBoard: () => 'board',
    getPartMaterial: overrides.getPartMaterial ?? null,
    getPartColorValue: overrides.getPartColorValue ?? null,
    moduleDoorFaceSpan: { spanW: 0.7, centerX: 0.05 },
    isFn,
    renderOpsHandleCatch: () => {},
  };
  return { args, App, drawersArray, input, outlineFn, bodyMat };
}

test('createSketchBoxExternalDrawersContext preserves drawer sources, geometry boundaries, and forwarding', () => {
  const empty = createBoxContextArgs({ box: { extDrawers: [], regularExtDrawers: [] } });
  assert.equal(createSketchBoxExternalDrawersContext(empty.args as never), null);

  const regularOnly = createBoxContextArgs({
    box: { extDrawers: [], regularExtDrawers: [{ id: 'regular', count: 2 }] },
  });
  const regularContext = createSketchBoxExternalDrawersContext(regularOnly.args as never);
  assert.ok(regularContext);
  assert.deepEqual(
    regularContext.boxExtDrawers.map(item => item.id),
    ['regular']
  );
  assert.equal(regularContext.boxExtDrawers[0].__wpRegularExternalDrawer, true);

  const combined = createBoxContextArgs({
    box: {
      extDrawers: [{ id: 'explicit-a' }, { id: 'explicit-b' }],
      regularExtDrawers: [{ id: 'regular-c', count: 1 }],
    },
  });
  const context = createSketchBoxExternalDrawersContext(combined.args as never);
  assert.ok(context);
  assert.deepEqual(
    context.boxExtDrawers.map(item => item.id),
    ['explicit-a', 'explicit-b', 'regular-c']
  );
  assert.equal(context.frontsArgs, combined.args.frontsArgs);
  assert.equal(context.doorStyle, combined.args.doorStyle);
  assert.equal(context.doorStyleMap, combined.doorStyleMap);
  assert.equal(context.shell, combined.shell);
  assert.equal(context.resolveBoxDrawerSpan, combined.resolveBoxDrawerSpan);
  assert.equal(context.App, combined.App);
  assert.equal(context.input, combined.input);
  assert.equal(context.group, combined.group);
  assert.equal(context.createDoorVisual, combined.createDoorVisual);
  assert.equal(context.createInternalDrawerBox, combined.createInternalDrawerBox);
  assert.equal(context.drawersArray, combined.drawersArray);
  assert.equal(context.visualT, SKETCH_BOX_DRAWER_PREVIEW_POLICY.drawerPreviewThicknessM);

  for (const [outerD, expected] of [
    [
      DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY.externalPreviewMinDepthM / 2,
      DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY.externalPreviewMinDepthM,
    ],
    [
      DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY.externalPreviewMinDepthM,
      DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY.externalPreviewMinDepthM,
    ],
    [
      DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY.externalPreviewMinDepthM * 2,
      DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY.externalPreviewMinDepthM * 2,
    ],
  ] as const) {
    const candidate = createSketchBoxExternalDrawersContext(createBoxContextArgs({ outerD }).args as never);
    assert.ok(candidate);
    assert.equal(candidate.outerD, expected);
  }

  const explicitFront = createSketchBoxExternalDrawersContext(
    createBoxContextArgs({ frontZ: 0.91, outerD: 0.44, centerZ: 0.2 }).args as never
  );
  assert.equal(explicitFront?.frontZ, 0.91);
  const fallbackFront = createSketchBoxExternalDrawersContext(
    createBoxContextArgs({ frontZ: Number.NaN, outerD: 0.44, centerZ: 0.2 }).args as never
  );
  assert.ok(fallbackFront);
  assert.ok(Math.abs(fallbackFront.frontZ - 0.42) < Number.EPSILON);

  const withoutThree = createBoxContextArgs({ THREE: null });
  assert.equal(createSketchBoxExternalDrawersContext(withoutThree.args as never), null);
});

test('createSketchBoxExternalDrawersContext preserves material resolution, mirror caching, and center clamping', () => {
  const mirrorMaterial = { id: 'mirror' };
  let mirrorCalls = 0;
  let materialFactoryCalls = 0;
  const App = createApp({
    drawersArray: [],
    getMirrorMaterial() {
      mirrorCalls += 1;
      return mirrorMaterial;
    },
    getMaterial() {
      materialFactoryCalls += 1;
      return { id: 'factory-material' };
    },
  });
  const explicitBase = { id: 'explicit-base' };
  const painted = { id: 'painted' };
  const resolvedParts: Array<[string, unknown]> = [];
  const fixture = createBoxContextArgs({
    App,
    input: {
      drawerBoxBaseMat: explicitBase,
      drawerBoxMat: { id: 'secondary-base' },
      whiteMat: { id: 'white-base' },
    },
    getPartColorValue: () => '#123456',
    resolvePartMaterial(partId, fallbackMaterial) {
      resolvedParts.push([partId, fallbackMaterial]);
      return painted;
    },
  });
  const context = createSketchBoxExternalDrawersContext(fixture.args as never);
  assert.ok(context);
  assert.equal(context.resolveDrawerBoxMaterial('drawer_box__painted'), painted);
  assert.deepEqual(resolvedParts, [['drawer_box__painted', explicitBase]]);
  assert.equal(materialFactoryCalls, 0, 'explicit drawer-box base material must precede the factory');
  assert.equal(context.resolveCachedMirrorMaterial(), mirrorMaterial);
  assert.equal(context.resolveCachedMirrorMaterial(), mirrorMaterial);
  assert.equal(mirrorCalls, 1);

  const fallbackCases = [
    [{ drawerBoxMat: { id: 'drawer-box-mat' }, whiteMat: { id: 'white' } }, 'drawer-box-mat'],
    [{ whiteMat: { id: 'white' } }, 'white'],
  ] as const;
  for (const [input, expectedId] of fallbackCases) {
    const candidate = createSketchBoxExternalDrawersContext(
      createBoxContextArgs({ input, getPartColorValue: () => undefined }).args as never
    );
    assert.equal(
      (candidate?.resolveDrawerBoxMaterial('drawer_box__fallback') as UnknownRecord).id,
      expectedId
    );
  }

  let cachedFactoryCalls = 0;
  const factoryFixture = createBoxContextArgs({
    App: createApp({
      getMaterial() {
        cachedFactoryCalls += 1;
        return { id: 'factory' };
      },
    }),
  });
  const factoryContext = createSketchBoxExternalDrawersContext(factoryFixture.args as never);
  assert.equal((factoryContext?.resolveDrawerBoxMaterial('one') as UnknownRecord).id, 'factory');
  assert.equal((factoryContext?.resolveDrawerBoxMaterial('two') as UnknownRecord).id, 'factory');
  assert.equal(cachedFactoryCalls, 1);

  const shellFallback = createSketchBoxExternalDrawersContext(
    createBoxContextArgs({
      App: createApp({
        getMaterial: () => {
          throw new Error('lookup failed');
        },
      }),
    }).args as never
  );
  assert.equal(shellFallback?.resolveDrawerBoxMaterial('drawer_box__shell'), shellFallback?.shell.boxMat);

  const normalClamp = createSketchBoxExternalDrawersContext(
    createBoxContextArgs({ innerBottomY: 0, innerTopY: 1, woodThick: 0.1 }).args as never
  );
  assert.equal(normalClamp?.clampDrawerCenterY(-1, 0.2), 0.1);
  assert.equal(normalClamp?.clampDrawerCenterY(2, 0.2), 0.8);
  const compressedClamp = createSketchBoxExternalDrawersContext(
    createBoxContextArgs({ innerBottomY: 0, innerTopY: 0.15, woodThick: 0.1 }).args as never
  );
  assert.equal(compressedClamp?.clampDrawerCenterY(0.5, 0.2), 0.1);
});

test('createSketchExternalDrawerRenderContext preserves boundary formulas, front state, and forwarding', () => {
  assert.equal(
    createSketchExternalDrawerRenderContext(createExternalContextArgs({ extDrawers: [] }).args as never),
    null
  );
  assert.equal(
    createSketchExternalDrawerRenderContext(createExternalContextArgs({ THREE: null }).args as never),
    null
  );

  for (const [innerW, expected] of [
    [
      DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY.externalPreviewMinWidthM / 2,
      DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY.externalPreviewMinWidthM,
    ],
    [
      DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY.externalPreviewMinWidthM,
      DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY.externalPreviewMinWidthM,
    ],
    [
      DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY.externalPreviewMinWidthM * 2,
      DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY.externalPreviewMinWidthM * 2,
    ],
  ] as const) {
    const candidate = createSketchExternalDrawerRenderContext(
      createExternalContextArgs({ innerW, moduleDepth: 0.5 }).args as never
    );
    assert.equal(candidate?.outerW, expected);
  }

  const positiveDepth = createSketchExternalDrawerRenderContext(
    createExternalContextArgs({ moduleDepth: 0.3, internalDepth: 0.9 }).args as never
  );
  assert.equal(positiveDepth?.outerD, 0.3, 'positive module depth must take priority');
  const zeroDepth = createSketchExternalDrawerRenderContext(
    createExternalContextArgs({ moduleDepth: 0, internalDepth: 0.2 }).args as never
  );
  assert.equal(zeroDepth?.outerD, 0.2 + DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY.externalPreviewDepthClearanceM);
  const negativeDepthBelowMinimum = createSketchExternalDrawerRenderContext(
    createExternalContextArgs({ moduleDepth: -1, internalDepth: 0.01 }).args as never
  );
  assert.equal(
    negativeDepthBelowMinimum?.outerD,
    DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY.externalPreviewMinDepthM
  );

  const fixture = createExternalContextArgs({
    externalFrontZ: 0.77,
    effectiveTopY: 2,
    woodThick: 0.02,
  });
  const context = createSketchExternalDrawerRenderContext(fixture.args as never);
  assert.ok(context);
  assert.equal(context.frontZ, 0.77);
  assert.equal(context.visualT, SKETCH_BOX_DRAWER_PREVIEW_POLICY.drawerPreviewThicknessM);
  assert.equal(context.outlineFn, fixture.outlineFn);
  assert.equal(context.doorStyle, 'profile');
  assert.equal(context.doorStyleMap.drawer_a, 'double_profile');
  assert.equal(context.doorFaceTopY, 2.01);
  assert.equal(context.drawersArray, fixture.drawersArray);
  assert.equal(context.App, fixture.App);
  assert.equal(context.input, fixture.input);
  assert.equal(context.group, fixture.args.group);
  assert.equal(context.extDrawers, fixture.args.extDrawers);
  assert.equal(context.moduleDoorFaceSpan, fixture.args.moduleDoorFaceSpan);

  for (const invalidFrontZ of [undefined, Number.NaN, Number.POSITIVE_INFINITY]) {
    const candidate = createSketchExternalDrawerRenderContext(
      createExternalContextArgs({ externalFrontZ: invalidFrontZ, moduleDepth: 0.4 }).args as never
    );
    assert.equal(candidate?.frontZ, 0.2);
  }
  const nonNegativeFallback = createSketchExternalDrawerRenderContext(
    createExternalContextArgs({ externalFrontZ: undefined, moduleDepth: -1, internalDepth: -0.2 })
      .args as never
  );
  assert.equal(
    nonNegativeFallback?.frontZ,
    DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY.externalPreviewMinDepthM / 2
  );
});

test('createSketchExternalDrawerRenderContext preserves material fallbacks, resilient lookup, and mirror caching', () => {
  const bodyMat = { id: 'body' };
  const mirrorMaterial = { id: 'mirror' };
  let mirrorCalls = 0;
  let factoryCalls = 0;
  const App = createApp({
    getMirrorMaterial() {
      mirrorCalls += 1;
      return mirrorMaterial;
    },
    getMaterial() {
      factoryCalls += 1;
      return { id: 'factory' };
    },
  });
  const explicitBase = { id: 'explicit-base' };
  const painted = { id: 'painted' };
  const fixture = createExternalContextArgs({
    App,
    bodyMat,
    input: { drawerBoxBaseMat: explicitBase },
    getPartColorValue: () => '#abcdef',
    getPartMaterial: partId => (partId === 'drawer_box__painted' ? painted : { id: `part:${partId}` }),
  });
  const context = createSketchExternalDrawerRenderContext(fixture.args as never);
  assert.ok(context);
  assert.equal(context.resolveDrawerBoxMaterial('drawer_box__painted'), painted);
  assert.equal(factoryCalls, 0);
  assert.deepEqual(context.resolvePartMaterial('front'), { id: 'part:front' });
  assert.equal(context.resolveCachedMirrorMaterial(), mirrorMaterial);
  assert.equal(context.resolveCachedMirrorMaterial(), mirrorMaterial);
  assert.equal(mirrorCalls, 1);

  const falseLookup = createSketchExternalDrawerRenderContext(
    createExternalContextArgs({ bodyMat, getPartMaterial: () => null }).args as never
  );
  assert.equal(falseLookup?.resolvePartMaterial('missing'), bodyMat);
  const throwingLookup = createSketchExternalDrawerRenderContext(
    createExternalContextArgs({
      bodyMat,
      getPartMaterial: () => {
        throw new Error('material lookup failed');
      },
    }).args as never
  );
  assert.equal(throwingLookup?.resolvePartMaterial('throwing'), bodyMat);

  let cachedFactoryCalls = 0;
  const factoryContext = createSketchExternalDrawerRenderContext(
    createExternalContextArgs({
      bodyMat,
      App: createApp({
        getMaterial() {
          cachedFactoryCalls += 1;
          return { id: 'factory' };
        },
      }),
    }).args as never
  );
  assert.equal((factoryContext?.resolveDrawerBoxMaterial('one') as UnknownRecord).id, 'factory');
  assert.equal((factoryContext?.resolveDrawerBoxMaterial('two') as UnknownRecord).id, 'factory');
  assert.equal(cachedFactoryCalls, 1);

  const bodyFallback = createSketchExternalDrawerRenderContext(
    createExternalContextArgs({
      bodyMat,
      App: createApp({
        getMaterial() {
          throw new Error('factory failed');
        },
      }),
    }).args as never
  );
  assert.equal(bodyFallback?.resolveDrawerBoxMaterial('drawer_box__body'), bodyMat);
});
