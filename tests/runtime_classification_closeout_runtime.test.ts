import test from 'node:test';
import assert from 'node:assert/strict';

import { getBootStartEntry } from '../esm/native/runtime/boot_entry_access.ts';
import { getBootFlags } from '../esm/native/runtime/internal_state.ts';
import {
  writeDoorsRuntimeBool,
  writeDoorsRuntimeNumber,
} from '../esm/native/runtime/doors_access_services.ts';
import { writeStackSplitLowerTopY } from '../esm/native/runtime/cache_access.ts';

type DiagnosticContext = { where?: string; op?: string; fatal?: boolean };

function makeDiagnosticApp() {
  const diagnostics: Array<{ error: unknown; ctx: DiagnosticContext | undefined }> = [];
  const platform = {
    reportError(error: unknown, ctx?: DiagnosticContext) {
      diagnostics.push({ error, ctx });
    },
  };
  return { diagnostics, platform };
}

test('runtime classification closeout: boot entry reports rejected appStart lookup and continues to uiBoot', () => {
  const { diagnostics, platform } = makeDiagnosticApp();
  const services: Record<string, unknown> = {
    platform,
    uiBoot: { bootMain: () => 'ui-boot' },
  };
  Object.defineProperty(services, 'appStart', {
    configurable: true,
    get() {
      throw new Error('appStart getter rejected');
    },
  });
  const App = { services };

  const start = getBootStartEntry(App);
  assert.equal(start?.(), 'ui-boot');
  assert.equal(diagnostics.length, 1);
  assert.equal(diagnostics[0]?.ctx?.where, 'native/runtime/boot_entry_access');
  assert.equal(diagnostics[0]?.ctx?.op, 'appStart.lookup');
});

test('runtime classification closeout: internal boot state attachment rejection is observable and fail-soft', () => {
  const { diagnostics, platform } = makeDiagnosticApp();
  const App: Record<string, unknown> = { services: { platform } };
  Object.freeze(App);

  const flags = getBootFlags(App);
  assert.equal(typeof flags, 'object');
  assert.equal(diagnostics.length, 1);
  assert.equal(diagnostics[0]?.ctx?.where, 'native/runtime/internal_state');
  assert.equal(diagnostics[0]?.ctx?.op, 'internalRoot.attach');
});

test('runtime classification closeout: doors runtime write rejection is reported without throwing', () => {
  const { diagnostics, platform } = makeDiagnosticApp();
  const App = {
    services: {
      platform,
      doors: { runtime: Object.freeze({}) },
    },
  };

  assert.equal(writeDoorsRuntimeNumber(App, 'lastToggleTime', 123), 123);
  assert.equal(writeDoorsRuntimeBool(App, 'prevOpen', true), true);
  assert.deepEqual(
    diagnostics.map(entry => entry.ctx?.op),
    ['runtimeNumber.write:lastToggleTime', 'runtimeBool.write:prevOpen']
  );
});

test('runtime classification closeout: cache write rejection is reported and remains fail-soft', () => {
  const { diagnostics, platform } = makeDiagnosticApp();
  const App = {
    services: {
      platform,
      runtimeCache: Object.freeze({}),
    },
  };

  assert.doesNotThrow(() => writeStackSplitLowerTopY(App, 42));
  assert.equal(diagnostics.length, 1);
  assert.equal(diagnostics[0]?.ctx?.where, 'native/runtime/cache_access');
  assert.equal(diagnostics[0]?.ctx?.op, 'stackSplitLowerTopY.write');
});
