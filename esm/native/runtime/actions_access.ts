// Runtime App.actions public surface (Pure ESM)
//
// Keep this module as the single stable entry point for App.actions access. Internals
// are grouped into core/domain/mutation sections so callers can also depend on the
// narrower same-layer owner when appropriate.

export * from './actions_access_core.js';
export * from './actions_access_domains.js';
export * from './actions_access_mutations.js';

// Keep representative named exports visible at the entry surface so source-contract
// guards can verify the public API without walking every grouped section.
export {
  ensureActionsRoot,
  ensureActionNamespace,
  getActions,
  getAction,
  getActionNamespace,
  getActionFn,
  requireActionNamespace,
  hasAction,
  getNamespacedActionFn,
  hasNamespacedAction,
  callNamespacedAction,
  listActionFns,
} from './actions_access_core.js';

export {
  getMetaActions,
  ensureMetaActions,
  requireMetaActions,
  getMetaActionFn,
  hasMetaAction,
  callMetaAction,
  getConfigActions,
  getConfigActionFn,
  hasConfigAction,
  callConfigAction,
  getDoorsActions,
  getDoorsActionFn,
  hasDoorsAction,
  callDoorsAction,
  getModulesActions,
  getModulesActionFn,
  hasModulesAction,
  callModulesAction,
  listModulesActionFns,
  getHistoryActions,
  getHistoryActionFn,
  getModelsActions,
  getModelsActionFn,
  callModelsAction,
  getColorsActions,
  getColorsActionFn,
  callColorsAction,
  getDividersActions,
  getDividersActionFn,
  getGroovesActions,
  getGroovesActionFn,
  getRoomActions,
  getRoomActionFn,
  callRoomAction,
  getUiActions,
  getUiActionFn,
  callUiAction,
  getRuntimeActions,
  getRuntimeActionFn,
  callRuntimeAction,
  getStoreActions,
  getStoreActionFn,
  callStoreAction,
} from './actions_access_domains.js';

export {
  commitUiSnapshotViaActions,
  commitUiSnapshotViaActionsOrThrow,
  setDirtyViaActions,
  setDirtyViaActionsOrThrow,
  setSavedNotesViaActions,
  applyProjectConfigSnapshotViaActions,
  applyProjectConfigSnapshotViaActionsOrThrow,
  applyModulesGeometrySnapshotViaActions,
  runHistoryBatchViaActions,
  patchViaActions,
  renderModelUiViaActions,
  setMultiModeViaActions,
  applyPaintViaActions,
  toggleDividerViaActions,
  toggleGrooveViaActions,
  getSaveProjectAction,
  setSaveProjectAction,
  saveProjectResultViaActions,
  saveProjectViaActions,
} from './actions_access_mutations.js';
