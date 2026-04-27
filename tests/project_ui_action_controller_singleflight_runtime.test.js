import test from 'node:test';
import assert from 'node:assert/strict';

import { createController } from './project_ui_action_controller_runtime_helpers.js';

test('[project-ui-controller] restore single-flights duplicate inflight requests', async () => {
  let restoreCalls = 0;
  let releaseRestore;
  const restoreGate = new Promise(resolve => {
    releaseRestore = resolve;
  });
  const { controller, reportCalls } = createController({
    restoreLastSession: async () => {
      restoreCalls += 1;
      await restoreGate;
      return { ok: true, restoreGen: restoreCalls };
    },
  });

  const first = controller.restoreLastSession();
  const second = controller.restoreLastSession();
  assert.notEqual(first, null);
  assert.notEqual(second, null);
  await Promise.resolve();
  assert.equal(restoreCalls, 1);

  releaseRestore();
  await first;
  assert.equal(restoreCalls, 1);
  assert.equal(
    JSON.stringify(reportCalls.map(([kind, _fb, result]) => [kind, result])),
    JSON.stringify([['restore', { ok: true, restoreGen: 1 }]])
  );

  await controller.restoreLastSession();
  assert.equal(restoreCalls, 2);
});

test('[project-ui-controller] reset single-flights duplicate inflight requests', async () => {
  let resetCalls = 0;
  let releaseReset;
  const resetGate = new Promise(resolve => {
    releaseReset = resolve;
  });
  const { controller, reportCalls } = createController({
    resetToDefaultProject: async () => {
      resetCalls += 1;
      await resetGate;
      return { ok: true, resetGen: resetCalls };
    },
  });

  const first = controller.resetToDefault();
  const second = controller.resetToDefault();
  assert.notEqual(first, null);
  assert.notEqual(second, null);
  await Promise.resolve();
  assert.equal(resetCalls, 1);

  releaseReset();
  await first;
  assert.equal(resetCalls, 1);
  assert.equal(
    JSON.stringify(reportCalls.map(([kind, _fb, result]) => [kind, result])),
    JSON.stringify([['reset', { ok: true, resetGen: 1 }]])
  );

  await controller.resetToDefault();
  assert.equal(resetCalls, 2);
});

test('[project-ui-controller] load reuses same-key inflight requests and reports busy for conflicting ones', async () => {
  let loadCalls = 0;
  let releaseLoad;
  const loadGate = new Promise(resolve => {
    releaseLoad = resolve;
  });
  const { controller, reportCalls } = createController({
    loadFromFileEvent: async (_app, evt) => {
      loadCalls += 1;
      await loadGate;
      return { ok: true, file: evt.currentTarget.value };
    },
  });

  const inputA = { value: 'same.json' };
  const inputB = { value: 'same.json' };
  const first = controller.handleLoadInputChange({ currentTarget: inputA });
  const second = controller.handleLoadInputChange({ currentTarget: inputB });
  assert.notEqual(first, null);
  assert.notEqual(second, null);
  await Promise.resolve();
  assert.equal(loadCalls, 1);
  assert.equal(inputB.value, '');

  const inputBusy = { value: 'other.json' };
  await controller.handleLoadInputChange({ currentTarget: inputBusy });
  assert.equal(inputBusy.value, '');

  releaseLoad();
  await first;
  assert.equal(loadCalls, 1);
  assert.equal(inputA.value, '');
  assert.equal(
    JSON.stringify(reportCalls.map(([kind, _fb, result]) => [kind, result])),
    JSON.stringify([
      ['load', { ok: false, reason: 'busy' }],
      ['load', { ok: true, file: 'same.json' }],
    ])
  );
});
