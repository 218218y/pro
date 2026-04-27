import test from 'node:test';
import assert from 'node:assert/strict';

import { createController } from './project_ui_action_controller_runtime_helpers.js';

test('[project-ui-controller] load/reset/restore/save orchestration is canonical and clears file input', async () => {
  const inputTarget = { value: 'keep-me?' };
  const { controller, reportCalls } = createController({
    loadFromFileEvent: async (_app, evt) => {
      assert.equal(evt.currentTarget, inputTarget);
      return { ok: true };
    },
    restoreLastSession: async () => ({ ok: true, restoreGen: 3 }),
    resetToDefaultProject: async () => ({ ok: false, reason: 'cancelled' }),
    saveProject: () => ({ ok: true }),
  });

  let clicked = 0;
  controller.openLoadInput({
    current: {
      click: () => {
        clicked += 1;
      },
    },
  });
  assert.equal(clicked, 1);

  await controller.handleLoadInputChange({ currentTarget: inputTarget });
  await controller.restoreLastSession();
  await controller.resetToDefault();
  assert.deepEqual(controller.saveProject(), { ok: true });
  assert.equal(inputTarget.value, '');
  assert.equal(
    JSON.stringify(reportCalls.map(([kind, _fb, result]) => [kind, result])),
    JSON.stringify([
      ['load', { ok: true }],
      ['restore', { ok: true, restoreGen: 3 }],
      ['reset', { ok: false, reason: 'cancelled' }],
      ['save', { ok: true }],
    ])
  );
});
