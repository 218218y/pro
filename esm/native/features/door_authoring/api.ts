export { isRemoveDoorModeFromSnapshot, resolveRemoveDoorsEnabledFromSnapshots } from './internal/removal.js';

export type { DoorStyleOverrideValue } from './internal/style.js';

export type { AdhesiveGlassKind } from './internal/special_glass.js';
export {
  DOOR_SPECIAL_BLACK_GLASS,
  DOOR_SPECIAL_FROSTED_GLASS,
  isAdhesiveGlassValue,
  isDoorSpecialSurfaceValue,
  resolveAdhesiveGlassKind,
} from './internal/special_glass.js';
export {
  encodeDoorStyleOverridePaintToken,
  encodeGlassFrameStylePaintToken,
  isDoorStyleOverridePaintToken,
  isDoorStyleOverrideValue,
  isGlassPaintSelection,
  parseDoorStyleOverridePaintToken,
  readDoorStyleMap,
  resolveDoorStylePaintSelectionState,
  resolveEffectiveDoorStyle,
  resolveGlassFrameStyleValue,
  resolveGlassFrameStylePaintSelection,
} from './internal/style.js';

export type { DoorTrimSurfacePlane } from './internal/trim.js';
export {
  DEFAULT_DOOR_TRIM_CROSS_SIZE_CM,
  DEFAULT_DOOR_TRIM_DEPTH_M,
  MAX_DOOR_TRIM_CROSS_SIZE_CM,
  MAX_DOOR_TRIM_CUSTOM_CM,
  MIN_DOOR_TRIM_CROSS_SIZE_CM,
  MIN_DOOR_TRIM_CUSTOM_CM,
  buildDoorTrimCenterFromLocal,
  buildDoorTrimSurfaceUserData,
  buildSnappedDoorTrimCenterFromLocal,
  createDoorTrimEntry,
  findDoorTrimMatchInRect,
  isCabinetBodyDoorTrimSurfacePartId,
  mapDoorTrimSurfaceLocalPoint,
  normalizeDoorTrimAxis,
  normalizeDoorTrimColor,
  normalizeDoorTrimSpan,
  readDoorTrimListForPart,
  readDoorTrimMap,
  readDoorTrimSurfaceFaceCoordFromUserData,
  readDoorTrimSurfaceFaceSignFromUserData,
  readDoorTrimSurfacePlaneFromUserData,
  resolveCabinetBodyDoorTrimSurfaceInfo,
  resolveDoorTrimPlacements,
  resolveDoorTrimPlacement,
  resolveDoorTrimPlacementAvoidingMirror,
  resolveDoorTrimSurfaceLogicalPoint,
} from './internal/trim.js';

export {
  DEFAULT_FACE_SIGN,
  buildMirrorLayoutFromHit,
  buildSnappedMirrorCenterFromHit,
  findMirrorLayoutMatchInRect,
  hasMirrorSurfaceOnFace,
  mirrorLayoutMapEquals,
  readMirrorLayoutFaceSign,
  readMirrorLayoutList,
  readMirrorLayoutListForPart,
  readMirrorLayoutMap,
  resolveMirrorPlacementInRect,
  resolveMirrorPlacementListInRect,
} from './internal/mirror.js';

export {
  buildDoorVisualOwnerAliasKeys,
  hasAnyDoorVisualSegmentMapEntry,
  readDoorVisualMapEntry,
  readDoorVisualMapValue,
  readDoorVisualMirrorLayout,
  readDoorVisualPrefixedMapEntry,
  readDoorVisualPrefixedOwnMapEntry,
  resolveDoorStylePaintTargetKey,
} from './internal/visual_keys.js';
