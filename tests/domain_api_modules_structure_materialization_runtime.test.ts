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

test('domain_api modules ensureAt/patchAt materialize missing top modules with structure-aware doors', () => {
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
  const modulesActions: AnyRec = {};
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

  const ensured = modulesActions.ensureAt(2);
  assert.equal(ensured.doors, 1);
  assert.equal(ensured.layout, 'shelves');

  modulesActions.patchAt(2, { customData: { storage: true } }, { source: 'test:domain-top-module' });

  const modules = Array.isArray(state.config.modulesConfiguration) ? state.config.modulesConfiguration : [];
  assert.equal(modules.length, 3);
  assert.equal(modules[2].doors, 1);
  assert.equal(modules[2].layout, 'shelves');
  assert.equal(modules[2].customData?.storage, true);
});
