// Canonical shared surface for doors runtime.
//
// Runtime-level helper ownership lives in runtime/doors_runtime_support.ts.
// Service-owned mutable state and browser/render seams live in doors_runtime_state.ts.

export type {
  AppLike,
  ActionsNamespaceLike,
  DoorUserDataLike,
  ModeSliceLike,
  ValueRecord,
} from '../runtime/doors_runtime_support.js';

export {
  doorsRuntimeNow,
  getActionsNamespace,
  getDoorModuleKey,
  getDrawerModuleKey,
  getGroupUserData,
  getModeConst,
  getModeSlice,
  getOpenDoorModuleKeys,
  getVisibleOpenInternalDrawerModuleKeys,
  hasAnyOpenDoor,
  hasInternalDrawers,
  hasOpenInternalDrawers,
  isIntDrawerEditActive,
  isInvalidNumber,
  isManualLayoutEditActive,
  isRecord,
  isSketchEditActive,
  isSketchExtDrawersEditActive,
  isSketchIntDrawersEditActive,
  readNumber,
  readRecord,
  readString,
  shouldForceSketchFreeBoxDoorsOpen,
  vecCopy,
  wardrobeType,
} from '../runtime/doors_runtime_support.js';

export type {
  CaptureLocalOpenOptions,
  DoorsRuntimeState,
  DoorsSnapshot,
  DrawerId,
  EditHoldState,
  HoldEditOptions,
  ReleaseEditHoldOptions,
  SetDoorsOptions,
  SyncVisualsOptions,
} from './doors_runtime_state.js';

export {
  createBooleanMap,
  ensureDoorsRuntimeDefaults,
  ensureRecordSlot,
  getDoorsLastToggleTime,
  getDoorsOpen,
  isGlobalClickMode,
  reportDoorsRuntimeNonFatal,
  setDoorStatusCss,
  touchDoorsRuntimeRender,
} from './doors_runtime_state.js';
