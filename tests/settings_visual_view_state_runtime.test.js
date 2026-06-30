import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');

function loadSettingsVisualViewStateModule(stubs = {}) {
  const file = path.join(process.cwd(), 'esm/native/ui/react/tabs/settings_visual_view_state_runtime.ts');
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
    if (specifier === './settings_visual_shared_contracts.js') {
      return {
        DEFAULT_WALL_COLOR: stubs.DEFAULT_WALL_COLOR || '#37474f',
      };
    }
    if (specifier === './settings_visual_shared_lighting.js') {
      return {
        LIGHT_PRESETS: stubs.LIGHT_PRESETS || { default: { amb: 0.7, dir: 1.45, x: 5, y: 8, z: 8 } },
      };
    }
    if (specifier === './settings_visual_shared_normalize.js') {
      return {
        asFiniteNumber:
          stubs.asFiniteNumber ||
          ((value, fallback) => {
            const next =
              typeof value === 'number' ? value : typeof value === 'string' ? parseFloat(value) : NaN;
            return Number.isFinite(next) ? next : fallback;
          }),
        asRecord:
          stubs.asRecord ||
          (value => (value && typeof value === 'object' && !Array.isArray(value) ? { ...value } : null)),
        getFloorTypeFromUi:
          stubs.getFloorTypeFromUi ||
          (ui =>
            ui.currentFloorType === 'tiles' || ui.currentFloorType === 'none'
              ? ui.currentFloorType
              : 'parquet'),
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

test('settings visual controls view-state runtime reads cfg state through canonical semantics', () => {
  const mod = loadSettingsVisualViewStateModule();
  assert.equal(
    JSON.stringify(mod.readSettingsVisualCfgState({ showDimensions: 1, savedNotes: [{}, {}] })),
    JSON.stringify({ showDimensions: true, mirrorReflectorEnabled: true })
  );
  assert.equal(
    JSON.stringify(mod.readSettingsVisualCfgState({ showDimensions: 0, MIRROR_REFLECTOR_ENABLED: false })),
    JSON.stringify({ showDimensions: false, mirrorReflectorEnabled: false })
  );
});

test('settings visual controls view-state runtime reads only type-specific floor style ids', () => {
  const mod = loadSettingsVisualViewStateModule();
  assert.equal(
    mod.readSettingsVisualFloorStyleId(
      {
        lastSelectedFloorStyleIdByType: { parquet: 'oak_light', tiles: 'marble_white' },
      },
      'tiles'
    ),
    'marble_white'
  );
  assert.equal(mod.readSettingsVisualFloorStyleId({}, 'parquet'), null);
});

test('settings visual controls view-state runtime normalizes wall color and preset fallbacks', () => {
  const mod = loadSettingsVisualViewStateModule();
  assert.equal(mod.readSettingsVisualWallColor({ lastSelectedWallColor: '#112233' }), '#112233');
  assert.equal(mod.readSettingsVisualWallColor({}), '#37474f');
  assert.equal(mod.readSettingsVisualLightingPreset({ lastLightPreset: 'evening' }), 'evening');
  assert.equal(mod.readSettingsVisualLightingPreset({}), 'default');
});

test('settings visual controls view-state runtime reads ui state with canonical defaults', () => {
  const mod = loadSettingsVisualViewStateModule();
  assert.equal(
    JSON.stringify(
      mod.readSettingsVisualUiState({
        currentFloorType: 'tiles',
        lastSelectedFloorStyleIdByType: { tiles: 'marble_white' },
        lastSelectedWallColor: '#abcdef',
        showContents: 1,
        showHanger: 0,
        globalClickMode: false,
        darkMode: true,
        lightingControl: true,
        lastLightPreset: 'front',
        lightAmb: '0.8',
        lightDir: 1.5,
        lightX: 7,
        lightY: '10',
        lightZ: 'oops',
      })
    ),
    JSON.stringify({
      showContents: true,
      showHanger: false,
      globalClickUi: false,
      darkMode: true,
      floorType: 'tiles',
      floorStyleId: 'marble_white',
      wallColor: '#abcdef',
      lightingControl: true,
      lastLightPreset: 'front',
      lightAmb: 0.8,
      lightDir: 1.5,
      lightX: 7,
      lightY: 10,
      lightZ: 8,
    })
  );
});

test('settings visual controls view-state runtime defaults dark mode off', () => {
  const mod = loadSettingsVisualViewStateModule();
  assert.equal(mod.readSettingsVisualUiState({}).darkMode, false);
});

test('settings visual controls view-state runtime reads runtime state booleans safely', () => {
  const mod = loadSettingsVisualViewStateModule();
  assert.equal(
    JSON.stringify(mod.readSettingsVisualRuntimeState({ globalClickMode: 0, sketchMode: 'yes' })),
    JSON.stringify({ globalClickRt: false })
  );
});
