export type { MirrorDraftInput } from './mirror_contracts.js';
export {
  DEFAULT_CENTER_NORM,
  DEFAULT_FACE_SIGN,
  MIRROR_CENTER_SNAP_NORM_THRESHOLD,
  cloneMirrorLayoutList,
  hasMirrorSurfaceOnFace,
  mirrorLayoutEquals,
  mirrorLayoutMapEquals,
  mirrorLayoutListEquals,
  normalizeMirrorDraftInput,
  normalizeMirrorFaceSign,
  readMirrorLayoutEntry,
  readMirrorLayoutFaceSign,
  readMirrorLayoutList,
  readMirrorLayoutMap,
} from './mirror_contracts.js';

export type {
  MirrorRect,
  PreparedMirrorRect,
  ResolvedMirrorPlacement,
  SnappedMirrorCenter,
} from './mirror_geometry.js';
export {
  buildMirrorLayoutFromHit,
  buildSnappedMirrorCenterFromHit,
  resolveMirrorPlacementInRect,
  resolveMirrorPlacementListInRect,
} from './mirror_geometry.js';

export type { MirrorLayoutHitMatch } from './mirror_lookup.js';
export { findMirrorLayoutMatchInRect, readMirrorLayoutListForPart } from './mirror_lookup.js';
