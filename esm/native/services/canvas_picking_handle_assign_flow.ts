import {
  clampSurfaceHandleCenter,
  encodeHandleSize,
  getSurfaceHandleFootprint,
  handleSizePartKey,
  handleOverrideBaseId,
  HANDLE_INHERIT_GLOBAL,
  isHandleType,
  usesCatalogHandleGeometry,
  supportsHandleHost,
} from '../../shared/handle_catalog.js';
import type { HandleHost, HandleType } from '../../shared/handle_catalog.js';
import { setCfgHandlesMap } from '../runtime/cfg_access.js';
// Canvas picking handle-assign click handling.
//
// Extracted from canvas_picking_click_flow.ts to keep the click owner focused on
// routing while preserving the canonical handle-assignment behavior.

import type { AppContainer, ModeStateLike, UnknownRecord } from '../../../types';

import { asRecord } from '../runtime/record.js';
import {
  DEFAULT_HANDLE_FINISH_COLOR,
  handleColorPartKey,
  normalizeHandleFinishColor,
} from '../features/finish_palette/api.js';
import {
  createManualHandlePositionFromLocalPoint,
  isManualHandlePositionMode,
  manualHandlePositionKey,
  serializeManualHandlePosition,
} from '../features/manual_handle_position.js';

import type { HitObjectLike } from './canvas_picking_engine.js';
import { getTools, getUiFeedback } from '../runtime/service_access.js';
import { getMode } from '../kernel/api.js';
import { getThreeMaybe } from '../runtime/three_access.js';
import { readMapOrEmpty } from '../runtime/maps_access.js';
import { readDoorLeafRectFromUserData, resolveDoorHitOwnerByPartId } from './canvas_picking_door_shared.js';
import { createCanvasPickingHandleAssignStructuralMeta } from './canvas_picking_handle_assign_meta.js';
import { resolveCanvasPrecisionAxisLockedLocalPoint } from './canvas_picking_precision_axis_lock.js';
import {
  __wp_isDoorLikePartId,
  __wp_isDrawerLikePartId,
  __edgeHandleVariantPartKey,
  __normEdgeHandleVariant,
  __wp_str,
} from './canvas_picking_core_helpers.js';

export interface CanvasHandleAssignClickArgs {
  App: AppContainer;
  primaryHitObject: HitObjectLike | null;
  doorHitObject?: HitObjectLike | null | undefined;
  primaryHitPoint?: { x?: number; y?: number; z?: number } | null;
  doorHitPoint?: { x?: number; y?: number; z?: number } | null;
  foundDrawerId: string | null;
  effectiveDoorId: string | null;
  foundPartId: string | null;
  isHandleEditMode: boolean;
}

type PointLike = { x?: number; y?: number; z?: number } | null | undefined;

type DoorOwnerLike = UnknownRecord & {
  userData?: UnknownRecord | null;
  worldToLocal?: (target: { x: number; y: number; z: number }) => unknown;
};

function readParentHitObject(value: unknown): HitObjectLike | null {
  return asRecord<HitObjectLike>(value);
}

function readModeOpts(App: AppContainer): UnknownRecord | null {
  const mode: ModeStateLike | null = getMode(App) || null;
  return asRecord(mode?.opts);
}

function __readHitPartId(App: AppContainer, primaryHitObject: HitObjectLike | null): string | null {
  let cur = primaryHitObject;
  while (cur) {
    if (cur.userData && cur.userData.partId) return __wp_str(App, cur.userData.partId);
    cur = readParentHitObject(cur.parent);
  }
  return null;
}

function isDoorPartId(partId: string): boolean {
  return __wp_isDoorLikePartId(partId);
}

function isDrawerPartId(partId: string): boolean {
  return __wp_isDrawerLikePartId(partId);
}

function readClickPoint(args: CanvasHandleAssignClickArgs): PointLike {
  return args.foundDrawerId ? args.primaryHitPoint : args.doorHitPoint || args.primaryHitPoint;
}

function readSelectedHandleType(App: AppContainer, opts: UnknownRecord | null): HandleType {
  const tools = getTools(App);
  const raw = opts?.handleType ?? tools.getHandlesType?.();
  if (isHandleType(raw)) return raw;
  return 'standard';
}

function readUserDataPartId(userData: UnknownRecord | null | undefined): string {
  return typeof userData?.partId === 'string' ? String(userData.partId) : '';
}

function readReferencedDrawerOwnerId(userData: UnknownRecord | null | undefined): string {
  const raw = userData?.__wpDrawerOwnerPartId ?? userData?.drawerId ?? userData?.__wpDrawerId;
  return typeof raw === 'string' && raw.trim() ? raw.trim() : '';
}

function findAncestorOwnerByPartId(
  start: HitObjectLike | null,
  partId: string,
  allowDrawerOwnerReference: boolean
): DoorOwnerLike | null {
  let cur = asRecord<DoorOwnerLike>(start);
  while (cur) {
    const userData = asRecord<UnknownRecord>(cur.userData);
    const currentPartId = readUserDataPartId(userData);
    const currentDrawerOwnerId = allowDrawerOwnerReference ? readReferencedDrawerOwnerId(userData) : '';
    const matchesPart =
      currentPartId === partId || (currentDrawerOwnerId !== '' && currentDrawerOwnerId === partId);
    if (matchesPart && readDoorLeafRectFromUserData(userData)) return cur;
    cur = asRecord<DoorOwnerLike>(cur.parent);
  }
  return null;
}

function resolveManualHandleTargetOwner(args: {
  primaryHitObject: HitObjectLike | null;
  doorHitObject?: HitObjectLike | null | undefined;
  partId: string;
}): DoorOwnerLike | null {
  const { primaryHitObject, doorHitObject, partId } = args;
  const preferredRoot = asRecord<UnknownRecord>(doorHitObject) || asRecord<UnknownRecord>(primaryHitObject);
  const resolvedOwner = asRecord<DoorOwnerLike>(resolveDoorHitOwnerByPartId(preferredRoot, partId));
  if (resolvedOwner && readDoorLeafRectFromUserData(asRecord<UnknownRecord>(resolvedOwner.userData))) {
    return resolvedOwner;
  }

  return (
    findAncestorOwnerByPartId(doorHitObject || null, partId, false) ||
    findAncestorOwnerByPartId(primaryHitObject, partId, false) ||
    findAncestorOwnerByPartId(doorHitObject || null, partId, true) ||
    findAncestorOwnerByPartId(primaryHitObject, partId, true)
  );
}

function writeSelectedHandleConfig(args: {
  App: AppContainer;
  partId: string;
  handleType: HandleType;
  modeOpts: UnknownRecord | null;
  position: ReturnType<typeof createManualHandlePositionFromLocalPoint>;
}): void {
  const { App, partId, handleType, modeOpts, position } = args;
  const map = { ...readMapOrEmpty(App, 'handlesMap') };
  const edgeKey = __edgeHandleVariantPartKey(partId);
  const colorKey = handleColorPartKey(partId);
  const sizeKey = handleSizePartKey(partId);
  const positionKey = manualHandlePositionKey(partId);
  delete map[partId];
  delete map[edgeKey];
  delete map[colorKey];
  delete map[sizeKey];
  delete map[positionKey];

  if (modeOpts?.handleReset === true) {
    const base = handleOverrideBaseId(map, partId);
    const inheritedKeys = [
      base,
      __edgeHandleVariantPartKey(base),
      handleColorPartKey(base),
      handleSizePartKey(base),
      manualHandlePositionKey(base),
    ];
    if (base !== partId && inheritedKeys.some(key => typeof map[key] === 'string' && map[key] !== '')) {
      map[partId] = HANDLE_INHERIT_GLOBAL;
    }
  } else {
    map[partId] = handleType;
    if (handleType === 'edge') map[edgeKey] = __normEdgeHandleVariant(modeOpts?.edgeHandleVariant);
    if (handleType !== 'none') {
      map[colorKey] = normalizeHandleFinishColor(modeOpts?.handleColor ?? DEFAULT_HANDLE_FINISH_COLOR);
    }
    const size =
      modeOpts?.handleSizeMm === undefined ? null : encodeHandleSize(handleType, modeOpts.handleSizeMm);
    if (size !== null) map[sizeKey] = size;
    if (position) map[positionKey] = serializeManualHandlePosition(position);
  }
  setCfgHandlesMap(App, map, createCanvasPickingHandleAssignStructuralMeta('handles:assign'));
}

function readManualHandlePoint(args: CanvasHandleAssignClickArgs, owner: DoorOwnerLike) {
  const point = readClickPoint(args);
  if (!point || typeof point.x !== 'number' || typeof point.y !== 'number' || typeof point.z !== 'number')
    return null;
  if (![point.x, point.y, point.z].every(Number.isFinite)) return null;
  const THREE = getThreeMaybe(args.App);
  if (!THREE || typeof THREE.Vector3 !== 'function') return null;

  const local = new THREE.Vector3(point.x, point.y, point.z);
  owner.worldToLocal?.(local);
  return resolveCanvasPrecisionAxisLockedLocalPoint(args.App, local);
}

export function tryHandleCanvasHandleAssignClick(args: CanvasHandleAssignClickArgs): boolean {
  const { App, primaryHitObject, foundDrawerId, effectiveDoorId, foundPartId } = args;
  if (!args.isHandleEditMode) return false;

  const pickedId = foundDrawerId || __readHitPartId(App, primaryHitObject) || effectiveDoorId || foundPartId;
  if (!pickedId) return true;
  const partId = __wp_str(App, pickedId);
  if (!partId || (!isDoorPartId(partId) && !isDrawerPartId(partId))) return true;

  const __modeOpts = readModeOpts(App);
  const reset = __modeOpts?.handleReset === true;
  const manual = !reset && isManualHandlePositionMode(__modeOpts?.handlePlacement);
  const selected = readSelectedHandleType(App, __modeOpts);
  const handleType = manual && selected === 'none' ? 'standard' : selected;
  const owner = resolveManualHandleTargetOwner({ ...args, partId });
  const ownerData = asRecord<UnknownRecord>(owner?.userData);
  const host: HandleHost =
    ownerData?.__doorType === 'sliding' || /^(?:lower_)?slid/.test(partId)
      ? 'sliding'
      : isDrawerPartId(partId)
        ? 'drawer'
        : 'door';
  const useCatalogGeometry = usesCatalogHandleGeometry(handleType, __modeOpts?.handleSizeMm);
  if (!reset && (!supportsHandleHost(handleType, host) || (host === 'sliding' && useCatalogGeometry))) {
    getUiFeedback(App).toast('מרווח המסילה אינו מספיק לידית זו בדלת הזזה.', 'warning');
    return true;
  }
  if (manual && host === 'sliding') {
    getUiFeedback(App).toast('ידיות הפרופיל בדלתות הזזה אינן ניתנות למיקום ידני.', 'warning');
    return true;
  }
  if (
    !reset &&
    handleType !== 'none' &&
    host === 'sliding' &&
    ownerData?.__wpSlidingHandlesEnabled === false
  ) {
    getUiFeedback(App).toast('יש להפעיל ידיות לדלתות הזזה לפני השיוך.', 'warning');
    return true;
  }

  const rect = readDoorLeafRectFromUserData(ownerData);
  const point = manual && owner ? readManualHandlePoint(args, owner) : null;
  if (manual && (!rect || !point)) return true;
  const fitted =
    !reset && useCatalogGeometry
      ? rect &&
        clampSurfaceHandleCenter(
          getSurfaceHandleFootprint(handleType, host, __modeOpts?.handleSizeMm),
          rect,
          point?.x ?? 0,
          point?.y ?? 0
        )
      : point;
  if (!reset && useCatalogGeometry && !fitted) {
    getUiFeedback(App).toast('אין מספיק מקום לידית במידה שנבחרה בחזית הזו.', 'warning');
    return true;
  }
  const position =
    manual && rect && fitted
      ? createManualHandlePositionFromLocalPoint({ rect, localX: fitted.x, localY: fitted.y })
      : null;
  writeSelectedHandleConfig({ App, partId, handleType, modeOpts: __modeOpts, position });
  return true;
}
