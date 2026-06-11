import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');

function loadRenderTabLightingControllerModule(stubs = {}) {
  const file = path.join(process.cwd(), 'esm/native/ui/react/tabs/render_tab_lighting_controller_runtime.ts');
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
        getUiSnapshot: stubs.getUiSnapshot || (() => ({})),
        patchUiLightingState: stubs.patchUiLightingState || (() => undefined),
        setUiLightScalar: stubs.setUiLightScalar || (() => undefined),
      };
    }
    if (specifier === './render_tab_shared_contracts.js') {
      return {
        WALL_COLOR_EVENING: stubs.WALL_COLOR_EVENING || '#222222',
      };
    }
    if (specifier === './render_tab_shared_lighting.js') {
      return {
        clamp: stubs.clamp || ((value, min, max) => Math.min(max, Math.max(min, value))),
        getLightBounds: stubs.getLightBounds || (() => ({ min: 0, max: 100 })),
        LIGHT_PRESETS: stubs.LIGHT_PRESETS || {
          default: { amb: 0.5, dir: 0.6, x: 1, y: 2, z: 3 },
          evening: { amb: 0.2, dir: 0.3, x: 4, y: 5, z: 6 },
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
    setTimeout,
    clearTimeout,
  };
  vm.runInNewContext(transpiled, sandbox, { filename: file });
  return mod.exports;
}

test('[render-tab-lighting-controller] centralizes lighting writes and preset room sync', () => {
  const calls = [];
  const mod = loadRenderTabLightingControllerModule({
    getUiSnapshot: () => ({}),
    patchUiLightingState: (...args) => calls.push(['patch', ...args]),
    setUiLightScalar: (...args) => calls.push(['scalar', ...args]),
  });
  const app = { id: 'app' };
  const controller = mod.createRenderTabLightingController({
    app,
    meta: { uiOnlyImmediate: source => ({ source, immediate: true }) },
    roomDesignRuntime: { updateRoomWall: (...args) => calls.push(['wall', ...args]) },
    defaultWall: '#ffffff',
  });

  controller.setLightingControl(true);
  controller.setLightValue('lightAmb', 500);
  controller.applyLightPreset('evening');

  assert.equal(
    JSON.stringify(calls),
    JSON.stringify([
      [
        'patch',
        app,
        {
          lightingControl: true,
          lightAmb: '0.5',
          lightDir: '0.6',
          lightX: '1',
          lightY: '2',
          lightZ: '3',
          lastLightPreset: 'default',
        },
        { source: 'react:renderTab:lightingControl', immediate: true },
      ],
      ['scalar', app, 'lightAmb', '100', { source: 'react:renderTab:lightSlider', immediate: true }],
      [
        'patch',
        app,
        {
          lightingControl: true,
          lastLightPreset: 'evening',
          lightAmb: '0.2',
          lightDir: '0.3',
          lightX: '4',
          lightY: '5',
          lightZ: '6',
          lastSelectedWallColor: '#222222',
        },
        { source: 'react:renderTab:lightPreset', immediate: true },
      ],
      ['wall', '#222222'],
    ])
  );
});

test('[render-tab-lighting-controller] runtime wall sync failures stay non-fatal', () => {
  const reported = [];
  const mod = loadRenderTabLightingControllerModule({
    patchUiLightingState: () => undefined,
  });
  const controller = mod.createRenderTabLightingController({
    app: { id: 'app' },
    meta: { uiOnlyImmediate: source => ({ source, immediate: true }) },
    roomDesignRuntime: {
      updateRoomWall: () => {
        throw new Error('boom');
      },
    },
    defaultWall: '#ffffff',
    reportNonFatal: (op, err) => reported.push([op, String(err && err.message ? err.message : err)]),
  });

  assert.doesNotThrow(() => controller.applyLightPreset('evening'));
  assert.equal(JSON.stringify(reported), JSON.stringify([['renderTabLighting:applyLightPreset', 'boom']]));
});
