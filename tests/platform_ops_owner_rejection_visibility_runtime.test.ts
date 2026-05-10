import test from 'node:test';
import assert from 'node:assert/strict';

import {
  triggerRenderViaPlatform,
  stringifyViaPlatform,
  cloneViaPlatform,
  cleanGroupViaPlatform,
  pruneCachesSafeViaPlatform,
  afterPaintViaPlatform,
  hash32ViaPlatform,
} from '../esm/native/runtime/platform_access.ts';

function createAppWithDiagnostics() {
  const reports: Array<{ error: unknown; ctx: any }> = [];
  const App: any = {
    services: {
      errors: {
        report(error: unknown, ctx?: unknown) {
          reports.push({ error, ctx });
        },
      },
      platform: {
        triggerRender() {
          throw new Error('render owner failed');
        },
        util: {
          str() {
            throw new Error('stringifier owner failed');
          },
          clone() {
            throw new Error('clone owner failed');
          },
          cleanGroup() {
            throw new Error('clean group owner failed');
          },
          pruneCachesSafe() {
            throw new Error('prune owner failed');
          },
          afterPaint() {
            throw new Error('after paint owner failed');
          },
          hash32() {
            throw new Error('hash owner failed');
          },
        },
      },
    },
  };
  return { App, reports };
}

test('platform access reports owner rejection while preserving stable fallback results', () => {
  const { App, reports } = createAppWithDiagnostics();

  assert.equal(triggerRenderViaPlatform(App, true), false);
  assert.equal(stringifyViaPlatform(App, { a: 1 }, 'fallback'), '[object Object]');
  const value = { stable: true };
  assert.equal(cloneViaPlatform(App, value), value);
  assert.equal(cleanGroupViaPlatform(App, { children: [] }), false);
  assert.equal(pruneCachesSafeViaPlatform(App, {}), false);
  assert.equal(
    afterPaintViaPlatform(App, () => undefined),
    false
  );
  assert.equal(hash32ViaPlatform(App, 'abc'), null);

  assert.deepEqual(
    reports.map(report => report.ctx?.op),
    [
      'triggerRender.ownerRejected',
      'stringify.ownerRejected',
      'clone.ownerRejected',
      'cleanGroup.ownerRejected',
      'pruneCachesSafe.ownerRejected',
      'afterPaint.ownerRejected',
      'hash32.ownerRejected',
    ]
  );
  assert.ok(reports.every(report => report.ctx?.where === 'native/runtime/platform_access'));
  assert.ok(reports.every(report => report.ctx?.fatal === false));
});
