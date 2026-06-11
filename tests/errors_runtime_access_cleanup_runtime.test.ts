import test from 'node:test';
import assert from 'node:assert/strict';

import {
  clearErrorsWindowEventsCleanup,
  getErrorsRuntimeServiceMaybe,
  getErrorsWindowEventsCleanup,
  setErrorsWindowEventsCleanup,
} from '../esm/native/runtime/errors_runtime_access.ts';

test('errors runtime access cleanup: clears and executes the canonical window cleanup seam once', () => {
  const calls: string[] = [];
  const App: any = {};

  const cleanup = () => {
    calls.push('cleanup');
  };

  assert.equal(getErrorsRuntimeServiceMaybe(App), null);
  assert.equal(setErrorsWindowEventsCleanup(App, cleanup), cleanup);
  assert.equal(getErrorsWindowEventsCleanup(App), cleanup);

  clearErrorsWindowEventsCleanup(App);

  assert.deepEqual(calls, ['cleanup']);
  assert.equal(getErrorsWindowEventsCleanup(App), null);
  assert.equal(getErrorsRuntimeServiceMaybe(App)?.windowEventsCleanup, null);
});

test('errors runtime access cleanup: swallows cleanup failures and still clears the canonical slot', () => {
  const App: any = {};

  setErrorsWindowEventsCleanup(App, () => {
    throw new Error('cleanup exploded');
  });

  assert.doesNotThrow(() => clearErrorsWindowEventsCleanup(App));
  assert.equal(getErrorsWindowEventsCleanup(App), null);
  assert.equal(getErrorsRuntimeServiceMaybe(App)?.windowEventsCleanup, null);
});
