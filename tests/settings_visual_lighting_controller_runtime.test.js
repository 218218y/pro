import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';

import { loadTsRuntimeModule } from './_ts_runtime_module_loader.mjs';
function loadSettingsVisualLightingControllerModule(stubs = {}) {
  const file = path.join(
    process.cwd(),
    'esm/native/ui/react/tabs/settings_visual_lighting_controller_runtime.ts'
  );
  const localRequire = specifier => {
    if (specifier === '../actions/store_actions.js') {
      return {
        getUiSnapshot: stubs.getUiSnapshot || (() => ({})),
        patchUiLightingState: stubs.patchUiLightingState || (() => undefined),
        setUiLightScalar: stubs.setUiLightScalar || (() => undefined),
      };
    }
    if (specifier === './settings_visual_shared_contracts.js') {
      return {
        WALL_COLOR_EVENING: stubs.WALL_COLOR_EVENING || '#222222',
      };
    }
    if (specifier === './settings_visual_shared_lighting.js') {
      return {
        clamp: stubs.clamp || ((value, min, max) => Math.min(max, Math.max(min, value))),
        getLightBounds: stubs.getLightBounds || (() => ({ min: 0, max: 100 })),
        LIGHT_PRESETS: stubs.LIGHT_PRESETS || {
          default: { amb: 0.5, dir: 0.6, x: 1, y: 2, z: 3 },
          evening: { amb: 0.2, dir: 0.3, x: 4, y: 5, z: 6 },
        },
      };
    }
    return undefined;
  };
  return loadTsRuntimeModule(file, {
    mock: specifier => localRequire(specifier),
  });
}

test('[settings-visual-lighting-controller] centralizes lighting writes and preset room sync', () => {
  const calls = [];
  const mod = loadSettingsVisualLightingControllerModule({
    getUiSnapshot: () => ({}),
    patchUiLightingState: (...args) => calls.push(['patch', ...args]),
    setUiLightScalar: (...args) => calls.push(['scalar', ...args]),
  });
  const app = { id: 'app' };
  const controller = mod.createSettingsVisualLightingController({
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
        { source: 'react:settingsVisual:lightingControl', immediate: true },
      ],
      ['scalar', app, 'lightAmb', '100', { source: 'react:settingsVisual:lightSlider', immediate: true }],
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
        { source: 'react:settingsVisual:lightPreset', immediate: true },
      ],
      ['wall', '#222222'],
    ])
  );
});

test('[settings-visual-lighting-controller] runtime wall sync failures stay non-fatal', () => {
  const reported = [];
  const mod = loadSettingsVisualLightingControllerModule({
    patchUiLightingState: () => undefined,
  });
  const controller = mod.createSettingsVisualLightingController({
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
  assert.equal(
    JSON.stringify(reported),
    JSON.stringify([['settingsVisualLighting:applyLightPreset', 'boom']])
  );
});
