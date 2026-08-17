import type { AppContainer, Object3DLike, UnknownRecord } from '../../../types';

import { __wp_measureObjectLocalBox } from './canvas_picking_local_helpers.js';
import { __wp_primaryMode } from './canvas_picking_core_helpers.js';
import { __wp_asRecord } from './canvas_picking_core_support.js';
import type { MouseVectorLike, RaycasterLike } from './canvas_picking_engine.js';
import { runPlatformActivityRenderTouch } from './api_services_surface.js';
import { findRoomDoorTargetHit, readRoomArchitectureGroup } from './room_architecture_picking.js';
import {
  getViewportAnimationTimers,
  getViewportRoomGroup,
  getViewportWardrobeGroup,
} from './render_surface_runtime.js';
import { isIgnoredRoomWardrobeObstacleObject } from './room_wardrobe_obstacle_policy.js';

const MAX_DOOR_OPEN_ANGLE_RAD = Math.PI / 2;
const DOOR_SWEEP_STEP_RAD = Math.PI / 180;
const DOOR_COLLISION_CLEARANCE_M = 0.012;
const DOOR_OPEN_EPSILON_RAD = Math.PI / 360;
const DOOR_ANIMATION_LERP = 0.1;
const DOOR_ANIMATION_SETTLED_EPSILON_RAD = 0.001;

type RoomDoorAnimationState = {
  frameId: number | null;
  targetAngleRad: number;
};

const roomDoorAnimationStates = new WeakMap<object, Map<string, RoomDoorAnimationState>>();

export type RoomDoorSweepSpec = {
  hingeX: number;
  hingeZ: number;
  leafWidth: number;
  leafHeight: number;
  bottom: number;
  directionX: number;
  directionZ: number;
  targetAngleSign: 1 | -1;
  thickness: number;
};

export type RoomDoorObstacleBox = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
};

function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readDoorSweepSpec(value: unknown): RoomDoorSweepSpec | null {
  const userData = __wp_asRecord(__wp_asRecord(value)?.userData);
  const hingeX = finiteNumber(userData?.__wpRoomDoorHingeX);
  const hingeZ = finiteNumber(userData?.__wpRoomDoorHingeZ);
  const leafWidth = finiteNumber(userData?.__wpRoomDoorLeafWidth);
  const leafHeight = finiteNumber(userData?.__wpRoomDoorLeafHeight);
  const bottom = finiteNumber(userData?.__wpRoomDoorBottom);
  const directionX = finiteNumber(userData?.__wpRoomDoorDirectionX);
  const directionZ = finiteNumber(userData?.__wpRoomDoorDirectionZ);
  const rawSign = finiteNumber(userData?.__wpRoomDoorTargetAngleSign);
  if (
    hingeX == null ||
    hingeZ == null ||
    leafWidth == null ||
    leafHeight == null ||
    bottom == null ||
    directionX == null ||
    directionZ == null ||
    Math.hypot(directionX, directionZ) < 0.99 ||
    !(leafWidth > 0) ||
    !(leafHeight > 0) ||
    (rawSign !== 1 && rawSign !== -1)
  ) {
    return null;
  }
  return {
    hingeX,
    hingeZ,
    leafWidth,
    leafHeight,
    bottom,
    directionX,
    directionZ,
    targetAngleSign: rawSign,
    thickness: 0.035,
  };
}

function rotateXZ(
  x: number,
  z: number,
  hingeX: number,
  hingeZ: number,
  angleRad: number
): { x: number; z: number } {
  const dx = x - hingeX;
  const dz = z - hingeZ;
  const c = Math.cos(angleRad);
  const s = Math.sin(angleRad);
  return {
    x: hingeX + c * dx + s * dz,
    z: hingeZ - s * dx + c * dz,
  };
}

function segmentIntersectsExpandedRect(args: {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}): boolean {
  let tMin = 0;
  let tMax = 1;
  const dx = args.x1 - args.x0;
  const dz = args.z1 - args.z0;
  const clip = (p: number, q: number): boolean => {
    if (Math.abs(p) < 1e-12) return q >= 0;
    const r = q / p;
    if (p < 0) {
      if (r > tMax) return false;
      if (r > tMin) tMin = r;
    } else {
      if (r < tMin) return false;
      if (r < tMax) tMax = r;
    }
    return true;
  };
  return (
    clip(-dx, args.x0 - args.minX) &&
    clip(dx, args.maxX - args.x0) &&
    clip(-dz, args.z0 - args.minZ) &&
    clip(dz, args.maxZ - args.z0) &&
    tMax >= tMin
  );
}

export function doesRoomDoorSweepCollide(
  spec: RoomDoorSweepSpec,
  obstacles: readonly RoomDoorObstacleBox[],
  signedAngleRad: number
): boolean {
  const directionLength = Math.hypot(spec.directionX, spec.directionZ) || 1;
  const directionX = spec.directionX / directionLength;
  const directionZ = spec.directionZ / directionLength;
  const end = rotateXZ(
    spec.hingeX + directionX * spec.leafWidth,
    spec.hingeZ + directionZ * spec.leafWidth,
    spec.hingeX,
    spec.hingeZ,
    signedAngleRad
  );
  const yMin = spec.bottom;
  const yMax = spec.bottom + spec.leafHeight;
  const radius = spec.thickness / 2 + DOOR_COLLISION_CLEARANCE_M;
  for (const obstacle of obstacles) {
    if (obstacle.maxY <= yMin + 0.002 || obstacle.minY >= yMax - 0.002) continue;
    if (
      segmentIntersectsExpandedRect({
        x0: spec.hingeX,
        z0: spec.hingeZ,
        x1: end.x,
        z1: end.z,
        minX: obstacle.minX - radius,
        maxX: obstacle.maxX + radius,
        minZ: obstacle.minZ - radius,
        maxZ: obstacle.maxZ + radius,
      })
    ) {
      return true;
    }
  }
  return false;
}

export function resolveRoomDoorMaxOpenAngleRad(
  spec: RoomDoorSweepSpec,
  obstacles: readonly RoomDoorObstacleBox[]
): number {
  const sign = spec.targetAngleSign;
  let lastSafe = 0;
  for (
    let angle = DOOR_SWEEP_STEP_RAD;
    angle <= MAX_DOOR_OPEN_ANGLE_RAD + 1e-9;
    angle += DOOR_SWEEP_STEP_RAD
  ) {
    const signed = sign * Math.min(angle, MAX_DOOR_OPEN_ANGLE_RAD);
    if (doesRoomDoorSweepCollide(spec, obstacles, signed)) {
      let low = lastSafe;
      let high = Math.min(angle, MAX_DOOR_OPEN_ANGLE_RAD);
      for (let i = 0; i < 7; i += 1) {
        const mid = (low + high) / 2;
        if (doesRoomDoorSweepCollide(spec, obstacles, sign * mid)) high = mid;
        else low = mid;
      }
      return sign * Math.max(0, low - Math.PI / 720);
    }
    lastSafe = Math.min(angle, MAX_DOOR_OPEN_ANGLE_RAD);
  }
  return sign * MAX_DOOR_OPEN_ANGLE_RAD;
}

function readObstacleBoxes(App: AppContainer): RoomDoorObstacleBox[] {
  const wardrobeGroup = getViewportWardrobeGroup(App);
  const roomGroup = getViewportRoomGroup(App);
  if (!wardrobeGroup || !roomGroup) return [];
  const boxes: RoomDoorObstacleBox[] = [];
  const visit = (value: Object3DLike): void => {
    if (!value || value === wardrobeGroup || isIgnoredRoomWardrobeObstacleObject(value)) return;
    const rec = __wp_asRecord(value);
    if (!rec?.geometry) return;
    const box = __wp_measureObjectLocalBox(App, value, roomGroup);
    if (!box) return;
    boxes.push({
      minX: box.centerX - box.width / 2,
      maxX: box.centerX + box.width / 2,
      minY: box.centerY - box.height / 2,
      maxY: box.centerY + box.height / 2,
      minZ: box.centerZ - box.depth / 2,
      maxZ: box.centerZ + box.depth / 2,
    });
  };
  try {
    if (typeof wardrobeGroup.traverse === 'function') wardrobeGroup.traverse(visit);
    else for (const child of wardrobeGroup.children) visit(child);
  } catch {
    return boxes;
  }
  return boxes;
}

function collectDoorMovableNodes(App: AppContainer, openingId: string): UnknownRecord[] {
  const architecture = readRoomArchitectureGroup(App);
  if (!architecture) return [];
  const out: UnknownRecord[] = [];
  const visit = (value: unknown): void => {
    const rec = __wp_asRecord(value);
    if (!rec) return;
    const userData = __wp_asRecord(rec.userData);
    if (userData?.__wpRoomDoorMovable === true && userData.roomOpeningId === openingId) out.push(rec);
  };
  try {
    const traverse = architecture.traverse;
    if (typeof traverse === 'function') Reflect.apply(traverse, architecture, [visit]);
    else {
      const stack = Array.isArray(architecture.children) ? [...architecture.children] : [];
      while (stack.length) {
        const node = stack.pop();
        visit(node);
        const rec = __wp_asRecord(node);
        if (Array.isArray(rec?.children)) stack.push(...rec.children);
      }
    }
  } catch {
    return out;
  }
  return out;
}

function applyDoorAngle(nodes: readonly UnknownRecord[], angleRad: number): void {
  for (const node of nodes) {
    const userData = __wp_asRecord(node.userData);
    const position = __wp_asRecord(node.position);
    const rotation = __wp_asRecord(node.rotation);
    const hingeX = finiteNumber(userData?.__wpRoomDoorHingeX);
    const hingeZ = finiteNumber(userData?.__wpRoomDoorHingeZ);
    const closedX = finiteNumber(userData?.__wpRoomDoorClosedX);
    const closedZ = finiteNumber(userData?.__wpRoomDoorClosedZ);
    const closedRotationY = finiteNumber(userData?.__wpRoomDoorClosedRotationY) ?? 0;
    if (hingeX == null || hingeZ == null || closedX == null || closedZ == null || !position) continue;
    const rotated = rotateXZ(closedX, closedZ, hingeX, hingeZ, angleRad);
    position.x = rotated.x;
    position.z = rotated.z;
    if (rotation) rotation.y = closedRotationY + angleRad;
    if (userData) {
      userData.__wpRoomDoorCurrentAngleRad = angleRad;
      if (userData.__wpRoomMeasurementTarget === true) {
        const baseUX = finiteNumber(userData.__wpRoomMeasurementBaseUX);
        const baseUZ = finiteNumber(userData.__wpRoomMeasurementBaseUZ);
        const baseNormalX = finiteNumber(userData.__wpRoomMeasurementBaseNormalX);
        const baseNormalZ = finiteNumber(userData.__wpRoomMeasurementBaseNormalZ);
        if (baseUX != null && baseUZ != null) {
          const c = Math.cos(angleRad);
          const s = Math.sin(angleRad);
          userData.__wpRoomMeasurementUX = c * baseUX + s * baseUZ;
          userData.__wpRoomMeasurementUZ = -s * baseUX + c * baseUZ;
          if (baseNormalX != null && baseNormalZ != null) {
            userData.__wpRoomMeasurementNormalX = c * baseNormalX + s * baseNormalZ;
            userData.__wpRoomMeasurementNormalZ = -s * baseNormalX + c * baseNormalZ;
          }
        }
      }
    }
  }
}

function readCurrentDoorAngle(nodes: readonly UnknownRecord[]): number {
  for (const node of nodes) {
    const userData = __wp_asRecord(node.userData);
    const angle = finiteNumber(userData?.__wpRoomDoorCurrentAngleRad);
    if (angle != null) return angle;
  }
  return 0;
}

function getDoorAnimationStateMap(App: AppContainer): Map<string, RoomDoorAnimationState> {
  const existing = roomDoorAnimationStates.get(App);
  if (existing) return existing;
  const next = new Map<string, RoomDoorAnimationState>();
  roomDoorAnimationStates.set(App, next);
  return next;
}

function clearDoorAnimationState(
  App: AppContainer,
  openingId: string,
  expectedState: RoomDoorAnimationState
): void {
  const states = roomDoorAnimationStates.get(App);
  if (!states || states.get(openingId) !== expectedState) return;
  states.delete(openingId);
  if (!states.size) roomDoorAnimationStates.delete(App);
}

function animateDoorAngle(App: AppContainer, openingId: string, targetAngleRad: number): void {
  const timers = getViewportAnimationTimers(App);
  const states = getDoorAnimationStateMap(App);
  const previous = states.get(openingId);
  if (previous?.frameId != null) timers.cancelAnimationFrame(previous.frameId);

  const state: RoomDoorAnimationState = { frameId: null, targetAngleRad };
  states.set(openingId, state);

  const renderFrame = (): void => {
    runPlatformActivityRenderTouch(App, {
      updateShadows: true,
      ensureRenderLoopAfterTrigger: true,
    });
  };

  const step = (): void => {
    if (roomDoorAnimationStates.get(App)?.get(openingId) !== state) return;
    const nodes = collectDoorMovableNodes(App, openingId);
    if (!nodes.length) {
      clearDoorAnimationState(App, openingId, state);
      return;
    }

    const currentAngle = readCurrentDoorAngle(nodes);
    const delta = state.targetAngleRad - currentAngle;
    if (Math.abs(delta) <= DOOR_ANIMATION_SETTLED_EPSILON_RAD) {
      applyDoorAngle(nodes, state.targetAngleRad);
      renderFrame();
      clearDoorAnimationState(App, openingId, state);
      return;
    }

    applyDoorAngle(nodes, currentAngle + delta * DOOR_ANIMATION_LERP);
    renderFrame();
    state.frameId = timers.requestAnimationFrame(step);
  };

  state.frameId = timers.requestAnimationFrame(step);
}

function shouldOpenDoorForToggle(App: AppContainer, openingId: string, currentAngleRad: number): boolean {
  const activeTarget = roomDoorAnimationStates.get(App)?.get(openingId)?.targetAngleRad;
  if (activeTarget != null) return Math.abs(activeTarget) <= DOOR_OPEN_EPSILON_RAD;
  return Math.abs(currentAngleRad) <= DOOR_OPEN_EPSILON_RAD;
}

export function tryHandleRoomDoorToggleClick(args: {
  App: AppContainer;
  ndcX: number;
  ndcY: number;
  raycaster: RaycasterLike;
  mouse: MouseVectorLike;
}): boolean {
  if (__wp_primaryMode(args.App) !== 'none') return false;
  const hit = findRoomDoorTargetHit(args);
  if (!hit) return false;
  const userData = __wp_asRecord(hit.target.userData);
  const openingId = typeof userData?.roomOpeningId === 'string' ? userData.roomOpeningId : '';
  if (!openingId) return false;
  const nodes = collectDoorMovableNodes(args.App, openingId);
  if (!nodes.length) return false;
  const currentAngle = readCurrentDoorAngle(nodes);
  let nextAngle = 0;
  if (shouldOpenDoorForToggle(args.App, openingId, currentAngle)) {
    const spec = readDoorSweepSpec(hit.target) || readDoorSweepSpec(nodes[0]);
    if (!spec) return false;
    nextAngle = resolveRoomDoorMaxOpenAngleRad(spec, readObstacleBoxes(args.App));
  }
  animateDoorAngle(args.App, openingId, nextAngle);
  return true;
}
