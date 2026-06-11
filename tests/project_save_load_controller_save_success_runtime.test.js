import test from 'node:test';
import assert from 'node:assert/strict';
import { loadProjectSaveLoadControllerModule } from './project_save_load_controller_runtime_helpers.js';

test('[project-save-load-controller] installed save action exports current project at click time and reports pending/final results canonically', async () => {
  const toasts = [];
  const reportCalls = [];
  const setDirtyCalls = [];
  const setActionCalls = [];
  const downloadCalls = [];
  const promptCalls = [];
  const exportCalls = [];
  const saveActionHolder = { current: null };
  const fixedDate = class extends Date {
    constructor(...args) {
      super(args.length ? args[0] : '2026-03-29T08:00:00.000Z');
    }
    static now() {
      return new Date('2026-03-29T08:00:00.000Z').valueOf();
    }
  };

  const mod = loadProjectSaveLoadControllerModule({
    Date: fixedDate,
    api: {
      exportProjectResultViaService: () => {
        const nextJson = exportCalls.length === 0 ? '{"version":1}' : '{"version":2}';
        exportCalls.push(nextJson);
        return { ok: true, exported: { jsonStr: nextJson, defaultBaseName: 'demo_project' } };
      },
      getUiFeedback: () => ({
        openCustomPrompt: (title, def, cb) => {
          promptCalls.push([title, def]);
          cb(' saved_name ');
        },
      }),
      handleProjectFileLoadViaService: async () => ({ ok: true }),
      normalizeProjectIoLoadResult: value => value,
      metaUiOnly: (_app, _meta, source) => ({ source }),
      setDirtyViaActions: (_app, dirty, meta) => setDirtyCalls.push([dirty, meta]),
    },
    feedback: {
      buildProjectActionErrorResult: (error, fallbackMessage) => ({
        ok: false,
        reason: 'error',
        message: error instanceof Error && error.message ? error.message : fallbackMessage,
      }),
      reportProjectLoadResult: (_fb, result) => reportCalls.push(['load', result]),
      reportProjectSaveResult: (_fb, result) => {
        reportCalls.push(['save', result]);
        if (result && result.ok && result.pending !== true) toasts.push(['הפרויקט נשמר בהצלחה!', 'success']);
        if (result && result.reason === 'download-unavailable')
          toasts.push(['הדפדפן לא זמין לשמירה', 'error']);
        if (result && result.reason === 'error' && result.message) toasts.push([result.message, 'error']);
        return result;
      },
    },
    browser: {
      normalizeDownloadFilename: (trimmed, fallback, ext) => `${trimmed || fallback}${ext}`,
      downloadJsonTextResultViaBrowser: (...args) => {
        downloadCalls.push(args);
        return { ok: true };
      },
    },
  });

  const controller = mod.createProjectSaveLoadInteractionController(
    { id: 'app' },
    { win: null, doc: { id: 'doc' }, toast: () => undefined },
    {
      getSaveProjectAction: () => saveActionHolder.current,
      setSaveProjectAction: (_app, fn) => {
        saveActionHolder.current = fn;
        setActionCalls.push(fn);
      },
      saveProjectResultViaActions: app =>
        saveActionHolder.current?.(app) ??
        saveActionHolder.current?.() ?? { ok: false, reason: 'not-installed' },
      saveProjectViaActions: () => true,
    }
  );

  controller.ensureSaveProjectAction();
  assert.equal(setActionCalls.length, 1);
  controller.performSave();
  controller.performSave();
  await new Promise(resolve => setTimeout(resolve, 0));

  assert.deepEqual(exportCalls, ['{"version":1}', '{"version":2}']);
  assert.deepEqual(promptCalls, [
    ['בחר שם לקובץ השמירה:', 'demo_project'],
    ['בחר שם לקובץ השמירה:', 'demo_project'],
  ]);
  assert.equal(downloadCalls.length, 2);
  assert.equal(downloadCalls[0][1], 'saved_name.json');
  assert.equal(downloadCalls[0][2], '{"version":1}');
  assert.equal(downloadCalls[1][2], '{"version":2}');
  assert.deepEqual(setDirtyCalls, [
    [false, { source: 'saveProject' }],
    [false, { source: 'saveProject' }],
  ]);
  assert.deepEqual(toasts, [
    ['הפרויקט נשמר בהצלחה!', 'success'],
    ['הפרויקט נשמר בהצלחה!', 'success'],
  ]);
  assert.equal(
    JSON.stringify(reportCalls),
    JSON.stringify([
      ['save', { ok: true, pending: true }],
      ['save', { ok: true, pending: true }],
      ['save', { ok: true }],
      ['save', { ok: true }],
    ])
  );
});
