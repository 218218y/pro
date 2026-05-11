import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');

function loadDesignTabEditModesControllerModule(calls) {
  const file = path.join(
    process.cwd(),
    'esm/native/ui/react/tabs/design_tab_edit_modes_controller_runtime.ts'
  );
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
    if (specifier === '../actions/modes_actions.js') {
      return {
        enterPrimaryMode: (...args) => calls.push(['enterPrimaryMode', ...args]),
        exitPrimaryMode: (...args) => calls.push(['exitPrimaryMode', ...args]),
      };
    }
    if (specifier === '../actions/builder_actions.js') {
      return {
        syncHandlesAfterDoorOps: (...args) => calls.push(['syncHandlesAfterDoorOps', ...args]),
      };
    }
    if (specifier === '../actions/store_actions.js') {
      return {
        setUiFlag: (...args) => calls.push(['setUiFlag', ...args]),
      };
    }
    if (specifier === './design_tab_multicolor_shared.js') {
      return {
        __designTabReportNonFatal: (...args) => calls.push(['reportNonFatal', ...args]),
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
    console: {
      warn: (...args) => calls.push(['console.warn', ...args]),
      error: (...args) => calls.push(['console.error', ...args]),
    },
    process,
  };
  vm.runInNewContext(transpiled, sandbox, { filename: file });
  return mod.exports;
}

test('[design-tab-edit-modes-controller] feature toggles and edit mode entry flow through one canonical owner', () => {
  const calls = [];
  const mod = loadDesignTabEditModesControllerModule(calls);

  const state = mod.readDesignTabEditModesState({
    primaryMode: 'split',
    splitVariant: 'custom',
    grooveModeId: 'groove',
    splitModeId: 'split',
    removeDoorModeId: 'remove_door',
  });
  assert.equal(
    JSON.stringify(state),
    JSON.stringify({
      grooveActive: false,
      splitActive: true,
      splitIsCustom: true,
      removeDoorActive: false,
    })
  );

  const controller = mod.createDesignTabEditModesController({
    app: { id: 'app' },
    feedback: { toast: (...args) => calls.push(['toast', ...args]) },
    grooveModeId: 'groove',
    splitModeId: 'split',
    removeDoorModeId: 'remove_door',
    groovesEnabled: false,
    splitDoors: false,
    removeDoorsEnabled: false,
    groovesDirty: false,
    removedDoorsDirty: false,
    grooveActive: false,
    splitActive: false,
    splitIsCustom: false,
    removeDoorActive: false,
  });

  controller.setFeatureToggle('groovesEnabled', true);
  assert.equal(
    calls.some(entry => entry[0] === 'setUiFlag'),
    false
  );
  const grooveEnterCall = calls.find(entry => entry[0] === 'enterPrimaryMode' && entry[2] === 'groove');
  assert.ok(grooveEnterCall);
  assert.equal(JSON.stringify(grooveEnterCall[3].uiPatch), JSON.stringify({ groovesEnabled: true }));
  assert.equal(grooveEnterCall[3].source, 'react:design:groovesEnabled');

  calls.length = 0;
  controller.toggleSplitCustomEdit();
  assert.ok(calls.some(entry => entry[0] === 'enterPrimaryMode' && entry[2] === 'split'));
  const splitCall = calls.find(entry => entry[0] === 'enterPrimaryMode');
  assert.equal(splitCall[3].modeOpts.splitVariant, 'custom');

  calls.length = 0;
  const exitController = mod.createDesignTabEditModesController({
    app: { id: 'app' },
    feedback: { toast: (...args) => calls.push(['toast', ...args]) },
    grooveModeId: 'groove',
    splitModeId: 'split',
    removeDoorModeId: 'remove_door',
    groovesEnabled: true,
    splitDoors: true,
    removeDoorsEnabled: true,
    groovesDirty: false,
    removedDoorsDirty: false,
    grooveActive: false,
    splitActive: true,
    splitIsCustom: true,
    removeDoorActive: true,
  });
  exitController.toggleSplitCustomEdit();
  exitController.toggleRemoveDoorEdit();
  assert.ok(calls.some(entry => entry[0] === 'exitPrimaryMode' && entry[2] === 'split'));
  assert.ok(calls.some(entry => entry[0] === 'exitPrimaryMode' && entry[2] === 'remove_door'));
});

test('[design-tab-edit-modes-controller] failures stay reported without throwing', () => {
  const calls = [];
  const mod = loadDesignTabEditModesControllerModule(calls);
  const controller = mod.createDesignTabEditModesController({
    app: { id: 'app' },
    feedback: {
      toast() {
        throw new Error('toast-boom');
      },
    },
    grooveModeId: 'groove',
    splitModeId: 'split',
    removeDoorModeId: 'remove_door',
    groovesEnabled: false,
    splitDoors: false,
    removeDoorsEnabled: false,
    groovesDirty: false,
    removedDoorsDirty: false,
    grooveActive: false,
    splitActive: false,
    splitIsCustom: false,
    removeDoorActive: false,
    reportNonFatal: (...args) => calls.push(['reportNonFatal', ...args]),
  });

  // monkey-patch mocked runtime to throw through local calls list inspection path
  calls.length = 0;
  const failingMod = loadDesignTabEditModesControllerModule(calls);
  const failing = failingMod.createDesignTabEditModesController({
    app: { id: 'app' },
    feedback: {
      toast() {
        throw new Error('toast-boom');
      },
    },
    grooveModeId: 'groove',
    splitModeId: 'split',
    removeDoorModeId: 'remove_door',
    groovesEnabled: false,
    splitDoors: false,
    removeDoorsEnabled: false,
    groovesDirty: false,
    removedDoorsDirty: false,
    grooveActive: false,
    splitActive: false,
    splitIsCustom: false,
    removeDoorActive: false,
    reportNonFatal: (...args) => calls.push(['reportNonFatal', ...args]),
  });

  // force enterPrimaryMode failures by overriding mocked calls after module load
  const realEnter = calls.push.bind(calls);
  calls.length = 0;
  const hardFailMod = (() => {
    const file = path.join(
      process.cwd(),
      'esm/native/ui/react/tabs/design_tab_edit_modes_controller_runtime.ts'
    );
    const source = fs.readFileSync(file, 'utf8');
    const transpiled = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
      fileName: file,
    }).outputText;
    const mod = { exports: {} };
    const localRequire = specifier => {
      if (specifier === '../actions/modes_actions.js') {
        return {
          enterPrimaryMode() {
            throw new Error('enter-boom');
          },
          exitPrimaryMode() {
            throw new Error('exit-boom');
          },
        };
      }
      if (specifier === '../actions/store_actions.js') {
        return {
          setUiFlag: (...args) => realEnter(['setUiFlag', ...args]),
        };
      }
      if (specifier === './design_tab_multicolor_shared.js') {
        return {
          __designTabReportNonFatal: (...args) => realEnter(['reportNonFatal', ...args]),
        };
      }
      return require(specifier);
    };
    vm.runInNewContext(
      transpiled,
      {
        module: mod,
        exports: mod.exports,
        require: localRequire,
        __dirname: path.dirname(file),
        __filename: file,
        console: {
          warn: (...args) => realEnter(['console.warn', ...args]),
          error: (...args) => realEnter(['console.error', ...args]),
        },
        process,
      },
      { filename: file }
    );
    return mod.exports;
  })();

  const hardFail = hardFailMod.createDesignTabEditModesController({
    app: { id: 'app' },
    feedback: {
      toast() {
        throw new Error('toast-boom');
      },
    },
    grooveModeId: 'groove',
    splitModeId: 'split',
    removeDoorModeId: 'remove_door',
    groovesEnabled: false,
    splitDoors: false,
    removeDoorsEnabled: false,
    groovesDirty: false,
    removedDoorsDirty: false,
    grooveActive: false,
    splitActive: false,
    splitIsCustom: false,
    removeDoorActive: true,
    reportNonFatal: (...args) => calls.push(['reportNonFatal', ...args]),
  });

  hardFail.toggleGrooveEdit();
  hardFail.toggleRemoveDoorEdit();

  assert.ok(calls.some(entry => entry[0] === 'reportNonFatal' && entry[1] === 'editModes:toastWarn'));
  assert.ok(calls.some(entry => entry[0] === 'reportNonFatal' && entry[1] === 'editModes:enterPrimaryMode'));
  assert.ok(calls.some(entry => entry[0] === 'reportNonFatal' && entry[1] === 'editModes:exitPrimaryMode'));
  assert.equal(
    calls.some(entry => entry[0] === 'console.warn'),
    false
  );
});

test('[design-tab-edit-modes-controller] enabling dirty or already-active features does not auto-enter duplicate edit modes', () => {
  const calls = [];
  const mod = loadDesignTabEditModesControllerModule(calls);
  const controller = mod.createDesignTabEditModesController({
    app: { id: 'app' },
    feedback: { toast: (...args) => calls.push(['toast', ...args]) },
    grooveModeId: 'groove',
    splitModeId: 'split',
    removeDoorModeId: 'remove_door',
    groovesEnabled: true,
    splitDoors: true,
    removeDoorsEnabled: true,
    groovesDirty: true,
    removedDoorsDirty: true,
    grooveActive: true,
    splitActive: true,
    splitIsCustom: false,
    removeDoorActive: true,
  });

  controller.setFeatureToggle('groovesEnabled', true);
  controller.setFeatureToggle('removeDoorsEnabled', true);
  controller.setFeatureToggle('splitDoors', false);
  controller.setFeatureToggle('groovesEnabled', false);
  controller.setFeatureToggle('removeDoorsEnabled', false);

  assert.equal(calls.filter(entry => entry[0] === 'enterPrimaryMode').length, 0);
  assert.deepEqual(
    calls.filter(entry => entry[0] === 'exitPrimaryMode').map(entry => entry[2]),
    ['split', 'groove', 'remove_door']
  );
  assert.equal(
    JSON.stringify(calls.filter(entry => entry[0] === 'exitPrimaryMode').map(entry => entry[3].uiPatch)),
    JSON.stringify([{ splitDoors: false }, { groovesEnabled: false }, { removeDoorsEnabled: false }])
  );
});
