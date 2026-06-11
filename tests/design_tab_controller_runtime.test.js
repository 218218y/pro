import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');

function loadDesignTabControllerRuntimeModule(stubs = {}) {
  const file = path.join(process.cwd(), 'esm/native/ui/react/tabs/design_tab_controller_runtime.ts');
  const source = fs.readFileSync(file, 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: file,
  }).outputText;
  const mod = { exports: {} };
  const localRequire = specifier => {
    if (specifier === '../actions/store_actions.js') {
      return {
        runHistoryBatch:
          stubs.runHistoryBatch ||
          ((app, fn, meta) => {
            stubs.calls?.push(['runHistoryBatch', app, meta]);
            fn();
          }),
        setCfgMap: stubs.setCfgMap || ((...args) => stubs.calls?.push(['setCfgMap', ...args])),
        setCfgScalar: stubs.setCfgScalar || ((...args) => stubs.calls?.push(['setCfgScalar', ...args])),
        setUiCorniceType:
          stubs.setUiCorniceType || ((...args) => stubs.calls?.push(['setUiCorniceType', ...args])),
        setUiDoorStyle: stubs.setUiDoorStyle || ((...args) => stubs.calls?.push(['setUiDoorStyle', ...args])),
      };
    }
    if (specifier === '../../../services/api.js') {
      return {
        materializeActiveGrooveLinesCountMap:
          stubs.materializeActiveGrooveLinesCountMap ||
          (app => {
            stubs.calls?.push(['materializeActiveGrooveLinesCountMap', app]);
            return { active: 4 };
          }),
        patchViaActions:
          stubs.patchViaActions ||
          ((...args) => {
            stubs.calls?.push(['patchViaActions', ...args]);
            return false;
          }),
        readStoreStateMaybe: stubs.readStoreStateMaybe || (() => ({ ui: {} })),
        requestBuilderStructuralRefresh:
          stubs.requestBuilderStructuralRefresh ||
          ((...args) => stubs.calls?.push(['requestBuilderStructuralRefresh', ...args])),
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
  };
  vm.runInNewContext(transpiled, sandbox, { filename: file });
  return mod.exports;
}

test('[design-tab-controller-runtime] delegates structural ui writes through canonical no-build patch + refresh', () => {
  const calls = [];
  const mod = loadDesignTabControllerRuntimeModule({
    calls,
    patchViaActions: (...args) => {
      calls.push(['patchViaActions', ...args]);
      return true;
    },
    readStoreStateMaybe: () => ({ ui: { doorStyle: 'flat', corniceType: 'classic' } }),
  });
  const toggles = [];
  const app = { id: 'app' };
  const controller = mod.createDesignTabControllerRuntime({
    app,
    setFeatureToggle: (...args) => toggles.push(args),
  });

  assert.equal(mod.normalizeDesignTabGrooveLinesCount(0), 1);
  assert.equal(mod.normalizeDesignTabGrooveLinesCount(12.8), 12);
  assert.equal(mod.normalizeDesignTabGrooveLinesCount(Number.NaN), 1);

  controller.setDoorStyle('profile');
  controller.setCorniceType('wave');
  controller.setHasCornice(true);
  controller.setFeatureToggle('groovesEnabled', true);
  controller.setGrooveLinesCount(7.9);
  controller.resetGrooveLinesCount();

  assert.equal(
    JSON.stringify(calls),
    JSON.stringify([
      [
        'patchViaActions',
        app,
        { ui: { doorStyle: 'profile' } },
        { source: 'react:design:doorStyle', immediate: true, noBuild: true },
      ],
      [
        'requestBuilderStructuralRefresh',
        app,
        { source: 'react:design:doorStyle', immediate: false, force: false, triggerRender: false },
      ],
      [
        'patchViaActions',
        app,
        { ui: { corniceType: 'wave' } },
        { source: 'react:design:corniceType', immediate: true, noBuild: true },
      ],
      [
        'requestBuilderStructuralRefresh',
        app,
        { source: 'react:design:corniceType', immediate: false, force: false, triggerRender: false },
      ],
      ['runHistoryBatch', app, { source: 'react:design:grooveLinesCount', immediate: true }],
      ['materializeActiveGrooveLinesCountMap', app],
      [
        'setCfgMap',
        app,
        'grooveLinesCountMap',
        { active: 4 },
        { source: 'react:design:grooveLinesCount:freezeExisting', immediate: true },
      ],
      [
        'setCfgScalar',
        app,
        'grooveLinesCount',
        7,
        { source: 'react:design:grooveLinesCount', immediate: true },
      ],
      ['runHistoryBatch', app, { source: 'react:design:grooveLinesCount:reset', immediate: true }],
      ['materializeActiveGrooveLinesCountMap', app],
      [
        'setCfgMap',
        app,
        'grooveLinesCountMap',
        { active: 4 },
        { source: 'react:design:grooveLinesCount:freezeExisting', immediate: true },
      ],
      [
        'setCfgScalar',
        app,
        'grooveLinesCount',
        null,
        { source: 'react:design:grooveLinesCount:reset', immediate: true },
      ],
    ])
  );

  assert.equal(
    JSON.stringify(toggles),
    JSON.stringify([
      ['hasCornice', true],
      ['groovesEnabled', true],
    ])
  );
});
