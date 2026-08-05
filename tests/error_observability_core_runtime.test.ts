import test from 'node:test';
import assert from 'node:assert/strict';

import { installBootFinalizers } from '../esm/native/services/boot_finalizers.ts';
import { flushPendingPush, installHistoryService, schedulePush } from '../esm/native/services/history.ts';
import { isRestoring } from '../esm/native/services/history_shared.ts';
import { pause, pushNow, resume } from '../esm/native/services/history_runtime.ts';

type ErrorReport = { error: unknown; context: unknown };

function createReporter(reports: ErrorReport[]) {
  return (error: unknown, context: unknown) => {
    reports.push({ error, context });
  };
}

test('history runtime preserves fail-soft behavior while reporting functional owner failures', () => {
  const reports: ErrorReport[] = [];
  const system = {
    isPaused: false,
    pushState() {
      throw new Error('history push failed');
    },
    pause() {
      throw new Error('history pause failed');
    },
    resume() {
      throw new Error('history resume failed');
    },
  };
  const App: any = {
    services: {
      errors: { report: createReporter(reports) },
      history: { system },
    },
  };

  assert.doesNotThrow(() => pushNow(App, { reason: 'test' }));
  assert.doesNotThrow(() => pause(App));
  assert.doesNotThrow(() => resume(App));
  assert.deepEqual(
    reports.map(report => (report.context as { op?: string })?.op),
    ['pushNow', 'pause', 'resume']
  );
  assert.equal(
    reports.every(
      report => (report.context as { where?: string })?.where === 'native/services/history_runtime'
    ),
    true
  );
});

test('boot finalizer command installation failure is observable without aborting boot', () => {
  const reports: ErrorReport[] = [];
  const services: Record<string, unknown> = {
    errors: { report: createReporter(reports) },
  };
  Object.defineProperty(services, 'commands', {
    configurable: true,
    get() {
      throw new Error('commands slot unavailable');
    },
    set() {
      throw new Error('commands slot unavailable');
    },
  });
  const App: any = { services };

  assert.equal(installBootFinalizers(App), null);
  assert.equal(
    reports.some(report => (report.context as { op?: string })?.op === 'installCommandsSurface'),
    true
  );
  assert.equal(
    reports.some(
      report => (report.context as { where?: string })?.where === 'native/services/boot_finalizers'
    ),
    true
  );
});

test('history scheduling reports timer cleanup fallback without losing the pending action', () => {
  const reports: ErrorReport[] = [];
  const pushes: unknown[] = [];
  let nextTimer = 0;
  const App: any = {
    deps: {
      browser: {
        setTimeout() {
          nextTimer += 1;
          return nextTimer;
        },
        clearTimeout() {
          throw new Error('browser timer cleanup failed');
        },
      },
    },
    services: {
      errors: { report: createReporter(reports) },
      history: { system: { pushState: (meta: unknown) => pushes.push(meta) } },
    },
    store: {
      getState() {
        return { runtime: { restoring: false } };
      },
    },
  };

  installHistoryService(App);
  schedulePush(App, { source: 'first' });
  assert.doesNotThrow(() => schedulePush(App, { source: 'replacement' }));

  assert.equal(pushes.length, 0);
  flushPendingPush(App);
  assert.deepEqual(pushes, [{ source: 'replacement' }]);
  assert.equal(
    reports.some(
      report =>
        (report.context as { where?: string; op?: string })?.where === 'native/services/history_shared' &&
        (report.context as { op?: string })?.op === 'clearTimer.browser'
    ),
    true
  );
});

test('history restore-state read failures remain fail-soft and observable', () => {
  const reports: ErrorReport[] = [];
  const App: any = {
    services: { errors: { report: createReporter(reports) } },
    store: {
      getState() {
        throw new Error('state read failed');
      },
    },
  };

  assert.equal(isRestoring(App), false);
  assert.equal(
    reports.some(
      report =>
        (report.context as { where?: string; op?: string })?.where === 'native/services/history_shared' &&
        (report.context as { op?: string })?.op === 'isRestoring.readRootState'
    ),
    true
  );
});
