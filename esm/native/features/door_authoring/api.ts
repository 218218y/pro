export { isRemoveDoorModeFromSnapshot, resolveRemoveDoorsEnabledFromSnapshots } from './internal/removal.js';

export type { DoorStyleOverrideValue } from './internal/style.js';
export {
  encodeDoorStyleOverridePaintToken,
  encodeGlassFrameStylePaintToken,
  isDoorStyleOverridePaintToken,
  isDoorStyleOverrideValue,
  isGlassPaintSelection,
  normalizeDoorStyleOverrideValue,
  parseDoorStyleOverridePaintToken,
  readDoorStyleMap,
  resolveDoorStyleOverrideValue,
  resolveEffectiveDoorStyle,
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
  mapDoorTrimSurfaceLogicalToLocalPoint,
  normalizeDoorTrimAxis,
  normalizeDoorTrimColor,
  normalizeDoorTrimSpan,
  readDoorTrimList,
  readDoorTrimListForPart,
  readDoorTrimMap,
  readDoorTrimSurfaceFaceCoordFromUserData,
  readDoorTrimSurfaceFaceSignFromUserData,
  readDoorTrimSurfacePlaneFromUserData,
  resolveCabinetBodyDoorTrimSurfaceInfo,
  resolveDoorTrimPlacement,
  resolveDoorTrimPlacementAvoidingMirror,
} from './internal/trim.js';

export {
  DEFAULT_FACE_SIGN,
  buildMirrorLayoutFromHit,
  buildSnappedMirrorCenterFromHit,
  cloneMirrorLayoutList,
  findMirrorLayoutMatchInRect,
  hasMirrorSurfaceOnFace,
  mirrorLayoutListEquals,
  readMirrorLayoutFaceSign,
  readMirrorLayoutList,
  readMirrorLayoutListForPart,
  readMirrorLayoutMap,
  resolveMirrorPlacementInRect,
  resolveMirrorPlacementListInRect,
} from './internal/mirror.js';

export {
  buildDoorVisualLookupKeys,
  hasAnyDoorVisualSegmentMapEntry,
  isDoorVisualSegmentPartId,
  readDoorVisualMapEntry,
  readDoorVisualMapValue,
  readDoorVisualMirrorLayout,
  readDoorVisualPrefixedMapEntry,
  readDoorVisualPrefixedOwnMapEntry,
  readDoorVisualSegmentBasePartId,
  stripDoorVisualSurfaceSuffix,
  toDoorStyleOverrideMapKey,
} from './internal/visual_keys.js';
