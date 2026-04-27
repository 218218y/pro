import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');

function loadDesignTabViewStateRuntimeModule(stubs = {}) {
  const file = path.join(process.cwd(), 'esm/native/ui/react/tabs/design_tab_view_state_runtime.ts');
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
        selectWardrobeType: stubs.selectWardrobeType || (cfg => cfg.wardrobeType),
        selectSavedColors: stubs.selectSavedColors || (cfg => cfg.savedColors),
        selectCustomUploadedDataURL: stubs.selectCustomUploadedDataURL || (cfg => cfg.customUploadedDataURL),
        selectColorSwatchesOrder: stubs.selectColorSwatchesOrder || (cfg => cfg.colorSwatchesOrder),
        selectGrooveLinesCount: stubs.selectGrooveLinesCount || (cfg => cfg.grooveLinesCount),
        selectGroovesDirty: stubs.selectGroovesDirty || (cfg => cfg.groovesDirty),
        selectRemovedDoorsDirty: stubs.selectRemovedDoorsDirty || (cfg => cfg.removedDoorsDirty),
      };
    }
    if (specifier === './design_tab_shared.js') {
      return {
        readDesignTabDoorStyle:
          stubs.readDesignTabDoorStyle || (value => String(value || 'flat').toLowerCase()),
        readDesignTabCorniceType:
          stubs.readDesignTabCorniceType || (value => String(value || 'classic').toLowerCase()),
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

test('[design-tab-view-state-runtime] derives cfg/ui/design feature state through one stable seam', () => {
  const mod = loadDesignTabViewStateRuntimeModule();

  assert.equal(
    JSON.stringify(
      mod.readDesignTabCfgState({
        wardrobeType: 'sliding',
        savedColors: [{ id: '1' }],
        customUploadedDataURL: 'blob:123',
        colorSwatchesOrder: ['a', 'b'],
        grooveLinesCount: 7,
        groovesDirty: 1,
        removedDoorsDirty: 0,
      })
    ),
    JSON.stringify({
      wardrobeType: 'sliding',
      savedColorsRaw: [{ id: '1' }],
      customUploadedDataURL: 'blob:123',
      colorSwatchesOrderRaw: ['a', 'b'],
      grooveLinesCountOverride: 7,
      groovesDirty: true,
      removedDoorsDirty: false,
    })
  );

  assert.equal(
    JSON.stringify(
      mod.readDesignTabUiState({
        doorStyle: 'PROFILE',
        colorChoice: '#111111',
        groovesEnabled: 1,
        splitDoors: 0,
        removeDoorsEnabled: true,
        hasCornice: 'yes',
        corniceType: 'WAVE',
      })
    ),
    JSON.stringify({
      doorStyle: 'profile',
      colorChoice: '#111111',
      groovesEnabled: true,
      splitDoors: false,
      removeDoorsEnabled: true,
      hasCornice: true,
      corniceType: 'wave',
    })
  );

  assert.equal(
    JSON.stringify(
      mod.deriveDesignTabDoorFeaturesState({
        wardrobeType: 'hinged',
        grooveLinesCountOverride: null,
        groovesEnabled: true,
        splitDoors: false,
        removeDoorsEnabled: true,
      })
    ),
    JSON.stringify({
      wardrobeType: 'hinged',
      groovesEnabled: true,
      grooveLinesCount: '',
      grooveLinesCountIsAuto: true,
      splitDoors: false,
      removeDoorsEnabled: true,
    })
  );

  assert.equal(
    JSON.stringify(
      mod.deriveDesignTabDoorFeaturesState({
        wardrobeType: 'sliding',
        grooveLinesCountOverride: 9,
        groovesEnabled: false,
        splitDoors: true,
        removeDoorsEnabled: false,
      })
    ),
    JSON.stringify({
      wardrobeType: 'sliding',
      groovesEnabled: false,
      grooveLinesCount: '9',
      grooveLinesCountIsAuto: false,
      splitDoors: true,
      removeDoorsEnabled: false,
    })
  );
});

test('[design-tab-view-state-runtime] delegates selector and shared readers exactly once per state read', () => {
  const calls = [];
  const mod = loadDesignTabViewStateRuntimeModule({
    selectWardrobeType(cfg) {
      calls.push(['selectWardrobeType', cfg]);
      return 'hinged';
    },
    selectSavedColors(cfg) {
      calls.push(['selectSavedColors', cfg]);
      return [{ id: 'saved_a' }];
    },
    selectCustomUploadedDataURL(cfg) {
      calls.push(['selectCustomUploadedDataURL', cfg]);
      return 'blob:custom';
    },
    selectColorSwatchesOrder(cfg) {
      calls.push(['selectColorSwatchesOrder', cfg]);
      return ['saved_a'];
    },
    selectGrooveLinesCount(cfg) {
      calls.push(['selectGrooveLinesCount', cfg]);
      return 4;
    },
    selectGroovesDirty(cfg) {
      calls.push(['selectGroovesDirty', cfg]);
      return 1;
    },
    selectRemovedDoorsDirty(cfg) {
      calls.push(['selectRemovedDoorsDirty', cfg]);
      return 0;
    },
    readDesignTabDoorStyle(value) {
      calls.push(['readDesignTabDoorStyle', value]);
      return 'tom';
    },
    readDesignTabCorniceType(value) {
      calls.push(['readDesignTabCorniceType', value]);
      return 'wave';
    },
  });

  const cfg = { id: 'cfg' };
  const ui = { doorStyle: 'PROFILE', corniceType: 'CLASSIC', colorChoice: 'custom' };

  assert.equal(
    JSON.stringify(mod.readDesignTabCfgState(cfg)),
    JSON.stringify({
      wardrobeType: 'hinged',
      savedColorsRaw: [{ id: 'saved_a' }],
      customUploadedDataURL: 'blob:custom',
      colorSwatchesOrderRaw: ['saved_a'],
      grooveLinesCountOverride: 4,
      groovesDirty: true,
      removedDoorsDirty: false,
    })
  );
  assert.equal(
    JSON.stringify(mod.readDesignTabUiState(ui)),
    JSON.stringify({
      doorStyle: 'tom',
      colorChoice: 'custom',
      groovesEnabled: false,
      splitDoors: false,
      removeDoorsEnabled: false,
      hasCornice: false,
      corniceType: 'wave',
    })
  );

  assert.deepEqual(
    calls.map(entry => entry[0]),
    [
      'selectWardrobeType',
      'selectSavedColors',
      'selectCustomUploadedDataURL',
      'selectColorSwatchesOrder',
      'selectGrooveLinesCount',
      'selectGroovesDirty',
      'selectRemovedDoorsDirty',
      'readDesignTabDoorStyle',
      'readDesignTabCorniceType',
    ]
  );
});
