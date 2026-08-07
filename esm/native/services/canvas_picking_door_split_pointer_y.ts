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
  raycaster?: RaycasterLike | null;
  mouse?: MouseVectorLike | null;
  camera?: unknown;
  ndcX?: number | null;
  ndcY?: number | null;
  hitDoorGroup?: unknown;
  referenceY?: number | null;
}): number | null {
  const { App, raycaster, mouse, ndcX, ndcY, hitDoorGroup, referenceY } = args;
  const reference = isFiniteNumber(referenceY) ? Number(referenceY) : null;
  if (!raycaster || !mouse || !isFiniteNumber(ndcX) || !isFiniteNumber(ndcY) || !hitDoorGroup) {
    return reference;
  }

  const camera = args.camera || getCamera(App);
  if (!camera) return reference;

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
  if (!localHit) return reference;

  const projectedWorldY = localPointToWorldY(App, hitDoorGroup, localHit);
  return isFiniteNumber(projectedWorldY) ? projectedWorldY : reference;
}
