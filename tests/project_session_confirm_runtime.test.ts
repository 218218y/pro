import test from 'node:test';
import assert from 'node:assert/strict';

import {
  PROJECT_RESTORE_SESSION_CONFIRM,
  runProjectSessionConfirmedAction,
} from '../esm/native/ui/project_session_commands_shared.ts';

test('project session confirm runtime: confirm surface forwards copy and only runs confirmed action after yes', async () => {
  const seen: Array<{ title: string; message: string }> = [];
  let confirmedRuns = 0;

  const App = {
    services: {
      uiFeedback: {
        openCustomConfirm(title: string, message: string, onYes?: (() => void) | null) {
          seen.push({ title, message });
          onYes?.();
        },
      },
    },
  } as any;

  const result = await runProjectSessionConfirmedAction({
    app: App,
    copy: PROJECT_RESTORE_SESSION_CONFIRM,
    buildError: (message: string, fallbackMessage: string) => ({
      ok: false,
      reason: 'error',
      message,
      fallbackMessage,
    }),
    onCancelled: () => ({ ok: false, reason: 'cancelled' }),
    runConfirmed: async () => {
      confirmedRuns += 1;
      return { ok: true, restoreGen: 12 };
    },
  });

  assert.deepEqual(seen, [
    {
      title: PROJECT_RESTORE_SESSION_CONFIRM.title,
      message: PROJECT_RESTORE_SESSION_CONFIRM.message,
    },
  ]);
  assert.equal(confirmedRuns, 1);
  assert.deepEqual(result, { ok: true, restoreGen: 12 });
});

test('project session confirm runtime: unavailable or exploding confirm surfaces return actionable request errors without running action', async () => {
  let runs = 0;

  const unavailable = await runProjectSessionConfirmedAction({
    app: { services: {} } as any,
    copy: PROJECT_RESTORE_SESSION_CONFIRM,
    buildError: (message: string, fallbackMessage: string) => ({
      ok: false,
      reason: 'error',
      message,
      fallbackMessage,
    }),
    onCancelled: () => ({ ok: false, reason: 'cancelled' }),
    runConfirmed: () => {
      runs += 1;
      return { ok: true };
    },
  });

  const exploded = await runProjectSessionConfirmedAction({
    app: {
      services: {
        uiFeedback: {
          confirm() {
            throw new Error('confirm exploded');
          },
        },
      },
    } as any,
    copy: PROJECT_RESTORE_SESSION_CONFIRM,
    buildError: (message: string, fallbackMessage: string) => ({
      ok: false,
      reason: 'error',
      message,
      fallbackMessage,
    }),
    onCancelled: () => ({ ok: false, reason: 'cancelled' }),
    runConfirmed: () => {
      runs += 1;
      return { ok: true };
    },
  });

  assert.equal(runs, 0);
  assert.deepEqual(unavailable, { ok: false, reason: 'cancelled' });
  assert.deepEqual(exploded, {
    ok: false,
    reason: 'error',
    message: 'confirm exploded',
    fallbackMessage: PROJECT_RESTORE_SESSION_CONFIRM.fallbackMessage,
  });
});
