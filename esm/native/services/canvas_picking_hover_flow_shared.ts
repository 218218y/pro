import type {
  AppContainer,
  InteriorLayoutHoverPreviewArgsLike,
  SketchPlacementPreviewArgsLike,
  UnknownRecord,
} from '../../../types';
import { getThreeMaybe } from '../runtime/three_access.js';
import { readRootState } from '../runtime/root_state_access.js';

export type RootModeOptsLike = { splitVariant?: string };
export type RootModeLike = { opts?: RootModeOptsLike | null };
export type RootStateLike = { mode?: RootModeLike | null };
export type HoverMarkerLike = { visible?: boolean; userData?: Record<string, unknown> | null } & Record<
  string,
  unknown
>;
export type DoorGroupUserDataLike = { __wpSplitHoverDoorBaseKey?: string } & Record<string, unknown>;
export type PreviewOpsArgs = SketchPlacementPreviewArgsLike &
  UnknownRecord & { App: AppContainer; THREE: unknown; __reason?: string };
export type HoverPreviewArgs = SketchPlacementPreviewArgsLike | InteriorLayoutHoverPreviewArgsLike;
export type HoverRenderOpsLike = {
  ensureSplitHoverMarker?: (args: UnknownRecord) => HoverMarkerLike | null;
  ensureDoorActionHoverMarker?: (args: UnknownRecord) => HoverMarkerLike | null;
  ensureDoorCutHoverMarker?: (args: UnknownRecord) => HoverMarkerLike | null;
  hideSketchPlacementPreview?: (args: SketchPlacementPreviewArgsLike) => unknown;
  setInteriorLayoutHoverPreview?: (args: InteriorLayoutHoverPreviewArgsLike) => unknown;
  hideInteriorLayoutHoverPreview?: (args: InteriorLayoutHoverPreviewArgsLike) => unknown;
  setSketchPlacementPreview?: (args: SketchPlacementPreviewArgsLike) => unknown;
};

export type HitDoorGroupLike = { userData?: DoorGroupUserDataLike | null } & Record<string, unknown>;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object';
}

export function asRootState(value: unknown): RootStateLike | null {
  return isRecord(value) ? value : null;
}

export function asHoverRenderOps(value: unknown): HoverRenderOpsLike | null {
  return isRecord(value) ? value : null;
}

export function asDoorGroupUserData(value: unknown): DoorGroupUserDataLike | null {
  return isRecord(value) ? value : null;
}

export function asHitDoorGroup(value: unknown): HitDoorGroupLike | null {
  return isRecord(value) ? value : null;
}

export function createPreviewOpsArgs(App: AppContainer, extra: UnknownRecord = {}): PreviewOpsArgs {
  return { App, THREE: getThreeMaybe(App), ...extra };
}

export function asPreviewCallback(
  fn: ((args: HoverPreviewArgs) => unknown) | null | undefined
): ((args: HoverPreviewArgs) => unknown) | null {
  return typeof fn === 'function' ? (args: HoverPreviewArgs) => fn(args) : null;
}

export function readSplitVariant(App: AppContainer): string {
  try {
    const state = asRootState(readRootState(App));
    const variant = state?.mode?.opts?.splitVariant;
    return typeof variant === 'string' ? variant : '';
  } catch {
    return '';
  }
}

export function normalizeDoorBaseKeyFromGroup(
  hitDoorGroup: unknown,
  hitDoorPid: string,
  getSplitHoverDoorBaseKey: (partId: string) => string
): string {
  let doorBaseKey = hitDoorPid;
  const userData = asDoorGroupUserData(asHitDoorGroup(hitDoorGroup)?.userData);
  const cachedBase =
    typeof userData?.__wpSplitHoverDoorBaseKey === 'string' ? userData.__wpSplitHoverDoorBaseKey : '';
  doorBaseKey = cachedBase || getSplitHoverDoorBaseKey(hitDoorPid);
  if (userData && doorBaseKey && cachedBase !== doorBaseKey) userData.__wpSplitHoverDoorBaseKey = doorBaseKey;
  return doorBaseKey;
}

export function asRecordMap(value: unknown): UnknownRecord | null {
  return isRecord(value) ? value : null;
}
