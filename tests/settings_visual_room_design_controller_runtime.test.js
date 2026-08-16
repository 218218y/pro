import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';

import { loadTsRuntimeModule } from './_ts_runtime_module_loader.mjs';
function loadSettingsVisualRoomDesignControllerModule(stubs = {}) {
  const file = path.join(
    process.cwd(),
    'esm/native/ui/react/tabs/settings_visual_room_design_controller_runtime.ts'
  );
  const localRequire = specifier => {
    if (specifier === '../../../../shared/room_architecture_shared.js') {
      return {
        patchRoomArchitecture:
          stubs.patchRoomArchitecture ||
          ((current, patch) => ({
            ...current,
            ...patch,
            backWall: { ...current.backWall, ...(patch.backWall || {}) },
            column: { ...current.column, ...(patch.column || {}) },
          })),
      };
    }
    if (specifier === '../actions/structural_build_refresh_actions.js') {
      return {
        patchProjectRoomArchitecture:
          stubs.patchProjectRoomArchitecture ||
          ((current, patch) => ({
            ...current,
            ...patch,
            backWall: { ...current.backWall, ...patch.backWall },
            column: { ...current.column, ...patch.column },
          })),
        applyStructuralConfigMutation:
          stubs.applyStructuralConfigMutation ||
          ((app, source, patch, applyDirectMutation, options) => {
            applyDirectMutation({ source, buildTiming: options?.buildTiming });
            return { appliedViaActions: false, requestedBuild: false };
          }),
      };
    }
    if (specifier === '../actions/store_actions.js') {
      return {
        getUiSnapshot: stubs.getUiSnapshot || (() => ({})),
        getConfigSnapshot: stubs.getConfigSnapshot || (() => ({})),
        setCfgScalar: stubs.setCfgScalar || (() => undefined),
        setUiCurrentFloorType: stubs.setUiCurrentFloorType || (() => undefined),
        setUiLastSelectedWallColor: stubs.setUiLastSelectedWallColor || (() => undefined),
      };
    }
    if (specifier === './settings_visual_shared_room.js') {
      return {
        DEFAULT_FLOOR_STYLES: stubs.DEFAULT_FLOOR_STYLES || { parquet: [{ id: 'fallback' }], tile: [] },
      };
    }
    if (specifier === './settings_visual_shared_normalize.js') {
      return {
        normalizeFloorStyle: stubs.normalizeFloorStyle || (value => value),
      };
    }
    return undefined;
  };
  return loadTsRuntimeModule(file, {
    mock: specifier => localRequire(specifier),
  });
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
    roomArchitecture: {
      backWall: { enabled: false, widthCm: 400, heightCm: 280, wardrobeOffsetLeftCm: 50 },
      column: {
        enabled: false,
        offsetLeftCm: 180,
        widthCm: 30,
        depthCm: 20,
        heightCm: 280,
        bottomOffsetCm: 0,
      },
      surfacesHidden: false,
    },
    wardrobeWidthCm: 240,
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
    roomArchitecture: {
      backWall: { enabled: false, widthCm: 400, heightCm: 280, wardrobeOffsetLeftCm: 50 },
      column: {
        enabled: false,
        offsetLeftCm: 180,
        widthCm: 30,
        depthCm: 20,
        heightCm: 280,
        bottomOffsetCm: 0,
      },
      surfacesHidden: false,
    },
    wardrobeWidthCm: 240,
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

test('[settings-visual-room-design-controller] persists room architecture structurally while visibility stays no-build', () => {
  const calls = [];
  const app = { id: 'app' };
  let configState = {
    roomArchitecture: {
      backWall: { enabled: true, widthCm: 400, heightCm: 280, wardrobeOffsetLeftCm: 50 },
      column: {
        enabled: false,
        offsetLeftCm: 180,
        widthCm: 30,
        depthCm: 20,
        heightCm: 280,
        bottomOffsetCm: 0,
      },
      surfacesHidden: false,
    },
  };
  const mod = loadSettingsVisualRoomDesignControllerModule({
    getConfigSnapshot: () => configState,
    setCfgScalar: (_app, key, value, meta) => {
      calls.push(['cfg', key, value, meta]);
      configState = { ...configState, [key]: value };
    },
    applyStructuralConfigMutation: (_app, source, patch, applyDirectMutation, options) => {
      calls.push(['mutation', source, options?.buildTiming, patch]);
      applyDirectMutation({ source, buildTiming: options?.buildTiming });
      return { appliedViaActions: false, requestedBuild: false };
    },
  });
  const runtime = {
    updateRoomArchitecture: () => calls.push(['refreshArchitecture']),
  };
  const controller = mod.createSettingsVisualRoomDesignController({
    app,
    meta: {
      uiOnlyImmediate: source => ({ source, immediate: true }),
      noBuild: (_value, source) => ({ source, build: false }),
    },
    roomData: { floorStyles: { parquet: [] } },
    roomDesignRuntime: runtime,
    roomArchitecture: configState.roomArchitecture,
    wardrobeWidthCm: 240,
  });

  controller.setColumnEnabled(true);
  controller.setColumnDimension('depthCm', 35);
  controller.setBackWallDimension('widthCm', 500);
  controller.setWardrobeOffsetRightCm(20);
  controller.toggleArchitectureVisibility();
  controller.toggleArchitectureVisibility();

  assert.equal(configState.roomArchitecture.column.enabled, true);
  assert.equal(configState.roomArchitecture.column.depthCm, 35);
  assert.equal(configState.roomArchitecture.backWall.widthCm, 500);
  assert.equal(configState.roomArchitecture.backWall.wardrobeOffsetLeftCm, 240);
  assert.equal(configState.roomArchitecture.surfacesHidden, false);
  assert.deepEqual(
    calls.filter(call => call[0] === 'mutation').map(call => [call[1], call[2]]),
    [
      ['react:settingsVisual:roomColumnEnabled', 'immediate'],
      ['react:settingsVisual:roomColumn:depthCm', 'coalesced'],
      ['react:settingsVisual:roomBackWall:widthCm', 'coalesced'],
      ['react:settingsVisual:roomBackWall:wardrobeOffsetRightCm', 'coalesced'],
      ['react:settingsVisual:roomArchitectureVisibility', 'none'],
      ['react:settingsVisual:roomArchitectureVisibility', 'none'],
    ]
  );
  assert.equal(calls.filter(call => call[0] === 'refreshArchitecture').length, 6);
});
