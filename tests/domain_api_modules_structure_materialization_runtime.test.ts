import test from 'node:test';
import assert from 'node:assert/strict';

import { installDomainApiModulesCorner } from '../esm/native/kernel/domain_api_modules_corner.ts';

type AnyRec = Record<string, any>;

function isRecord(value: unknown): value is AnyRec {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

test('domain_api retires module/corner routing aliases and preserves the canonical stack router', () => {
  const state: { config: AnyRec; ui: AnyRec } = {
    config: {
      modulesConfiguration: [{ layout: 'drawers', doors: 2 }],
      cornerConfiguration: { layout: 'shelves' },
    },
    ui: { raw: { doors: 2 } },
  };
  const ensureCalls: AnyRec[] = [];
  const patchCalls: AnyRec[] = [];
  const ensureForStack = (stack: unknown, moduleKey: unknown) => {
    ensureCalls.push({ stack, moduleKey });
    return { layout: 'shelves' };
  };
  const patchForStack = (stack: unknown, moduleKey: unknown, patch: unknown, meta: unknown) => {
    patchCalls.push({ stack, moduleKey, patch, meta });
    return patch;
  };
  const legacy = () => 'legacy';
  const modulesActions: AnyRec = {
    ensureForStack,
    patchForStack,
    ensureAt: legacy,
    ensureLowerAt: legacy,
    patchAt: legacy,
    patchLowerAt: legacy,
    patch: legacy,
  };
  const cornerActions: AnyRec = {
    ensureConfig: legacy,
    ensureLowerConfig: legacy,
    ensureCellAt: legacy,
    ensureLowerCellAt: legacy,
    patch: legacy,
    patchLower: legacy,
    patchCellAt: legacy,
    patchLowerCellAt: legacy,
  };
  const App: AnyRec = {
    services: {},
    store: {
      getState: () => ({ config: state.config, ui: state.ui }),
      patch: () => true,
    },
    actions: {
      config: {
        setModulesConfiguration(next: unknown) {
          state.config.modulesConfiguration = Array.isArray(next) ? next : [];
          return state.config.modulesConfiguration;
        },
        setCornerConfiguration(next: unknown) {
          state.config.cornerConfiguration = isRecord(next) ? next : {};
          return state.config.cornerConfiguration;
        },
      },
    },
  };
  const select: AnyRec = { modules: {}, corner: {} };

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

  assert.equal(modulesActions.ensureForStack, ensureForStack);
  assert.equal(modulesActions.patchForStack, patchForStack);
  for (const key of ['patch', 'ensureAt', 'ensureLowerAt', 'patchAt', 'patchLowerAt']) {
    assert.equal(modulesActions[key], undefined);
  }
  for (const key of [
    'ensureConfig',
    'ensureLowerConfig',
    'ensureCellAt',
    'ensureLowerCellAt',
    'patch',
    'patchLower',
    'patchCellAt',
    'patchLowerCellAt',
  ]) {
    assert.equal(cornerActions[key], undefined);
  }
  assert.equal(typeof modulesActions.setAll, 'function');
  assert.equal(typeof cornerActions.setConfig, 'function');
  assert.deepEqual(select.modules.list(), state.config.modulesConfiguration);
  assert.equal(select.corner.config().layout, 'shelves');

  modulesActions.setAll([{ layout: 'hanging' }], { source: 'test:set-all' });
  cornerActions.setConfig({ layout: 'drawers' }, { source: 'test:set-corner' });

  assert.equal(state.config.modulesConfiguration[0].layout, 'hanging');
  assert.equal(state.config.cornerConfiguration.layout, 'drawers');
  assert.deepEqual(ensureCalls, []);
  assert.deepEqual(patchCalls, []);
});
