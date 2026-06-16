import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');

function loadSettingsVisualRoomDesignControllerModule(stubs = {}) {
  const file = path.join(
    process.cwd(),
    'esm/native/ui/react/tabs/settings_visual_room_design_controller_runtime.ts'
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
    if (specifier === '../actions/store_actions.js') {
      return {
        getUiSnapshot: stubs.getUiSnapshot || (() => ({})),
        setUiCurrentFloorType: stubs.setUiCurrentFloorType || (() => undefined),
        setUiLastSelectedWallColor: stubs.setUiLastSelectedWallColor || (() => undefined),
      };
    }
    if (specifier === './settings_visual_shared_room.js') {
      return {
        FALLBACK_FLOOR_STYLES: stubs.FALLBACK_FLOOR_STYLES || { parquet: [{ id: 'fallback' }], tile: [] },
      };
    }
    if (specifier === './settings_visual_shared_normalize.js') {
      return {
        normalizeFloorStyle: stubs.normalizeFloorStyle || (value => value),
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

test('[settings-visual-room-design-controller] delegates floor/wall flows through one canonical owner', () => {
  const calls = [];
  const app = { id: 'app' };
  const runtime = {
    __wp_room_resolveStyle: (type, lastId) => {
      calls.push(['resolve', type, lastId]);
      return { id: `${type}:${lastId || 'none'}` };
    },
    setActive: (...args) => calls.push(['setActive', ...args]),
    updateFloorTexture: (...args) => calls.push(['floor', ...args]),
    updateRoomWall: (...args) => calls.push(['wall', ...args]),
  };
  const mod = loadSettingsVisualRoomDesignControllerModule({
    getUiSnapshot: () => ({ lastSelectedFloorStyleIdByType: { parquet: 'oak' } }),
    setUiCurrentFloorType: (...args) => calls.push(['uiFloorType', ...args]),
    setUiLastSelectedWallColor: (...args) => calls.push(['uiWall', ...args]),
  });
  const meta = {
    uiOnlyImmediate: source => ({ source, immediate: true }),
    noBuild: (_value, source) => ({ source, build: false }),
  };
  const controller = mod.createSettingsVisualRoomDesignController({
    app,
    meta,
    roomData: { floorStyles: { parquet: [{ id: 'oak-fallback' }] } },
    roomDesignRuntime: runtime,
  });

  controller.setFloorType('parquet');
  controller.pickFloorStyle({ id: 'stone' });
  controller.pickWallColor('#fafafa');

  assert.equal(
    JSON.stringify(calls),
    JSON.stringify([
      ['uiFloorType', app, 'parquet', { source: 'react:settingsVisual:floorType', immediate: true }],
      ['resolve', 'parquet', 'oak'],
      ['floor', { id: 'parquet:oak' }],
      ['setActive', true, { source: 'react:settingsVisual:floorStyle', build: false }],
      ['floor', { id: 'stone' }, { force: true }],
      ['uiWall', app, '#fafafa', { source: 'react:settingsVisual:wallColor', immediate: true }],
      ['setActive', true, { source: 'react:settingsVisual:wallColor', build: false }],
      ['wall', '#fafafa', { force: true }],
    ])
  );
});

test('[settings-visual-room-design-controller] falls back cleanly when runtime activation/update misbehaves', () => {
  const calls = [];
  const mod = loadSettingsVisualRoomDesignControllerModule({
    getUiSnapshot: () => ({}),
    setUiCurrentFloorType: (...args) => calls.push(['uiFloorType', ...args]),
    setUiLastSelectedWallColor: (...args) => calls.push(['uiWall', ...args]),
  });
  const runtime = {
    setActive: () => {
      throw new Error('activate');
    },
    updateFloorTexture: () => {
      throw new Error('floor');
    },
    updateRoomWall: () => {
      throw new Error('wall');
    },
  };
  const reported = [];
  const controller = mod.createSettingsVisualRoomDesignController({
    app: { id: 'app' },
    meta: {
      uiOnlyImmediate: source => ({ source, immediate: true }),
      noBuild: (_value, source) => ({ source, build: false }),
    },
    roomData: { floorStyles: { parquet: [{ id: 'fallback-style' }] } },
    roomDesignRuntime: runtime,
    reportNonFatal: (op, err) => reported.push([op, String(err && err.message ? err.message : err)]),
  });

  assert.doesNotThrow(() => controller.setFloorType('parquet'));
  assert.doesNotThrow(() => controller.pickFloorStyle({ id: 'stone' }));
  assert.doesNotThrow(() => controller.pickWallColor('#111111'));

  assert.equal(
    JSON.stringify(reported),
    JSON.stringify([
      ['settingsVisualRoomDesign:setFloorType', 'floor'],
      ['react:settingsVisual:floorStyle:setActive', 'activate'],
      ['settingsVisualRoomDesign:pickFloorStyle', 'floor'],
      ['react:settingsVisual:wallColor:setActive', 'activate'],
      ['settingsVisualRoomDesign:pickWallColor', 'wall'],
    ])
  );
});
