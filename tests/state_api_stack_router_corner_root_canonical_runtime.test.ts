import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ensureCornerRootDirect,
  type StateApiStackRouterContext,
} from '../esm/native/kernel/state_api_stack_router_shared.ts';
import { installStateApiStackRouterPatch } from '../esm/native/kernel/state_api_stack_router_patch.ts';

type AnyRec = Record<string, any>;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function createCtx(state: { config: AnyRec; ui: AnyRec }): StateApiStackRouterContext {
  const modulesNs: AnyRec = {};
  const cornerNs: AnyRec = {};
  const setCfgScalar = ((key: string, valueOrFn: unknown) => {
    const prev = state.config[key];
    const next = typeof valueOrFn === 'function' ? valueOrFn(prev) : valueOrFn;
    state.config[key] = next;
    return next;
  }) as (key: string, valueOrFn: unknown) => unknown;

  return {
    modulesNs,
    cornerNs,
    getSetCfgScalar: () => setCfgScalar,
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
    callSetCfgScalar: (key: string, valueOrFn: unknown) => setCfgScalar(key, valueOrFn),
    shallowCloneObj: (value: unknown) => clone((value && typeof value === 'object' ? value : {}) as AnyRec),
    safeCall: (fn: () => unknown) => fn(),
  };
}

test('state_api stack router top-corner ensure returns a detached canonical root snapshot', () => {
  const sourceCorner: AnyRec = {
    layout: 'hanging_top2',
    customMeta: { tags: ['seed'] },
    customData: {
      shelves: [false, false, false, false, false, false],
      rods: [false, false, false, false, false, false],
      storage: false,
    },
    modulesConfiguration: [{ layout: 'drawers', customData: { note: 'keep' } }],
  };

  const state = {
    config: {
      cornerConfiguration: sourceCorner,
    },
    ui: {
      cornerSide: 'right',
      cornerDoors: 2,
      stackSplitEnabled: false,
    },
  };

  const ctx = createCtx(state);
  const ensured = ensureCornerRootDirect(ctx, 'top') as AnyRec;

  assert.equal(ensured.layout, 'hanging_top2');
  assert.deepEqual(((ensured.customMeta as AnyRec) || {}).tags, ['seed']);
  assert.equal(((ensured.modulesConfiguration as AnyRec[]) || [])[0].layout, 'drawers');

  (ensured.customMeta as AnyRec).tags.push('leak');
  (ensured.customData as AnyRec).shelves[0] = true;
  ((ensured.modulesConfiguration as AnyRec[]) || [])[0].layout = 'changed';

  const storedCorner = state.config.cornerConfiguration as AnyRec;
  assert.deepEqual((storedCorner.customMeta as AnyRec).tags, ['seed']);
  assert.equal((storedCorner.customData as AnyRec).shelves[0], false);
  assert.equal(((storedCorner.modulesConfiguration as AnyRec[]) || [])[0].layout, 'drawers');
});

test('state_api stack router corner root patch detaches preserved unknown nested objects from previous config', () => {
  const sourceCorner: AnyRec = {
    layout: 'shelves',
    customMeta: { tags: ['seed'] },
    customData: {
      shelves: [false, false, false, false, false, false],
      rods: [false, false, false, false, false, false],
      storage: false,
    },
    modulesConfiguration: [{ layout: 'shelves' }],
  };

  const state = {
    config: {
      cornerConfiguration: sourceCorner,
    },
    ui: {
      cornerSide: 'right',
      cornerDoors: 2,
      stackSplitEnabled: false,
    },
  };

  const ctx = createCtx(state);
  installStateApiStackRouterPatch(ctx);

  (ctx.modulesNs as AnyRec).patchForStack(
    'top',
    'corner',
    { layout: 'drawers' },
    { source: 't:corner-root' }
  );

  sourceCorner.customMeta.tags.push('mutated-after-patch');

  const storedCorner = state.config.cornerConfiguration as AnyRec;
  assert.equal(storedCorner.layout, 'drawers');
  assert.deepEqual((storedCorner.customMeta as AnyRec).tags, ['seed']);
});
