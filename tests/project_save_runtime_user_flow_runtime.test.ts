import test from 'node:test';
import assert from 'node:assert/strict';

import { runEnsureSaveProjectAction } from '../esm/native/ui/project_save_runtime.ts';

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
  assert.deepEqual(saveProject?.(), { ok: true, pending: true });
  await new Promise(resolve => setTimeout(resolve, 0));

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
  assert.deepEqual(saveProject?.(), { ok: true, pending: true });
  await new Promise(resolve => setTimeout(resolve, 0));

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
  assert.deepEqual(saveProject?.(), { ok: true, pending: true });
  assert.deepEqual(saveProject?.(), { ok: true, pending: true });
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

  assert.deepEqual(saveProject?.(), { ok: true, pending: true });
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
  assert.deepEqual(saveProject?.(), { ok: true, pending: true });

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
  assert.deepEqual(saveProject?.(), { ok: true, pending: true });
  assert.equal(promptCallbacks.length, 1);
});
