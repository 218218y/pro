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

test('non-library recompute canonicalizes preserved modules through the top-module materializer', () => {
  const malformedExisting = {
    layout: 'mixed',
    extDrawersCount: '4',
    hasShoeDrawer: 1,
    intDrawersSlot: '2',
    intDrawersList: null,
    isCustom: '',
    customData: {
      storage: true,
    },
    doors: 99,
  };

  const state: { config: AnyRec; ui: AnyRec } = {
    config: {
      wardrobeType: 'hinged',
      isLibraryMode: false,
      modulesConfiguration: [clone(malformedExisting)],
    },
    ui: {
      raw: { doors: 5 },
      structureSelect: '[2,2,1]',
      singleDoorPos: 'left',
    },
  };

  const App: AnyRec = { services: {} };
  const select: AnyRec = { modules: {}, corner: {} };
  const setAllCalls: unknown[] = [];
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

  const result = modulesActions.recomputeFromUi(
    null,
    { source: 'react:structure:doors' },
    {
      preserveTemplate: true,
      anchorSide: 'left',
    }
  );

  assert.equal(result.ok, true);
  assert.equal(result.updated, true);
  assert.equal(setAllCalls.length, 1);

  const next = state.config.modulesConfiguration;
  assert.equal(next.length, 3);

  assert.equal(next[0].layout, 'mixed', 'existing layout should still be preserved');
  assert.equal(next[0].doors, 2, 'preserved modules should be rematerialized against the live structure');
  assert.equal(next[0].extDrawersCount, 4);
  assert.equal(next[0].hasShoeDrawer, true);
  assert.equal(next[0].intDrawersSlot, 2);
  assert.deepEqual(next[0].intDrawersList, []);
  assert.equal(next[0].isCustom, false);
  assert.equal(next[0].customData?.storage, true);
  assert.deepEqual(next[0].customData?.shelves, [false, false, false, false, false, false]);
  assert.deepEqual(next[0].customData?.rods, [false, false, false, false, false, false]);

  assert.equal(next[1].doors, 2);
  assert.equal(next[2].doors, 1);
});

test('modules recompute runtime: failed derived write returns canonical writeFailed result', () => {
  const state: { config: AnyRec; ui: AnyRec } = {
    config: {
      wardrobeType: 'hinged',
      isLibraryMode: false,
      modulesConfiguration: [],
    },
    ui: {
      raw: { doors: 4 },
      structureSelect: '[2,2]',
      singleDoorPos: 'left',
    },
  };

  const reports: Array<[string, unknown, unknown]> = [];
  const App: AnyRec = {
    actions: {
      config: {
        setModulesConfiguration() {
          throw new Error('cfg exploded');
        },
      },
    },
    services: {},
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
    _domainApiReportNonFatal: (_app, op, err, meta) => {
      reports.push([op, err, meta]);
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

  assert.deepEqual(result, { ok: false, reason: 'writeFailed' });
  assert.equal(reports.length, 1);
  assert.equal(reports[0][0], 'actions.modules.recomputeFromUi.cfgSetScalarFallback');
  assert.deepEqual(reports[0][2], { throttleMs: 6000 });
});
