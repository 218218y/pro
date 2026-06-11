import test from 'node:test';
import assert from 'node:assert/strict';

import { createUiBootTriggerRender } from '../esm/native/ui/ui_boot_controller_shared.ts';
import { ensureErrorsRenderLoopBestEffort } from '../esm/native/ui/errors_install_support.ts';
import { __wp_triggerRender } from '../esm/native/services/canvas_picking_core_runtime.ts';

test('ui boot trigger render uses canonical platform render follow-through without forcing ensureRenderLoop', () => {
  const renders: boolean[] = [];
  const ensured: string[] = [];
  const App = {
    services: {
      platform: {
        triggerRender(updateShadows?: boolean) {
          renders.push(!!updateShadows);
        },
        ensureRenderLoop() {
          ensured.push('ensure');
        },
      },
    },
  } as Record<string, unknown>;

  createUiBootTriggerRender(App as never)(true);

  assert.deepEqual(renders, [true]);
  assert.deepEqual(ensured, []);
});

test('errors install support uses canonical wakeup follow-through without touching activity', () => {
  const ensured: string[] = [];
  const touches: string[] = [];
  const reports: string[] = [];
  const App = {
    services: {
      platform: {
        activity: {
          touch() {
            touches.push('touch');
          },
        },
        ensureRenderLoop() {
          ensured.push('ensure');
        },
      },
    },
  } as Record<string, unknown>;

  ensureErrorsRenderLoopBestEffort(App as never, (op: string) => {
    reports.push(op);
  });

  assert.deepEqual(ensured, ['ensure']);
  assert.deepEqual(touches, []);
  assert.deepEqual(reports, []);
});

test('canvas picking trigger render uses canonical platform render follow-through without forcing ensureRenderLoop', () => {
  const renders: boolean[] = [];
  const ensured: string[] = [];
  const App = {
    services: {
      platform: {
        triggerRender(updateShadows?: boolean) {
          renders.push(!!updateShadows);
        },
        ensureRenderLoop() {
          ensured.push('ensure');
        },
      },
    },
  } as Record<string, unknown>;

  __wp_triggerRender(App as never, false);

  assert.deepEqual(renders, [false]);
  assert.deepEqual(ensured, []);
});
