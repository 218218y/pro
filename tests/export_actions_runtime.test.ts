import test from 'node:test';
import assert from 'node:assert/strict';

import type { AppContainer } from '../types/index.ts';

import { getExportActionFailureToast } from '../esm/native/ui/export_action_feedback.js';
import { createExportActions, runExportUiActionWithDeps } from '../esm/native/ui/react/export_actions.js';
import { getPerfEntries } from '../esm/native/runtime/perf_runtime_surface.ts';

function createApp(): AppContainer {
  return { services: {}, deps: { config: {} } } as AppContainer;
}

test('runExportUiActionWithDeps returns ok when the export action resolves', async () => {
  const app = createApp();
  const calls: string[] = [];
  const result = await runExportUiActionWithDeps({
    app,
    kind: 'snapshot',
    ensureModule: async () => ({
      takeSnapshot: async () => {
        calls.push('snapshot');
      },
    }),
  });

  assert.deepEqual(result, { ok: true, kind: 'snapshot' });
  assert.deepEqual(calls, ['snapshot']);
  const perfEntries = getPerfEntries(app, 'export.snapshot');
  assert.equal(perfEntries.length, 1);
  assert.equal(perfEntries[0]?.status, 'ok');
  assert.deepEqual(perfEntries[0]?.detail, { kind: 'snapshot' });
});

test('runExportUiActionWithDeps returns not-installed when the export action is missing', async () => {
  const app = createApp();
  const result = await runExportUiActionWithDeps({
    app,
    kind: 'render-sketch',
    ensureModule: async () => ({}),
  });

  assert.deepEqual(result, { ok: false, kind: 'render-sketch', reason: 'not-installed' });
  const perfEntries = getPerfEntries(app, 'export.renderSketch');
  assert.equal(perfEntries.length, 1);
  assert.equal(perfEntries[0]?.status, 'error');
  assert.deepEqual(getExportActionFailureToast(result), {
    message: 'ייצוא סקיצה/הדמיה לא זמין כרגע',
    type: 'error',
  });
});

test('runExportUiActionWithDeps returns error when the export action throws', async () => {
  const app = createApp();
  const reports: Array<{ scope: string; error: unknown }> = [];
  const result = await runExportUiActionWithDeps({
    app,
    kind: 'copy',
    ensureModule: async () => ({
      copyToClipboard: async () => {
        throw new Error('clipboard boom');
      },
    }),
    reportError: (scope, error) => {
      reports.push({ scope, error });
    },
  });

  assert.deepEqual(result, { ok: false, kind: 'copy', reason: 'error', message: 'clipboard boom' });
  assert.equal(reports.length, 1);
  assert.equal(reports[0]?.scope, 'export action failed');
  assert.match(String((reports[0]?.error as Error)?.message || reports[0]?.error), /clipboard boom/);
  assert.deepEqual(getExportActionFailureToast(result), {
    message: 'העתקה ללוח נכשלה: clipboard boom',
    type: 'error',
  });
  const perfEntries = getPerfEntries(app, 'export.copy');
  assert.equal(perfEntries.length, 1);
  assert.equal(perfEntries[0]?.status, 'error');
  assert.deepEqual(perfEntries[0]?.detail, {
    kind: 'copy',
    reason: 'error',
    message: 'clipboard boom',
  });
});

test('runExportUiActionWithDeps preserves a lazy-load failure message', async () => {
  const reports: Array<{ scope: string; error: unknown }> = [];
  const result = await runExportUiActionWithDeps({
    app: createApp(),
    kind: 'auto-zoom',
    ensureModule: async () => {
      throw new Error('lazy export load exploded');
    },
    reportError: (scope, error) => {
      reports.push({ scope, error });
    },
  });

  assert.deepEqual(result, {
    ok: false,
    kind: 'auto-zoom',
    reason: 'error',
    message: 'lazy export load exploded',
  });
  assert.equal(reports.length, 1);
  assert.equal(reports[0]?.scope, 'export action failed');
  assert.match(
    String((reports[0]?.error as Error)?.message || reports[0]?.error),
    /lazy export load exploded/
  );
  assert.deepEqual(getExportActionFailureToast(result), {
    message: 'זום אוטומטי נכשל: lazy export load exploded',
    type: 'error',
  });
});

test('createExportActions reuses the same in-flight export per app and kind', async () => {
  const calls: string[] = [];
  let resolveRun: (() => void) | null = null;
  const pending = new Promise<void>(resolve => {
    resolveRun = resolve;
  });
  const actions = createExportActions(createApp(), () => {}, {
    ensureModule: async () => ({
      exportDualImage: async () => {
        calls.push('dual');
        await pending;
      },
    }),
  });

  const first = actions.exportDualImage();
  const second = actions.exportDualImage();
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.deepEqual(calls, ['dual']);
  resolveRun?.();

  assert.deepEqual(await first, { ok: true, kind: 'dual' });
  assert.deepEqual(await second, { ok: true, kind: 'dual' });
  assert.deepEqual(calls, ['dual']);
});

test('createExportActions blocks a different export kind while another export flight is still running', async () => {
  const calls: string[] = [];
  let resolveRun: (() => void) | null = null;
  const pending = new Promise<void>(resolve => {
    resolveRun = resolve;
  });
  const toasts: Array<{ message: string; type?: string }> = [];
  const actions = createExportActions(
    createApp(),
    (message, type) => {
      toasts.push({ message, type });
    },
    {
      ensureModule: async () => ({
        exportDualImage: async () => {
          calls.push('dual');
          await pending;
        },
        takeSnapshot: async () => {
          calls.push('snapshot');
        },
      }),
    }
  );

  const first = actions.exportDualImage();
  const busy = await actions.exportTakeSnapshot();
  assert.deepEqual(busy, { ok: false, kind: 'snapshot', reason: 'busy' });
  assert.deepEqual(calls, ['dual']);
  assert.deepEqual(toasts, [{ message: 'פעולת ייצוא כבר רצה כרגע', type: 'error' }]);

  resolveRun?.();
  assert.deepEqual(await first, { ok: true, kind: 'dual' });
});

test('createExportActions does not duplicate failure toasts when a duplicate click reuses the same pending export', async () => {
  const reports: Array<{ scope: string; error: unknown }> = [];
  const toasts: Array<{ message: string; type?: string }> = [];
  let rejectRun: ((reason?: unknown) => void) | null = null;
  const pending = new Promise<void>((_, reject) => {
    rejectRun = reject;
  });
  const app = createApp();
  const actionsA = createExportActions(
    app,
    (message, type) => {
      toasts.push({ message, type });
    },
    {
      ensureModule: async () => ({
        copyToClipboard: async () => {
          await pending;
        },
      }),
      reportError: (scope, error) => {
        reports.push({ scope, error });
      },
    }
  );
  const actionsB = createExportActions(
    app,
    (message, type) => {
      toasts.push({ message, type });
    },
    {
      ensureModule: async () => ({
        copyToClipboard: async () => {
          await pending;
        },
      }),
      reportError: (scope, error) => {
        reports.push({ scope, error });
      },
    }
  );

  const first = actionsA.exportCopyToClipboard();
  const second = actionsB.exportCopyToClipboard();
  rejectRun?.(new Error('clipboard boom'));

  assert.deepEqual(await first, { ok: false, kind: 'copy', reason: 'error', message: 'clipboard boom' });
  assert.deepEqual(await second, { ok: false, kind: 'copy', reason: 'error', message: 'clipboard boom' });
  assert.equal(reports.length, 1);
  assert.deepEqual(toasts, [{ message: 'העתקה ללוח נכשלה: clipboard boom', type: 'error' }]);
});
