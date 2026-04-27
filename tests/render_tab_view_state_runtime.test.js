import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');

function loadRenderTabViewStateModule(stubs = {}) {
  const file = path.join(process.cwd(), 'esm/native/ui/react/tabs/render_tab_view_state_runtime.ts');
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
    if (specifier === '../selectors/config_selectors.js') {
      return {
        selectSavedNotesCount:
          stubs.selectSavedNotesCount || (cfg => (Array.isArray(cfg.savedNotes) ? cfg.savedNotes.length : 0)),
      };
    }
    if (specifier === './render_tab_shared_contracts.js') {
      return {
        DEFAULT_WALL_COLOR: stubs.DEFAULT_WALL_COLOR || '#37474f',
      };
    }
    if (specifier === './render_tab_shared_lighting.js') {
      return {
        LIGHT_PRESETS: stubs.LIGHT_PRESETS || { default: { amb: 0.7, dir: 1.45, x: 5, y: 8, z: 8 } },
      };
    }
    if (specifier === './render_tab_shared_normalize.js') {
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

test('render tab view-state runtime reads cfg state through canonical semantics', () => {
  const mod = loadRenderTabViewStateModule();
  assert.equal(
    JSON.stringify(mod.readRenderTabCfgState({ showDimensions: 1, savedNotes: [{}, {}] })),
    JSON.stringify({ showDimensions: true, savedNotesCount: 2 })
  );
});

test('render tab view-state runtime prefers type-specific floor style and falls back to legacy id', () => {
  const mod = loadRenderTabViewStateModule();
  assert.equal(
    mod.readRenderTabFloorStyleId(
      {
        lastSelectedFloorStyleIdByType: { parquet: 'oak_light', tiles: 'marble_white' },
        lastSelectedFloorStyleId: 'legacy_fallback',
      },
      'tiles'
    ),
    'marble_white'
  );
  assert.equal(
    mod.readRenderTabFloorStyleId({ lastSelectedFloorStyleId: 'legacy_fallback' }, 'parquet'),
    'legacy_fallback'
  );
});

test('render tab view-state runtime normalizes wall color and preset fallbacks', () => {
  const mod = loadRenderTabViewStateModule();
  assert.equal(mod.readRenderTabWallColor({ lastSelectedWallColor: '#112233' }), '#112233');
  assert.equal(mod.readRenderTabWallColor({}), '#37474f');
  assert.equal(mod.readRenderTabLightingPreset({ lastLightPreset: 'evening' }), 'evening');
  assert.equal(mod.readRenderTabLightingPreset({}), 'default');
});

test('render tab view-state runtime reads ui state with canonical defaults', () => {
  const mod = loadRenderTabViewStateModule();
  assert.equal(
    JSON.stringify(
      mod.readRenderTabUiState({
        currentFloorType: 'tiles',
        lastSelectedFloorStyleIdByType: { tiles: 'marble_white' },
        lastSelectedWallColor: '#abcdef',
        showContents: 1,
        showHanger: 0,
        notesEnabled: true,
        globalClickMode: false,
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
      notesEnabled: true,
      globalClickUi: false,
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

test('render tab view-state runtime reads runtime state booleans safely', () => {
  const mod = loadRenderTabViewStateModule();
  assert.equal(
    JSON.stringify(mod.readRenderTabRuntimeState({ globalClickMode: 0, sketchMode: 'yes' })),
    JSON.stringify({ globalClickRt: false, sketchMode: true })
  );
});
