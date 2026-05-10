import test from 'node:test';
import assert from 'node:assert/strict';

import { createStateApiInstallSupport } from '../esm/native/kernel/state_api_install_support.ts';

type AnyRecord = Record<string, unknown>;

type PatchCall = {
  op: string;
  payload: AnyRecord;
  meta: AnyRecord;
};

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function mergeRecord(target: AnyRecord, patch: unknown): void {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) return;
  const rec = patch as AnyRecord;
  for (const key of Object.keys(rec)) {
    const next = rec[key];
    if (
      next &&
      typeof next === 'object' &&
      !Array.isArray(next) &&
      target[key] &&
      typeof target[key] === 'object' &&
      !Array.isArray(target[key])
    ) {
      mergeRecord(target[key] as AnyRecord, next);
      continue;
    }
    target[key] = next;
  }
}

function createInteractiveUiHarness(initialUi: AnyRecord = {}) {
  const state = {
    ui: {
      raw: {},
      ...clone(initialUi),
    } as AnyRecord,
    runtime: {},
    mode: {},
    config: {},
    meta: {},
  };
  const calls: PatchCall[] = [];
  const store = {
    getState: () => state,
    patch(payload: AnyRecord, meta?: AnyRecord) {
      calls.push({ op: 'store.patch', payload: clone(payload), meta: clone(meta || {}) });
      if (payload.ui) mergeRecord(state.ui, payload.ui);
      if (payload.runtime) mergeRecord(state.runtime, payload.runtime);
      if (payload.mode) mergeRecord(state.mode, payload.mode);
      if (payload.config) mergeRecord(state.config, payload.config);
      if (payload.meta) mergeRecord(state.meta, payload.meta);
      return 'store.patch';
    },
    setUi(patch: AnyRecord, meta?: AnyRecord) {
      calls.push({ op: 'store.setUi', payload: clone(patch), meta: clone(meta || {}) });
      mergeRecord(state.ui, patch);
      return 'store.setUi';
    },
  };
  const app = { store };
  const support = createStateApiInstallSupport(app as never, store);
  return { state, calls, support };
}

test('[stage4-ui-build-reactivity] interactive ui commits update state once through root store.patch', () => {
  const { state, calls, support } = createInteractiveUiHarness({
    baseType: 'plinth',
    colorChoice: '#ffffff',
    hasCornice: false,
    corniceType: '',
    groovesEnabled: false,
  });

  const cases: Array<{ patch: AnyRecord; meta: AnyRecord; expectedUi: AnyRecord }> = [
    {
      patch: { baseType: 'legs' },
      meta: { source: 'react:structure:baseType', immediate: true },
      expectedUi: { baseType: 'legs' },
    },
    {
      patch: { baseType: 'none' },
      meta: { source: 'react:structure:baseType', immediate: true },
      expectedUi: { baseType: 'none' },
    },
    {
      patch: { baseType: 'plinth' },
      meta: { source: 'react:structure:baseType', immediate: true },
      expectedUi: { baseType: 'plinth' },
    },
    {
      patch: { colorChoice: '#123456' },
      meta: { source: 'react:design:colorChoice', immediate: true },
      expectedUi: { colorChoice: '#123456' },
    },
    {
      patch: { hasCornice: true },
      meta: { source: 'react:design:hasCornice', immediate: true },
      expectedUi: { hasCornice: true },
    },
    {
      patch: { groovesEnabled: true },
      meta: { source: 'react:design:groovesEnabled', immediate: true },
      expectedUi: { groovesEnabled: true },
    },
  ];

  for (const entry of cases) {
    const before = calls.length;
    const out = support.commitUiPatch(entry.patch, entry.meta);
    assert.equal(out, 'store.patch');
    assert.equal(calls.length, before + 1);
    assert.equal(calls[before].op, 'store.patch');
    assert.deepEqual(calls[before].payload, { ui: entry.patch });
    assert.deepEqual(calls[before].meta, entry.meta);
    assert.equal(calls[before].meta.noBuild, undefined);
    for (const [key, value] of Object.entries(entry.expectedUi)) {
      assert.deepEqual(state.ui[key], value);
    }
  }

  assert.equal(calls.filter(call => call.op === 'store.setUi').length, 0);
});

test('[stage4-ui-build-reactivity] explicit no-build structural ui commits still patch root state only once', () => {
  const { state, calls, support } = createInteractiveUiHarness({
    stackSplitEnabled: false,
    raw: {
      stackSplitLowerHeight: 80,
      stackSplitLowerDepth: 55,
      stackSplitLowerWidth: 160,
      stackSplitLowerDoors: 4,
    },
  });

  const patch = {
    stackSplitEnabled: true,
    raw: {
      stackSplitLowerHeight: 90,
      stackSplitLowerDepth: 50,
      stackSplitLowerWidth: 150,
      stackSplitLowerDoors: 2,
      stackSplitLowerDoorsManual: true,
    },
  };
  const meta = { source: 'react:structure:stackSplit:on', immediate: true, noBuild: true };

  const out = support.commitUiPatch(patch, meta);

  assert.equal(out, 'store.patch');
  assert.deepEqual(calls, [{ op: 'store.patch', payload: { ui: patch }, meta }]);
  assert.equal(calls[0].meta.noBuild, true);
  assert.equal(state.ui.stackSplitEnabled, true);
  assert.deepEqual((state.ui.raw as AnyRecord).stackSplitLowerDoors, 2);
  assert.equal(calls.filter(call => call.op === 'store.setUi').length, 0);
});
