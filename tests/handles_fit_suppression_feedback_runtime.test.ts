import test from 'node:test';
import assert from 'node:assert/strict';

import { notifyHandleFitSuppressions } from '../esm/native/builder/handles_fit_suppression_feedback.ts';

test('handle fit suppression feedback reports set differences and permits re-suppression after a complete pass', () => {
  const toasts: Array<[string, string | undefined]> = [];
  const App = {
    services: {
      runtimeCache: {},
      uiFeedback: {
        toast(message: string, type?: string) {
          toasts.push([message, type]);
        },
      },
    },
  };

  notifyHandleFitSuppressions(App, ['door-b', 'door-a', 'door-a'], {
    scope: 'main',
    completePass: true,
  });
  assert.equal(toasts.length, 1);
  assert.match(toasts[0]?.[0] ?? '', /2/);
  assert.equal(toasts[0]?.[1], 'info');
  assert.deepEqual(
    (App.services.runtimeCache as Record<string, unknown>).__wpHandleFitSuppressedPartIdsByScope,
    { main: ['door-a', 'door-b'] }
  );

  notifyHandleFitSuppressions(App, ['door-b', 'door-a'], {
    scope: 'main',
    completePass: true,
  });
  assert.equal(toasts.length, 1);

  notifyHandleFitSuppressions(App, ['door-b'], { scope: 'main', completePass: true });
  assert.equal(toasts.length, 1);

  notifyHandleFitSuppressions(App, ['door-a', 'door-b'], {
    scope: 'main',
    completePass: true,
  });
  assert.equal(toasts.length, 2);
  assert.equal(toasts[1]?.[1], 'info');
});

test('handle fit suppression feedback keeps cumulative scope state for partial passes', () => {
  const toasts: string[] = [];
  const App = {
    services: {
      runtimeCache: {},
      uiFeedback: {
        toast(message: string) {
          toasts.push(message);
        },
      },
    },
  };

  notifyHandleFitSuppressions(App, ['door-a'], { scope: 'partial' });
  notifyHandleFitSuppressions(App, ['door-b'], { scope: 'partial' });
  notifyHandleFitSuppressions(App, ['door-a', 'door-b'], { scope: 'partial' });

  assert.equal(toasts.length, 2);
  assert.deepEqual(
    (App.services.runtimeCache as Record<string, unknown>).__wpHandleFitSuppressedPartIdsByScope,
    { partial: ['door-a', 'door-b'] }
  );
});
