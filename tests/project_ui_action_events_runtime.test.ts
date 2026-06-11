import test from 'node:test';
import assert from 'node:assert/strict';

import {
  PROJECT_UI_ACTION_EVENT,
  buildProjectUiActionEventDetail,
  publishProjectUiActionEvent,
  readProjectUiActionEventName,
} from '../esm/native/ui/react/project_ui_action_events.ts';

test('project ui action events build canonical detail for success, explicit failure, and blank messages', () => {
  assert.equal(readProjectUiActionEventName('save'), 'wardrobepro:project-save');
  assert.equal(readProjectUiActionEventName('load'), 'wardrobepro:project-load');

  assert.deepEqual(
    buildProjectUiActionEventDetail('load', { ok: true, pending: true, restoreGen: 7 }, { at: 1234 }),
    {
      action: 'load',
      ok: true,
      pending: true,
      restoreGen: 7,
      at: 1234,
    }
  );

  assert.deepEqual(
    buildProjectUiActionEventDetail(
      'reset-default',
      { ok: false, reason: 'invalid', message: 'bad payload' },
      { at: 4321 }
    ),
    {
      action: 'reset-default',
      ok: false,
      pending: false,
      reason: 'invalid',
      message: 'bad payload',
      at: 4321,
    }
  );

  const blank = buildProjectUiActionEventDetail(
    'save',
    { ok: false, reason: 'busy', message: '   ' },
    { at: 99 }
  );
  assert.equal(blank.message, undefined);
  assert.equal(blank.pending, false);
});

test('project ui action events publish generic and action-specific browser events when window surface exists', () => {
  const dispatched: Array<{ type: string; detail: unknown }> = [];
  class FakeCustomEvent {
    type: string;
    detail: unknown;
    constructor(type: string, options?: { detail?: unknown }) {
      this.type = type;
      this.detail = options?.detail;
    }
  }

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
    CustomEvent: FakeCustomEvent,
    dispatchEvent(event: FakeCustomEvent) {
      dispatched.push({ type: event.type, detail: event.detail });
      return true;
    },
  };

  const app = {
    browser: {
      getWindow: () => windowLike,
    },
  } as any;

  const detail = publishProjectUiActionEvent(
    app,
    'restore-last-session',
    {
      ok: false,
      reason: 'missing-autosave',
      message: 'nothing to restore',
    },
    { at: 456 }
  );

  assert.deepEqual(detail, {
    action: 'restore-last-session',
    ok: false,
    pending: false,
    reason: 'missing-autosave',
    message: 'nothing to restore',
    at: 456,
  });
  assert.deepEqual(dispatched, [
    { type: PROJECT_UI_ACTION_EVENT, detail },
    { type: 'wardrobepro:project-restore-last-session', detail },
  ]);
});
