import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ensureStateKernelService,
  getStateKernelService,
} from '../esm/native/kernel/state_kernel_service.ts';
import { ensureHistoryService, getHistoryServiceMaybe } from '../esm/native/runtime/history_system_access.ts';
import { getHistorySystem, setHistorySystem } from '../esm/native/kernel/history_access.ts';

test('kernel/history service slot runtime: canonical helpers reuse one shared services root and preserve slot identity', () => {
  const App: any = {};

  const stateKernel = ensureStateKernelService(App);
  const history = ensureHistoryService(App);

  assert.equal(typeof App.services, 'object');
  assert.equal(Object.getPrototypeOf(App.services), null);
  assert.equal(App.services.stateKernel, stateKernel);
  assert.equal(App.services.history, history);
  assert.equal(getStateKernelService(App), stateKernel);
  assert.equal(getHistoryServiceMaybe(App), history);
  assert.equal(Object.getPrototypeOf(stateKernel), null);
  assert.equal(Object.getPrototypeOf(history), null);

  const stateKernel2 = ensureStateKernelService(App);
  const history2 = ensureHistoryService(App);
  assert.equal(stateKernel2, stateKernel);
  assert.equal(history2, history);
});

test('kernel/history service slot runtime: history setter writes into canonical history service slot', () => {
  const App: any = {};
  const hs = { id: 'history-system' };

  setHistorySystem(App, hs as any);

  assert.equal(getHistorySystem(App as any), hs as any);
  assert.equal(getHistoryServiceMaybe(App)?.system, hs as any);
});
