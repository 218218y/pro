import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createSaveLoadController,
  loadProjectSaveLoadControllerModule,
} from './project_save_load_controller_runtime_helpers.js';

test('[project-save-load-controller] load action seam reuses same-key inflight loads and reports busy for conflicting ones', async () => {
  const reportCalls = [];
  const saveActionHolder = { current: null };
  let loadCalls = 0;
  let releaseLoad;
  const loadGate = new Promise(resolve => {
    releaseLoad = resolve;
  });

  const mod = loadProjectSaveLoadControllerModule({
    api: {
      handleProjectFileLoadViaService: async (_app, evt) => {
        loadCalls += 1;
        await loadGate;
        const target = (evt && typeof evt === 'object' && (evt.currentTarget || evt.target)) || null;
        const value =
          target && typeof target === 'object' && 'value' in target ? String(target.value || '') : '';
        return { ok: true, pending: false, value };
      },
    },
    feedback: {
      reportProjectLoadResult: (_fb, result) => {
        reportCalls.push(['load', result]);
        return result;
      },
      reportProjectSaveResult: (_fb, result) => {
        reportCalls.push(['save', result]);
        return result;
      },
    },
    browser: {
      normalizeDownloadFilename: value => value,
      downloadJsonTextResultViaBrowser: () => ({ ok: true }),
    },
  });

  const controller = createSaveLoadController(mod, saveActionHolder);
  const inputA = { value: 'same.json' };
  const inputB = { value: 'same.json' };

  const first = controller.handleLoadInputChange({ currentTarget: inputA });
  const second = controller.handleLoadInputChange({ currentTarget: inputB });

  assert.notEqual(first, null);
  assert.notEqual(second, null);
  await Promise.resolve();
  assert.equal(loadCalls, 1);
  assert.equal(inputA.value, 'same.json');
  assert.equal(inputB.value, '');
  assert.deepEqual(reportCalls, []);

  const inputBusy = { value: 'other.json' };
  const busyResult = await controller.handleLoadInputChange({ currentTarget: inputBusy });
  assert.deepEqual(busyResult, { ok: false, reason: 'busy' });
  assert.equal(loadCalls, 1);
  assert.equal(inputBusy.value, '');
  assert.deepEqual(reportCalls, [['load', { ok: false, reason: 'busy' }]]);

  releaseLoad();
  await first;

  assert.equal(inputA.value, '');
  assert.deepEqual(reportCalls, [
    ['load', { ok: false, reason: 'busy' }],
    ['load', { ok: true, pending: false, value: 'same.json' }],
  ]);

  const inputC = { value: 'third.json' };
  await controller.handleLoadInputChange({ currentTarget: inputC });
  assert.equal(loadCalls, 2);
  assert.equal(inputC.value, '');
  assert.deepEqual(reportCalls, [
    ['load', { ok: false, reason: 'busy' }],
    ['load', { ok: true, pending: false, value: 'same.json' }],
    ['load', { ok: true, pending: false, value: 'third.json' }],
  ]);
});
