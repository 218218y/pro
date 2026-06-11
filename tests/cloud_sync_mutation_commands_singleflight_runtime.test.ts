import test from 'node:test';
import assert from 'node:assert/strict';

import {
  deleteTemporaryColorsWithConfirm,
  deleteTemporaryModelsWithConfirm,
} from '../esm/native/ui/cloud_sync_mutation_commands.ts';

test('cloud sync delete-temp commands reuse one pending models cleanup flow per app', async () => {
  const confirmTitles: string[] = [];
  let confirmYes: (() => void) | null = null;
  let deleteCalls = 0;
  let releaseDelete: ((value: { ok: true; removed: number }) => void) | null = null;
  const deleteGate = new Promise<{ ok: true; removed: number }>(resolve => {
    releaseDelete = resolve;
  });

  const App = {
    services: {
      uiFeedback: {
        confirm(title: string, _message: string, onYes?: (() => void) | null) {
          confirmTitles.push(title);
          confirmYes = onYes || null;
        },
      },
      cloudSync: {
        panelApi: {
          deleteTemporaryModels() {
            deleteCalls += 1;
            return deleteGate;
          },
        },
      },
    },
  } as any;

  const first = deleteTemporaryModelsWithConfirm(App);
  const second = deleteTemporaryModelsWithConfirm(App);

  assert.equal(first, second);
  await Promise.resolve();
  assert.deepEqual(confirmTitles, ['מחיקת דגמים זמניים']);
  assert.equal(deleteCalls, 0);

  confirmYes?.();
  await Promise.resolve();
  assert.equal(deleteCalls, 1);

  releaseDelete?.({ ok: true, removed: 4 });
  assert.deepEqual(await first, { ok: true, removed: 4 });
  assert.equal(deleteCalls, 1);
});

test('cloud sync delete-temp commands block conflicting cleanup family actions while one is pending', async () => {
  const confirmTitles: string[] = [];
  let confirmYes: (() => void) | null = null;
  let modelDeleteCalls = 0;
  let colorDeleteCalls = 0;
  let releaseDelete: ((value: { ok: true; removed: number }) => void) | null = null;
  const deleteGate = new Promise<{ ok: true; removed: number }>(resolve => {
    releaseDelete = resolve;
  });

  const App = {
    services: {
      uiFeedback: {
        confirm(title: string, _message: string, onYes?: (() => void) | null) {
          confirmTitles.push(title);
          confirmYes = onYes || null;
        },
      },
      cloudSync: {
        panelApi: {
          deleteTemporaryModels() {
            modelDeleteCalls += 1;
            return deleteGate;
          },
          deleteTemporaryColors() {
            colorDeleteCalls += 1;
            return Promise.resolve({ ok: true, removed: 2 });
          },
        },
      },
    },
  } as any;

  const inflightModels = deleteTemporaryModelsWithConfirm(App);
  const busyColors = await deleteTemporaryColorsWithConfirm(App);

  assert.deepEqual(busyColors, { ok: false, removed: 0, reason: 'busy' });
  assert.deepEqual(confirmTitles, ['מחיקת דגמים זמניים']);
  assert.equal(modelDeleteCalls, 0);
  assert.equal(colorDeleteCalls, 0);

  confirmYes?.();
  await Promise.resolve();
  assert.equal(modelDeleteCalls, 1);

  releaseDelete?.({ ok: true, removed: 5 });
  assert.deepEqual(await inflightModels, { ok: true, removed: 5 });
  assert.equal(colorDeleteCalls, 0);
});
