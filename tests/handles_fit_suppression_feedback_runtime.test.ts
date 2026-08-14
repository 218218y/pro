import test from 'node:test';
import assert from 'node:assert/strict';

import {
  notifyHandleFitSuppressions,
  notifyUnusuallySmallDoorSegments,
} from '../esm/native/builder/construction_correction_feedback.ts';

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
    (App.services.runtimeCache as Record<string, unknown>).__wpConstructionCorrectionPartIdsByScope,
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
    (App.services.runtimeCache as Record<string, unknown>).__wpConstructionCorrectionPartIdsByScope,
    { partial: ['door-a', 'door-b'] }
  );
});

test('construction correction feedback clearly reports small cut doors without repeating unchanged state', () => {
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

  notifyUnusuallySmallDoorSegments(App, ['d2_top', 'd1_bot', 'd1_bot']);
  notifyUnusuallySmallDoorSegments(App, ['d1_bot', 'd2_top']);
  assert.equal(toasts.length, 1);
  assert.equal(toasts[0]?.[1], 'info');
  assert.match(toasts[0]?.[0] ?? '', /2/);
  assert.match(toasts[0]?.[0] ?? '', /מקטעי דלת קטנים באופן חריג/);
  assert.match(toasts[0]?.[0] ?? '', /הבנייה הושלמה/);

  notifyUnusuallySmallDoorSegments(App, []);
  notifyUnusuallySmallDoorSegments(App, ['d1_bot']);
  assert.equal(toasts.length, 2, 'cleared anomalies can be reported again if they return');
  assert.match(toasts[1]?.[0] ?? '', /דלת קטנה באופן חריג/);
});
