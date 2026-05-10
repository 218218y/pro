import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ensureMetaActions,
  getActionFn,
  saveProjectResultViaActions,
} from '../esm/native/runtime/actions_access.ts';

test('actions_access hydrates missing meta stubs without replacing real handlers and keeps owner binding intact', () => {
  const calls: Array<{ source?: string }> = [];
  const App: any = {
    actions: {
      meta: {
        __ownerId: 'meta-owner',
        touch(meta?: { source?: string }) {
          calls.push(meta || {});
          return this.__ownerId;
        },
      },
      sample: {
        count: 0,
        inc(step = 1) {
          this.count += step;
          return this.count;
        },
      },
    },
  };

  const meta = ensureMetaActions(App);
  assert.equal(meta.uiOnly({ source: 't' }).noBuild, true);
  assert.equal(meta.touch({ source: 'test:touch' }), 'meta-owner');
  assert.deepEqual(calls, [{ source: 'test:touch' }]);

  const inc = getActionFn<(step?: number) => number>(App, 'sample.inc');
  assert.equal(typeof inc, 'function');
  assert.equal(inc?.(2), 2);
  assert.equal(App.actions.sample.count, 2);
});

test('actions_access reports saveProject owner rejection while preserving error result recovery', () => {
  const reports: Array<{ error: unknown; ctx: any }> = [];
  const App: any = {
    services: {
      errors: {
        report: (error: unknown, ctx?: unknown) => reports.push({ error, ctx }),
      },
    },
    actions: {
      saveProject() {
        throw new Error('save owner exploded');
      },
    },
  };

  const result = saveProjectResultViaActions(App);

  assert.equal(result.ok, false);
  assert.equal(result.reason, 'error');
  assert.match(String(result.message), /save owner exploded/);
  assert.equal(reports.length, 1);
  assert.equal((reports[0].error as Error).message, 'save owner exploded');
  assert.deepEqual(reports[0].ctx, {
    where: 'native/runtime/actions_access',
    op: 'actions.saveProject.ownerRejected',
    fatal: false,
  });
});
