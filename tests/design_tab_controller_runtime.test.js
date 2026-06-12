import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';

import { loadStructuralBuildRefreshActionsModule } from './_load_structural_build_refresh_actions.js';

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
  let structuralBuildRefreshActions;
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
    if (specifier === '../actions/structural_build_refresh_actions.js') {
      structuralBuildRefreshActions ||= loadStructuralBuildRefreshActionsModule(stubs);
      return structuralBuildRefreshActions;
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
    if (specifier === '../../../features/removable_parts.js') {
      const readMap = (cfg, name) =>
        cfg && typeof cfg === 'object' && cfg[name] && typeof cfg[name] === 'object' ? cfg[name] : {};
      return {
        ROUNDED_FRAME_SIDE_SHELVES_MAP_NAME: 'roundedFrameSideShelvesMap',
        readRemovedFrameSidePartIds: cfg => {
          const removed = readMap(cfg, 'removedDoorsMap');
          return ['body_left', 'lower_body_left', 'body_right', 'lower_body_right'].filter(
            partId => removed[`removed_${partId}`] === true
          );
        },
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
    patchViaActions: () => true,
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

test('[design-tab-controller-runtime] toggles rounded shelves for removed frame sides only', () => {
  const calls = [];
  const app = { id: 'app' };
  const mod = loadDesignTabControllerRuntimeModule({
    calls,
    readStoreStateMaybe: () => ({
      config: {
        removedDoorsMap: { removed_body_left: true },
        roundedFrameSideShelvesMap: { body_right: true },
      },
      ui: {},
    }),
  });
  const controller = mod.createDesignTabControllerRuntime({
    app,
    setFeatureToggle: () => undefined,
  });

  controller.toggleRoundedFrameSideShelves();

  assert.equal(calls.length, 2);
  assert.equal(calls[0][0], 'runHistoryBatch');
  assert.equal(calls[0][1], app);
  assert.deepEqual({ ...calls[0][2] }, { source: 'react:design:roundedFrameSideShelves', immediate: true });
  assert.equal(calls[1][0], 'setCfgMap');
  assert.equal(calls[1][1], app);
  assert.equal(calls[1][2], 'roundedFrameSideShelvesMap');
  assert.deepEqual({ ...calls[1][3] }, { body_right: true, body_left: true });
  assert.deepEqual({ ...calls[1][4] }, { source: 'react:design:roundedFrameSideShelves', immediate: true });
});

test('[design-tab-controller-runtime] toggles rounded shelves on lower scoped removed frame sides', () => {
  const calls = [];
  const app = { id: 'app' };
  const mod = loadDesignTabControllerRuntimeModule({
    calls,
    readStoreStateMaybe: () => ({
      config: {
        removedDoorsMap: { removed_body_left: true, removed_lower_body_left: true },
        roundedFrameSideShelvesMap: { body_left: true },
      },
      ui: {},
    }),
  });
  const controller = mod.createDesignTabControllerRuntime({
    app,
    setFeatureToggle: () => undefined,
  });

  controller.toggleRoundedFrameSideShelves();

  assert.equal(calls[1][0], 'setCfgMap');
  assert.deepEqual({ ...calls[1][3] }, { body_left: true, lower_body_left: true });
});
