import test from 'node:test';
import assert from 'node:assert/strict';

import { runProjectRestoreAction } from '../esm/native/ui/project_recovery_runtime_restore.ts';
import { runProjectResetDefaultAction } from '../esm/native/ui/project_recovery_runtime_reset.ts';

test('project recovery runtime reuses duplicate restore actions per app and reports once', async () => {
  const toasts: Array<{ message: string; type: string | undefined }> = [];
  const fb = {
    toast(message: string, type?: string) {
      toasts.push({ message, type });
    },
  };

  let restoreCalls = 0;
  let releaseRestore: ((value: { ok: true; restoreGen: number }) => void) | null = null;
  const restoreGate = new Promise<{ ok: true; restoreGen: number }>(resolve => {
    releaseRestore = resolve;
  });

  const App = {} as any;
  const restore = async () => {
    restoreCalls += 1;
    return await restoreGate;
  };

  const first = runProjectRestoreAction(App, fb, restore);
  const second = runProjectRestoreAction(App, fb, restore);

  assert.equal(first, second);
  await Promise.resolve();
  assert.equal(restoreCalls, 1);
  assert.deepEqual(toasts, []);

  releaseRestore?.({ ok: true, restoreGen: 1 });
  assert.deepEqual(await first, { ok: true, restoreGen: 1 });
  assert.equal(restoreCalls, 1);
  assert.deepEqual(toasts, [{ message: 'העריכה שוחזרה בהצלחה!', type: 'success' }]);
});

test('project recovery runtime blocks conflicting reset while restore is inflight', async () => {
  const toasts: Array<{ message: string; type: string | undefined }> = [];
  const fb = {
    toast(message: string, type?: string) {
      toasts.push({ message, type });
    },
  };

  let restoreCalls = 0;
  let resetCalls = 0;
  let releaseRestore: ((value: { ok: true; restoreGen: number }) => void) | null = null;
  const restoreGate = new Promise<{ ok: true; restoreGen: number }>(resolve => {
    releaseRestore = resolve;
  });

  const App = {} as any;
  const inflightRestore = runProjectRestoreAction(App, fb, async () => {
    restoreCalls += 1;
    return await restoreGate;
  });

  const busy = await runProjectResetDefaultAction(App, fb, async () => {
    resetCalls += 1;
    return { ok: true };
  });

  assert.deepEqual(busy, { ok: false, reason: 'busy' });
  assert.equal(resetCalls, 0);
  assert.equal(restoreCalls, 1);
  assert.deepEqual(toasts, [{ message: 'פעולת פרויקט אחרת כבר מתבצעת כרגע', type: 'info' }]);

  releaseRestore?.({ ok: true, restoreGen: 1 });
  assert.deepEqual(await inflightRestore, { ok: true, restoreGen: 1 });
  assert.deepEqual(toasts, [
    { message: 'פעולת פרויקט אחרת כבר מתבצעת כרגע', type: 'info' },
    { message: 'העריכה שוחזרה בהצלחה!', type: 'success' },
  ]);
});
