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
    confirm(_title, _message, onYes) {
      onYes();
    },
  };
}

function createAppHarness() {
  const state = {
    savedColors: [],
    colorSwatchesOrder: [],
    batchCalls: 0,
    appliedChoice: '',
    appliedSource: '',
  };
  const app = {
    actions: {
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

function loadSavedSwatchesModule(stubs = {}) {
  const file = path.join(
    process.cwd(),
    'esm/native/ui/react/tabs/design_tab_saved_swatches_controller_runtime.ts'
  );
  const source = fs.readFileSync(file, 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: file,
  }).outputText;
  const mod = { exports: {} };
  const localRequire = specifier => {
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
          if (result)
            feedback.toast(String(result.reason || result.kind || ''), result.ok ? 'success' : 'info');
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
        reorderSavedColorSwatches: () => ({ ok: true, kind: 'reorder-swatches' }),
        toggleSavedColorLock: () => ({ ok: true, kind: 'toggle-lock', id: 'saved_a', locked: true }),
        runDeleteSavedColorFlow: stubs.runDeleteSavedColorFlow,
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

test('saved swatches delete is app-scoped single-flight across controllers and reports busy for conflicting design-color work', async () => {
  let deleteResolve;
  let deleteCalls = 0;
  const mod = loadSavedSwatchesModule({
    runDeleteSavedColorFlow: async () => {
      deleteCalls += 1;
      return await new Promise(resolve => {
        deleteResolve = resolve;
      });
    },
  });

  const feedback = createFeedbackSpy();
  const { app, applyColorChoice } = createAppHarness();
  const savedColors = [
    { id: 'saved_a', name: 'לבן', value: '#ffffff' },
    { id: 'saved_b', name: 'שחור', value: '#000000' },
  ];
  const orderedSwatches = savedColors;
  const controllerA = mod.createDesignTabSavedSwatchesController({
    app,
    feedback,
    savedColors,
    orderedSwatches,
    colorChoice: 'saved_a',
    applyColorChoice,
  });
  const controllerB = mod.createDesignTabSavedSwatchesController({
    app,
    feedback,
    savedColors,
    orderedSwatches,
    colorChoice: 'saved_a',
    applyColorChoice,
  });

  const first = controllerA.deleteSelected(savedColors[0]);
  const duplicate = controllerB.deleteSelected(savedColors[0]);
  await Promise.resolve();
  assert.equal(deleteCalls, 1);

  const busyDelete = await controllerB.deleteSelected(savedColors[1]);
  assert.deepEqual(busyDelete, { ok: false, kind: 'delete-color', reason: 'busy' });

  deleteResolve({ ok: true, kind: 'delete-color', id: 'saved_a', message: 'deleted' });
  assert.deepEqual(await first, { ok: true, kind: 'delete-color', id: 'saved_a', message: 'deleted' });
  assert.deepEqual(feedback.seen, [
    { message: 'busy', type: 'info' },
    { message: 'delete-color', type: 'success' },
  ]);
});
