import test from 'node:test';
import assert from 'node:assert/strict';

import { installDomainApiModulesCorner } from '../esm/native/kernel/domain_api_modules_corner.ts';

type AnyRec = Record<string, any>;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function isRecord(value: unknown): value is AnyRec {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

test('domain_api modules expose explicit writes and delegate patchAt through the canonical stack router', () => {
  const state: { config: AnyRec; ui: AnyRec } = {
    config: {
      wardrobeType: 'hinged',
      modulesConfiguration: [{ layout: 'drawers', doors: 2 }],
    },
    ui: {
      raw: { doors: 5 },
      structureSelect: '[2,2,1]',
    },
  };

  const App: AnyRec = {
    services: {},
    store: {
      getState: () => ({ config: state.config, ui: state.ui }),
      patch(next: unknown) {
        const patch = next && typeof next === 'object' && !Array.isArray(next) ? (next as AnyRec) : {};
        if (patch.config && typeof patch.config === 'object' && !Array.isArray(patch.config)) {
          state.config = { ...state.config, ...(patch.config as AnyRec) };
        }
        return true;
      },
    },
    actions: {
      config: {
        patch(next: unknown) {
          const patch = next && typeof next === 'object' && !Array.isArray(next) ? (next as AnyRec) : {};
          state.config = { ...state.config, ...patch };
          return state.config;
        },
        setModulesConfiguration(next: unknown) {
          const prev = state.config.modulesConfiguration;
          const value = typeof next === 'function' ? next(prev) : next;
          state.config.modulesConfiguration = Array.isArray(value) ? clone(value) : [];
          return state.config.modulesConfiguration;
        },
      },
    },
  };
  const select: AnyRec = { modules: {}, corner: {} };
  const ensureCalls: AnyRec[] = [];
  const patchCalls: AnyRec[] = [];
  const legacyCalls: string[] = [];
  const modulesActions: AnyRec = {
    patch() {
      legacyCalls.push('patch');
    },
    patchAt() {
      legacyCalls.push('patchAt');
    },
    patchLowerAt() {
      legacyCalls.push('patchLowerAt');
    },
    ensureForStack(stack: unknown, moduleKey: unknown) {
      ensureCalls.push({ stack, moduleKey });
      return { doors: 1, layout: 'shelves' };
    },
    patchForStack(stack: unknown, moduleKey: unknown, patch: unknown, meta: unknown) {
      patchCalls.push({ stack, moduleKey, patch, meta });
      if (stack !== 'top' || typeof moduleKey !== 'number') return null;
      const current = Array.isArray(state.config.modulesConfiguration)
        ? clone(state.config.modulesConfiguration)
        : [];
      while (current.length <= moduleKey) current.push({ layout: 'shelves' });
      current[moduleKey] = { ...current[moduleKey], ...(isRecord(patch) ? patch : {}) };
      state.config.modulesConfiguration = current;
      return current[moduleKey];
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
  });

  const patchAtRef = modulesActions.patchAt;
  const patchLowerAtRef = modulesActions.patchLowerAt;
  const cornerPatchRef = cornerActions.patch;

  const ensured = modulesActions.ensureAt(2);
  assert.equal(ensured.doors, 1);
  assert.equal(ensured.layout, 'shelves');
  modulesActions.ensureLowerAt(1);
  cornerActions.ensureConfig();
  cornerActions.ensureLowerConfig();
  cornerActions.ensureCellAt(3);
  cornerActions.ensureLowerCellAt(4);
  assert.deepEqual(ensureCalls, [
    { stack: 'top', moduleKey: 2 },
    { stack: 'bottom', moduleKey: 1 },
    { stack: 'top', moduleKey: 'corner' },
    { stack: 'bottom', moduleKey: 'corner' },
    { stack: 'top', moduleKey: 'corner:3' },
    { stack: 'bottom', moduleKey: 'corner:4' },
  ]);

  modulesActions.patchAt(2, { customData: { storage: true } }, { source: 'test:domain-top-module' });
  modulesActions.patchLowerAt(1, { width: 44 }, { source: 'test:domain-bottom-module' });
  cornerActions.patch({ depth: 61 });
  cornerActions.patchLower({ depth: 52 });
  cornerActions.patchCellAt(3, { width: 33 });
  cornerActions.patchLowerCellAt(4, { width: 24 });

  assert.deepEqual(patchCalls, [
    {
      stack: 'top',
      moduleKey: 2,
      patch: { customData: { storage: true } },
      meta: { source: 'actions:modules:patchAt' },
    },
    {
      stack: 'bottom',
      moduleKey: 1,
      patch: { width: 44 },
      meta: { source: 'actions:modules:patchLowerAt' },
    },
    {
      stack: 'top',
      moduleKey: 'corner',
      patch: { depth: 61 },
      meta: { source: 'actions:corner:patch' },
    },
    {
      stack: 'bottom',
      moduleKey: 'corner',
      patch: { depth: 52 },
      meta: { source: 'actions:corner:patchLower' },
    },
    {
      stack: 'top',
      moduleKey: 'corner:3',
      patch: { width: 33 },
      meta: { source: 'actions:corner:patchCellAt' },
    },
    {
      stack: 'bottom',
      moduleKey: 'corner:4',
      patch: { width: 24 },
      meta: { source: 'actions:corner:patchLowerCellAt' },
    },
  ]);
  assert.deepEqual(legacyCalls, []);
  assert.equal(typeof modulesActions.setAll, 'function');
  assert.equal(typeof modulesActions.patchLowerAt, 'function');
  assert.equal(modulesActions.patch, undefined);

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
  });

  assert.equal(modulesActions.patchAt, patchAtRef);
  assert.equal(modulesActions.patchLowerAt, patchLowerAtRef);
  assert.equal(cornerActions.patch, cornerPatchRef);

  delete modulesActions.ensureForStack;
  assert.throws(
    () => modulesActions.ensureAt(0),
    /actions\.modules\.ensureForStack is required before stack ensure delegation/
  );

  delete modulesActions.patchForStack;
  assert.throws(
    () => modulesActions.patchAt(0, { width: 10 }),
    /actions\.modules\.patchForStack is required before stack patch delegation/
  );
});
