import test from 'node:test';
import assert from 'node:assert/strict';

import { getPerfEntries } from '../esm/native/runtime/perf_runtime_surface.ts';
import { runProjectUiSaveAction } from '../esm/native/ui/react/project_ui_action_controller_save.ts';

test('project save perf span and browser event settle on the terminal business result', async () => {
  const previousCustomEvent = globalThis.CustomEvent;
  globalThis.CustomEvent = class CustomEvent<T = unknown> extends Event {
    detail: T;
    constructor(type: string, init?: CustomEventInit<T>) {
      super(type);
      this.detail = (init?.detail ?? null) as T;
    }
  } as typeof CustomEvent;

  try {
    const dispatched: Array<{ type: string; detail: any }> = [];
    const windowLike = {
      document: {
        createElement() {
          return {};
        },
        querySelector() {
          return null;
        },
      },
      navigator: { userAgent: 'test' },
      location: {},
      dispatchEvent(event: CustomEvent) {
        dispatched.push({ type: event.type, detail: event.detail });
        return true;
      },
    };
    const app = {
      deps: { config: {} },
      services: {},
      browser: { getWindow: () => windowLike },
    } as any;
    let resolveTerminal: (value: { ok: false; reason: 'cancelled' }) => void = () => undefined;
    const settled = new Promise<{ ok: false; reason: 'cancelled' }>(resolve => {
      resolveTerminal = resolve;
    });
    const operation = {
      accepted: true as const,
      reused: false,
      operationId: 'project-save-test-1',
      requestedAt: Date.now() - 5,
      acceptedAt: Date.now(),
      settled,
    };

    const returned = runProjectUiSaveAction({
      app,
      fb: null,
      saveProject: () => operation,
    });
    const reused = { ...operation, reused: true };
    const reusedReturned = runProjectUiSaveAction({
      app,
      fb: null,
      saveProject: () => reused,
    });

    assert.equal(returned, operation);
    assert.equal(reusedReturned, reused);
    assert.equal(
      getPerfEntries(app).some(entry => entry.name === 'project.save'),
      false
    );
    const projectEvents = () => dispatched.filter(event => event.type.startsWith('wardrobepro:project-'));
    assert.deepEqual(
      projectEvents().map(event => [event.type, event.detail.phase, event.detail.operationId]),
      [
        ['wardrobepro:project-action', 'started', operation.operationId],
        ['wardrobepro:project-save', 'started', operation.operationId],
      ]
    );

    resolveTerminal({ ok: false, reason: 'cancelled' });
    assert.deepEqual(await settled, { ok: false, reason: 'cancelled' });
    await Promise.resolve();

    const saveEntries = getPerfEntries(app).filter(entry => entry.name === 'project.save');
    assert.equal(saveEntries.length, 1);
    assert.equal(saveEntries[0]?.status, 'mark');
    assert.equal((saveEntries[0]?.detail as Record<string, unknown>)?.reason, 'cancelled');
    assert.equal(typeof (saveEntries[0]?.detail as Record<string, unknown>)?.journeyDurationMs, 'number');
    assert.equal((saveEntries[0]?.detail as Record<string, unknown>)?.requestedAt, operation.requestedAt);
    assert.deepEqual(
      projectEvents()
        .slice(2)
        .map(event => [event.type, event.detail.phase, event.detail.operationId]),
      [
        ['wardrobepro:project-action', 'settled', operation.operationId],
        ['wardrobepro:project-save', 'settled', operation.operationId],
      ]
    );
  } finally {
    globalThis.CustomEvent = previousCustomEvent;
  }
});

test('project save feedback is observed once for one business operation reused by multiple intents', async () => {
  const toasts: Array<{ message: string; type?: string }> = [];
  const app = { deps: { config: {} }, services: {} } as any;
  let resolveTerminal: (value: { ok: true; outcome: 'browser-delivery-completed' }) => void = () => undefined;
  const settled = new Promise<{ ok: true; outcome: 'browser-delivery-completed' }>(resolve => {
    resolveTerminal = resolve;
  });
  const requestedAt = Date.now();
  const operation = {
    accepted: true as const,
    reused: false,
    operationId: 'project-save-feedback-once-1',
    requestedAt,
    acceptedAt: requestedAt + 1,
    settled,
  };
  const fb = {
    toast(message: string, type?: string) {
      toasts.push({ message, type });
    },
  };

  runProjectUiSaveAction({ app, fb, saveProject: () => operation });
  runProjectUiSaveAction({ app, fb, saveProject: () => ({ ...operation, reused: true }) });
  resolveTerminal({ ok: true, outcome: 'browser-delivery-completed' });
  await settled;
  await new Promise(resolve => setTimeout(resolve, 0));

  assert.equal(toasts.length, 1);
  assert.equal(toasts[0]?.type, 'success');
});

test('project save observers map one rejected operation to one feedback and one failed perf entry', async () => {
  const toasts: Array<{ message: string; type?: string }> = [];
  const app = { deps: { config: {} }, services: {} } as any;
  let rejectTerminal: (error: unknown) => void = () => undefined;
  const settled = new Promise<{ ok: true }>((_resolve, reject) => {
    rejectTerminal = reject;
  });
  const requestedAt = Date.now();
  const operation = {
    accepted: true as const,
    reused: false,
    operationId: 'project-save-rejected-once-1',
    requestedAt,
    acceptedAt: requestedAt + 1,
    settled,
  };
  const fb = {
    toast(message: string, type?: 'success' | 'error' | 'warning' | 'info') {
      toasts.push({ message, type });
    },
  };

  runProjectUiSaveAction({ app, fb, saveProject: () => operation });
  runProjectUiSaveAction({ app, fb, saveProject: () => ({ ...operation, reused: true }) });
  rejectTerminal(new Error('terminal delivery rejected'));
  await assert.rejects(settled, /terminal delivery rejected/);
  await new Promise(resolve => setTimeout(resolve, 0));

  assert.deepEqual(toasts, [{ message: 'terminal delivery rejected', type: 'error' }]);
  const saveEntries = getPerfEntries(app).filter(entry => entry.name === 'project.save');
  assert.equal(saveEntries.length, 1);
  assert.equal(saveEntries[0]?.status, 'error');
  assert.equal(saveEntries[0]?.error, 'terminal delivery rejected');
});
