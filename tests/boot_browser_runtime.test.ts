import test from 'node:test';
import assert from 'node:assert/strict';

import { runBrowserBootRuntime } from '../esm/boot/boot_browser_runtime.js';

function createWindowHarness() {
  const listeners = new Map<string, Array<(event: any) => unknown>>();
  const win: any = {
    addEventListener(type: string, handler: (event: any) => unknown) {
      const bag = listeners.get(type) || [];
      bag.push(handler);
      listeners.set(type, bag);
    },
  };
  return { win, listeners };
}

test('browser boot runtime orchestrates react mount, boot start, debug surface, and beforeunload guard', async () => {
  const calls: string[] = [];
  const flushes: string[] = [];
  const reports: string[] = [];
  const { win, listeners } = createWindowHarness();
  const doc = {} as any;
  const app: any = {
    boot: {
      start() {
        calls.push('boot.start');
      },
    },
    autosave: {
      flush() {
        flushes.push('autosave');
      },
    },
    historySvc: {
      flush() {
        flushes.push('history');
      },
    },
    store: {
      getState() {
        return { meta: { dirty: true } };
      },
    },
  };

  await runBrowserBootRuntime({
    app,
    window: win,
    document: doc,
    report: (_err, meta) => reports.push(`${meta.phase}:${meta.op}`),
    mountReactUi() {
      calls.push('react.mount');
    },
    startBootUi: true,
    installDebugSurface() {
      calls.push('debug.install');
    },
    installBeforeUnloadGuard: true,
  });

  assert.deepEqual(calls, ['react.mount', 'boot.start', 'debug.install']);
  assert.deepEqual(reports, []);

  const handler = listeners.get('beforeunload')?.[0];
  assert.equal(typeof handler, 'function');
  const event: any = {
    prevented: false,
    returnValue: undefined,
    preventDefault() {
      this.prevented = true;
    },
  };

  const result = handler?.(event);
  assert.equal(event.prevented, true);
  assert.equal(event.returnValue, 'יש שינויים שלא נשמרו. לצאת בכל זאת?');
  assert.equal(result, 'יש שינויים שלא נשמרו. לצאת בכל זאת?');
  assert.deepEqual(flushes, ['autosave', 'history']);
});

test('browser boot runtime reports and propagates a required React mount failure', async () => {
  const expected = new Error('missing canonical React shell');
  const reports: Array<{ error: unknown; phase?: string; op: string }> = [];
  const { win } = createWindowHarness();

  await assert.rejects(
    runBrowserBootRuntime({
      app: {} as any,
      window: win,
      document: {} as any,
      report: (error, meta) => reports.push({ error, ...meta }),
      mountReactUi() {
        throw expected;
      },
      startBootUi: true,
    }),
    expected
  );

  assert.deepEqual(reports, [{ error: expected, phase: 'reactUi', op: 'mount' }]);
});
