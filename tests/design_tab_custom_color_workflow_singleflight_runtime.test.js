import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');

function createFeedbackSpy() {
  const seen = [];
  return {
    seen,
    toast(message, type) {
      seen.push({ message, type });
    },
    prompt(_title, defaultValue, cb) {
      cb(defaultValue);
    },
    confirm(_title, _message, onYes) {
      onYes();
    },
  };
}

function createAppHarness() {
  const state = {
    savedColors: [],
    colorSwatchesOrder: [],
    customUploadedDataURL: '',
    batchCalls: 0,
    appliedChoice: '',
    appliedSource: '',
  };
  const app = {
    actions: {
      config: {
        setCustomUploadedDataURL(next) {
          state.customUploadedDataURL = next == null ? null : String(next);
        },
      },
      colors: {
        setSavedColors(next) {
          state.savedColors = Array.isArray(next) ? next.slice() : [];
        },
        setColorSwatchesOrder(next) {
          state.colorSwatchesOrder = Array.isArray(next) ? next.slice() : [];
        },
      },
      history: {
        batch(fn) {
          state.batchCalls += 1;
          fn();
        },
      },
    },
  };
  const applyColorChoice = (choice, source) => {
    state.appliedChoice = String(choice || '');
    state.appliedSource = String(source || '');
  };
  return { app, state, applyColorChoice };
}

function createStateBag() {
  const bag = {
    customOpen: false,
    draftColor: '#d0d4d8',
    draftTextureName: '',
    draftTextureData: null,
  };
  return {
    bag,
    setCustomOpen(next) {
      bag.customOpen = next;
    },
    setDraftColor(next) {
      bag.draftColor = String(next);
    },
    setDraftTextureName(next) {
      bag.draftTextureName = String(next);
    },
    setDraftTextureData(next) {
      bag.draftTextureData = next == null ? null : String(next);
    },
  };
}

const SAVED_COLORS = [{ id: 'saved_a', name: 'לבן', type: 'color', value: '#ffffff', textureData: null }];

function loadWorkflowModule(stubs = {}) {
  const file = path.join(
    process.cwd(),
    'esm/native/ui/react/tabs/design_tab_custom_color_workflow_controller_runtime.ts'
  );
  const source = fs.readFileSync(file, 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: file,
  }).outputText;
  const mod = { exports: {} };
  const localRequire = specifier => {
    if (specifier === '../actions/store_actions.js') {
      return {
        setCfgCustomUploadedDataURL(app, next) {
          app.actions.config.setCustomUploadedDataURL(next);
        },
      };
    }
    if (specifier === '../../../services/api.js') {
      return {
        buildPerfEntryOptionsFromActionResult(result) {
          return result;
        },
        async runPerfAction(_app, _name, run) {
          return await run();
        },
      };
    }
    if (specifier === './design_tab_color_action_feedback.js') {
      return {
        reportDesignTabColorActionResult(feedback, result) {
          const message =
            result?.reason === 'busy' ? 'פעולת גוונים אחרת כבר מתבצעת כרגע' : String(result?.message || '');
          const type = result?.reason === 'busy' ? 'info' : result?.ok ? 'success' : 'error';
          feedback.toast(message, type);
        },
      };
    }
    if (specifier === './design_tab_color_action_singleflight.js') {
      const flights = new WeakMap();
      const beginFlight = ({ app, key, run }) => {
        const owner = app && typeof app === 'object' ? app : null;
        if (!owner) return { status: 'started', promise: Promise.resolve().then(run) };
        const active = flights.get(owner);
        if (active) {
          if (active.key === key) return { status: 'reused', promise: active.promise };
          return { status: 'busy', activeKey: active.key, promise: active.promise };
        }
        const promise = Promise.resolve().then(run);
        flights.set(owner, { key, promise });
        promise.finally(() => {
          if (flights.get(owner)?.promise === promise) flights.delete(owner);
        });
        return { status: 'started', promise };
      };
      return {
        DESIGN_TAB_COLOR_ACTION_SAVE_KEY: 'save-custom-color',
        buildDesignTabColorTextureUploadFlightKey(fileKey) {
          return `upload-texture:${String(fileKey || '').trim()}`;
        },
        buildDesignTabColorDeleteFlightKey(id) {
          return `delete-color:${String(id || '').trim()}`;
        },
        runDesignTabColorActionSingleFlight({ app, key, run, onBusy }) {
          const flight = beginFlight({ app, key, run });
          if (flight.status === 'reused') return flight.promise;
          if (flight.status === 'busy') {
            const busyKind =
              key === 'save-custom-color'
                ? 'save-custom-color'
                : String(key || '').startsWith('upload-texture:')
                  ? 'upload-texture'
                  : 'delete-color';
            const busyResult = { ok: false, reason: 'busy', kind: busyKind };
            if (typeof onBusy === 'function') onBusy(busyResult);
            return Promise.resolve(busyResult);
          }
          return flight.promise;
        },
      };
    }
    if (specifier === './design_tab_color_command_flows.js') {
      return {
        readTextureFileAsDataUrl:
          stubs.readTextureFileAsDataUrl || (async () => ({ ok: false, message: 'missing texture stub' })),
        removeCustomTexture: stubs.removeCustomTexture || (() => ({ ok: true, message: '' })),
        runSaveCustomColorFlow:
          stubs.runSaveCustomColorFlow || (async () => ({ ok: false, message: 'missing save stub' })),
      };
    }
    return require(specifier);
  };
  const sandbox = {
    module: mod,
    exports: mod.exports,
    require: localRequire,
    __dirname: path.dirname(file),
    __filename: file,
    console,
    process,
    setTimeout,
    clearTimeout,
    Promise,
  };
  vm.runInNewContext(transpiled, sandbox, { filename: file });
  return mod.exports;
}

test('custom color workflow saveCustom reuses one pending save flow', async () => {
  let resolve;
  let calls = 0;
  const pending = new Promise(r => {
    resolve = r;
  });
  const mod = loadWorkflowModule({
    runSaveCustomColorFlow: async () => {
      calls += 1;
      return pending;
    },
  });

  const feedback = createFeedbackSpy();
  const { app, state, applyColorChoice } = createAppHarness();
  const stateBag = createStateBag();
  const controller = mod.createDesignTabCustomColorWorkflowController({
    app,
    colorChoice: '#102030',
    customUploadedDataURL: '',
    feedback,
    savedColors: SAVED_COLORS,
    orderedSwatches: SAVED_COLORS,
    applyColorChoice,
    customOpen: true,
    draftColor: '#102030',
    draftTextureData: null,
    fileRef: { current: { value: 'picked' } },
    prevRef: { current: null },
    ...stateBag,
  });

  const first = controller.saveCustom();
  const second = controller.saveCustom();
  assert.equal(first, second);
  await Promise.resolve();
  assert.equal(calls, 1);

  resolve({ ok: true, kind: 'save-custom-color', message: 'נשמר גוון חדש' });
  await first;
  assert.equal(calls, 1);
  assert.deepEqual(feedback.seen, [{ message: 'נשמר גוון חדש', type: 'success' }]);
  assert.equal(stateBag.bag.customOpen, false);
  assert.equal(state.batchCalls, 0);
  assert.equal(state.appliedChoice, '');
});

test('custom color workflow reuses one pending texture upload per file fingerprint but allows distinct files', async () => {
  const results = [];
  let calls = 0;
  const mod = loadWorkflowModule({
    readTextureFileAsDataUrl: async file => {
      calls += 1;
      return await new Promise(resolve => {
        results.push({
          resolve,
          name: String(file?.name || ''),
        });
      });
    },
  });

  const feedback = createFeedbackSpy();
  const { app, state, applyColorChoice } = createAppHarness();
  const stateBag = createStateBag();
  const controller = mod.createDesignTabCustomColorWorkflowController({
    app,
    colorChoice: '#112233',
    customUploadedDataURL: '',
    feedback,
    savedColors: SAVED_COLORS,
    orderedSwatches: SAVED_COLORS,
    applyColorChoice,
    customOpen: true,
    draftColor: '#112233',
    draftTextureData: null,
    fileRef: { current: { value: 'picked' } },
    prevRef: { current: null },
    ...stateBag,
  });

  const fileA = { name: 'wood.png', size: 1, type: 'image/png', lastModified: 1 };
  const fileB = { name: 'metal.png', size: 2, type: 'image/png', lastModified: 2 };
  const first = controller.onPickTextureFile({ target: { files: [fileA] } });
  const second = controller.onPickTextureFile({ target: { files: [fileA] } });
  const third = controller.onPickTextureFile({ target: { files: [fileB] } });
  assert.equal(first, second);
  assert.notEqual(first, third);
  await Promise.resolve();
  assert.equal(calls, 1);
  assert.deepEqual(await third, { ok: false, kind: 'upload-texture', reason: 'busy' });

  results[0].resolve({
    ok: true,
    kind: 'upload-texture',
    dataUrl: 'data:a',
    textureName: 'wood.png',
    message: 'תמונה נטענה!',
  });
  await first;

  assert.equal(state.customUploadedDataURL, 'data:a');
  assert.equal(stateBag.bag.draftTextureData, 'data:a');
  assert.equal(stateBag.bag.draftTextureName, 'wood.png');
  assert.equal(state.appliedChoice, 'custom');
  assert.equal(state.appliedSource, 'react:design:custom:pickTexture');
  assert.deepEqual(feedback.seen, [
    { message: 'פעולת גוונים אחרת כבר מתבצעת כרגע', type: 'info' },
    { message: 'תמונה נטענה!', type: 'success' },
  ]);
});

test('custom color workflow single-flights across controllers that share the same app owner', async () => {
  let saveResolve;
  let textureResolve;
  let saveCalls = 0;
  let textureCalls = 0;
  const mod = loadWorkflowModule({
    runSaveCustomColorFlow: async () => {
      saveCalls += 1;
      return await new Promise(resolve => {
        saveResolve = resolve;
      });
    },
    readTextureFileAsDataUrl: async () => {
      textureCalls += 1;
      return await new Promise(resolve => {
        textureResolve = resolve;
      });
    },
  });

  const feedback = createFeedbackSpy();
  const { app, applyColorChoice } = createAppHarness();
  const firstState = createStateBag();
  const secondState = createStateBag();
  const baseArgs = {
    app,
    colorChoice: '#102030',
    customUploadedDataURL: '',
    feedback,
    savedColors: SAVED_COLORS,
    orderedSwatches: SAVED_COLORS,
    applyColorChoice,
    customOpen: true,
    draftColor: '#102030',
    draftTextureData: null,
    prevRef: { current: null },
  };
  const controllerA = mod.createDesignTabCustomColorWorkflowController({
    ...baseArgs,
    fileRef: { current: { value: 'picked-a' } },
    ...firstState,
  });
  const controllerB = mod.createDesignTabCustomColorWorkflowController({
    ...baseArgs,
    fileRef: { current: { value: 'picked-b' } },
    ...secondState,
  });

  const saveA = controllerA.saveCustom();
  const saveB = controllerB.saveCustom();
  assert.equal(saveA, saveB);
  await Promise.resolve();
  assert.equal(saveCalls, 1);

  const textureFile = { name: 'oak.png', size: 3, type: 'image/png', lastModified: 4 };
  const busyTexture = await controllerB.onPickTextureFile({ target: { files: [textureFile] } });
  assert.deepEqual(busyTexture, { ok: false, kind: 'upload-texture', reason: 'busy' });

  saveResolve({ ok: true, kind: 'save-custom-color', id: 'saved_2', name: 'חדש' });
  await saveA;

  const textureA = controllerA.onPickTextureFile({ target: { files: [textureFile] } });
  const textureB = controllerB.onPickTextureFile({ target: { files: [textureFile] } });
  assert.equal(textureA, textureB);
  await Promise.resolve();
  assert.equal(textureCalls, 1);
  textureResolve({
    ok: true,
    kind: 'upload-texture',
    dataUrl: 'data:oak',
    textureName: 'oak.png',
    message: 'תמונה נטענה!',
  });
  assert.deepEqual(await textureA, {
    ok: true,
    kind: 'upload-texture',
    dataUrl: 'data:oak',
    textureName: 'oak.png',
    message: 'תמונה נטענה!',
  });
});
