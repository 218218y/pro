import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';

import { loadTsRuntimeModule } from './_ts_runtime_module_loader.mjs';
const { buildDoorVisualOwnerAliasKeys } = loadTsRuntimeModule(
  path.join(process.cwd(), 'esm/native/features/door_authoring/api.ts')
);
const { resolveDoorVisualSegmentIdentity } = loadTsRuntimeModule(
  path.join(process.cwd(), 'esm/shared/door_visual_key_contracts_shared.ts')
);

function loadTsModule(file, overrides = {}) {
  return loadTsRuntimeModule(file, { mocks: overrides });
}

const { applyPaintPartMutation } = loadTsModule(
  path.join(process.cwd(), 'esm/native/services/canvas_picking_paint_flow_apply_special.ts'),
  {
    '../features/door_authoring/api.js': {
      readMirrorLayoutList(value) {
        return Array.isArray(value) ? value : [];
      },
      readDoorVisualMapEntry(map, partId) {
        if (!map || !partId || !Object.prototype.hasOwnProperty.call(map, partId)) return null;
        return { key: partId, value: map[partId] };
      },
      isDoorStyleOverrideValue(value) {
        return value === 'flat' || value === 'profile' || value === 'double_profile';
      },
      resolveGlassFrameStylePaintSelection(value) {
        return value === 'glass' ? 'profile' : null;
      },
      buildDoorVisualOwnerAliasKeys,
      resolveDoorVisualSegmentIdentity,
    },
    './canvas_picking_core_helpers.js': {
      __wp_canonDoorPartKeyForMaps(value) {
        return value;
      },
      __wp_scopeCornerPartKeyForStack(value) {
        return value;
      },
    },
    './canvas_picking_paint_flow_mirror.js': {
      resolveMirrorLayoutForPaintClick() {
        return {
          nextLayout: null,
          removeMatch: null,
          canApplyMirror: true,
          hitFaceSign: 1,
          isFullDoorMirror: true,
        };
      },
    },
    './canvas_picking_paint_flow_shared.js': {
      isSpecialPart(value) {
        return /^d\d+_/.test(String(value || ''));
      },
      isSpecialVal(value) {
        return value === 'mirror' || value === 'glass';
      },
      readCurtainChoice() {
        return 'none';
      },
    },
  }
);

function createState(overrides = {}) {
  let colors = { ...(overrides.colors0 || {}) };
  let curtains = { ...(overrides.curtains0 || {}) };
  let special = { ...(overrides.special0 || {}) };
  let mirrorLayout = { ...(overrides.mirror0 || {}) };
  return {
    App: {},
    colors0: overrides.colors0 || {},
    curtains0: overrides.curtains0 || {},
    special0: overrides.special0 || {},
    mirror0: overrides.mirror0 || {},
    get colors() {
      return colors;
    },
    get curtains() {
      return curtains;
    },
    get special() {
      return special;
    },
    get mirrorLayout() {
      return mirrorLayout;
    },
    ensureColors: () => colors,
    ensureCurtains: () => curtains,
    ensureSpecial: () => special,
    ensureMirrorLayout: () => mirrorLayout,
  };
}

function createCommand(canonicalPartKey, selection = 'mirror') {
  return {
    selection,
    sourceTag: selection === 'mirror' ? 'paint.apply:mirror' : 'paint.apply:color',
    targetKind: 'door',
    originalFoundPartId: canonicalPartKey,
    canonicalPartKey,
    effectiveDoorId: null,
    doorStyleTargetKey: null,
    drawerId: null,
    stack: 'top',
    targetScope: { stackSplitUnifiedFrame: false },
    hitIdentity: null,
    hitReferences: {
      primaryObject: null,
      doorObject: null,
      primaryPoint: null,
      doorPoint: null,
    },
    mutationKind: selection === 'mirror' ? 'mirror' : 'color',
    invalidationKind: selection === 'mirror' ? 'structuralRebuild' : 'materialRefreshOnly',
  };
}

test('full default mirror is committed on the first click even when no explicit mirror layout payload is needed', () => {
  const state = createState();
  applyPaintPartMutation({
    state,
    command: createCommand('d4_full'),
  });

  assert.equal(state.special.d4_full, 'mirror');
  assert.equal(state.mirrorLayout.d4_full, undefined);
});

test('full default mirror toggles off when clicked again on an already full-mirror door', () => {
  const state = createState({ special0: { d4_full: 'mirror' } });
  applyPaintPartMutation({
    state,
    command: createCommand('d4_full'),
  });

  assert.equal(state.special.d4_full, undefined);
  assert.equal(state.mirrorLayout.d4_full, undefined);
});

test('full inside mirror is stored as a face-specific full layout', () => {
  const state = createState();
  applyPaintPartMutation({
    state,
    command: createCommand('d4_full'),
    resolveMirrorLayout: () => ({
      nextLayout: null,
      removeMatch: null,
      canApplyMirror: true,
      hitFaceSign: -1,
      isFullDoorMirror: true,
    }),
  });

  assert.equal(state.special.d4_full, 'mirror');
  assert.deepEqual(JSON.parse(JSON.stringify(state.mirrorLayout.d4_full)), [{ faceSign: -1 }]);
});

test('full outside mirror does not erase an existing full inside mirror', () => {
  const state = createState({
    special0: { d4_full: 'mirror' },
    mirror0: { d4_full: [{ faceSign: -1 }] },
  });
  applyPaintPartMutation({
    state,
    command: createCommand('d4_full'),
    resolveMirrorLayout: () => ({
      nextLayout: null,
      removeMatch: null,
      canApplyMirror: true,
      hitFaceSign: 1,
      isFullDoorMirror: true,
    }),
  });

  assert.equal(state.special.d4_full, 'mirror');
  assert.deepEqual(JSON.parse(JSON.stringify(state.mirrorLayout.d4_full)), [
    { faceSign: -1 },
    { faceSign: 1 },
  ]);
});
