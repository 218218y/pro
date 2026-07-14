import test from 'node:test';
import assert from 'node:assert/strict';

import { runEnsureSaveProjectAction } from '../esm/native/ui/project_save_runtime.ts';
import { runProjectUiSaveAction } from '../esm/native/ui/react/project_ui_action_controller_save.ts';
import type { ProjectSaveAcceptedResult } from '../esm/native/runtime/project_save_action_result.ts';

function assertAcceptedSave(value: unknown): ProjectSaveAcceptedResult {
  assert.equal(!!value && typeof value === 'object', true);
  const result = value as ProjectSaveAcceptedResult;
  assert.equal(result.accepted, true);
  assert.equal(typeof result.reused, 'boolean');
  assert.match(result.operationId, /^project-save-/);
  assert.equal(Number.isFinite(result.requestedAt), true);
  assert.equal(Number.isFinite(result.acceptedAt), true);
  assert.equal(result.requestedAt <= result.acceptedAt, true);
  assert.equal(typeof result.settled?.then, 'function');
  return result;
}

type AnchorLike = {
  href: string;
  download: string;
  rel: string;
  style: { display?: string };
  click: () => void;
  remove: () => void;
};

function createDownloadHarness() {
  const clicked: Array<{ href: string; download: string; rel: string }> = [];
  const appended: AnchorLike[] = [];
  const revoked: string[] = [];

  const win: any = {
    URL: {
      createObjectURL(_blob: Blob) {
        return 'blob://download-1';
      },
      revokeObjectURL(url: string) {
        revoked.push(url);
      },
    },
    setTimeout(cb: () => void) {
      cb();
      return 1;
    },
  };

  const doc: any = {
    body: {
      appendChild(node: AnchorLike) {
        appended.push(node);
      },
    },
    createElement(tag: string) {
      assert.equal(tag, 'a');
      const anchor: AnchorLike = {
        href: '',
        download: '',
        rel: '',
        style: {},
        click() {
          clicked.push({ href: anchor.href, download: anchor.download, rel: anchor.rel });
        },
        remove() {
          const index = appended.indexOf(anchor);
          if (index >= 0) appended.splice(index, 1);
        },
      };
      return anchor;
    },
    defaultView: win,
  };
  win.document = doc;

  return { win, doc, clicked, revoked };
}

test('project save runtime: successful save downloads normalized json and clears dirty state only after successful browser delivery', async () => {
  const prompts: Array<[string, string]> = [];
  const toasts: Array<{ message: string; type?: string }> = [];
  const dirtyCalls: Array<{ next: boolean; meta: any }> = [];
  const exportMeta: any[] = [];
  const { win, doc, clicked, revoked } = createDownloadHarness();

  const App = {
    services: {
      projectIO: {
        exportCurrentProject(meta?: unknown) {
          exportMeta.push(meta);
          return { jsonStr: '{"version":2}', defaultBaseName: ' demo_project ' };
        },
      },
      uiFeedback: {
        openCustomPrompt(title: string, defaultValue: string, cb: (value: string | null) => void) {
          prompts.push([title, defaultValue]);
          cb(' saved_name ');
        },
      },
    },
    actions: {
      meta: {
        setDirty(next: boolean, meta?: unknown) {
          dirtyCalls.push({ next, meta });
        },
      },
    },
  } as any;

  const saveProject = runEnsureSaveProjectAction(App, {
    win,
    doc,
    toast(message: string, type?: string) {
      toasts.push({ message, type });
    },
  });

  assert.equal(typeof saveProject, 'function');
  const operation = assertAcceptedSave(saveProject?.());
  runProjectUiSaveAction({
    app: App,
    fb: {
      toast(message: string, type?: 'success' | 'error' | 'warning' | 'info') {
        toasts.push({ message, type });
      },
    },
    saveProject: () => operation,
  });
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.deepEqual(await operation.settled, {
    ok: true,
    outcome: 'browser-delivery-completed',
  });

  assert.deepEqual(prompts, [['בחר שם לקובץ השמירה:', 'demo_project']]);
  assert.deepEqual(exportMeta, [{ source: 'ui:saveProject' }]);
  assert.deepEqual(clicked, [{ href: 'blob://download-1', download: 'saved_name.json', rel: 'noopener' }]);
  assert.deepEqual(revoked, ['blob://download-1']);
  assert.equal(dirtyCalls.length, 1);
  assert.equal(dirtyCalls[0].next, false);
  assert.equal(dirtyCalls[0].meta?.source, 'saveProject');
  assert.equal(dirtyCalls[0].meta?.uiOnly, true);
  assert.deepEqual(toasts, [{ message: 'הפרויקט נשמר בהצלחה!', type: 'success' }]);
});

test('project save runtime: blank/cancelled prompt stays quiet and does not download or mutate dirty state', async () => {
  const toasts: Array<{ message: string; type?: string }> = [];
  const dirtyCalls: Array<unknown> = [];
  const { win, doc, clicked } = createDownloadHarness();

  const App = {
    services: {
      projectIO: {
        exportCurrentProject() {
          return { jsonStr: '{"version":3}', defaultBaseName: 'demo_project' };
        },
      },
      uiFeedback: {
        openCustomPrompt(_title: string, _defaultValue: string, cb: (value: string | null) => void) {
          cb('   ');
        },
      },
    },
    actions: {
      meta: {
        setDirty(next: boolean, meta?: unknown) {
          dirtyCalls.push({ next, meta });
        },
      },
    },
  } as any;

  const saveProject = runEnsureSaveProjectAction(App, {
    win,
    doc,
    toast(message: string, type?: string) {
      toasts.push({ message, type });
    },
  });

  assert.equal(typeof saveProject, 'function');
  const operation = assertAcceptedSave(saveProject?.());
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.deepEqual(await operation.settled, { ok: false, reason: 'cancelled' });

  assert.deepEqual(clicked, []);
  assert.deepEqual(dirtyCalls, []);
  assert.deepEqual(toasts, []);
});

test('project save runtime: duplicate save clicks reuse one open prompt until the current flow settles', async () => {
  const promptCallbacks: Array<(value: string | null) => void> = [];
  const promptDefaults: string[] = [];
  const toasts: Array<{ message: string; type?: string }> = [];
  const exportMeta: any[] = [];
  const dirtyCalls: Array<{ next: boolean; meta: any }> = [];
  const { win, doc, clicked } = createDownloadHarness();

  const App = {
    services: {
      projectIO: {
        exportCurrentProject(meta?: unknown) {
          exportMeta.push(meta);
          return { jsonStr: '{"version":4}', defaultBaseName: 'demo_project' };
        },
      },
      uiFeedback: {
        openCustomPrompt(_title: string, defaultValue: string, cb: (value: string | null) => void) {
          promptDefaults.push(defaultValue);
          promptCallbacks.push(cb);
        },
      },
    },
    actions: {
      meta: {
        setDirty(next: boolean, meta?: unknown) {
          dirtyCalls.push({ next, meta });
        },
      },
    },
  } as any;

  const saveProject = runEnsureSaveProjectAction(App, {
    win,
    doc,
    toast(message: string, type?: string) {
      toasts.push({ message, type });
    },
  });

  assert.equal(typeof saveProject, 'function');
  const firstOperation = assertAcceptedSave(saveProject?.());
  const reusedOperation = assertAcceptedSave(saveProject?.());
  assert.equal(firstOperation.reused, false);
  assert.equal(reusedOperation.reused, true);
  assert.equal(reusedOperation.operationId, firstOperation.operationId);
  assert.equal(reusedOperation.settled, firstOperation.settled);
  assert.equal(promptCallbacks.length, 1);
  assert.deepEqual(promptDefaults, ['demo_project']);
  assert.deepEqual(exportMeta, [{ source: 'ui:saveProject' }]);
  assert.deepEqual(clicked, []);
  assert.deepEqual(dirtyCalls, []);
  assert.deepEqual(toasts, []);

  promptCallbacks[0]('saved_once');
  await new Promise(resolve => setTimeout(resolve, 0));

  assert.deepEqual(clicked, [{ href: 'blob://download-1', download: 'saved_once.json', rel: 'noopener' }]);
  assert.equal(dirtyCalls.length, 1);
  assert.deepEqual(toasts, [{ message: 'הפרויקט נשמר בהצלחה!', type: 'success' }]);

  const secondOperation = assertAcceptedSave(saveProject?.());
  assert.equal(secondOperation.reused, false);
  assert.equal(promptCallbacks.length, 2);
  assert.deepEqual(exportMeta, [{ source: 'ui:saveProject' }, { source: 'ui:saveProject' }]);

  promptCallbacks[1](null);
  await new Promise(resolve => setTimeout(resolve, 0));

  assert.deepEqual(toasts, [{ message: 'הפרויקט נשמר בהצלחה!', type: 'success' }]);
});

test('project save runtime: conflicting restore reports busy while save prompt is open, then succeeds after save settles', async () => {
  const promptCallbacks: Array<(value: string | null) => void> = [];
  const { win, doc } = createDownloadHarness();
  const App = {
    services: {
      projectIO: {
        exportCurrentProject() {
          return { jsonStr: '{"version":5}', defaultBaseName: 'demo_project' };
        },
      },
      uiFeedback: {
        openCustomPrompt(_title: string, _defaultValue: string, cb: (value: string | null) => void) {
          promptCallbacks.push(cb);
        },
      },
    },
    actions: {
      meta: {
        setDirty() {},
      },
    },
  } as any;

  const saveProject = runEnsureSaveProjectAction(App, { win, doc, toast() {} });
  assert.equal(typeof saveProject, 'function');
  assertAcceptedSave(saveProject?.());

  const { runProjectRestoreAction } = await import('../esm/native/ui/project_recovery_runtime_restore.ts');
  assert.deepEqual(await runProjectRestoreAction(App, null, async () => ({ ok: true, restoreGen: 1 })), {
    ok: false,
    reason: 'busy',
  });

  promptCallbacks[0]('saved_once');
  await new Promise(resolve => setTimeout(resolve, 0));

  assert.deepEqual(await runProjectRestoreAction(App, null, async () => ({ ok: true, restoreGen: 2 })), {
    ok: true,
    restoreGen: 2,
  });
});

test('project save runtime: failed export releases project-action family so the next save can start cleanly', async () => {
  const promptCallbacks: Array<(value: string | null) => void> = [];
  const { win, doc } = createDownloadHarness();
  let exportCalls = 0;
  const App = {
    services: {
      projectIO: {
        exportCurrentProject() {
          exportCalls += 1;
          if (exportCalls === 1) throw new Error('export exploded');
          return { jsonStr: '{"version":6}', defaultBaseName: 'demo_project' };
        },
      },
      uiFeedback: {
        openCustomPrompt(_title: string, _defaultValue: string, cb: (value: string | null) => void) {
          promptCallbacks.push(cb);
        },
      },
    },
    actions: {
      meta: { setDirty() {} },
    },
  } as any;

  const saveProject = runEnsureSaveProjectAction(App, { win, doc, toast() {} });
  assert.equal(typeof saveProject, 'function');
  assert.deepEqual(saveProject?.(), {
    ok: false,
    reason: 'error',
    message: 'export exploded',
  });
  assertAcceptedSave(saveProject?.());
  assert.equal(promptCallbacks.length, 1);
});

test('project save runtime: dirty reset owner rejection is reported without failing a delivered save', async () => {
  const reported: Array<{ err: unknown; ctx: any }> = [];
  const toasts: Array<{ message: string; type?: string }> = [];
  const { win, doc, clicked } = createDownloadHarness();

  const App = {
    services: {
      platform: {
        reportError(err: unknown, ctx: unknown) {
          reported.push({ err, ctx });
        },
      },
      projectIO: {
        exportCurrentProject() {
          return { jsonStr: '{"version":7}', defaultBaseName: 'demo_project' };
        },
      },
      uiFeedback: {
        openCustomPrompt(_title: string, _defaultValue: string, cb: (value: string | null) => void) {
          cb('saved_with_dirty_reject');
        },
      },
    },
    actions: {
      meta: {
        setDirty() {
          throw new Error('dirty owner rejected');
        },
      },
    },
  } as any;

  const saveProject = runEnsureSaveProjectAction(App, {
    win,
    doc,
    toast(message: string, type?: string) {
      toasts.push({ message, type });
    },
  });

  assert.equal(typeof saveProject, 'function');
  assertAcceptedSave(saveProject?.());
  await new Promise(resolve => setTimeout(resolve, 0));

  assert.deepEqual(clicked, [
    { href: 'blob://download-1', download: 'saved_with_dirty_reject.json', rel: 'noopener' },
  ]);
  assert.deepEqual(toasts, [{ message: 'הפרויקט נשמר בהצלחה!', type: 'success' }]);
  assert.equal(reported.length, 1);
  assert.match(String((reported[0].err as Error).message), /dirty owner rejected/);
  assert.equal(reported[0].ctx?.where, 'native/ui/project_save_runtime_action');
  assert.equal(reported[0].ctx?.op, 'saveProject.clearDirty');
  assert.equal(reported[0].ctx?.fatal, false);
});

test('project save runtime: toast microtask failures are isolated after terminal success', async () => {
  const reported: Array<{ err: unknown; ctx: any }> = [];
  const { win, doc } = createDownloadHarness();
  const App = {
    services: {
      platform: {
        reportError(err: unknown, ctx: unknown) {
          reported.push({ err, ctx });
        },
      },
      projectIO: {
        exportCurrentProject() {
          return { jsonStr: '{"version":8}', defaultBaseName: 'demo_project' };
        },
      },
      uiFeedback: {
        openCustomPrompt(_title: string, _defaultValue: string, cb: (value: string | null) => void) {
          cb('toast_failure_isolated');
        },
      },
    },
    actions: { meta: { setDirty() {} } },
  } as any;

  const saveProject = runEnsureSaveProjectAction(App, {
    win,
    doc,
    toast() {
      throw new Error('toast exploded in microtask');
    },
  });
  const operation = assertAcceptedSave(saveProject?.());
  assert.deepEqual(await operation.settled, {
    ok: true,
    outcome: 'browser-delivery-completed',
  });
  await new Promise(resolve => setTimeout(resolve, 0));

  assert.equal(reported.length, 1);
  assert.match(String((reported[0]?.err as Error)?.message), /toast exploded in microtask/);
  assert.equal(reported[0]?.ctx?.where, 'native/ui/project_save_runtime_action');
  assert.equal(reported[0]?.ctx?.op, 'saveProject.feedback.callback');
  assert.equal(reported[0]?.ctx?.fatal, false);
});
