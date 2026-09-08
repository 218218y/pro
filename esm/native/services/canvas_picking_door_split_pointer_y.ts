import type { AppContainer, UnknownRecord } from '../../../types';
import { HINGED_DOOR_SPLIT_AUTHORING_POLICY } from '../../shared/dimensions/door_system_policy.js';
import { getCamera } from '../runtime/render_access.js';
import { getThreeMaybe } from '../runtime/three_access.js';
import type { MouseVectorLike, RaycasterLike } from './canvas_picking_engine.js';
import { __wp_intersectScreenWithLocalZPlane } from './canvas_picking_projection_runtime_plane.js';

function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as UnknownRecord) : null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

type CanvasDoorSplitAxisLockState = {
  pressed: boolean;
  latestWorldY: number | null;
  lockedWorldY: number | null;
  keyboardWorldY: number | null;
};

const canvasDoorSplitAxisLockByApp = new WeakMap<object, CanvasDoorSplitAxisLockState>();

function getCanvasDoorSplitAxisLockState(App: AppContainer): CanvasDoorSplitAxisLockState {
  const key = App as object;
  const current = canvasDoorSplitAxisLockByApp.get(key);
  if (current) return current;
  const created: CanvasDoorSplitAxisLockState = {
    pressed: false,
    latestWorldY: null,
    lockedWorldY: null,
    keyboardWorldY: null,
  };
  canvasDoorSplitAxisLockByApp.set(key, created);
  return created;
}

export function setCanvasDoorSplitVerticalLockPressed(App: AppContainer, pressed: boolean): void {
  const state = getCanvasDoorSplitAxisLockState(App);
  const next = !!pressed;
  if (state.pressed === next) return;

  state.pressed = next;
  if (next) {
    state.lockedWorldY = isFiniteNumber(state.keyboardWorldY)
      ? Number(state.keyboardWorldY)
      : isFiniteNumber(state.latestWorldY)
        ? Number(state.latestWorldY)
        : null;
    state.keyboardWorldY = null;
  } else {
    state.lockedWorldY = null;
    state.keyboardWorldY = null;
  }
}

export function resolveCanvasDoorSplitVerticalLockedWorldY(
  App: AppContainer,
  worldY: number | null
): number | null {
  const state = getCanvasDoorSplitAxisLockState(App);
  if (!isFiniteNumber(worldY)) {
    if (state.pressed && isFiniteNumber(state.lockedWorldY)) return Number(state.lockedWorldY);
    if (!state.pressed && isFiniteNumber(state.keyboardWorldY)) return Number(state.keyboardWorldY);
    return null;
  }

  const current = Number(worldY);
  state.latestWorldY = current;

  if (state.pressed) {
    if (!isFiniteNumber(state.lockedWorldY)) state.lockedWorldY = current;
    return Number(state.lockedWorldY);
  }

  if (isFiniteNumber(state.keyboardWorldY)) return Number(state.keyboardWorldY);
  return current;
}

/**
 * A physical pointer move takes ownership of the authoring height again.
 * While Shift is held, the locked height remains authoritative so horizontal
 * travel across adjacent doors keeps the same cut height.
 */
export function prepareCanvasDoorSplitPointerMove(App: AppContainer): void {
  const state = getCanvasDoorSplitAxisLockState(App);
  state.latestWorldY = null;
  if (!state.pressed) state.keyboardWorldY = null;
}

/**
 * Nudge the current manual-split authoring height in world metres.
 * Returns null when the pointer is not currently resolved over a split door.
 */
export function nudgeCanvasDoorSplitPointerWorldY(App: AppContainer, deltaWorldY: number): number | null {
  if (!isFiniteNumber(deltaWorldY) || deltaWorldY === 0) return null;
  const state = getCanvasDoorSplitAxisLockState(App);
  if (!isFiniteNumber(state.latestWorldY)) return null;

  const base =
    state.pressed && isFiniteNumber(state.lockedWorldY)
      ? Number(state.lockedWorldY)
      : isFiniteNumber(state.keyboardWorldY)
        ? Number(state.keyboardWorldY)
        : Number(state.latestWorldY);
  const next = base + Number(deltaWorldY);
  if (!isFiniteNumber(next)) return null;

  if (state.pressed) state.lockedWorldY = next;
  else state.keyboardWorldY = next;
  return next;
}

export function hasCanvasDoorSplitPointerWorldY(App: AppContainer): boolean {
  const state = getCanvasDoorSplitAxisLockState(App);
  return isFiniteNumber(state.latestWorldY);
}

export function clearCanvasDoorSplitPointerHover(App: AppContainer): void {
  const state = getCanvasDoorSplitAxisLockState(App);
  state.latestWorldY = null;
  state.keyboardWorldY = null;
}

export function clearCanvasDoorSplitVerticalLock(App: AppContainer): void {
  canvasDoorSplitAxisLockByApp.delete(App as object);
}

function readDoorMarkerPlaneZ(hitDoorGroup: unknown): number {
  const group = asRecord(hitDoorGroup);
  const userData = asRecord(group?.userData);
  const zSign = isFiniteNumber(userData?.__handleZSign) ? Number(userData.__handleZSign) : 1;
  const zOff = HINGED_DOOR_SPLIT_AUTHORING_POLICY.hoverMarkerZOffsetM;
  return zOff * (zSign === -1 ? -1 : 1);
}

function trySyncDoorGroupMatrix(hitDoorGroup: unknown): void {
  const group = asRecord(hitDoorGroup);
  try {
    const updateWorldMatrix = group?.updateWorldMatrix;
    if (typeof updateWorldMatrix === 'function') {
      Reflect.apply(updateWorldMatrix, group, [true, true]);
      return;
    }
    const updateMatrixWorld = group?.updateMatrixWorld;
    if (typeof updateMatrixWorld === 'function') Reflect.apply(updateMatrixWorld, group, [true]);
  } catch {
    // Best-effort only. Pointer projection falls back to the raw raycast hit if matrix sync is unavailable.
  }
}

function localPointToWorldY(
  App: AppContainer,
  hitDoorGroup: unknown,
  localPoint: { x: number; y: number; z: number }
): number | null {
  const group = asRecord(hitDoorGroup);
  if (!group) return null;

  try {
    const THREE = getThreeMaybe(App);
    const localToWorld = group.localToWorld;
    if (THREE && typeof THREE.Vector3 === 'function' && typeof localToWorld === 'function') {
      const v = new THREE.Vector3(localPoint.x, localPoint.y, localPoint.z);
      Reflect.apply(localToWorld, group, [v]);
      if (isFiniteNumber(v.y)) return Number(v.y);
    }
  } catch {
    // The next path covers simple Object3D layouts and test doubles.
  }

  try {
    const THREE = getThreeMaybe(App);
    const getWorldPosition = group.getWorldPosition;
    if (THREE && typeof THREE.Vector3 === 'function' && typeof getWorldPosition === 'function') {
      const v = new THREE.Vector3();
      Reflect.apply(getWorldPosition, group, [v]);
      if (isFiniteNumber(v.y) && isFiniteNumber(localPoint.y)) return Number(v.y) + localPoint.y;
    }
  } catch {
    // projection-fallback: alternate door-bound projection remains available when local transforms fail
  }

  const pos = asRecord(group.position);
  if (isFiniteNumber(pos?.y) && isFiniteNumber(localPoint.y)) return Number(pos.y) + localPoint.y;
  return null;
}

export function resolveCanvasDoorSplitPointerWorldY(args: {
  App: AppContainer;
  raycaster?: RaycasterLike | null | undefined;
  mouse?: MouseVectorLike | null | undefined;
  camera?: unknown;
  ndcX?: number | null | undefined;
  ndcY?: number | null | undefined;
  hitDoorGroup?: unknown;
  referenceY?: number | null | undefined;
  lockVertical?: boolean | undefined;
}): number | null {
  const { App, raycaster, mouse, ndcX, ndcY, hitDoorGroup, referenceY } = args;
  const reference = isFiniteNumber(referenceY) ? Number(referenceY) : null;
  const finalizeY = (value: number | null): number | null =>
    args.lockVertical ? resolveCanvasDoorSplitVerticalLockedWorldY(App, value) : value;
  if (!raycaster || !mouse || !isFiniteNumber(ndcX) || !isFiniteNumber(ndcY) || !hitDoorGroup) {
    return finalizeY(reference);
  }

  const camera = args.camera || getCamera(App);
  if (!camera) return finalizeY(reference);

  trySyncDoorGroupMatrix(hitDoorGroup);
  const localHit = __wp_intersectScreenWithLocalZPlane({
    App,
    raycaster,
    mouse,
    camera,
    ndcX,
    ndcY,
    localParent: hitDoorGroup,
    planeZ: readDoorMarkerPlaneZ(hitDoorGroup),
  });
  if (!localHit) return finalizeY(reference);

  const projectedWorldY = localPointToWorldY(App, hitDoorGroup, localHit);
  return finalizeY(isFiniteNumber(projectedWorldY) ? projectedWorldY : reference);
}
