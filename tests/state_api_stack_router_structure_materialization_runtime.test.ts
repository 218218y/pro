import test from 'node:test';
import assert from 'node:assert/strict';

import { installStateApiStackRouterEnsure } from '../esm/native/kernel/state_api_stack_router_ensure.ts';
import { installStateApiStackRouterPatch } from '../esm/native/kernel/state_api_stack_router_patch.ts';

type AnyRec = Record<string, any>;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

test('state_api stack router materializes missing top modules with structure-aware doors for ensure and patch fallbacks', () => {
  const state: { config: AnyRec; ui: AnyRec } = {
    config: {
      wardrobeType: 'hinged',
      modulesConfiguration: [{ layout: 'drawers', doors: 2 }],
    },
    ui: {
      raw: { doors: 5 },
      structureSelect: '[2,2,1]',
      stackSplitEnabled: false,
    },
  };

  const modulesNs: AnyRec = {};
  const cornerNs: AnyRec = {};

  const ctx = {
    modulesNs,
    cornerNs,
    getSetCfgScalar: () =>
      ((key: string, valueOrFn: unknown) => {
        const prev = state.config[key];
        const next = typeof valueOrFn === 'function' ? valueOrFn(prev) : valueOrFn;
        state.config[key] = next;
        return Array.isArray(next) ? (next[2] ?? next) : next;
      }) as (key: string, valueOrFn: unknown) => unknown,
    mergeMeta: (_meta: unknown, defaults: AnyRec, sourceFallback: string) => ({
      ...defaults,
      source: sourceFallback,
    }),
    normMeta: (meta: unknown, source: string) => ({
      ...(meta && typeof meta === 'object' ? (meta as AnyRec) : {}),
      source,
    }),
    readCfgSnapshot: () => state.config,
    readUiSnapshot: () => state.ui,
    callSetCfgScalar: (key: string, valueOrFn: unknown) => {
      const prev = state.config[key];
      const next = typeof valueOrFn === 'function' ? valueOrFn(prev) : valueOrFn;
      state.config[key] = next;
      return Array.isArray(next) ? (next[2] ?? next) : next;
    },
    shallowCloneObj: (value: unknown) => clone((value && typeof value === 'object' ? value : {}) as AnyRec),
    safeCall: (fn: () => unknown) => fn(),
  };

  installStateApiStackRouterEnsure(ctx);
  installStateApiStackRouterPatch(ctx);

  const ensured = modulesNs.ensureForStack('top', 2);
  assert.equal(ensured.doors, 1);
  assert.equal(ensured.layout, 'shelves');

  modulesNs.patchForStack(
    'top',
    2,
    { customData: { storage: true } },
    { source: 'test:state-api-top-module' }
  );

  const modules = Array.isArray(state.config.modulesConfiguration) ? state.config.modulesConfiguration : [];
  assert.equal(modules.length, 3);
  assert.equal(modules[2].doors, 1);
  assert.equal(modules[2].layout, 'shelves');
  assert.equal(modules[2].customData?.storage, true);
});
