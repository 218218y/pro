import test from 'node:test';
import assert from 'node:assert/strict';

import {
  notifyHandleFitSuppressions,
  notifyUnusuallySmallDoorSegments,
} from '../esm/native/builder/construction_correction_feedback.ts';

test('handle fit suppression feedback reports set differences and permits re-suppression after a complete pass', () => {
  const acknowledgements: Array<[string, string]> = [];
  const App = {
    services: {
      runtimeCache: {},
      uiFeedback: {
        acknowledge(title: string, message: string) {
          acknowledgements.push([title, message]);
        },
      },
    },
  };

  notifyHandleFitSuppressions(App, ['door-b', 'door-a', 'door-a'], {
    scope: 'main',
    completePass: true,
  });
  assert.equal(acknowledgements.length, 1);
  assert.equal(acknowledgements[0]?.[0], 'שינוי אוטומטי בבנייה');
  assert.match(acknowledgements[0]?.[1] ?? '', /2/);
  assert.deepEqual(
    (App.services.runtimeCache as Record<string, unknown>).__wpConstructionCorrectionPartIdsByScope,
    { main: ['door-a', 'door-b'] }
  );

  notifyHandleFitSuppressions(App, ['door-b', 'door-a'], {
    scope: 'main',
    completePass: true,
  });
  assert.equal(acknowledgements.length, 1);

  notifyHandleFitSuppressions(App, ['door-b'], { scope: 'main', completePass: true });
  assert.equal(acknowledgements.length, 1);

  notifyHandleFitSuppressions(App, ['door-a', 'door-b'], {
    scope: 'main',
    completePass: true,
  });
  assert.equal(acknowledgements.length, 2);
  assert.equal(acknowledgements[1]?.[0], 'שינוי אוטומטי בבנייה');
});

test('handle fit suppression feedback keeps cumulative scope state for partial passes', () => {
  const acknowledgements: string[] = [];
  const App = {
    services: {
      runtimeCache: {},
      uiFeedback: {
        acknowledge(_title: string, message: string) {
          acknowledgements.push(message);
        },
      },
    },
  };

  notifyHandleFitSuppressions(App, ['door-a'], { scope: 'partial' });
  notifyHandleFitSuppressions(App, ['door-b'], { scope: 'partial' });
  notifyHandleFitSuppressions(App, ['door-a', 'door-b'], { scope: 'partial' });

  assert.equal(acknowledgements.length, 2);
  assert.deepEqual(
    (App.services.runtimeCache as Record<string, unknown>).__wpConstructionCorrectionPartIdsByScope,
    { partial: ['door-a', 'door-b'] }
  );
});

test('construction correction feedback clearly reports small cut doors without repeating unchanged state', () => {
  const acknowledgements: Array<[string, string]> = [];
  const App = {
    services: {
      runtimeCache: {},
      uiFeedback: {
        acknowledge(title: string, message: string) {
          acknowledgements.push([title, message]);
        },
      },
    },
  };

  notifyUnusuallySmallDoorSegments(App, ['d2_top', 'd1_bot', 'd1_bot']);
  notifyUnusuallySmallDoorSegments(App, ['d1_bot', 'd2_top']);
  assert.equal(acknowledgements.length, 1);
  assert.equal(acknowledgements[0]?.[0], 'בנייה חריגה שדורשת בדיקה');
  assert.match(acknowledgements[0]?.[1] ?? '', /2/);
  assert.match(acknowledgements[0]?.[1] ?? '', /מקטעי דלת קטנים באופן חריג/);
  assert.match(acknowledgements[0]?.[1] ?? '', /הבנייה הושלמה/);

  notifyUnusuallySmallDoorSegments(App, []);
  notifyUnusuallySmallDoorSegments(App, ['d1_bot']);
  assert.equal(acknowledgements.length, 2, 'cleared anomalies can be reported again if they return');
  assert.match(acknowledgements[1]?.[1] ?? '', /דלת קטנה באופן חריג/);
});
