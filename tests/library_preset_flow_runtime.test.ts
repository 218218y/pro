import test from 'node:test';
import assert from 'node:assert/strict';

import {
  captureLibraryPresetPreState,
  ensureLibraryPresetInvariants,
  restoreLibraryPresetPreState,
} from '../esm/native/features/library_preset/library_preset_flow.ts';
import { buildLibraryModuleConfigLists } from '../esm/native/features/library_preset/library_preset_shared.ts';
import type {
  LibraryPresetEnsureArgs,
  LibraryPresetEnv,
  LibraryPresetToggleArgs,
  LibraryPresetUiOverride,
} from '../esm/native/features/library_preset/library_preset_types.ts';

test('library preset flow captures cloned pre-state and restores it through dedicated toggle owner', () => {
  const cfgState: any = {
    modulesConfiguration: [{ doors: 2 }],
    stackSplitLowerModulesConfiguration: [{ doors: 1 }],
    isMultiColorMode: true,
    individualColors: { a: 'oak' },
    curtainMap: { d1_full: 'none' },
    doorSpecialMap: { d1: 'glass' },
    doorStyleMap: { d1: 'flat' },
  };
  const uiState: any = {
    stackSplitEnabled: true,
    raw: {
      stackSplitLowerHeight: 88,
      stackSplitLowerDepth: 55,
      stackSplitLowerWidth: 120,
      stackSplitLowerDoors: 2,
      stackSplitLowerDepthManual: true,
      stackSplitLowerWidthManual: false,
      stackSplitLowerDoorsManual: true,
    },
  };

  const appliedSnapshots: any[] = [];
  const uiCalls: Array<[string, unknown]> = [];
  const recomputes: Array<{ uiOverride: LibraryPresetUiOverride; src: string }> = [];
  const multicolor: Array<{ on: boolean; source?: string }> = [];
  let exitedPaintMode = 0;

  const env: LibraryPresetEnv = {
    history: {
      batch: fn => fn(),
    },
    meta: {
      merge: (meta = {}, defaults = {}, src) => ({ ...defaults, ...meta, source: src || meta.source }),
      noBuild: (meta = {}, src) => ({ ...meta, source: src || meta.source, noBuild: true }),
      noHistory: (meta = {}, src) => ({ ...meta, source: src || meta.source, noHistory: true }),
    },
    config: {
      get: () => cfgState,
      applyProjectSnapshot: (next, meta) => {
        appliedSnapshots.push({ next, meta });
      },
      setModulesConfiguration: () => undefined,
      setLowerModulesConfiguration: () => undefined,
      setLibraryMode: () => undefined,
      setMultiColorMode: () => undefined,
      setIndividualColors: () => undefined,
      setCurtainMap: () => undefined,
      setDoorSpecialMap: () => undefined,
    },
    ui: {
      get: () => uiState,
      setStackSplitEnabled: (on: boolean) => uiCalls.push(['stackSplitEnabled', on]),
      setStackSplitLowerHeight: value => uiCalls.push(['stackSplitLowerHeight', value]),
      setStackSplitLowerDepth: value => uiCalls.push(['stackSplitLowerDepth', value]),
      setStackSplitLowerWidth: value => uiCalls.push(['stackSplitLowerWidth', value]),
      setStackSplitLowerDoors: value => uiCalls.push(['stackSplitLowerDoors', value]),
      setStackSplitLowerDepthManual: on => uiCalls.push(['stackSplitLowerDepthManual', on]),
      setStackSplitLowerWidthManual: on => uiCalls.push(['stackSplitLowerWidthManual', on]),
      setStackSplitLowerDoorsManual: on => uiCalls.push(['stackSplitLowerDoorsManual', on]),
    },
    runStructuralRecompute: (uiOverride, src) => {
      recomputes.push({ uiOverride, src: String(src || '') });
      return undefined;
    },
    multicolor: {
      setEnabled: (on, meta) => {
        multicolor.push({ on, source: meta?.source });
      },
      exitPaintMode: () => {
        exitedPaintMode += 1;
      },
    },
  };

  const preState = captureLibraryPresetPreState(env);
  assert.ok(preState, 'capture should return pre-state');
  cfgState.modulesConfiguration[0].doors = 9;
  cfgState.individualColors.a = 'walnut';
  uiState.raw.stackSplitLowerHeight = 44;

  assert.equal(preState?.cfg.modulesConfiguration?.[0]?.doors, 2);
  assert.equal(preState?.cfg.individualColors.a, 'oak');
  assert.equal(preState?.ui.raw.stackSplitLowerHeight, 88);

  const args: LibraryPresetToggleArgs = {
    isLibraryMode: true,
    wardrobeType: 'hinged',
    doors: 4,
    width: 180,
    height: 240,
    depth: 60,
    stackSplitEnabled: true,
    stackSplitLowerHeight: 88,
    stackSplitLowerDepth: 55,
    stackSplitLowerWidth: 120,
    stackSplitLowerDoors: 2,
    stackSplitLowerDepthManual: true,
    stackSplitLowerWidthManual: false,
    stackSplitLowerDoorsManual: true,
  };

  const restored = restoreLibraryPresetPreState(env, args, (_base, patch) => ({ ...patch }), preState);

  assert.equal(restored, null);
  assert.equal(appliedSnapshots.length, 1, 'restore should apply one config snapshot');
  assert.equal(appliedSnapshots[0].next.isLibraryMode, false);
  assert.deepEqual(appliedSnapshots[0].next.modulesConfiguration, [{ doors: 2 }]);
  assert.deepEqual(appliedSnapshots[0].next.stackSplitLowerModulesConfiguration, [{ doors: 1 }]);
  assert.deepEqual(appliedSnapshots[0].next.individualColors, { a: 'oak' });
  assert.ok(uiCalls.some(([name, value]) => name === 'stackSplitEnabled' && value === true));
  assert.ok(uiCalls.some(([name, value]) => name === 'stackSplitLowerHeight' && value === 88));
  assert.equal(multicolor.length, 1);
  assert.equal(multicolor[0].on, true);
  assert.equal(exitedPaintMode, 0);
  assert.equal(recomputes.length, 1);
  assert.equal(recomputes[0].src, 'react:structure:library:off');
});

test('library preset invariants preserve custom top-door curtains instead of resetting them to none', () => {
  const uiState: any = {
    structureSelect: '',
    singleDoorPos: 'center-right',
  };
  const canonicalCfgs = buildLibraryModuleConfigLists(1, 0, 'hinged', uiState);
  const cfgState: any = {
    modulesConfiguration: canonicalCfgs.topCfgList,
    stackSplitLowerModulesConfiguration: canonicalCfgs.bottomCfgList,
    isMultiColorMode: true,
    individualColors: {},
    curtainMap: { d1_full: 'white' },
    doorSpecialMap: { d1: 'glass', d1_full: 'glass' },
  };

  const configCalls: Array<[string, unknown]> = [];

  const env: LibraryPresetEnv = {
    history: {
      batch: fn => fn(),
    },
    meta: {
      merge: (meta = {}, defaults = {}, src) => ({ ...defaults, ...meta, source: src || meta.source }),
      noBuild: (meta = {}, src) => ({ ...meta, source: src || meta.source, noBuild: true }),
      noHistory: (meta = {}, src) => ({ ...meta, source: src || meta.source, noHistory: true }),
    },
    config: {
      get: () => cfgState,
      applyProjectSnapshot: () => undefined,
      setModulesConfiguration: next => configCalls.push(['modulesConfiguration', next]),
      setLowerModulesConfiguration: next => configCalls.push(['stackSplitLowerModulesConfiguration', next]),
      setLibraryMode: on => configCalls.push(['isLibraryMode', on]),
      setMultiColorMode: on => configCalls.push(['isMultiColorMode', on]),
      setIndividualColors: next => configCalls.push(['individualColors', next]),
      setCurtainMap: next => configCalls.push(['curtainMap', next]),
      setDoorSpecialMap: next => configCalls.push(['doorSpecialMap', next]),
    },
    ui: {
      get: () => uiState,
      setStackSplitEnabled: () => undefined,
      setStackSplitLowerHeight: () => undefined,
      setStackSplitLowerDepth: () => undefined,
      setStackSplitLowerWidth: () => undefined,
      setStackSplitLowerDoors: () => undefined,
      setStackSplitLowerDepthManual: () => undefined,
      setStackSplitLowerWidthManual: () => undefined,
      setStackSplitLowerDoorsManual: () => undefined,
    },
    runStructuralRecompute: () => undefined,
    multicolor: {
      setEnabled: () => undefined,
      exitPaintMode: () => undefined,
    },
  };

  const args: LibraryPresetEnsureArgs = {
    isLibraryMode: true,
    wardrobeType: 'hinged',
    doors: 1,
    stackSplitLowerDoors: 0,
  };

  ensureLibraryPresetInvariants(env, args);

  assert.equal(
    configCalls.some(([name]) => name === 'curtainMap'),
    false,
    'library invariants should not overwrite a custom curtain selection on top glass doors'
  );
});
