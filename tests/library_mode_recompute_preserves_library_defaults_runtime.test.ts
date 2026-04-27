import test from 'node:test';
import assert from 'node:assert/strict';

import { installDomainApiModulesCorner } from '../esm/native/kernel/domain_api_modules_corner.ts';
import { createLibraryTopModuleConfig } from '../esm/native/features/library_preset/module_defaults.ts';
import { createDefaultTopModuleConfig } from '../esm/native/features/modules_configuration/module_defaults.ts';

type AnyRec = Record<string, any>;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function isRecord(value: unknown): value is AnyRec {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

test('library mode recompute seeds added modules with library shelves while preserving edited interiors', () => {
  const editedLeft = {
    ...createLibraryTopModuleConfig(2),
    layout: 'mixed',
    isCustom: false,
  };
  const libraryRight = createLibraryTopModuleConfig(2);

  const state: { config: AnyRec; ui: AnyRec } = {
    config: {
      wardrobeType: 'hinged',
      isLibraryMode: true,
      modulesConfiguration: [clone(editedLeft), clone(libraryRight)],
    },
    ui: {
      raw: { doors: 5 },
      structureSelect: '[2,2,1]',
      singleDoorPos: 'left',
    },
  };

  const reports: Array<[string, unknown]> = [];
  const setAllCalls: unknown[] = [];

  const App: AnyRec = { services: {} };
  const select: AnyRec = { modules: {}, corner: {} };
  const modulesActions: AnyRec = {
    setAll(next: unknown) {
      const list = Array.isArray(next) ? clone(next) : [];
      state.config.modulesConfiguration = list;
      setAllCalls.push(list);
      return list;
    },
  };
  const cornerActions: AnyRec = {};

  installDomainApiModulesCorner({
    App,
    select,
    modulesActions,
    cornerActions,
    _cfg: () => state.config,
    _ui: () => state.ui,
    _ensureObj: (value: unknown) => (isRecord(value) ? value : {}),
    _isRecord: isRecord,
    _asMeta: (meta: unknown) => (isRecord(meta) ? meta : undefined),
    _meta: (meta: unknown, source: string) => ({ ...(isRecord(meta) ? meta : {}), source }),
    _domainApiReportNonFatal: (_app, op, err) => {
      reports.push([op, err]);
    },
    _markDelegatesStackPatch: () => undefined,
  });

  const result = modulesActions.recomputeFromUi(
    null,
    { source: 'react:structure:doors' },
    {
      preserveTemplate: true,
      anchorSide: 'left',
    }
  );

  assert.equal(result.ok, true);
  assert.equal(setAllCalls.length, 1);
  assert.equal(reports.length, 0);

  const next = state.config.modulesConfiguration;
  assert.equal(next.length, 3);

  assert.equal(next[0].layout, 'mixed', 'existing edited interior should be preserved');
  assert.equal(next[0].isCustom, false);
  assert.equal(next[0].doors, 2);

  assert.equal(next[1].layout, 'shelves');
  assert.equal(next[1].isCustom, true);
  assert.equal(next[1].doors, 2);
  assert.equal(next[1].gridDivisions, 5);
  assert.deepEqual(next[1].customData?.shelves, [true, true, true, true, false]);

  assert.equal(
    next[2].layout,
    'shelves',
    'new library module should not fall back to hanging wardrobe defaults'
  );
  assert.equal(next[2].isCustom, true);
  assert.equal(next[2].doors, 1);
  assert.equal(next[2].gridDivisions, 5);
  assert.deepEqual(next[2].customData?.shelves, [true, true, true, true, false]);
});

test('structure recompute requests a builder rebuild when UI changes but modulesConfiguration stays identical', () => {
  const baseModules = [createDefaultTopModuleConfig(0, 2), createDefaultTopModuleConfig(1, 2)];
  const state: { config: AnyRec; ui: AnyRec } = {
    config: {
      wardrobeType: 'hinged',
      isLibraryMode: false,
      modulesConfiguration: clone(baseModules),
    },
    ui: {
      raw: { width: 160, height: 240, depth: 60, doors: 4 },
      structureSelect: '',
      singleDoorPos: '',
    },
  };

  const buildRequests: Array<{ uiOverride: unknown; meta: unknown }> = [];
  const setAllCalls: unknown[] = [];

  const App: AnyRec = {
    services: {
      builder: {
        requestBuild(uiOverride: unknown, meta: unknown) {
          buildRequests.push({ uiOverride: clone(uiOverride), meta: clone(meta) });
          return true;
        },
      },
    },
  };
  const select: AnyRec = { modules: {}, corner: {} };
  const modulesActions: AnyRec = {
    setAll(next: unknown) {
      const list = Array.isArray(next) ? clone(next) : [];
      state.config.modulesConfiguration = list;
      setAllCalls.push(list);
      return list;
    },
  };
  const cornerActions: AnyRec = {};

  installDomainApiModulesCorner({
    App,
    select,
    modulesActions,
    cornerActions,
    _cfg: () => state.config,
    _ui: () => state.ui,
    _ensureObj: (value: unknown) => (isRecord(value) ? value : {}),
    _isRecord: isRecord,
    _asMeta: (meta: unknown) => (isRecord(meta) ? meta : undefined),
    _meta: (meta: unknown, source: string) => ({ ...(isRecord(meta) ? meta : {}), source }),
    _domainApiReportNonFatal: () => undefined,
    _markDelegatesStackPatch: () => undefined,
  });

  const uiOverride = {
    ...state.ui,
    raw: { ...state.ui.raw, width: 220 },
  };

  const result = modulesActions.recomputeFromUi(
    uiOverride,
    { source: 'react:structure:width', force: true },
    {
      structureChanged: true,
      preserveTemplate: true,
      anchorSide: 'left',
    }
  );

  assert.equal(result.ok, true);
  assert.equal(result.updated, false);
  assert.equal(setAllCalls.length, 0);
  assert.equal(buildRequests.length, 1);
  assert.equal((buildRequests[0].uiOverride as AnyRec)?.raw?.width, 220);
  assert.equal((buildRequests[0].meta as AnyRec)?.immediate, true);
  assert.equal((buildRequests[0].meta as AnyRec)?.force, true);
});

test('structure recompute respects meta noBuild for no-change follow-through unless forceBuild is present', () => {
  const baseModules = [createDefaultTopModuleConfig(0, 2), createDefaultTopModuleConfig(1, 2)];
  const state: { config: AnyRec; ui: AnyRec } = {
    config: {
      wardrobeType: 'hinged',
      isLibraryMode: false,
      modulesConfiguration: clone(baseModules),
    },
    ui: {
      raw: { width: 160, height: 240, depth: 60, doors: 4 },
      structureSelect: '',
      singleDoorPos: '',
    },
  };

  const buildRequests: Array<{ uiOverride: unknown; meta: unknown }> = [];
  const App: AnyRec = {
    services: {
      builder: {
        requestBuild(uiOverride: unknown, meta: unknown) {
          buildRequests.push({ uiOverride: clone(uiOverride), meta: clone(meta) });
          return true;
        },
      },
    },
  };
  const select: AnyRec = { modules: {}, corner: {} };
  const modulesActions: AnyRec = {
    setAll(next: unknown) {
      const list = Array.isArray(next) ? clone(next) : [];
      state.config.modulesConfiguration = list;
      return list;
    },
  };
  const cornerActions: AnyRec = {};

  installDomainApiModulesCorner({
    App,
    select,
    modulesActions,
    cornerActions,
    _cfg: () => state.config,
    _ui: () => state.ui,
    _ensureObj: (value: unknown) => (isRecord(value) ? value : {}),
    _isRecord: isRecord,
    _asMeta: (meta: unknown) => (isRecord(meta) ? meta : undefined),
    _meta: (meta: unknown, source: string) => ({ ...(isRecord(meta) ? meta : {}), source }),
    _domainApiReportNonFatal: () => undefined,
    _markDelegatesStackPatch: () => undefined,
  });

  const uiOverride = {
    ...state.ui,
    raw: { ...state.ui.raw, width: 200 },
  };

  const suppressed = modulesActions.recomputeFromUi(
    uiOverride,
    { source: 'react:structure:no-build', noBuild: true },
    {
      structureChanged: true,
      preserveTemplate: true,
      anchorSide: 'left',
    }
  );

  assert.equal(suppressed.ok, true);
  assert.equal(buildRequests.length, 0);

  const forced = modulesActions.recomputeFromUi(
    uiOverride,
    { source: 'react:structure:no-build', noBuild: true, forceBuild: true },
    {
      structureChanged: true,
      preserveTemplate: true,
      anchorSide: 'left',
    }
  );

  assert.equal(forced.ok, true);
  assert.equal(buildRequests.length, 1);
  assert.deepEqual(buildRequests[0].meta, {
    source: 'actions:modules:recomputeFromUi',
    reason: 'actions:modules:recomputeFromUi',
    noBuild: true,
    immediate: true,
    force: true,
  });
});

test('structure recompute skipBuild suppresses no-change follow-through rebuilds while keeping result canonical', () => {
  const baseModules = [createDefaultTopModuleConfig(0, 2), createDefaultTopModuleConfig(1, 2)];
  const state: { config: AnyRec; ui: AnyRec } = {
    config: {
      wardrobeType: 'hinged',
      isLibraryMode: false,
      modulesConfiguration: clone(baseModules),
    },
    ui: {
      raw: { width: 160, height: 240, depth: 60, doors: 4 },
      structureSelect: '',
      singleDoorPos: '',
    },
  };

  const buildRequests: Array<{ uiOverride: unknown; meta: unknown }> = [];
  const setAllCalls: unknown[] = [];

  const App: AnyRec = {
    services: {
      builder: {
        requestBuild(uiOverride: unknown, meta: unknown) {
          buildRequests.push({ uiOverride: clone(uiOverride), meta: clone(meta) });
          return true;
        },
      },
    },
  };
  const select: AnyRec = { modules: {}, corner: {} };
  const modulesActions: AnyRec = {
    setAll(next: unknown) {
      const list = Array.isArray(next) ? clone(next) : [];
      state.config.modulesConfiguration = list;
      setAllCalls.push(list);
      return list;
    },
  };
  const cornerActions: AnyRec = {};

  installDomainApiModulesCorner({
    App,
    select,
    modulesActions,
    cornerActions,
    _cfg: () => state.config,
    _ui: () => state.ui,
    _ensureObj: (value: unknown) => (isRecord(value) ? value : {}),
    _isRecord: isRecord,
    _asMeta: (meta: unknown) => (isRecord(meta) ? meta : undefined),
    _meta: (meta: unknown, source: string) => ({ ...(isRecord(meta) ? meta : {}), source }),
    _domainApiReportNonFatal: () => undefined,
    _markDelegatesStackPatch: () => undefined,
  });

  const uiOverride = {
    ...state.ui,
    raw: { ...state.ui.raw, width: 220 },
  };

  const result = modulesActions.recomputeFromUi(
    uiOverride,
    { source: 'react:structure:width', force: true },
    {
      structureChanged: true,
      preserveTemplate: true,
      anchorSide: 'left',
      skipBuild: true,
    }
  );

  assert.equal(result.ok, true);
  assert.equal(result.updated, false);
  assert.equal(setAllCalls.length, 0);
  assert.equal(buildRequests.length, 0);
});
