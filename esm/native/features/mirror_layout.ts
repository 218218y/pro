export type { MirrorDraftInput } from './mirror_layout_contracts.js';
export {
  DEFAULT_CENTER_NORM,
  DEFAULT_FACE_SIGN,
  MIRROR_CENTER_SNAP_NORM_THRESHOLD,
  cloneMirrorLayoutList,
  mirrorLayoutEquals,
  mirrorLayoutListEquals,
  normalizeMirrorDraftInput,
  normalizeMirrorFaceSign,
  readMirrorLayoutEntry,
  readMirrorLayoutFaceSign,
  readMirrorLayoutList,
  readMirrorLayoutMap,
} from './mirror_layout_contracts.js';

export type {
  MirrorRect,
  PreparedMirrorRect,
  ResolvedMirrorPlacement,
  SnappedMirrorCenter,
} from './mirror_layout_geometry.js';
export {
  buildMirrorLayoutFromHit,
  buildSnappedMirrorCenterFromHit,
  resolveMirrorPlacementInRect,
  resolveMirrorPlacementListInRect,
} from './mirror_layout_geometry.js';

export type { MirrorLayoutHitMatch } from './mirror_layout_lookup.js';
export { findMirrorLayoutMatchInRect, readMirrorLayoutListForPart } from './mirror_layout_lookup.js';
