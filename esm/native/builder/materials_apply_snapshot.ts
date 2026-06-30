import type { AppContainer, BuilderMaterialSnapshotLike } from '../../../types';
import { readRuntimeScalarOrDefault } from '../runtime/runtime_selectors.js';
import { resolveRemoveDoorsEnabledFromSnapshots } from '../features/door_authoring/api.js';
import { asObject, type BuildUiLike, type MaterialsCfgLike } from './materials_apply_shared.js';
import { getBuildStateMaybe } from './store_access.js';

export type MaterialsApplySnapshot = {
  ui: BuildUiLike;
  cfg: MaterialsCfgLike;
  materialSnapshot: BuilderMaterialSnapshotLike;
  removeDoorsEnabled: boolean;
};

export function requireMaterialsApplySnapshot(value: unknown): MaterialsApplySnapshot {
  const snapshot = asObject<MaterialsApplySnapshot>(value);
  const ui = asObject<BuildUiLike>(snapshot?.ui);
  const cfg = asObject<MaterialsCfgLike>(snapshot?.cfg);
  if (!snapshot || !ui || !cfg) {
    throw new TypeError('[materials_apply] snapshot with ui and cfg is required');
  }
  if (snapshot.materialSnapshot?.cfgSnapshot !== cfg) {
    throw new TypeError('[materials_apply] material snapshot must reference the apply cfg snapshot');
  }
  if (typeof snapshot.materialSnapshot.sketchMode !== 'boolean') {
    throw new TypeError('[materials_apply] material snapshot sketchMode is required');
  }
  if (typeof snapshot.removeDoorsEnabled !== 'boolean') {
    throw new TypeError('[materials_apply] snapshot removeDoorsEnabled is required');
  }
  return {
    ui,
    cfg,
    materialSnapshot: snapshot.materialSnapshot,
    removeDoorsEnabled: snapshot.removeDoorsEnabled,
  };
}

export function captureMaterialsApplySnapshot(App: AppContainer): MaterialsApplySnapshot {
  const state = getBuildStateMaybe(App);
  const ui = asObject<BuildUiLike>(state?.ui);
  const cfg = asObject<MaterialsCfgLike>(state?.config);
  if (!ui || !cfg) {
    throw new TypeError('[materials_apply] canonical build state with ui and config is required');
  }
  return {
    ui,
    cfg,
    materialSnapshot: {
      cfgSnapshot: cfg,
      sketchMode: readRuntimeScalarOrDefault(state?.runtime, 'sketchMode', false) === true,
    },
    removeDoorsEnabled: resolveRemoveDoorsEnabledFromSnapshots(state?.ui, state?.mode),
  };
}
