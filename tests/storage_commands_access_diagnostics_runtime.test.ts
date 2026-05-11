import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getStorageString,
  getStorageJSON,
  setStorageString,
  setStorageJSON,
  removeStorageKey,
  getStorageKey,
} from '../esm/native/runtime/storage_access.ts';
import { getCommandsServiceMaybe } from '../esm/native/runtime/commands_access.ts';

function createDiagnosticsApp(service: Record<string, unknown>) {
  const reports: Array<{ error: unknown; ctx: any }> = [];
  const App: any = {
    services: {
      storage: service,
      errors: {
        report(error: unknown, ctx?: unknown) {
          reports.push({ error, ctx });
        },
      },
    },
  };
  return { App, reports };
}

test('storage access reports storage owner rejections without changing fallback results', () => {
  const { App, reports } = createDiagnosticsApp({
    KEYS: new Proxy(
      {},
      {
        get() {
          throw new Error('storage keys rejected');
        },
      }
    ),
    getString() {
      throw new Error('storage get string rejected');
    },
    getJSON() {
      throw new Error('storage get json rejected');
    },
    setString() {
      throw new Error('storage set string rejected');
    },
    setJSON() {
      throw new Error('storage set json rejected');
    },
    remove() {
      throw new Error('storage remove rejected');
    },
  });

  assert.equal(getStorageKey(App, 'SAVED_MODELS', 'models-default'), 'models-default');
  assert.equal(getStorageString(App, 'k'), null);
  assert.deepEqual(getStorageJSON(App, 'j', { ok: true }), { ok: true });
  assert.equal(setStorageString(App, 'k', 'v'), false);
  assert.equal(setStorageJSON(App, 'j', { v: 1 }), false);
  assert.equal(removeStorageKey(App, 'old'), false);

  assert.deepEqual(
    reports.map(entry => entry.ctx.op),
    [
      'getStorageKey',
      'getStorageString',
      'getStorageJSON',
      'setStorageString',
      'setStorageJSON',
      'removeStorageKey',
    ]
  );
  assert.ok(reports.every(entry => entry.ctx.where === 'native/runtime/storage_access'));
  assert.ok(reports.every(entry => entry.ctx.fatal === false));
});

test('commands access reports command-surface healing rejection while preserving null result', () => {
  const reports: Array<{ error: unknown; ctx: any }> = [];
  const commands = new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === 'rebuildWardrobe') throw new Error('commands method rejected');
        return undefined;
      },
    }
  );
  const App: any = {
    services: {
      commands,
      errors: {
        report(error: unknown, ctx?: unknown) {
          reports.push({ error, ctx });
        },
      },
    },
  };

  assert.equal(getCommandsServiceMaybe(App), null);
  assert.equal(reports.length, 1);
  assert.equal(reports[0].ctx.where, 'native/runtime/commands_access');
  assert.equal(reports[0].ctx.op, 'getCommandsServiceMaybe');
  assert.equal(reports[0].ctx.fatal, false);
});
