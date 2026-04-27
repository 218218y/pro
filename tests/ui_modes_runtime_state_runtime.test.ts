import test from 'node:test';
import assert from 'node:assert/strict';

import { installModesController } from '../esm/native/ui/modes.ts';
import { installUiPrimaryMode } from '../esm/native/ui/primary_mode.ts';
import {
  getModesControllerMaybe,
  getPrimaryModeEffectsMaybe,
  getUiModesRuntimeServiceMaybe,
} from '../esm/native/runtime/ui_modes_runtime_access.ts';

test('modes controller lives under canonical services.uiModesRuntime service', () => {
  const App = {
    services: {},
    store: {
      subscribe(listener?: () => void) {
        return () => {
          void listener;
        };
      },
      getState() {
        return { mode: { primary: 'none', opts: {} } };
      },
    },
  } as any;

  const controller = installModesController(App);
  const runtime = getUiModesRuntimeServiceMaybe(App);

  assert.ok(controller);
  assert.ok(runtime);
  assert.equal(runtime?.controller, controller);
  assert.equal(getModesControllerMaybe(App), controller);
  assert.equal((App.services as any).__modesController_v1, undefined);
});

test('primary mode effects live under canonical services.uiModesRuntime service', () => {
  const App = {
    services: {},
    store: {
      subscribe(listener?: () => void) {
        return () => {
          void listener;
        };
      },
      getState() {
        return { mode: { primary: 'none', opts: {} } };
      },
    },
  } as any;

  const render = installUiPrimaryMode(App);
  const runtime = getUiModesRuntimeServiceMaybe(App);
  const effects = getPrimaryModeEffectsMaybe(App);

  assert.equal(typeof render, 'function');
  assert.ok(runtime);
  assert.ok(effects);
  assert.equal(typeof effects?.apply, 'function');
  assert.equal(typeof effects?.render, 'function');
  assert.equal(runtime?.primaryModeEffects, effects);
  assert.equal((App.services as any).__primaryModeEffects_v1, undefined);
});

test('modes installs heal damaged runtime surfaces in place without replacing stable refs', () => {
  let subscribeCalls = 0;

  const App = {
    services: {},
    store: {
      subscribe(listener?: () => void) {
        subscribeCalls += 1;
        void listener;
        return () => {};
      },
      getState() {
        return { mode: { primary: 'none', opts: {} } };
      },
    },
  } as any;

  const controller = installModesController(App);
  const render = installUiPrimaryMode(App);
  const runtime = getUiModesRuntimeServiceMaybe(App);
  const effects = getPrimaryModeEffectsMaybe(App);

  assert.ok(controller);
  assert.equal(typeof render, 'function');
  assert.ok(runtime);
  assert.ok(effects);

  const applyRef = controller?.apply;
  const primaryGetterRef = controller?.getPrimaryMode;
  const renderRef = effects?.render;
  const effectsApplyRef = effects?.apply;

  delete controller?.togglePrimaryMode;
  (controller as any).unsub = null;
  (effects as any).unsub = null;

  const repairedController = installModesController(App);
  const repairedRender = installUiPrimaryMode(App);

  assert.equal(repairedController, controller);
  assert.equal(repairedController?.apply, applyRef);
  assert.equal(repairedController?.getPrimaryMode, primaryGetterRef);
  assert.equal(typeof repairedController?.togglePrimaryMode, 'function');
  assert.notEqual(repairedController?.unsub, null);

  assert.equal(repairedRender, renderRef);
  assert.equal(runtime?.primaryModeEffects, effects);
  assert.equal(effects?.apply, effectsApplyRef);
  assert.equal(effects?.render, renderRef);
  assert.notEqual(effects?.unsub, null);

  assert.equal(subscribeCalls, 4);
});

test('modes controller suppresses duplicate apply side effects when opts only reorder keys', () => {
  let listener: (() => void) | null = null;
  const handleCalls: Array<[string | null, unknown]> = [];
  let modeState = {
    primary: 'handle',
    opts: {
      handleType: 'bar',
      meta: { alpha: 1, beta: 2 },
    },
  };

  const App = {
    services: {
      tools: {
        setHandlesType(handleType: string | null, meta?: unknown) {
          handleCalls.push([handleType, meta]);
        },
      },
    },
    store: {
      subscribe(nextListener?: () => void) {
        listener = nextListener || null;
        return () => {
          listener = null;
        };
      },
      getState() {
        return { mode: modeState };
      },
    },
  } as any;

  installModesController(App);

  assert.equal(handleCalls.length, 1);
  assert.deepEqual(handleCalls[0], ['bar', { source: 'modes:handleType' }]);
  assert.equal(typeof listener, 'function');

  modeState = {
    primary: 'handle',
    opts: {
      meta: { beta: 2, alpha: 1 },
      handleType: 'bar',
    },
  };
  listener?.();
  assert.equal(handleCalls.length, 1);

  modeState = {
    primary: 'handle',
    opts: {
      meta: { beta: 2, alpha: 1 },
      handleType: 'matte',
    },
  };
  listener?.();
  assert.equal(handleCalls.length, 2);
  assert.deepEqual(handleCalls[1], ['matte', { source: 'modes:handleType' }]);
});
