import type { UnknownRecord } from '../../../types';
import type {
  DoorActionHoverArgs,
  DoorHoverHit,
  HoverThreeLike,
  MarkerUserDataLike,
  ReusableQuaternionLike,
  ReusableVectorLike,
  TransformNodeLike,
} from './canvas_picking_door_hover_targets_shared.js';

export type DoorActionHoverModeState = {
  normalizedPaintSelection: string | null;
  isPaintHoverMode: boolean;
  isTrimHoverMode: boolean;
  isHandleHoverMode: boolean;
  isManualHandlePositionMode: boolean;
  isHingeHoverMode: boolean;
  isFacePreviewMode: boolean;
};

export type DoorActionHoverResolvedState = {
  hit: DoorHoverHit;
  hitDoorPid: string;
  hitDoorGroup: DoorHoverHit['hitDoorGroup'];
  wardrobeGroup: UnknownRecord;
  groupRec: TransformNodeLike | null;
  userData: UnknownRecord | null;
  hitDoorStack: 'top' | 'bottom';
  scopedHitDoorPid: string;
  width: number;
  anchorX: number;
  regionH: number;
  regionCenterY: number;
  markerUd: MarkerUserDataLike;
};

export type DoorActionHoverPreviewRuntime = {
  T3: HoverThreeLike;
  local: ReusableVectorLike;
  localHit: ReusableVectorLike;
  hgWp: ReusableVectorLike;
  wq: ReusableQuaternionLike;
  zOff: number;
};

export type DoorActionHoverPreviewRouteArgs = {
  hoverArgs: DoorActionHoverArgs;
  modeState: DoorActionHoverModeState;
  state: DoorActionHoverResolvedState;
  THREE: unknown;
};
