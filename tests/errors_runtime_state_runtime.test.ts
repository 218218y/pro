import test from 'node:test';
import assert from 'node:assert/strict';

import { ensureErrorsService } from '../esm/native/runtime/errors_access.ts';
import {
  ensureErrorsRuntimeService,
  getErrorsRuntimeServiceMaybe,
  isErrorsFatalShown,
  setErrorsFatalShown,
} from '../esm/native/runtime/errors_runtime_access.ts';

test('errors fatal runtime state lives in canonical errorsRuntime service', () => {
  const App: any = {};
  const errors = ensureErrorsService(App);
  const runtime = ensureErrorsRuntimeService(App);

  assert.equal(App.services.errors, errors);
  assert.equal(App.services.errorsRuntime, runtime);
  assert.equal(Object.getPrototypeOf(runtime), null);

  assert.equal(isErrorsFatalShown(App), false);
  assert.equal(setErrorsFatalShown(App, true), true);
  assert.equal(isErrorsFatalShown(App), true);
  assert.equal(setErrorsFatalShown(App, false), false);
  assert.equal(isErrorsFatalShown(App), false);

  assert.equal((errors as any)._fatalShown, undefined);
  assert.equal(getErrorsRuntimeServiceMaybe(App), runtime);
});
