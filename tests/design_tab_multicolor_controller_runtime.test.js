import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');

function loadDesignTabMulticolorControllerModule(reportCalls) {
  const file = path.join(
    process.cwd(),
    'esm/native/ui/react/tabs/design_tab_multicolor_controller_runtime.ts'
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
    if (specifier === '../../../services/api.js') {
      return {
        MODES: { PAINT: 'paint' },
        getTools: app => app.__tools || {},
        setUiScalarSoft: (...args) => reportCalls.push(['setUiScalarSoft', ...args]),
      };
    }
    if (specifier === '../actions/modes_actions.js') {
      return {
        enterPrimaryMode: (...args) => reportCalls.push(['enterPrimaryMode', ...args]),
      };
    }
    if (specifier === '../../multicolor_service.js') {
      return {
        exitPaintMode: (...args) => reportCalls.push(['exitPaintMode', ...args]),
        setCurtainChoice: (...args) => reportCalls.push(['setCurtainChoice', ...args]),
        setMultiEnabled: (...args) => reportCalls.push(['setMultiEnabled', ...args]),
      };
    }
    if (specifier === '../../../features/door_style_overrides.js') {
      return {
        encodeDoorStyleOverridePaintToken: value => `__door_style__:${value}`,
      };
    }
    if (specifier === './design_tab_multicolor_shared.js') {
      return {
        __designTabReportNonFatal: (...args) => reportCalls.push(['reportNonFatal', ...args]),
        buildDesignTabDefaultSwatches: app => {
          if (Array.isArray(app.__defaults)) return app.__defaults;
          return [{ paintId: '#fff', title: 'Default', val: '#fff' }];
        },
        isRecord: value => !!value && typeof value === 'object' && !Array.isArray(value),
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
  };
  vm.runInNewContext(transpiled, sandbox, { filename: file });
  return mod.exports;
}

test('[design-tab-multicolor-controller] paint actions flow through one canonical owner', () => {
  const calls = [];
  const mod = loadDesignTabMulticolorControllerModule(calls);
  const setPaintColorCalls = [];
  let paintActive = false;
  const app = {
    id: 'app',
    __defaults: [{ paintId: '#123', title: 'Imported', val: '#123' }],
    __tools: {
      setPaintColor: value => calls.push(['tool.setPaintColor', value]),
      getPaintColor: () => 'glass',
    },
  };
  const controller = mod.createDesignTabMulticolorController({
    app,
    getPaintActive: () => paintActive,
    setPaintColor: next => setPaintColorCalls.push(next),
  });

  assert.equal(controller.syncPaintColorFromTools(), null);
  assert.deepEqual(setPaintColorCalls, [null]);

  controller.toggleEnabled(false);
  assert.ok(calls.some(entry => entry[0] === 'setMultiEnabled' && entry[2] === false));
  assert.ok(calls.some(entry => entry[0] === 'exitPaintMode'));
  assert.equal(setPaintColorCalls.at(-1), null);

  calls.length = 0;
  setPaintColorCalls.length = 0;
  controller.pickBrush('glass', 'pink');
  assert.ok(calls.some(entry => entry[0] === 'enterPrimaryMode' && entry[2] === 'paint'));
  assert.ok(calls.some(entry => entry[0] === 'tool.setPaintColor' && entry[1] === 'glass'));
  assert.ok(calls.some(entry => entry[0] === 'setCurtainChoice' && entry[2] === 'pink'));
  assert.deepEqual(setPaintColorCalls, ['glass']);

  paintActive = true;
  calls.length = 0;
  setPaintColorCalls.length = 0;
  controller.enterDoorStyleMode('profile');
  assert.ok(calls.some(entry => entry[0] === 'tool.setPaintColor' && entry[1] === '__door_style__:profile'));
  assert.deepEqual(setPaintColorCalls, ['__door_style__:profile']);

  calls.length = 0;
  setPaintColorCalls.length = 0;
  controller.pickBrush('mirror');
  assert.ok(!calls.some(entry => entry[0] === 'enterPrimaryMode'));
  assert.ok(calls.some(entry => entry[0] === 'tool.setPaintColor' && entry[1] === 'mirror'));
  assert.deepEqual(setPaintColorCalls, ['mirror']);

  assert.deepEqual(controller.readDefaultSwatches(), [{ paintId: '#123', title: 'Imported', val: '#123' }]);
});

test('[design-tab-multicolor-controller] non-fatal failures stay reported without throwing', () => {
  const calls = [];
  const mod = loadDesignTabMulticolorControllerModule(calls);
  let paintActive = true;
  const controller = mod.createDesignTabMulticolorController({
    app: {
      __tools: {
        setPaintColor() {
          throw new Error('boom');
        },
        getPaintColor() {
          throw new Error('boom');
        },
      },
    },
    getPaintActive: () => paintActive,
    setPaintColor: () => calls.push(['setPaintColor']),
    setMultiEnabled() {
      throw new Error('boom');
    },
    setCurtainChoice() {
      throw new Error('boom');
    },
    exitPaintMode() {
      throw new Error('boom');
    },
    enterPrimaryMode() {
      throw new Error('boom');
    },
    setUiScalarSoft() {
      throw new Error('boom');
    },
    reportNonFatal: (...args) => calls.push(['reportNonFatal', ...args]),
  });

  assert.equal(controller.syncPaintColorFromTools(), null);
  controller.toggleEnabled(false);
  controller.setCurtain('white');
  controller.setMirrorDraftField('currentMirrorDraftHeightCm', '120');
  paintActive = false;
  controller.pickBrush('glass', 'white');
  paintActive = true;
  controller.finishPaintMode();

  assert.ok(calls.some(entry => entry[0] === 'reportNonFatal' && entry[1] === 'multicolor:toggleEnabled'));
  assert.ok(calls.some(entry => entry[0] === 'reportNonFatal' && entry[1] === 'multicolor:curtainChoice'));
  assert.ok(calls.some(entry => entry[0] === 'reportNonFatal' && entry[1] === 'multicolor:mirrorDraft'));
  assert.ok(calls.some(entry => entry[0] === 'reportNonFatal' && entry[1] === 'multicolor:enterPaint'));
  assert.ok(calls.some(entry => entry[0] === 'reportNonFatal' && entry[1] === 'multicolor:paintColor'));
  assert.ok(calls.some(entry => entry[0] === 'reportNonFatal' && entry[1] === 'multicolor:finishPaint'));
});
