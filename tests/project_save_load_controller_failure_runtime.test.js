import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createSaveLoadController,
  loadProjectSaveLoadControllerModule,
} from './project_save_load_controller_runtime_helpers.js';

test('[project-save-load-controller] runtime export/download failures stay canonical and keep actionable messages', async () => {
  const reportCalls = [];
  const toasts = [];
  let clicked = 0;
  const saveActionHolder = { current: null };
  const mod = loadProjectSaveLoadControllerModule({
    api: {
      exportProjectResultViaService: () => ({ ok: false, reason: 'invalid' }),
      getUiFeedback: () => ({}),
      handleProjectFileLoadViaService: async (_app, evt) => ({ ok: !!evt, pending: false }),
      metaUiOnly: () => null,
      setDirtyViaActions: () => undefined,
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
        if (result && result.message) toasts.push([result.message, 'error']);
        return result;
      },
    },
    browser: {
      normalizeDownloadFilename: value => value,
      downloadJsonTextResultViaBrowser: () => ({
        ok: false,
        reason: 'download-unavailable',
        message: 'browser blob download unavailable',
      }),
    },
  });

  const controller = createSaveLoadController(mod, saveActionHolder, {
    win: null,
    doc: null,
    toast: () => undefined,
    actions: { saveProjectViaActions: () => false },
  });

  controller.ensureSaveProjectAction();
  const inputTarget = { value: 'x' };
  controller.openLoadInput({
    click: () => {
      clicked += 1;
    },
  });
  await controller.handleLoadInputChange({ currentTarget: inputTarget });
  controller.performSave();
  await new Promise(resolve => setTimeout(resolve, 0));

  assert.equal(clicked, 1);
  assert.equal(inputTarget.value, '');
  assert.deepEqual(toasts, [['שמירה לא זמינה כרגע (exportCurrentProject)', 'error']]);
  assert.equal(
    JSON.stringify(reportCalls),
    JSON.stringify([
      ['load', { ok: true, pending: false }],
      ['save', { ok: false, reason: 'invalid', message: 'שמירה לא זמינה כרגע (exportCurrentProject)' }],
    ])
  );
});

test('[project-save-load-controller] thrown save/load handlers preserve real error messages', async () => {
  const reportCalls = [];
  const saveActionHolder = { current: null };
  const mod = loadProjectSaveLoadControllerModule({
    api: {
      exportProjectResultViaService: () => ({
        ok: true,
        exported: { jsonStr: '{}', defaultBaseName: 'demo' },
      }),
      getUiFeedback: () => ({
        openCustomPrompt: (_title, _def, _cb) => {
          throw new Error('prompt exploded');
        },
      }),
      handleProjectFileLoadViaService: async () => {
        throw new Error('load exploded');
      },
      metaUiOnly: () => null,
      normalizeUnknownError: (error, fallbackMessage) => ({
        message:
          (error && typeof error === 'object' && typeof error.message === 'string' && error.message) ||
          (typeof error === 'string' ? error : fallbackMessage),
      }),
      setDirtyViaActions: () => undefined,
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
        return result;
      },
    },
    browser: {
      normalizeDownloadFilename: value => value,
      downloadJsonTextViaBrowser: () => true,
    },
  });

  const controller = createSaveLoadController(mod, saveActionHolder);
  controller.ensureSaveProjectAction();
  const inputTarget = { value: 'x' };
  await controller.handleLoadInputChange({ currentTarget: inputTarget });
  controller.performSave();

  assert.equal(inputTarget.value, '');
  assert.equal(
    JSON.stringify(reportCalls),
    JSON.stringify([
      ['load', { ok: false, reason: 'error', message: 'load exploded' }],
      ['save', { ok: false, reason: 'error', message: 'prompt exploded' }],
    ])
  );
});

test('[project-save-load-controller] browser download failures preserve actionable messages from the canonical download seam', async () => {
  const reportCalls = [];
  const saveActionHolder = { current: null };
  const mod = loadProjectSaveLoadControllerModule({
    api: {
      exportProjectResultViaService: () => ({
        ok: true,
        exported: { jsonStr: '{}', defaultBaseName: 'demo' },
      }),
      getUiFeedback: () => ({
        openCustomPrompt: (_title, _def, cb) => cb('demo'),
      }),
      handleProjectFileLoadViaService: async () => ({ ok: true }),
      metaUiOnly: () => null,
      setDirtyViaActions: () => undefined,
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
        return result;
      },
    },
    browser: {
      normalizeDownloadFilename: value => value,
      downloadJsonTextResultViaBrowser: () => ({
        ok: false,
        reason: 'download-unavailable',
        message: 'browser blob download unavailable',
      }),
    },
  });

  const controller = createSaveLoadController(mod, saveActionHolder);
  controller.ensureSaveProjectAction();
  controller.performSave();
  await new Promise(resolve => setTimeout(resolve, 0));

  assert.equal(
    JSON.stringify(reportCalls),
    JSON.stringify([
      ['save', { ok: true, pending: true }],
      ['save', { ok: false, reason: 'download-unavailable', message: 'browser blob download unavailable' }],
    ])
  );
});

test('[project-save-load-controller] thrown non-Error save failures keep canonical actionable messages', async () => {
  const reportCalls = [];
  const saveActionHolder = { current: null };
  const mod = loadProjectSaveLoadControllerModule({
    api: {
      exportProjectResultViaService: () => ({
        ok: true,
        exported: { jsonStr: '{}', defaultBaseName: 'demo' },
      }),
      getUiFeedback: () => ({
        openCustomPrompt: () => {
          throw { message: 'prompt record exploded' };
        },
      }),
      handleProjectFileLoadViaService: async () => ({ ok: true }),
      metaUiOnly: () => null,
      setDirtyViaActions: () => undefined,
      normalizeUnknownError: (error, fallbackMessage) => ({
        message:
          (error && typeof error === 'object' && typeof error.message === 'string' && error.message) ||
          (typeof error === 'string' ? error : fallbackMessage),
      }),
    },
    feedback: {
      buildProjectActionErrorResult: (error, fallbackMessage) => ({
        ok: false,
        reason: 'error',
        message:
          (error && typeof error === 'object' && typeof error.message === 'string' && error.message) ||
          (typeof error === 'string' ? error : fallbackMessage),
      }),
      reportProjectLoadResult: (_fb, result) => reportCalls.push(['load', result]),
      reportProjectSaveResult: (_fb, result) => {
        reportCalls.push(['save', result]);
        return result;
      },
    },
    browser: {
      normalizeDownloadFilename: value => value,
      downloadJsonTextResultViaBrowser: () => ({ ok: true }),
    },
  });

  const controller = createSaveLoadController(mod, saveActionHolder);
  controller.ensureSaveProjectAction();
  controller.performSave();

  assert.equal(
    JSON.stringify(reportCalls),
    JSON.stringify([['save', { ok: false, reason: 'error', message: 'prompt record exploded' }]])
  );
});
