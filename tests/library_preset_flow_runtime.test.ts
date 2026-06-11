import test from 'node:test';
import assert from 'node:assert/strict';

import {
  applyLibraryPresetMode,
  captureLibraryPresetPreState,
  ensureLibraryPresetInvariants,
  restoreLibraryPresetPreState,
} from '../esm/native/features/library_preset/library_preset_flow.ts';
import { createLibraryPresetController } from '../esm/native/features/library_preset/library_preset.ts';
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
      setDoors: value => uiCalls.push(['doors', value]),
      setWidth: value => uiCalls.push(['width', value]),
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
    modulesCount: 2,
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

test('library preset mode defaults to 6 upper and lower doors while preserving the pre-library door count for restore', () => {
  const uiState: any = {
    stackSplitEnabled: false,
    structureSelect: '',
    singleDoorPos: 'left',
    raw: {
      doors: 4,
      width: 160,
      height: 240,
      depth: 55,
    },
  };
  const cfgState: any = {
    modulesConfiguration: [{ doors: 2 }, { doors: 2 }],
    stackSplitLowerModulesConfiguration: null,
    isMultiColorMode: false,
    individualColors: {},
    curtainMap: {},
    doorSpecialMap: {},
    doorStyleMap: {},
  };

  const configSnapshots: any[] = [];
  const uiCalls: Array<[string, unknown]> = [];
  const recomputes: Array<{ uiOverride: LibraryPresetUiOverride; src: string }> = [];

  const env: LibraryPresetEnv = {
    history: { batch: fn => fn() },
    meta: {
      merge: (meta = {}, defaults = {}, src) => ({ ...defaults, ...meta, source: src || meta.source }),
      noBuild: (meta = {}, src) => ({ ...meta, source: src || meta.source, noBuild: true }),
      noHistory: (meta = {}, src) => ({ ...meta, source: src || meta.source, noHistory: true }),
    },
    config: {
      get: () => cfgState,
      applyProjectSnapshot: next => {
        configSnapshots.push(next);
        Object.assign(cfgState, next);
      },
      setModulesConfiguration: next => {
        cfgState.modulesConfiguration = next;
      },
      setLowerModulesConfiguration: next => {
        cfgState.stackSplitLowerModulesConfiguration = next;
      },
      setLibraryMode: on => {
        cfgState.isLibraryMode = on;
      },
      setMultiColorMode: on => {
        cfgState.isMultiColorMode = on;
      },
      setIndividualColors: next => {
        cfgState.individualColors = next;
      },
      setCurtainMap: next => {
        cfgState.curtainMap = next;
      },
      setDoorSpecialMap: next => {
        cfgState.doorSpecialMap = next;
      },
    },
    ui: {
      get: () => uiState,
      setDoors: value => {
        uiCalls.push(['doors', value]);
        uiState.raw.doors = value;
      },
      setWidth: value => {
        uiCalls.push(['width', value]);
        uiState.raw.width = value;
      },
      setStackSplitEnabled: on => {
        uiCalls.push(['stackSplitEnabled', on]);
        uiState.stackSplitEnabled = on;
      },
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
    },
    multicolor: {
      setEnabled: () => undefined,
      exitPaintMode: () => undefined,
    },
  };

  const preState = applyLibraryPresetMode(
    env,
    {
      isLibraryMode: false,
      wardrobeType: 'hinged',
      doors: 4,
      width: 160,
      height: 240,
      depth: 55,
      stackSplitEnabled: false,
      stackSplitLowerHeight: 0,
      stackSplitLowerDepth: 0,
      stackSplitLowerWidth: 0,
      stackSplitLowerDoors: 0,
      stackSplitLowerDepthManual: false,
      stackSplitLowerWidthManual: false,
      stackSplitLowerDoorsManual: false,
      modulesCount: 4,
    },
    (_base, patch) => ({ ...patch })
  );

  assert.equal(preState?.ui.raw.doors, 4, 'pre-state keeps the regular wardrobe door count for restore');
  assert.ok(uiCalls.some(([name, value]) => name === 'doors' && value === 6));
  assert.ok(uiCalls.some(([name, value]) => name === 'width' && value === 240));
  assert.ok(uiCalls.some(([name, value]) => name === 'stackSplitLowerDoors' && value === 6));
  assert.ok(uiCalls.some(([name, value]) => name === 'stackSplitLowerWidth' && value === 240));
  assert.ok(uiCalls.some(([name, value]) => name === 'stackSplitLowerWidthManual' && value === false));
  assert.deepEqual(
    configSnapshots[0].modulesConfiguration.map((item: any) => item.doors),
    [2, 2, 2]
  );
  assert.deepEqual(
    configSnapshots[0].stackSplitLowerModulesConfiguration.map((item: any) => item.doors),
    [2, 2, 2]
  );
  assert.equal(recomputes[0].uiOverride.raw?.doors, 6);
  assert.equal(recomputes[0].uiOverride.raw?.width, 240);
  assert.equal(recomputes[0].uiOverride.raw?.stackSplitLowerDoors, 6);
  assert.equal(recomputes[0].uiOverride.raw?.stackSplitLowerWidth, 240);
  assert.equal(recomputes[0].uiOverride.raw?.stackSplitLowerWidthManual, false);
});

test('library preset mode does not reuse stale library width after returning from a wider library', () => {
  const uiState: any = {
    stackSplitEnabled: false,
    structureSelect: '',
    singleDoorPos: 'left',
    raw: {
      doors: 4,
      width: 160,
      height: 240,
      depth: 55,
      stackSplitLowerWidth: 320,
      stackSplitLowerWidthManual: true,
    },
  };
  const cfgState: any = {
    modulesConfiguration: [{ doors: 2 }, { doors: 2 }],
    stackSplitLowerModulesConfiguration: null,
    isMultiColorMode: false,
    individualColors: {},
    curtainMap: {},
    doorSpecialMap: {},
    doorStyleMap: {},
  };

  const uiCalls: Array<[string, unknown]> = [];
  const recomputes: Array<{ uiOverride: LibraryPresetUiOverride; src: string }> = [];

  const env: LibraryPresetEnv = {
    history: { batch: fn => fn() },
    meta: {
      merge: (meta = {}, defaults = {}, src) => ({ ...defaults, ...meta, source: src || meta.source }),
      noBuild: (meta = {}, src) => ({ ...meta, source: src || meta.source, noBuild: true }),
      noHistory: (meta = {}, src) => ({ ...meta, source: src || meta.source, noHistory: true }),
    },
    config: {
      get: () => cfgState,
      applyProjectSnapshot: next => Object.assign(cfgState, next),
      setModulesConfiguration: next => {
        cfgState.modulesConfiguration = next;
      },
      setLowerModulesConfiguration: next => {
        cfgState.stackSplitLowerModulesConfiguration = next;
      },
      setLibraryMode: on => {
        cfgState.isLibraryMode = on;
      },
      setMultiColorMode: on => {
        cfgState.isMultiColorMode = on;
      },
      setIndividualColors: next => {
        cfgState.individualColors = next;
      },
      setCurtainMap: next => {
        cfgState.curtainMap = next;
      },
      setDoorSpecialMap: next => {
        cfgState.doorSpecialMap = next;
      },
    },
    ui: {
      get: () => uiState,
      setDoors: value => {
        uiCalls.push(['doors', value]);
        uiState.raw.doors = value;
      },
      setWidth: value => {
        uiCalls.push(['width', value]);
        uiState.raw.width = value;
      },
      setStackSplitEnabled: on => {
        uiCalls.push(['stackSplitEnabled', on]);
        uiState.stackSplitEnabled = on;
      },
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
    },
    multicolor: {
      setEnabled: () => undefined,
      exitPaintMode: () => undefined,
    },
  };

  applyLibraryPresetMode(
    env,
    {
      isLibraryMode: false,
      wardrobeType: 'hinged',
      doors: 4,
      width: 160,
      height: 240,
      depth: 55,
      stackSplitEnabled: false,
      stackSplitLowerHeight: 0,
      stackSplitLowerDepth: 0,
      stackSplitLowerWidth: 320,
      stackSplitLowerDoors: 8,
      stackSplitLowerDepthManual: false,
      stackSplitLowerWidthManual: true,
      stackSplitLowerDoorsManual: true,
      modulesCount: 4,
    },
    (_base, patch) => ({ ...patch })
  );

  assert.ok(uiCalls.some(([name, value]) => name === 'width' && value === 240));
  assert.ok(uiCalls.some(([name, value]) => name === 'stackSplitLowerWidth' && value === 240));
  assert.ok(uiCalls.some(([name, value]) => name === 'stackSplitLowerWidthManual' && value === false));
  assert.equal(recomputes[0].uiOverride.raw?.width, 240);
  assert.equal(recomputes[0].uiOverride.raw?.stackSplitLowerWidth, 240);
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
      applyProjectSnapshot: (next: any) => {
        if (next && Object.prototype.hasOwnProperty.call(next, 'doorStyleMap')) {
          configCalls.push(['doorStyleMap', next.doorStyleMap]);
          cfgState.doorStyleMap = next.doorStyleMap;
        }
      },
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
      setDoors: () => undefined,
      setWidth: () => undefined,
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
    modulesCount: 1,
  };

  ensureLibraryPresetInvariants(env, args);

  assert.equal(
    configCalls.some(([name]) => name === 'curtainMap'),
    false,
    'library invariants should not overwrite a custom curtain selection on top glass doors'
  );
});

function createInvariantTestEnv(
  cfgState: any,
  uiState: any = {}
): {
  env: LibraryPresetEnv;
  configCalls: Array<[string, unknown]>;
  recomputes: Array<{ uiOverride: LibraryPresetUiOverride; src: string }>;
} {
  const configCalls: Array<[string, unknown]> = [];
  const recomputes: Array<{ uiOverride: LibraryPresetUiOverride; src: string }> = [];

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
      applyProjectSnapshot: (next: any) => {
        if (next && Object.prototype.hasOwnProperty.call(next, 'doorStyleMap')) {
          configCalls.push(['doorStyleMap', next.doorStyleMap]);
          cfgState.doorStyleMap = next.doorStyleMap;
        }
      },
      setModulesConfiguration: next => {
        configCalls.push(['modulesConfiguration', next]);
        cfgState.modulesConfiguration = next;
      },
      setLowerModulesConfiguration: next => {
        configCalls.push(['stackSplitLowerModulesConfiguration', next]);
        cfgState.stackSplitLowerModulesConfiguration = next;
      },
      setLibraryMode: on => configCalls.push(['isLibraryMode', on]),
      setMultiColorMode: on => {
        configCalls.push(['isMultiColorMode', on]);
        cfgState.isMultiColorMode = on;
      },
      setIndividualColors: next => {
        configCalls.push(['individualColors', next]);
        cfgState.individualColors = next;
      },
      setCurtainMap: next => {
        configCalls.push(['curtainMap', next]);
        cfgState.curtainMap = next;
      },
      setDoorSpecialMap: next => {
        configCalls.push(['doorSpecialMap', next]);
        cfgState.doorSpecialMap = next;
      },
    },
    ui: {
      get: () => uiState,
      setDoors: () => undefined,
      setWidth: () => undefined,
      setStackSplitEnabled: () => undefined,
      setStackSplitLowerHeight: () => undefined,
      setStackSplitLowerDepth: () => undefined,
      setStackSplitLowerWidth: () => undefined,
      setStackSplitLowerDoors: () => undefined,
      setStackSplitLowerDepthManual: () => undefined,
      setStackSplitLowerWidthManual: () => undefined,
      setStackSplitLowerDoorsManual: () => undefined,
    },
    runStructuralRecompute: (uiOverride, src) => {
      recomputes.push({ uiOverride, src: String(src || '') });
      return undefined;
    },
    multicolor: {
      setEnabled: () => undefined,
      exitPaintMode: () => undefined,
    },
  };

  return { env, configCalls, recomputes };
}

test('library preset invariants seed glass only for newly added upper doors and rebuild after map materialization', () => {
  const uiState: any = {
    structureSelect: '',
    singleDoorPos: 'left',
  };
  const canonicalCfgs = buildLibraryModuleConfigLists(4, 1, 'hinged', uiState);
  const cfgState: any = {
    modulesConfiguration: canonicalCfgs.topCfgList,
    stackSplitLowerModulesConfiguration: canonicalCfgs.bottomCfgList,
    isMultiColorMode: true,
    individualColors: {},
    curtainMap: {
      d1_full: 'none',
      d2_full: 'white',
    },
    doorSpecialMap: {
      d1: 'glass',
      d1_full: 'glass',
      d2_full: 'mirror',
    },
  };

  const { env, configCalls, recomputes } = createInvariantTestEnv(cfgState, uiState);

  ensureLibraryPresetInvariants(env, {
    isLibraryMode: true,
    wardrobeType: 'hinged',
    doors: 4,
    stackSplitLowerDoors: 1,
    modulesCount: 4,
    seededTopDoorsCount: 3,
    seededBottomDoorsCount: 1,
  });

  const specialCall = configCalls.find(([name]) => name === 'doorSpecialMap');
  assert.ok(specialCall, 'new upper door default glass should update doorSpecialMap');
  const nextSpecial = specialCall?.[1] as Record<string, unknown>;

  assert.equal(nextSpecial.d1_full, 'glass');
  assert.equal(nextSpecial.d2_full, 'mirror', 'existing manual upper-door mirror should be preserved');
  assert.equal(nextSpecial.d3_full, undefined, 'existing manually-cleared upper door should stay cleared');
  assert.equal(nextSpecial.d4, 'glass');
  assert.equal(nextSpecial.d4_full, 'glass');

  const curtainCall = configCalls.find(([name]) => name === 'curtainMap');
  assert.ok(curtainCall, 'new upper glass door should get the library no-curtain default');
  const nextCurtains = curtainCall?.[1] as Record<string, unknown>;
  assert.equal(nextCurtains.d2_full, 'white', 'existing custom upper-door curtain should be preserved');
  assert.equal(nextCurtains.d4_full, 'none');

  const styleCall = configCalls.find(([name]) => name === 'doorStyleMap');
  assert.ok(styleCall, 'new upper glass door should default to regular profile glass');
  const nextStyle = styleCall?.[1] as Record<string, unknown>;
  assert.equal(nextStyle.d4, 'profile');
  assert.equal(nextStyle.d4_full, 'profile');

  assert.equal(recomputes.length, 1, 'new glass defaults must trigger a rebuild after maps are written');
  assert.equal(recomputes[0].src, 'react:structure:library:ensure:rebuild');
});

test('library preset invariants preserve existing lower-door overrides and only clean newly added lower doors', () => {
  const uiState: any = {
    structureSelect: '',
    singleDoorPos: 'left',
  };
  const canonicalCfgs = buildLibraryModuleConfigLists(2, 2, 'hinged', uiState);
  const cfgState: any = {
    modulesConfiguration: canonicalCfgs.topCfgList,
    stackSplitLowerModulesConfiguration: canonicalCfgs.bottomCfgList,
    isMultiColorMode: true,
    individualColors: {
      d1001_full: 'oak',
      d1002_full: 'walnut',
    },
    curtainMap: {
      d1001_full: 'none',
      d1002_full: 'none',
    },
    doorSpecialMap: {
      d1001_full: 'mirror',
      d1002_full: 'glass',
    },
  };

  const { env, configCalls, recomputes } = createInvariantTestEnv(cfgState, uiState);

  ensureLibraryPresetInvariants(env, {
    isLibraryMode: true,
    wardrobeType: 'hinged',
    doors: 2,
    stackSplitLowerDoors: 2,
    modulesCount: 2,
    seededTopDoorsCount: 2,
    seededBottomDoorsCount: 1,
  });

  const specialCall = configCalls.find(([name]) => name === 'doorSpecialMap');
  assert.ok(specialCall, 'new lower regular-door default should clean stale lower special state');
  const nextSpecial = specialCall?.[1] as Record<string, unknown>;
  assert.equal(nextSpecial.d1001_full, 'mirror', 'existing lower-door mirror should be preserved');
  assert.equal(nextSpecial.d1002_full, undefined, 'new lower door should default back to a regular door');

  const colorCall = configCalls.find(([name]) => name === 'individualColors');
  assert.ok(colorCall);
  const nextColors = colorCall?.[1] as Record<string, unknown>;
  assert.equal(nextColors.d1001_full, 'oak', 'existing lower-door color override should be preserved');
  assert.equal(nextColors.d1002_full, undefined, 'new lower door should not inherit stale color state');

  assert.equal(recomputes.length, 1, 'cleaned lower-door default state should be rebuilt once');
});

test('library preset controller tracks seeded door counts so later upper doors receive glass defaults', () => {
  const uiState: any = {
    structureSelect: '',
    singleDoorPos: 'left',
    raw: {},
  };
  const initialCfgs = buildLibraryModuleConfigLists(2, 1, 'hinged', uiState);
  const cfgState: any = {
    modulesConfiguration: initialCfgs.topCfgList,
    stackSplitLowerModulesConfiguration: initialCfgs.bottomCfgList,
    isMultiColorMode: true,
    individualColors: {},
    curtainMap: {
      d1_full: 'none',
      d2_full: 'none',
    },
    doorSpecialMap: {
      d1: 'glass',
      d1_full: 'glass',
      d2: 'glass',
      d2_full: 'glass',
    },
  };

  const { env, configCalls, recomputes } = createInvariantTestEnv(cfgState, uiState);
  const controller = createLibraryPresetController();

  controller.ensureInvariants(env, {
    isLibraryMode: true,
    wardrobeType: 'hinged',
    doors: 2,
    stackSplitLowerDoors: 1,
    modulesCount: 2,
  });
  assert.equal(
    configCalls.some(([name]) => name === 'doorSpecialMap'),
    false,
    'first ensure on an already-library project should not rewrite existing door overrides'
  );

  const expandedCfgs = buildLibraryModuleConfigLists(3, 1, 'hinged', uiState);
  cfgState.modulesConfiguration = expandedCfgs.topCfgList;
  cfgState.stackSplitLowerModulesConfiguration = expandedCfgs.bottomCfgList;

  controller.ensureInvariants(env, {
    isLibraryMode: true,
    wardrobeType: 'hinged',
    doors: 3,
    stackSplitLowerDoors: 1,
    modulesCount: 3,
  });

  const specialCall = configCalls.find(([name]) => name === 'doorSpecialMap');
  assert.ok(specialCall, 'controller should seed defaults for upper doors added after the first ensure');
  const nextSpecial = specialCall?.[1] as Record<string, unknown>;
  assert.equal(nextSpecial.d3, 'glass');
  assert.equal(nextSpecial.d3_full, 'glass');
  assert.equal(recomputes.length, 1);
});

test('library preset invariants are idempotent after linked upper door count edit', () => {
  const uiState: any = {
    structureSelect: '',
    singleDoorPos: 'left',
    raw: {
      width: 160,
      height: 240,
      depth: 55,
      doors: 4,
      chestDrawersCount: 4,
      stackSplitLowerHeight: 80,
      stackSplitLowerDepth: 55,
      stackSplitLowerWidth: 160,
      stackSplitLowerDoors: 4,
      stackSplitLowerDoorsManual: false,
    },
  };
  const initialCfgs = buildLibraryModuleConfigLists(4, 4, 'hinged', uiState);
  const cfgState: any = {
    modulesConfiguration: initialCfgs.topCfgList,
    stackSplitLowerModulesConfiguration: initialCfgs.bottomCfgList,
    isMultiColorMode: true,
    individualColors: {},
    curtainMap: {
      d1_full: 'none',
      d2_full: 'none',
      d3_full: 'none',
      d4_full: 'none',
    },
    doorSpecialMap: {
      d1: 'glass',
      d1_full: 'glass',
      d2: 'glass',
      d2_full: 'glass',
      d3: 'glass',
      d3_full: 'glass',
      d4: 'glass',
      d4_full: 'glass',
    },
  };

  const { env, configCalls, recomputes } = createInvariantTestEnv(cfgState, uiState);
  const controller = createLibraryPresetController();

  controller.ensureInvariants(env, {
    isLibraryMode: true,
    wardrobeType: 'hinged',
    doors: 4,
    stackSplitLowerDoors: 4,
    modulesCount: 4,
  });
  assert.equal(configCalls.length, 0, 'initial canonical library state should not be rewritten');

  uiState.raw.width = 200;
  uiState.raw.doors = 5;

  controller.ensureInvariants(env, {
    isLibraryMode: true,
    wardrobeType: 'hinged',
    doors: 5,
    stackSplitLowerDoors: 5,
    modulesCount: 5,
  });
  assert.deepEqual(
    cfgState.modulesConfiguration.map((item: any) => item.doors),
    [1, 2, 2]
  );
  assert.deepEqual(
    cfgState.stackSplitLowerModulesConfiguration.map((item: any) => item.doors),
    [1, 2, 2]
  );
  assert.equal(
    recomputes.length,
    1,
    'first linked door edit should rebuild once after canonicalizing library state'
  );
  assert.equal(
    recomputes[0].uiOverride.raw?.doors,
    5,
    'library rebuild override must keep raw doors instead of falling back to the recompute default'
  );

  configCalls.length = 0;
  recomputes.length = 0;

  controller.ensureInvariants(env, {
    isLibraryMode: true,
    wardrobeType: 'hinged',
    doors: 5,
    stackSplitLowerDoors: 5,
    modulesCount: 5,
  });

  assert.equal(
    configCalls.length,
    0,
    'canonical linked library door state should be stable after one ensure'
  );
  assert.equal(recomputes.length, 0, 'stable linked library door state should not request another rebuild');
});

test('library preset controller resumes the last library door count and width after toggling back from regular mode', () => {
  const uiState: any = {
    stackSplitEnabled: false,
    structureSelect: '[2,2]',
    singleDoorPos: 'left',
    raw: {
      doors: 4,
      width: 160,
      height: 240,
      depth: 55,
    },
  };
  const cfgState: any = {
    wardrobeType: 'hinged',
    isLibraryMode: false,
    modulesConfiguration: [{ doors: 2 }, { doors: 2 }],
    stackSplitLowerModulesConfiguration: null,
    isMultiColorMode: false,
    individualColors: {},
    curtainMap: {},
    doorSpecialMap: {},
    doorStyleMap: {},
  };

  const recomputes: Array<{ uiOverride: LibraryPresetUiOverride; src: string }> = [];
  const env: LibraryPresetEnv = {
    history: { batch: fn => fn() },
    meta: {
      merge: (meta = {}, defaults = {}, src) => ({ ...defaults, ...meta, source: src || meta.source }),
      noBuild: (meta = {}, src) => ({ ...meta, source: src || meta.source, noBuild: true }),
      noHistory: (meta = {}, src) => ({ ...meta, source: src || meta.source, noHistory: true }),
    },
    config: {
      get: () => cfgState,
      applyProjectSnapshot: next => Object.assign(cfgState, next),
      setModulesConfiguration: next => {
        cfgState.modulesConfiguration = next;
      },
      setLowerModulesConfiguration: next => {
        cfgState.stackSplitLowerModulesConfiguration = next;
      },
      setLibraryMode: on => {
        cfgState.isLibraryMode = on;
      },
      setMultiColorMode: on => {
        cfgState.isMultiColorMode = on;
      },
      setIndividualColors: next => {
        cfgState.individualColors = next;
      },
      setCurtainMap: next => {
        cfgState.curtainMap = next;
      },
      setDoorSpecialMap: next => {
        cfgState.doorSpecialMap = next;
      },
    },
    ui: {
      get: () => uiState,
      setDoors: value => {
        uiState.raw.doors = value;
      },
      setWidth: value => {
        uiState.raw.width = value;
      },
      setStackSplitEnabled: on => {
        uiState.stackSplitEnabled = on;
      },
      setStackSplitLowerHeight: value => {
        uiState.raw.stackSplitLowerHeight = value;
      },
      setStackSplitLowerDepth: value => {
        uiState.raw.stackSplitLowerDepth = value;
      },
      setStackSplitLowerWidth: value => {
        uiState.raw.stackSplitLowerWidth = value;
      },
      setStackSplitLowerDoors: value => {
        uiState.raw.stackSplitLowerDoors = value;
      },
      setStackSplitLowerDepthManual: on => {
        uiState.raw.stackSplitLowerDepthManual = on;
      },
      setStackSplitLowerWidthManual: on => {
        uiState.raw.stackSplitLowerWidthManual = on;
      },
      setStackSplitLowerDoorsManual: on => {
        uiState.raw.stackSplitLowerDoorsManual = on;
      },
    },
    runStructuralRecompute: (uiOverride, src) => {
      recomputes.push({ uiOverride, src: String(src || '') });
      return undefined;
    },
    multicolor: {
      setEnabled: () => undefined,
      exitPaintMode: () => undefined,
    },
  };
  const controller = createLibraryPresetController();
  const merge = (_base: any, patch: any) => ({ ...patch });
  const makeArgs = (isLibraryMode: boolean): LibraryPresetToggleArgs => ({
    isLibraryMode,
    wardrobeType: 'hinged',
    doors: Number(uiState.raw.doors) || 0,
    width: Number(uiState.raw.width) || 0,
    height: Number(uiState.raw.height) || 240,
    depth: Number(uiState.raw.depth) || 55,
    stackSplitEnabled: !!uiState.stackSplitEnabled,
    stackSplitLowerHeight: Number(uiState.raw.stackSplitLowerHeight) || 0,
    stackSplitLowerDepth: Number(uiState.raw.stackSplitLowerDepth) || 0,
    stackSplitLowerWidth: Number(uiState.raw.stackSplitLowerWidth) || 0,
    stackSplitLowerDoors: Number(uiState.raw.stackSplitLowerDoors) || 0,
    stackSplitLowerDepthManual: !!uiState.raw.stackSplitLowerDepthManual,
    stackSplitLowerWidthManual: !!uiState.raw.stackSplitLowerWidthManual,
    stackSplitLowerDoorsManual: !!uiState.raw.stackSplitLowerDoorsManual,
    modulesCount: Array.isArray(cfgState.modulesConfiguration) ? cfgState.modulesConfiguration.length : 0,
  });

  controller.toggleLibraryMode(env, makeArgs(false), { mergeUiOverride: merge });
  assert.equal(uiState.raw.doors, 6);
  assert.equal(uiState.raw.width, 240);
  assert.deepEqual(
    cfgState.modulesConfiguration.map((item: any) => item.gridDivisions),
    [5, 5, 5],
    'first library entry should materialize every 6-door upper module as library shelves'
  );
  assert.equal(recomputes.at(-1)?.uiOverride.structureSelect, '');

  uiState.raw.doors = 8;
  uiState.raw.width = 320;
  uiState.raw.stackSplitLowerDoors = 8;
  uiState.raw.stackSplitLowerWidth = 320;
  const eightDoorCfgs = buildLibraryModuleConfigLists(8, 8, 'hinged', { ...uiState, structureSelect: '' });
  cfgState.modulesConfiguration = eightDoorCfgs.topCfgList;
  cfgState.stackSplitLowerModulesConfiguration = eightDoorCfgs.bottomCfgList;

  controller.toggleLibraryMode(env, makeArgs(true), { mergeUiOverride: merge });
  assert.equal(cfgState.isLibraryMode, false);
  assert.equal(uiState.raw.doors, 4, 'regular wardrobe doors should be restored when closing library');
  assert.equal(uiState.raw.width, 160, 'regular wardrobe width should be restored when closing library');

  controller.toggleLibraryMode(env, makeArgs(false), { mergeUiOverride: merge });
  assert.equal(uiState.raw.doors, 8, 'reopening library should resume the edited library door count');
  assert.equal(uiState.raw.width, 320, 'reopening library should resume the edited library width');
  assert.deepEqual(
    cfgState.modulesConfiguration.map((item: any) => item.gridDivisions),
    [5, 5, 5, 5],
    'resumed 8-door library should keep upper modules on the 4-shelf library template'
  );
  assert.equal(recomputes.at(-1)?.uiOverride.raw?.doors, 8);
  assert.equal(recomputes.at(-1)?.uiOverride.raw?.width, 320);
});
