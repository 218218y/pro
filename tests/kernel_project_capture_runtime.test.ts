import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

import { createKernelProjectCapture } from '../esm/native/kernel/kernel_project_capture.ts';
import { buildKernelProjectCaptureData } from '../esm/native/kernel/kernel_project_capture_payload.ts';
import { cloneProjectCaptureValue } from '../esm/native/kernel/kernel_project_capture_shared.ts';
import { DEFAULT_HINGED_DOORS } from '../esm/shared/dimensions/wardrobe_defaults.ts';

test('kernel project capture canonicalizes config lists and detaches mutable snapshot slices', () => {
  const savedNotesSource = [{ id: 'n1', blocks: [{ text: 'first' }] }];
  const cyclicMirrorLayout: Record<string, unknown> = { widthCm: 33 };
  cyclicMirrorLayout.self = cyclicMirrorLayout;
  const cfgSource: Record<string, unknown> = {
    wardrobeType: 'hinged',
    doorMountMode: 'inset',
    overlayFrameThicknessCm: '2.4',
    overlayShelfThicknessCm: 1.2,
    insetFrameThicknessCm: 3.6,
    insetShelfThicknessCm: '2.1',
    modulesConfiguration: [{ layout: 'drawers', doors: '2' }, null, { customData: { storage: true } }],
    stackSplitLowerModulesConfiguration: [{ extDrawersCount: '3' }],
    cornerConfiguration: { modulesConfiguration: [{ doors: '5' }] },
    groovesMap: { groove_d1: true, g1: true, drop: 1n },
    roundedFrameSideShelvesMap: { body_left: true, drop: 1n },
    splitDoorsBottomMap: { splitb_d1: true, d1: true, drop: false },
    mirrorLayoutMap: {
      d1: [{ widthCm: '99', heightCm: 99 }],
      d1_full: [{ widthCm: '55', heightCm: 88 }, { widthCm: 0 }],
      d2_full: [cyclicMirrorLayout],
    },
    doorTrimMap: {
      d1: [{ axis: 'horizontal', color: 'black' }],
      d1_full: [{ axis: 'vertical', color: 'gold', span: 'custom', sizeCm: '11' }, { bad: true }],
    },
    preChestState: { dims: { width: 55 }, createdAt: new Date('2024-01-02T03:04:05.000Z') },
    savedColors: ['oak', { id: 'c2', value: '#abc' }, { id: '' }, 1n],
  };

  const capture = createKernelProjectCapture({
    App: { store: { getState: () => ({ config: cfgSource }) } } as never,
    stateKernel: {
      captureConfig: () => cfgSource,
    } as never,
    getUiSnapshot: () => ({
      width: 240,
      height: 260,
      depth: 60,
      doors: 5,
      structureSelect: '[2,2,1]',
      singleDoorPos: 'left',
      raw: {
        width: 240,
        height: 260,
        depth: 60,
        doors: 5,
        structureSelect: '[2,2,1]',
        singleDoorPos: 'left',
      },
    }),
    captureSavedNotes: () => savedNotesSource,
    reportKernelError: () => false,
  });

  const snapshot = capture('persist') as Record<string, any>;

  assert.equal(snapshot.settings.doorMountMode, 'inset');
  assert.equal(Object.prototype.hasOwnProperty.call(snapshot.settings, 'overlayFrameThicknessCm'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(snapshot.settings, 'insetFrameThicknessCm'), false);
  assert.equal(snapshot.overlayFrameThicknessCm, 2.4);
  assert.equal(snapshot.overlayShelfThicknessCm, 1.2);
  assert.equal(snapshot.insetFrameThicknessCm, 3.6);
  assert.equal(snapshot.insetShelfThicknessCm, 2.1);

  assert.equal(snapshot.modulesConfiguration.length, 3);
  assert.equal(snapshot.modulesConfiguration[0].layout, 'drawers');
  assert.equal(snapshot.modulesConfiguration[1].doors, 2);
  assert.equal(snapshot.modulesConfiguration[2].doors, 1);
  assert.equal(snapshot.modulesConfiguration[2].customData.storage, true);

  assert.ok(Array.isArray(snapshot.stackSplitLowerModulesConfiguration));
  assert.equal(snapshot.stackSplitLowerModulesConfiguration[0].extDrawersCount, 3);
  assert.equal(snapshot.cornerConfiguration.layout, 'shelves');
  assert.ok(Array.isArray(snapshot.cornerConfiguration.modulesConfiguration));

  cfgSource.modulesConfiguration = [{ layout: 'mutated', doors: 99 }];
  cfgSource.stackSplitLowerModulesConfiguration = [{ extDrawersCount: 9 }];
  (cfgSource.groovesMap as Record<string, unknown>).groove_d1 = false;
  (cfgSource.roundedFrameSideShelvesMap as Record<string, unknown>).body_left = false;
  ((savedNotesSource[0].blocks as Record<string, unknown>[])[0] as Record<string, unknown>).text = 'mutated';
  ((cfgSource.preChestState as Record<string, unknown>).dims as Record<string, unknown>).width = 99;

  assert.equal(snapshot.modulesConfiguration[0].layout, 'drawers');
  assert.equal(snapshot.stackSplitLowerModulesConfiguration[0].extDrawersCount, 3);
  assert.deepEqual({ ...snapshot.groovesMap }, { groove_d1: true });
  assert.deepEqual({ ...snapshot.roundedFrameSideShelvesMap }, { body_left: true });
  assert.deepEqual({ ...snapshot.splitDoorsBottomMap }, { splitb_d1: true });
  assert.deepEqual(
    { ...snapshot.mirrorLayoutMap },
    { d1_full: [{ widthCm: 55, heightCm: 88 }], d2_full: [{ widthCm: 33 }] }
  );
  assert.equal('d1' in snapshot.mirrorLayoutMap, false);
  assert.equal(Array.isArray(snapshot.doorTrimMap.d1_full), true);
  assert.equal(snapshot.doorTrimMap.d1_full.length, 2);
  assert.equal(snapshot.doorTrimMap.d1_full[0].axis, 'vertical');
  assert.equal(snapshot.doorTrimMap.d1_full[0].color, 'gold');
  assert.equal(snapshot.doorTrimMap.d1_full[0].span, 'custom');
  assert.equal(snapshot.doorTrimMap.d1_full[0].sizeCm, 11);
  assert.equal('d1' in snapshot.doorTrimMap, false);
  assert.deepEqual(snapshot.savedColors, ['oak', { id: 'c2', value: '#abc' }]);
  assert.equal(
    ((snapshot.savedNotes[0].blocks as Record<string, unknown>[])[0] as Record<string, unknown>).text,
    'first'
  );
  assert.equal(
    ((snapshot.preChestState as Record<string, unknown>).dims as Record<string, unknown>).width,
    55
  );
});

test('kernel project capture omits absent optional finite numbers instead of serializing undefined', () => {
  const capture = createKernelProjectCapture({
    App: { store: { getState: () => ({ config: {} }) } } as never,
    stateKernel: {
      captureConfig: () => ({}),
    } as never,
    getUiSnapshot: () => ({
      raw: {
        width: 240,
        height: 240,
        depth: 55,
        doors: 6,
        stackSplitLowerDepthManual: false,
        stackSplitLowerWidthManual: false,
        stackSplitLowerDoorsManual: false,
      },
    }),
    captureSavedNotes: () => [],
    reportKernelError: () => false,
  });

  const snapshot = capture('persist') as Record<string, any>;

  assert.equal(Object.prototype.hasOwnProperty.call(snapshot.settings, 'stackSplitLowerHeight'), false);
  assert.equal(snapshot.settings.stackSplitLowerDepth, 55);
  assert.equal(snapshot.settings.stackSplitLowerWidth, 240);
  assert.equal(snapshot.settings.stackSplitLowerDoors, 6);
  assert.equal(Object.prototype.hasOwnProperty.call(snapshot.chestSettings, 'mirrorHeightCm'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(snapshot.chestSettings, 'mirrorWidthCm'), false);
});

test('kernel project capture persists positive wardrobe doors while chest build state keeps zero doors', () => {
  const capture = createKernelProjectCapture({
    App: { store: { getState: () => ({ config: {} }) } } as never,
    stateKernel: {
      captureConfig: () => ({ preChestState: { doors: 5, width: 180, height: 240, depth: 55 } }),
    } as never,
    getUiSnapshot: () => ({
      isChestMode: true,
      baseType: 'legs',
      raw: {
        width: 130,
        height: 95,
        depth: 45,
        doors: 0,
        chestDrawersCount: 4,
      },
    }),
    captureSavedNotes: () => [],
    reportKernelError: () => false,
  });

  const snapshot = capture('persist') as Record<string, any>;

  assert.equal(snapshot.toggles.chestMode, true);
  assert.equal(snapshot.settings.doors, 5);
  assert.equal(snapshot.settings.width, 130);
  assert.equal(snapshot.settings.height, 95);
  assert.equal(snapshot.settings.depth, 45);
  assert.equal(snapshot.chestSettings.drawersCount, 4);

  const fallbackCapture = createKernelProjectCapture({
    App: { store: { getState: () => ({ config: {} }) } } as never,
    stateKernel: {
      captureConfig: () => ({ preChestState: null }),
    } as never,
    getUiSnapshot: () => ({
      isChestMode: true,
      raw: {
        width: 130,
        height: 95,
        depth: 45,
        doors: 0,
        chestDrawersCount: 4,
      },
    }),
    captureSavedNotes: () => [],
    reportKernelError: () => false,
  });

  const fallbackSnapshot = fallbackCapture('persist') as Record<string, any>;
  assert.equal(fallbackSnapshot.settings.doors, DEFAULT_HINGED_DOORS);
});

test('kernel project capture rejects top-level-only UI dimensions before serialization', () => {
  const reports: unknown[] = [];
  const capture = createKernelProjectCapture({
    App: {} as never,
    stateKernel: {
      captureConfig: () => ({}),
    } as never,
    getUiSnapshot: () => ({
      width: 240,
      height: 260,
      depth: 60,
      doors: 5,
    }),
    captureSavedNotes: () => [],
    reportKernelError: (_App, err, ctx) => {
      reports.push({ err, ctx });
      return false;
    },
  });

  assert.throws(() => capture('persist'), /Project capture requires essential UI fields/);
  assert.equal(reports.length, 1);
});

test('kernel project capture cloning preserves valid branches when unsupported leaves are not JSON-stringifiable', () => {
  const cyclic: Record<string, unknown> = { widthCm: 21 };
  cyclic.self = cyclic;
  const cloned = cloneProjectCaptureValue(
    {
      ok: { nested: true },
      badBigInt: 1n,
      cyclic,
      when: new Date('2024-01-02T03:04:05.000Z'),
      list: ['keep', 2n, cyclic],
    },
    null
  ) as Record<string, unknown> | null;

  assert.deepEqual(cloned, {
    ok: { nested: true },
    cyclic: { widthCm: 21 },
    when: '2024-01-02T03:04:05.000Z',
    list: ['keep', null, { widthCm: 21 }],
  });
});

test('kernel project capture payload preserves exact persisted key order and serialization fingerprint', () => {
  const uiRec = {
    raw: {
      width: 240,
      height: 260,
      depth: 60,
      doors: 5,
      chestDrawersCount: 4,
      stackSplitLowerDepthManual: false,
      stackSplitLowerWidthManual: false,
      stackSplitLowerDoorsManual: false,
    },
  };
  const payload = buildKernelProjectCaptureData({
    uiRec,
    rawAny: uiRec.raw,
    cfgRec: {},
    savedNotes: [],
  });

  assert.deepEqual(Object.keys(payload), [
    'settings',
    'toggles',
    'chestSettings',
    'modulesConfiguration',
    'stackSplitLowerModulesConfiguration',
    'cornerConfiguration',
    'groovesMap',
    'grooveLinesCountMap',
    'grooveLayoutMap',
    'splitDoorsMap',
    'splitDoorsBottomMap',
    'removedDoorsMap',
    'roundedFrameSideShelvesMap',
    'drawerDividersMap',
    'individualColors',
    'doorSpecialMap',
    'doorStyleMap',
    'mirrorLayoutMap',
    'savedColors',
    'handlesMap',
    'hingeMap',
    'curtainMap',
    'doorTrimMap',
    'preChestState',
    'overlayFrameThicknessCm',
    'overlayShelfThicknessCm',
    'insetFrameThicknessCm',
    'insetShelfThicknessCm',
    'grooveLinesCount',
    'isLibraryMode',
    'savedNotes',
    'projectName',
  ]);
  assert.deepEqual(Object.keys(payload.settings as Record<string, unknown>), [
    'doors',
    'width',
    'height',
    'depth',
    'baseType',
    'shoeDrawerAutoBasePreviousType',
    'baseLegStyle',
    'baseLegColor',
    'baseLegPlatformMode',
    'baseLegPlatformSideMode',
    'basePlinthHeightCm',
    'baseLegHeightCm',
    'baseLegWidthCm',
    'slidingTracksColor',
    'doorStyle',
    'corniceType',
    'color',
    'customColor',
    'structureSelection',
    'wardrobeType',
    'doorMountMode',
    'boardMaterial',
    'isManualWidth',
    'singleDoorPos',
    'globalHandleType',
    'cornerWidth',
    'cornerSide',
    'cornerDoors',
    'cornerHeight',
    'cornerDepth',
    'stackSplitEnabled',
    'stackSplitDecorativeSeparatorEnabled',
    'stackSplitLowerDepthManual',
    'stackSplitLowerWidthManual',
    'stackSplitLowerDoorsManual',
    'stackSplitLowerDepth',
    'stackSplitLowerWidth',
    'stackSplitLowerDoors',
  ]);
  assert.deepEqual(Object.keys(payload.toggles as Record<string, unknown>), [
    'sketchMode',
    'multiColor',
    'chestMode',
    'chestCommode',
    'cornerMode',
    'removeDoors',
    'splitDoors',
    'grooves',
    'internalDrawers',
    'handleControl',
    'showHanger',
    'showContents',
    'hingeDirection',
    'showDimensions',
    'addCornice',
    'notesEnabled',
    'globalClickMode',
    'lightingControl',
    'lightAmb',
    'lightDir',
    'lightX',
    'lightY',
    'lightZ',
  ]);
  assert.deepEqual(Object.keys(payload.chestSettings as Record<string, unknown>), [
    'drawersCount',
    'commodeEnabled',
    'mirrorWidthManual',
  ]);
  for (const key of [
    'overlayFrameThicknessCm',
    'overlayShelfThicknessCm',
    'insetFrameThicknessCm',
    'insetShelfThicknessCm',
  ]) {
    assert.equal(payload[key], null);
    assert.equal(Object.prototype.hasOwnProperty.call(payload.settings, key), false);
  }

  const serialized = JSON.stringify(payload);
  assert.equal(serialized.length, 2021);
  assert.equal(
    createHash('sha256').update(serialized).digest('hex'),
    'c01e3a7202691bf93150501bcb1c9d5888ebf7d67a7281985120f16567db4436'
  );
});

test('kernel project capture preserves chest door precedence and exact thickness normalization', () => {
  const build = (
    doors: unknown,
    isChestMode: boolean,
    preChestState: unknown,
    thicknesses: Record<string, unknown> = {}
  ) => {
    const raw = {
      width: 130,
      height: 95,
      depth: 45,
      doors,
      chestDrawersCount: 4,
    };
    return buildKernelProjectCaptureData({
      uiRec: { isChestMode, raw },
      rawAny: raw,
      cfgRec: { preChestState, ...thicknesses },
      savedNotes: [],
    });
  };

  assert.equal((build(0, false, { doors: 9 }).settings as Record<string, unknown>).doors, 0);
  assert.equal((build(7.9, true, { doors: 5.9 }).settings as Record<string, unknown>).doors, 5);
  assert.equal((build(7.9, true, { doors: '6' }).settings as Record<string, unknown>).doors, 7);
  assert.equal(
    (build(0, true, { doors: Number.POSITIVE_INFINITY }).settings as Record<string, unknown>).doors,
    4
  );

  const normalized = build(4, false, null, {
    overlayFrameThicknessCm: 0.39,
    overlayShelfThicknessCm: 1.85,
    insetFrameThicknessCm: 8.1,
    insetShelfThicknessCm: 'bad',
  });
  assert.equal(normalized.overlayFrameThicknessCm, 0.4);
  assert.equal(normalized.overlayShelfThicknessCm, 1.9);
  assert.equal(normalized.insetFrameThicknessCm, 8);
  assert.equal(normalized.insetShelfThicknessCm, null);
  for (const key of [
    'overlayFrameThicknessCm',
    'overlayShelfThicknessCm',
    'insetFrameThicknessCm',
    'insetShelfThicknessCm',
  ]) {
    assert.equal(Object.prototype.hasOwnProperty.call(normalized.settings, key), false);
  }
});
