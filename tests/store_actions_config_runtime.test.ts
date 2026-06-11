import test from 'node:test';
import assert from 'node:assert/strict';

import {
  applyProjectConfigSnapshot,
  runHistoryBatch,
  setCfgColorSwatchesOrder,
  setCfgCustomUploadedDataURL,
  setCfgHandlesMap,
  setCfgHingeMap,
  setCfgLibraryMode,
  setCfgLowerModulesConfiguration,
  setCfgManualWidth,
  setCfgModulesConfiguration,
  setCfgMultiColorMode,
  setCfgPreChestState,
  setCfgSavedColors,
  setCfgSavedNotes,
  setCfgShowDimensions,
  setCfgWardrobeType,
} from '../esm/native/ui/react/actions/store_actions_config.ts';

type Call = { ns: string; method: string; args: unknown[] };

type AppHarness = {
  app: any;
  calls: Call[];
  state: {
    config: Record<string, unknown>;
    ui: Record<string, unknown>;
  };
};

function createHarness(): AppHarness {
  const calls: Call[] = [];
  const state = {
    config: {} as Record<string, unknown>,
    ui: {} as Record<string, unknown>,
  };

  const app: any = {
    actions: {},
    store: {
      getState: () => ({ config: state.config, ui: state.ui }),
      setConfig: (patch: Record<string, unknown>, meta?: unknown) => {
        calls.push({ ns: 'store', method: 'setConfig', args: [patch, meta] });
        state.config = { ...state.config, ...patch };
        return patch;
      },
      patch: (patch: Record<string, unknown>, meta?: unknown) => {
        calls.push({ ns: 'store', method: 'patch', args: [patch, meta] });
        if (patch && patch.config && typeof patch.config === 'object') {
          state.config = { ...state.config, ...(patch.config as Record<string, unknown>) };
        }
        if (patch && patch.ui && typeof patch.ui === 'object') {
          state.ui = { ...state.ui, ...(patch.ui as Record<string, unknown>) };
        }
        return patch;
      },
    },
  };

  const addNs = (ns: string, methods: Record<string, (...args: unknown[]) => unknown>) => {
    const bucket: Record<string, (...args: unknown[]) => unknown> = {};
    for (const [method, impl] of Object.entries(methods)) {
      bucket[method] = (...args: unknown[]) => {
        calls.push({ ns, method, args });
        return impl(...args);
      };
    }
    app.actions[ns] = bucket;
  };

  addNs('config', {
    setSavedNotes: () => undefined,
    setCustomUploadedDataURL: () => undefined,
    setPreChestState: () => undefined,
    applyProjectSnapshot: () => undefined,
    setHingeMap: () => undefined,
    setHandlesMap: () => undefined,
    setModulesConfiguration: () => undefined,
    setLowerModulesConfiguration: () => undefined,
    setScalar: (key: unknown, value: unknown) => {
      state.config[String(key)] = value;
      return value;
    },
    setMap: (key: unknown, value: unknown) => {
      state.config[String(key)] = value;
      return value;
    },
  });

  addNs('colors', {
    setSavedColors: () => undefined,
    setColorSwatchesOrder: () => undefined,
  });

  addNs('history', {
    batch: (fn: unknown) => {
      if (typeof fn === 'function') fn();
      return true;
    },
  });

  return { app, calls, state };
}

test('store actions config prefers focused action namespaces and normalizes maps/list payloads', () => {
  const h = createHarness();

  setCfgSavedNotes(h.app, [{ id: 'note-1' }, null, 'x', { text: 'ok' }], { source: 'notes' });
  setCfgCustomUploadedDataURL(h.app, '   https://cdn.test/texture.png   ', { source: 'upload' });
  setCfgPreChestState(h.app, { left: true, right: false }, { source: 'prechest' });
  applyProjectConfigSnapshot(
    h.app,
    {
      modulesConfiguration: [{ id: 'm1' }],
      hingeMap: { d1: 'left' },
    },
    { source: 'snapshot' }
  );
  setCfgHingeMap(h.app, { d1: 'left', d2: { mode: 'swing' }, bad: 42 }, { source: 'hinge' });
  setCfgHandlesMap(h.app, { d1: 'bar', d2: null, bad: 42 }, { source: 'handles' });
  setCfgModulesConfiguration(h.app, [{ id: 'm1' }, null, 'skip', { id: 'm2' }], { source: 'modules' });
  setCfgLowerModulesConfiguration(h.app, [{ id: 'lm1' }, 1, { id: 'lm2' }], { source: 'lower' });
  setCfgSavedColors(h.app, ['oak', { id: 'c1', value: '#fff' }, { id: '' }, 7], { source: 'colors' });
  setCfgColorSwatchesOrder(h.app, ['a', null, '  ', 'b'], { source: 'order' });

  let ran = false;
  runHistoryBatch(
    h.app,
    () => {
      ran = true;
    },
    { source: 'history' }
  );

  assert.equal(ran, true);

  assert.deepEqual(
    h.calls.filter(call => call.ns !== 'store').map(call => [call.ns, call.method, call.args[0]]),
    [
      ['config', 'setSavedNotes', [{ id: 'note-1' }, { text: 'ok' }]],
      ['config', 'setCustomUploadedDataURL', 'https://cdn.test/texture.png'],
      ['config', 'setPreChestState', { left: true, right: false }],
      ['config', 'applyProjectSnapshot', { modulesConfiguration: [{ id: 'm1' }], hingeMap: { d1: 'left' } }],
      ['config', 'setHingeMap', Object.assign(Object.create(null), { d1: 'left', d2: { mode: 'swing' } })],
      ['config', 'setHandlesMap', Object.assign(Object.create(null), { d1: 'bar', d2: null })],
      ['config', 'setModulesConfiguration', [{ id: 'm1' }, { id: 'm2' }]],
      ['config', 'setLowerModulesConfiguration', [{ id: 'lm1' }, { id: 'lm2' }]],
      ['colors', 'setSavedColors', ['oak', { id: 'c1', value: '#fff' }]],
      ['colors', 'setColorSwatchesOrder', ['a', 'b']],
      ['history', 'batch', h.calls.find(call => call.ns === 'history' && call.method === 'batch')?.args[0]],
    ]
  );
});

test('store actions config falls back to canonical scalar/map writers and replace-key snapshots', () => {
  const h = createHarness();
  delete h.app.actions.config.setSavedNotes;
  delete h.app.actions.config.setCustomUploadedDataURL;
  delete h.app.actions.config.setPreChestState;
  delete h.app.actions.config.applyProjectSnapshot;
  delete h.app.actions.config.setHingeMap;
  delete h.app.actions.config.setHandlesMap;
  delete h.app.actions.config.setModulesConfiguration;
  delete h.app.actions.config.setLowerModulesConfiguration;
  delete h.app.actions.colors.setSavedColors;
  delete h.app.actions.colors.setColorSwatchesOrder;
  delete h.app.actions.history.batch;

  setCfgSavedNotes(h.app, [{ id: 'note-1' }, 'skip'], { source: 'notes' });
  setCfgCustomUploadedDataURL(h.app, '   ', { source: 'upload' });
  setCfgPreChestState(h.app, { keep: true }, { source: 'prechest' });
  applyProjectConfigSnapshot(
    h.app,
    { modulesConfiguration: [{ id: 'm1' }], handlesMap: { d1: 'bar' } },
    { source: 'snapshot' }
  );
  setCfgHingeMap(h.app, { d1: 'left', bad: 99 }, { source: 'hinge' });
  setCfgHandlesMap(h.app, { d1: 'bar', bad: 88 }, { source: 'handles' });
  setCfgModulesConfiguration(h.app, [{ id: 'm1' }, 'skip'], { source: 'modules' });
  setCfgLowerModulesConfiguration(h.app, [{ id: 'lm1' }, false], { source: 'lower' });
  setCfgSavedColors(h.app, ['oak', { id: 'c1', value: '#fff' }, { nope: true }], { source: 'colors' });
  setCfgColorSwatchesOrder(h.app, ['oak', '', 'birch'], { source: 'order' });
  setCfgManualWidth(h.app, 0, { source: 'manual-width' });
  setCfgWardrobeType(h.app, 'sliding', { source: 'wardrobe' });
  setCfgShowDimensions(h.app, 1, { source: 'dims' });
  setCfgLibraryMode(h.app, '', { source: 'library' });
  setCfgMultiColorMode(h.app, 'yes', { source: 'multi' });

  let ran = false;
  runHistoryBatch(h.app, () => {
    ran = true;
  });
  assert.equal(ran, true);

  const configCalls = h.calls.filter(call => call.ns === 'config');
  assert.deepEqual(
    configCalls.map(call => [call.method, call.args[0], call.args[1]]),
    [
      ['setScalar', 'savedNotes', [{ id: 'note-1' }]],
      ['setScalar', 'customUploadedDataURL', null],
      ['setScalar', 'preChestState', { keep: true }],
      ['setMap', 'hingeMap', { d1: 'left' }],
      ['setMap', 'handlesMap', { d1: 'bar' }],
      ['setScalar', 'modulesConfiguration', [{ id: 'm1' }, 'skip']],
      ['setScalar', 'stackSplitLowerModulesConfiguration', [{ id: 'lm1' }, false]],
      ['setScalar', 'savedColors', ['oak', { id: 'c1', value: '#fff' }]],
      ['setScalar', 'colorSwatchesOrder', ['oak', 'birch']],
      ['setScalar', 'isManualWidth', false],
      ['setScalar', 'wardrobeType', 'sliding'],
      ['setScalar', 'showDimensions', true],
      ['setScalar', 'isLibraryMode', false],
      ['setScalar', 'isMultiColorMode', true],
    ]
  );

  const storeCalls = h.calls.filter(call => call.ns === 'store');
  assert.deepEqual(storeCalls, [
    {
      ns: 'store',
      method: 'setConfig',
      args: [
        {
          modulesConfiguration: [{ id: 'm1' }],
          handlesMap: { d1: 'bar' },
          __replace: {
            modulesConfiguration: true,
            stackSplitLowerModulesConfiguration: true,
            cornerConfiguration: true,
            groovesMap: true,
            splitDoorsMap: true,
            splitDoorsBottomMap: true,
            removedDoorsMap: true,
            drawerDividersMap: true,
            individualColors: true,
            doorSpecialMap: true,
            doorStyleMap: true,
            savedColors: true,
            handlesMap: true,
            hingeMap: true,
            curtainMap: true,
            doorTrimMap: true,
          },
        },
        { source: 'snapshot' },
      ],
    },
  ]);
});
