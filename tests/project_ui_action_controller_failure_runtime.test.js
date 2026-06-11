import test from 'node:test';
import assert from 'node:assert/strict';

import { createController } from './project_ui_action_controller_runtime_helpers.js';

test('[project-ui-controller] missing handlers and thrown loaders downgrade to canonical error/not-installed results', async () => {
  const inputTarget = { value: 'x' };
  const { controller, reportCalls } = createController({
    loadFromFileEvent: async () => {
      throw new Error('boom');
    },
    saveProject: () => ({ ok: false, reason: 'not-installed' }),
  });

  await controller.handleLoadInputChange({ currentTarget: inputTarget });
  await controller.restoreLastSession();
  await controller.resetToDefault();
  assert.deepEqual(controller.saveProject(), { ok: false, reason: 'not-installed' });
  assert.equal(inputTarget.value, '');
  assert.equal(
    JSON.stringify(reportCalls.map(([kind, _fb, result]) => [kind, result])),
    JSON.stringify([
      ['load', { ok: false, reason: 'error', message: 'boom' }],
      ['restore', { ok: false, reason: 'not-installed' }],
      ['reset', { ok: false, reason: 'not-installed' }],
      ['save', { ok: false, reason: 'not-installed' }],
    ])
  );
});

test('[project-ui-controller] restore/reset thrown handlers preserve actionable messages', async () => {
  const { controller, reportCalls } = createController({
    restoreLastSession: async () => {
      throw new Error('restore exploded');
    },
    resetToDefaultProject: async () => {
      throw new Error('reset exploded');
    },
  });

  await controller.restoreLastSession();
  await controller.resetToDefault();

  assert.equal(
    JSON.stringify(reportCalls.map(([kind, _fb, result]) => [kind, result])),
    JSON.stringify([
      ['restore', { ok: false, reason: 'error', message: 'restore exploded' }],
      ['reset', { ok: false, reason: 'error', message: 'reset exploded' }],
    ])
  );
});
