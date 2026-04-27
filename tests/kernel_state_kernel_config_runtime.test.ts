import test from 'node:test';
import assert from 'node:assert/strict';

import { installKernelStateKernelConfigSurface } from '../esm/native/kernel/kernel_state_kernel_config.ts';

function asRecord(value: unknown, fallback: Record<string, unknown> = {}): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : fallback;
}

test('kernel_state_kernel_config captures and applies normalized config map snapshots', () => {
  const patches: Array<{ patch: Record<string, unknown>; meta: Record<string, unknown> }> = [];
  const state = {
    ui: {},
    config: {},
    runtime: {},
    mode: {},
    meta: { dirty: false, version: 1, updatedAt: 0 },
  };
  const App: any = {
    store: {
      getState: () => state,
      patch: () => true,
    },
  };
  const __sk: any = {};

  installKernelStateKernelConfigSurface({
    App,
    __sk,
    asMeta: meta => asRecord(meta),
    asRecord,
    isRecord: (value): value is Record<string, unknown> =>
      !!value && typeof value === 'object' && !Array.isArray(value),
    isFn: (value): value is (...args: unknown[]) => unknown => typeof value === 'function',
    cloneKernelValue: (_App, value, fallback) => {
      if (typeof value === 'undefined') return fallback;
      try {
        return structuredClone(value);
      } catch {
        return fallback;
      }
    },
    setStoreConfigPatch: (_App, patch, meta) => {
      patches.push({ patch: patch as Record<string, unknown>, meta: meta as Record<string, unknown> });
      const rec = patch as Record<string, unknown>;
      for (const [key, value] of Object.entries(rec)) {
        if (key === '__replace') continue;
        state.config[key] = value;
      }
      return true;
    },
    asString: value => String(value ?? ''),
    readCornerCfgFromStoreConfig: cfg => asRecord(asRecord(cfg).cornerConfiguration),
    readLowerCornerCfgFromCornerCfg: cornerCfg => {
      const lower = asRecord(cornerCfg).lower;
      return lower && typeof lower === 'object' && !Array.isArray(lower)
        ? (lower as Record<string, unknown>)
        : null;
    },
  });

  const captured = __sk.__captureConfigFromObject({
    groovesMap: { groove_d1: 'yes', drop: 'wat' },
    grooveLinesCountMap: { d1: '4', bad: 'x' },
    doorSpecialMap: { d1: 'glass', drop: 3 },
    mirrorLayoutMap: {
      d1: [{ widthCm: 55, heightCm: 88, faceSign: -1 }, { widthCm: 0 }],
      d2: [{ faceSign: -1 }],
      drop: 'x',
    },
    doorTrimMap: {
      d1: [
        {
          axis: 'vertical',
          color: 'gold',
          span: 'custom',
          sizeCm: '11',
          centerXNorm: '0.3',
          centerYNorm: '0.7',
        },
      ],
    },
    savedColors: [
      'oak',
      {
        id: 'c2',
        name: 'Variant Texture',
        type: 'texture',
        value: 'c2',
        textureData: 'data:image/png;base64,AAA=',
        locked: true,
      },
      { id: '' },
    ],
    colorSwatchesOrder: [' c2 ', null, '', 7],
  });

  assert.deepEqual({ ...captured.groovesMap }, { groove_d1: true });
  assert.deepEqual({ ...captured.grooveLinesCountMap }, { d1: 4 });
  assert.deepEqual({ ...captured.doorSpecialMap }, { d1: 'glass' });
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(captured.mirrorLayoutMap || {}).map(([key, list]) => [
        key,
        Array.isArray(list) ? list.map(entry => ({ ...entry })) : list,
      ])
    ),
    {
      d1: [{ widthCm: 55, heightCm: 88, faceSign: -1 }],
      d2: [{ faceSign: -1 }],
    }
  );
  assert.equal(captured.doorTrimMap.d1[0].sizeCm, 11);
  assert.deepEqual(captured.savedColors, [
    {
      id: 'c2',
      name: 'Variant Texture',
      type: 'texture',
      value: 'c2',
      textureData: 'data:image/png;base64,AAA=',
      locked: true,
    },
  ]);
  assert.deepEqual(captured.colorSwatchesOrder, ['c2', '7']);

  __sk.applyConfig(
    {
      groovesMap: { groove_d2: '1', drop: 'wat' },
      doorSpecialMap: { d2: 'mirror', drop: 3 },
      mirrorLayoutMap: {
        d2: [{ widthCm: 60, heightCm: 90, faceSign: -1 }, { widthCm: 0 }],
        d3: [{ faceSign: -1 }],
        drop: 'x',
      },
      savedColors: [
        'walnut',
        {
          id: 'c3',
          name: 'Applied Texture',
          type: 'texture',
          value: 'c3',
          textureData: 'data:image/png;base64,BBB=',
        },
        { id: '' },
      ],
      colorSwatchesOrder: [' c3 ', '', null, 8],
    },
    { source: 'test:apply-config' }
  );

  assert.equal(patches.length, 1);
  assert.deepEqual({ ...(patches[0].patch.groovesMap as Record<string, unknown>) }, { groove_d2: true });
  assert.deepEqual({ ...(patches[0].patch.doorSpecialMap as Record<string, unknown>) }, { d2: 'mirror' });
  assert.deepEqual(
    Object.fromEntries(
      Object.entries((patches[0].patch.mirrorLayoutMap as Record<string, unknown>) || {}).map(
        ([key, list]) => [
          key,
          Array.isArray(list) ? list.map(entry => ({ ...(entry as Record<string, unknown>) })) : list,
        ]
      )
    ),
    {
      d2: [{ widthCm: 60, heightCm: 90, faceSign: -1 }],
      d3: [{ faceSign: -1 }],
    }
  );
  assert.deepEqual(patches[0].patch.savedColors, [
    {
      id: 'c3',
      name: 'Applied Texture',
      type: 'texture',
      value: 'c3',
      textureData: 'data:image/png;base64,BBB=',
    },
  ]);
  assert.deepEqual(patches[0].patch.colorSwatchesOrder, ['c3', '8']);
  assert.equal(asRecord(patches[0].patch.__replace).mirrorLayoutMap, true);
});

test('kernel_state_kernel_config captureConfig rematerializes structure-aware top modules and detaches captured slices', () => {
  const sourceCornerLowerCells = [{ layout: 'drawers', extDrawersCount: '3' }];
  const sourceCornerCfg = {
    modulesConfiguration: [null, { customData: { storage: true } }],
    stackSplitLower: {
      modulesConfiguration: sourceCornerLowerCells,
    },
  };
  const sourceTopModules = [
    { layout: 'drawers', doors: 8 },
    null,
    { extDrawersCount: '4', intDrawersList: null },
  ];
  const sourceLowerModules = [{ layout: 'drawers', extDrawersCount: '2' }];

  const sourceSavedNotes = [{ id: 'note-1', blocks: [{ text: 'keep' }] }];
  const sourcePreChestState = { dims: { width: 88 } };
  const sourceExtra = { nested: { enabled: true } };
  const state = {
    ui: { raw: { doors: 5 }, structureSelect: '[2,2,1]' },
    config: {
      wardrobeType: 'hinged',
      modulesConfiguration: sourceTopModules,
      stackSplitLowerModulesConfiguration: sourceLowerModules,
      cornerConfiguration: sourceCornerCfg,
      groovesMap: { groove_d1: true },
      savedNotes: sourceSavedNotes,
      preChestState: sourcePreChestState,
      extraSettings: sourceExtra,
      savedColors: [
        'oak',
        {
          id: 'c2',
          name: 'Captured Texture',
          type: 'texture',
          value: 'c2',
          textureData: 'data:image/png;base64,CCC=',
          locked: true,
        },
        { id: '' },
      ],
      colorSwatchesOrder: [' c2 ', '', null],
    },
    runtime: {},
    mode: {},
    meta: { dirty: false, version: 1, updatedAt: 0 },
  };
  const App: any = {
    store: {
      getState: () => state,
      patch: () => true,
    },
  };
  const __sk: any = {};

  installKernelStateKernelConfigSurface({
    App,
    __sk,
    asMeta: meta => asRecord(meta),
    asRecord,
    isRecord: (value): value is Record<string, unknown> =>
      !!value && typeof value === 'object' && !Array.isArray(value),
    isFn: (value): value is (...args: unknown[]) => unknown => typeof value === 'function',
    cloneKernelValue: (_App, value, fallback) => {
      if (typeof value === 'undefined') return fallback;
      try {
        return structuredClone(value);
      } catch {
        return fallback;
      }
    },
    setStoreConfigPatch: () => true,
    asString: value => String(value ?? ''),
    readCornerCfgFromStoreConfig: cfg => asRecord(asRecord(cfg).cornerConfiguration),
    readLowerCornerCfgFromCornerCfg: cornerCfg => {
      const lower = asRecord(cornerCfg).stackSplitLower;
      return lower && typeof lower === 'object' && !Array.isArray(lower)
        ? (lower as Record<string, unknown>)
        : null;
    },
  });

  const captured = __sk.captureConfig();
  const topModules = Array.isArray(captured.modulesConfiguration) ? captured.modulesConfiguration : [];
  const lowerModules = Array.isArray(captured.stackSplitLowerModulesConfiguration)
    ? captured.stackSplitLowerModulesConfiguration
    : [];
  const capturedCorner = asRecord(captured.cornerConfiguration);
  const capturedCornerCells = Array.isArray(capturedCorner.modulesConfiguration)
    ? capturedCorner.modulesConfiguration
    : [];
  const capturedLowerCorner = asRecord(capturedCorner.stackSplitLower);
  const capturedLowerCornerCells = Array.isArray(capturedLowerCorner.modulesConfiguration)
    ? capturedLowerCorner.modulesConfiguration
    : [];

  assert.equal(topModules.length, 3);
  assert.equal(asRecord(topModules[0]).doors, 2);
  assert.equal(asRecord(topModules[1]).doors, 2);
  assert.equal(asRecord(topModules[2]).doors, 1);
  assert.equal(asRecord(topModules[2]).extDrawersCount, 4);
  assert.deepEqual(asRecord(topModules[2]).intDrawersList, []);
  assert.equal(asRecord(lowerModules[0]).extDrawersCount, 2);
  assert.equal(capturedCornerCells.length, 2);
  assert.deepEqual(asRecord(capturedCornerCells[0]), {});
  assert.equal(capturedLowerCornerCells.length, 1);
  assert.equal(asRecord(capturedLowerCornerCells[0]).extDrawersCount, 3);

  sourceTopModules[0] = { layout: 'shelves', doors: 9 };
  sourceLowerModules[0] = { layout: 'shelves', extDrawersCount: 9 };
  sourceCornerCfg.modulesConfiguration[1] = { layout: 'shelves' };
  sourceCornerLowerCells[0] = { layout: 'shelves', extDrawersCount: 9 };
  state.config.groovesMap.groove_d2 = true;

  assert.equal(asRecord(topModules[0]).doors, 2);
  assert.equal(asRecord(lowerModules[0]).extDrawersCount, 2);
  assert.equal(asRecord(asRecord(capturedCornerCells[1]).customData).storage, true);
  assert.equal(asRecord(capturedLowerCornerCells[0]).extDrawersCount, 3);
  assert.deepEqual({ ...captured.groovesMap }, { groove_d1: true });
  assert.deepEqual(captured.savedColors, [
    {
      id: 'c2',
      name: 'Captured Texture',
      type: 'texture',
      value: 'c2',
      textureData: 'data:image/png;base64,CCC=',
      locked: true,
    },
  ]);
  assert.deepEqual(captured.colorSwatchesOrder, ['c2']);

  (
    ((captured.savedNotes as Record<string, unknown>[])[0].blocks as Record<string, unknown>[])[0] as Record<
      string,
      unknown
    >
  ).text = 'changed';
  ((captured.preChestState as Record<string, unknown>).dims as Record<string, unknown>).width = 120;
  ((captured.extraSettings as Record<string, unknown>).nested as Record<string, unknown>).enabled = false;

  assert.equal(
    (
      ((sourceSavedNotes[0] as Record<string, unknown>).blocks as Record<string, unknown>[])[0] as Record<
        string,
        unknown
      >
    ).text,
    'keep'
  );
  assert.equal((sourcePreChestState.dims as Record<string, unknown>).width, 88);
  assert.equal((sourceExtra.nested as Record<string, unknown>).enabled, true);
});

test('kernel_state_kernel_config keeps top-corner default layout policy aligned for left-corner ensure/patch flows', () => {
  const state = {
    ui: { cornerSide: 'left', cornerDoors: 4 },
    config: {
      cornerConfiguration: {
        modulesConfiguration: [{}],
      },
    },
    runtime: {},
    mode: {},
    meta: { dirty: false, version: 1, updatedAt: 0 },
  };
  const App: any = {
    store: {
      getState: () => state,
      patch: () => true,
    },
  };
  const __sk: any = {};

  installKernelStateKernelConfigSurface({
    App,
    __sk,
    asMeta: meta => asRecord(meta),
    asRecord,
    isRecord: (value): value is Record<string, unknown> =>
      !!value && typeof value === 'object' && !Array.isArray(value),
    isFn: (value): value is (...args: unknown[]) => unknown => typeof value === 'function',
    cloneKernelValue: (_App, value, fallback) => {
      if (typeof value === 'undefined') return fallback;
      try {
        return structuredClone(value);
      } catch {
        return fallback;
      }
    },
    setStoreConfigPatch: (_App, patch, _meta) => {
      const rec = patch as Record<string, unknown>;
      for (const [key, value] of Object.entries(rec)) {
        if (key === '__replace') continue;
        state.config[key] = value;
      }
      return true;
    },
    asString: value => String(value ?? ''),
    readCornerCfgFromStoreConfig: cfg => asRecord(asRecord(cfg).cornerConfiguration),
    readLowerCornerCfgFromCornerCfg: cornerCfg => {
      const lower = asRecord(cornerCfg).stackSplitLower;
      return lower && typeof lower === 'object' && !Array.isArray(lower)
        ? (lower as Record<string, unknown>)
        : null;
    },
  });

  const ensured = __sk.ensureCornerCellConfig(1);
  assert.equal(ensured.layout, 'hanging_top2');
  assert.equal(ensured.doors, 2);

  const patched = __sk.patchModuleConfig(
    'corner:1',
    { customData: { storage: true } },
    { source: 'test:left-corner-cell' }
  );
  assert.equal(patched.layout, 'hanging_top2');
  assert.equal(asRecord(patched.customData).storage, true);

  const cornerCfg = asRecord(state.config.cornerConfiguration);
  const cells = Array.isArray(cornerCfg.modulesConfiguration) ? cornerCfg.modulesConfiguration : [];
  assert.equal(asRecord(cells[1]).layout, 'hanging_top2');
  assert.equal(asRecord(asRecord(cells[1]).customData).storage, true);
});

test('kernel_state_kernel_config reuses canonical corner-cell normalization across ensure and patch flows', () => {
  const state = {
    ui: { cornerSide: 'right', cornerDoors: 4 },
    config: {
      cornerConfiguration: {
        modulesConfiguration: [{ doors: 5, customData: { storage: false } }],
      },
    },
    runtime: {},
    mode: {},
    meta: { dirty: false, version: 1, updatedAt: 0 },
  };
  const App: any = {
    store: {
      getState: () => state,
      patch: () => true,
    },
  };
  const __sk: any = {};

  installKernelStateKernelConfigSurface({
    App,
    __sk,
    asMeta: meta => asRecord(meta),
    asRecord,
    isRecord: (value): value is Record<string, unknown> =>
      !!value && typeof value === 'object' && !Array.isArray(value),
    isFn: (value): value is (...args: unknown[]) => unknown => typeof value === 'function',
    cloneKernelValue: (_App, value, fallback) => {
      if (typeof value === 'undefined') return fallback;
      try {
        return structuredClone(value);
      } catch {
        return fallback;
      }
    },
    setStoreConfigPatch: (_App, patch, _meta) => {
      const rec = patch as Record<string, unknown>;
      for (const [key, value] of Object.entries(rec)) {
        if (key === '__replace') continue;
        state.config[key] = value;
      }
      return true;
    },
    asString: value => String(value ?? ''),
    readCornerCfgFromStoreConfig: cfg => asRecord(asRecord(cfg).cornerConfiguration),
    readLowerCornerCfgFromCornerCfg: cornerCfg => {
      const lower = asRecord(cornerCfg).stackSplitLower;
      return lower && typeof lower === 'object' && !Array.isArray(lower)
        ? (lower as Record<string, unknown>)
        : null;
    },
  });

  const ensuredExisting = __sk.ensureCornerCellConfig(0);
  assert.equal(ensuredExisting.layout, 'hanging_top2');
  assert.equal(ensuredExisting.doors, 5);
  assert.equal(asRecord(ensuredExisting.customData).storage, false);

  const ensuredMissing = __sk.ensureCornerCellConfig(1);
  assert.equal(ensuredMissing.layout, 'shelves');
  assert.equal(ensuredMissing.doors, 2);

  const patched = __sk.patchModuleConfig(
    'corner:1',
    { doors: 3, customData: { storage: true } },
    { source: 'test:corner-cell' }
  );
  assert.equal(patched.layout, 'shelves');
  assert.equal(patched.doors, 3);
  assert.equal(asRecord(patched.customData).storage, true);

  const cornerCfg = asRecord(state.config.cornerConfiguration);
  const cells = Array.isArray(cornerCfg.modulesConfiguration) ? cornerCfg.modulesConfiguration : [];
  assert.equal(asRecord(cells[1]).layout, 'shelves');
  assert.equal(asRecord(cells[1]).doors, 3);
  assert.equal(asRecord(asRecord(cells[1]).customData).storage, true);
});

test('kernel_state_kernel_config materializes missing top modules with structure-aware doors across ensure and patch', () => {
  const state = {
    ui: { raw: { doors: 5 }, structureSelect: '[2,2,1]' },
    config: {
      wardrobeType: 'hinged',
      modulesConfiguration: [{ layout: 'drawers', doors: 2 }],
    },
    runtime: {},
    mode: {},
    meta: { dirty: false, version: 1, updatedAt: 0 },
  };
  const App: any = {
    store: {
      getState: () => state,
      patch: () => true,
    },
  };
  const __sk: any = {};

  installKernelStateKernelConfigSurface({
    App,
    __sk,
    asMeta: meta => asRecord(meta),
    asRecord,
    isRecord: (value): value is Record<string, unknown> =>
      !!value && typeof value === 'object' && !Array.isArray(value),
    isFn: (value): value is (...args: unknown[]) => unknown => typeof value === 'function',
    cloneKernelValue: (_App, value, fallback) => {
      if (typeof value === 'undefined') return fallback;
      try {
        return structuredClone(value);
      } catch {
        return fallback;
      }
    },
    setStoreConfigPatch: (_App, patch, _meta) => {
      const rec = patch as Record<string, unknown>;
      for (const [key, value] of Object.entries(rec)) {
        if (key === '__replace') continue;
        state.config[key] = value;
      }
      return true;
    },
    asString: value => String(value ?? ''),
    readCornerCfgFromStoreConfig: cfg => asRecord(asRecord(cfg).cornerConfiguration),
    readLowerCornerCfgFromCornerCfg: cornerCfg => {
      const lower = asRecord(cornerCfg).stackSplitLower;
      return lower && typeof lower === 'object' && !Array.isArray(lower)
        ? (lower as Record<string, unknown>)
        : null;
    },
  });

  const ensured = __sk.ensureModuleConfig(2);
  assert.equal(ensured.doors, 1);
  assert.equal(ensured.layout, 'shelves');

  const patched = __sk.patchModuleConfig(
    2,
    { customData: { storage: true } },
    { source: 'test:top-module-doors' }
  );
  assert.equal(patched.doors, 1);
  assert.equal(patched.layout, 'shelves');
  assert.equal(asRecord(patched.customData).storage, true);

  const modules = Array.isArray(state.config.modulesConfiguration) ? state.config.modulesConfiguration : [];
  assert.equal(modules.length, 3);
  assert.equal(asRecord(modules[2]).doors, 1);
  assert.equal(asRecord(modules[2]).layout, 'shelves');
  assert.equal(asRecord(asRecord(modules[2]).customData).storage, true);
});

test('kernel_state_kernel_config applyConfig and patchConfigScalar keep top-module sanitization structure-aware', () => {
  const patches: Array<{ patch: Record<string, unknown>; meta: Record<string, unknown> }> = [];
  const state = {
    ui: { raw: { doors: 5 }, structureSelect: '[2,2,1]' },
    config: {
      wardrobeType: 'hinged',
      modulesConfiguration: [{ layout: 'drawers', doors: 2 }],
    },
    runtime: {},
    mode: {},
    meta: { dirty: false, version: 1, updatedAt: 0 },
  };
  const App: any = {
    store: {
      getState: () => state,
      patch: () => true,
    },
  };
  const __sk: any = {};

  installKernelStateKernelConfigSurface({
    App,
    __sk,
    asMeta: meta => asRecord(meta),
    asRecord,
    isRecord: (value): value is Record<string, unknown> =>
      !!value && typeof value === 'object' && !Array.isArray(value),
    isFn: (value): value is (...args: unknown[]) => unknown => typeof value === 'function',
    cloneKernelValue: (_App, value, fallback) => {
      if (typeof value === 'undefined') return fallback;
      try {
        return structuredClone(value);
      } catch {
        return fallback;
      }
    },
    setStoreConfigPatch: (_App, patch, meta) => {
      patches.push({ patch: patch as Record<string, unknown>, meta: meta as Record<string, unknown> });
      const rec = patch as Record<string, unknown>;
      for (const [key, value] of Object.entries(rec)) {
        if (key === '__replace') continue;
        state.config[key] = value;
      }
      return true;
    },
    asString: value => String(value ?? ''),
    readCornerCfgFromStoreConfig: cfg => asRecord(asRecord(cfg).cornerConfiguration),
    readLowerCornerCfgFromCornerCfg: cornerCfg => {
      const lower = asRecord(cornerCfg).stackSplitLower;
      return lower && typeof lower === 'object' && !Array.isArray(lower)
        ? (lower as Record<string, unknown>)
        : null;
    },
  });

  __sk.applyConfig(
    {
      modulesConfiguration: [{ layout: 'drawers', doors: 2 }, {}, {}],
    },
    { source: 'test:apply-config-structure-aware' }
  );

  const applyModules = Array.isArray(state.config.modulesConfiguration)
    ? state.config.modulesConfiguration
    : [];
  assert.equal(applyModules.length, 3);
  assert.equal(asRecord(applyModules[2]).doors, 1);
  assert.equal(asRecord(applyModules[2]).layout, 'shelves');
  assert.equal(asRecord(patches[0]?.patch.modulesConfiguration?.[2]).doors, 1);

  const scalarResult = __sk.patchConfigScalar(
    'modulesConfiguration',
    [{ layout: 'drawers', doors: 2 }, { customData: { storage: true } }, {}],
    { source: 'test:patch-config-scalar-structure-aware' }
  );

  assert.equal(asRecord((scalarResult as Record<string, unknown>[])[1]).doors, 2);
  assert.equal(asRecord((scalarResult as Record<string, unknown>[])[2]).doors, 1);
  const scalarModules = Array.isArray(state.config.modulesConfiguration)
    ? state.config.modulesConfiguration
    : [];
  assert.equal(asRecord(scalarModules[2]).doors, 1);
  assert.equal(asRecord(asRecord(scalarModules[1]).customData).storage, true);
});

test('kernel_state_kernel_config patchConfigMaps and replaceModulesConfiguration keep top-module sanitization structure-aware', () => {
  const state = {
    ui: { raw: { doors: 5 }, structureSelect: '[2,2,1]' },
    config: {
      wardrobeType: 'hinged',
      modulesConfiguration: [{ layout: 'drawers', doors: 2 }],
    },
    runtime: {},
    mode: {},
    meta: { dirty: false, version: 1, updatedAt: 0 },
  };
  const App: any = {
    store: {
      getState: () => state,
      patch: () => true,
    },
  };
  const __sk: any = {};

  installKernelStateKernelConfigSurface({
    App,
    __sk,
    asMeta: meta => asRecord(meta),
    asRecord,
    isRecord: (value): value is Record<string, unknown> =>
      !!value && typeof value === 'object' && !Array.isArray(value),
    isFn: (value): value is (...args: unknown[]) => unknown => typeof value === 'function',
    cloneKernelValue: (_App, value, fallback) => {
      if (typeof value === 'undefined') return fallback;
      try {
        return structuredClone(value);
      } catch {
        return fallback;
      }
    },
    setStoreConfigPatch: (_App, patch, _meta) => {
      const rec = patch as Record<string, unknown>;
      for (const [key, value] of Object.entries(rec)) {
        if (key === '__replace') continue;
        state.config[key] = value;
      }
      return true;
    },
    asString: value => String(value ?? ''),
    readCornerCfgFromStoreConfig: cfg => asRecord(asRecord(cfg).cornerConfiguration),
    readLowerCornerCfgFromCornerCfg: cornerCfg => {
      const lower = asRecord(cornerCfg).stackSplitLower;
      return lower && typeof lower === 'object' && !Array.isArray(lower)
        ? (lower as Record<string, unknown>)
        : null;
    },
  });

  __sk.patchConfigMaps(
    {
      modulesConfiguration: [{ layout: 'drawers', doors: 2 }, { layout: 'shelves' }, {}],
    },
    { source: 'test:patch-config-maps-structure-aware' }
  );

  let modules = Array.isArray(state.config.modulesConfiguration) ? state.config.modulesConfiguration : [];
  assert.equal(asRecord(modules[1]).doors, 2);
  assert.equal(asRecord(modules[2]).doors, 1);

  const replaced = __sk.replaceModulesConfiguration(
    [{ layout: 'drawers', doors: 2 }, { layout: 'shelves' }, {}],
    { source: 'test:replace-modules-structure-aware' }
  );

  assert.equal(asRecord(replaced[1]).doors, 2);
  assert.equal(asRecord(replaced[2]).doors, 1);
  modules = Array.isArray(state.config.modulesConfiguration) ? state.config.modulesConfiguration : [];
  assert.equal(asRecord(modules[2]).doors, 1);
  assert.equal(asRecord(modules[2]).layout, 'shelves');
});
