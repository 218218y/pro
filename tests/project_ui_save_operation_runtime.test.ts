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
      ok: true as const,
      pending: true as const,
      operationId: 'project-save-test-1',
      acceptedAt: Date.now(),
      settled,
    };

    const returned = runProjectUiSaveAction({
      app,
      fb: null,
      saveProject: () => operation,
    });

    assert.equal(returned, operation);
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
