import type { DrawerVisualEntryLike, DoorVisualEntryLike, UnknownRecord } from '../../../types';

import {
  asRecord,
  readRecord,
  readFiniteNumber,
  readFiniteNumberOrNull,
  hasFiniteVec3,
} from '../runtime/render_runtime_primitives.js';
import { vecCopy } from '../runtime/doors_runtime_support.js';

export type ReportFn = (
  app: unknown,
  op: string,
  err: unknown,
  opts?: { throttleMs?: number; failFast?: boolean; reportMeta?: UnknownRecord }
) => void;

export type DebugLogFn = (app: unknown, ...args: readonly unknown[]) => void;

export type Vec3Like = {
  x: number;
  y: number;
  z: number;
  lerp?: (target: unknown, alpha: number) => void;
};

export type DoorGroupLike = UnknownRecord & {
  position: Vec3Like;
  rotation: { y: number };
  userData?: UnknownRecord;
};

export type DoorMotionLike = DoorVisualEntryLike & {
  group: DoorGroupLike | null;
  total?: number;
  index?: number;
  width?: number;
  originalX?: number | null;
  originalZ?: number | null;
  outerZ?: number | null;
  stackZStep?: number | null;
  noGlobalOpen?: boolean;
  invertSwing?: boolean;
  isOpen?: boolean;
};

export type DrawerGroupLike = UnknownRecord & {
  position: Vec3Like;
  userData?: UnknownRecord;
};

export type DrawerMotionLike = DrawerVisualEntryLike & {
  group: DrawerGroupLike | null;
  closed: Vec3Like;
  open: Vec3Like;
  isInternal?: boolean;
  isOpen?: boolean;
};

export type MotionFrameState = {
  hasInternalDrawers: boolean;
  doorsShouldBeOpen: boolean;
  internalDrawersShouldBeOpen: boolean;
  externalDrawersShouldBeOpen: boolean;
  isAnimating: boolean;
  isActiveState: boolean;
  globalClickMode: boolean;
  platformDimsFrame: UnknownRecord | null;
  doorsOpenFlag: boolean;
  sketchEditActive: boolean;
  sketchIntDrawersEditActive: boolean;
  sketchExtDrawersEditActive: boolean;
  intDrawerEditActive: boolean;
  forcedOpenDrawerId: unknown;
  manualTool: unknown;
  delayTime: number;
  timeSinceToggle: number;
  localDoorModules: Set<string>;
  hasAnyLocalOpenDoor: boolean;
  visibleOpenInternalDrawerModules: Set<string>;
};

export type RenderLoopMotionStep = {
  isAnimating: boolean;
  isActiveState: boolean;
};

export const MOTION_SETTLED_EPSILON = 0.001;
export const ROTATION_SETTLED_EPSILON = 0.001;

export function hasNumberMotionRemaining(
  current: unknown,
  target: unknown,
  epsilon = MOTION_SETTLED_EPSILON
): boolean {
  const currentNum = readFiniteNumberOrNull(current);
  const targetNum = readFiniteNumberOrNull(target);
  if (currentNum === null || targetNum === null) return false;
  return Math.abs(targetNum - currentNum) > epsilon;
}

export function hasVec3MotionRemaining(
  current: Vec3Like | null | undefined,
  target: Vec3Like | null | undefined,
  epsilon = MOTION_SETTLED_EPSILON
): boolean {
  if (!current || !target) return false;
  return (
    hasNumberMotionRemaining(current.x, target.x, epsilon) ||
    hasNumberMotionRemaining(current.y, target.y, epsilon) ||
    hasNumberMotionRemaining(current.z, target.z, epsilon)
  );
}

export function isRecord(v: unknown): v is UnknownRecord {
  return !!readRecord(v);
}

export function asRecordOrNull(v: unknown): UnknownRecord | null {
  return readRecord(v);
}

export function call0m(ctx: unknown, fn: unknown): unknown {
  return typeof fn === 'function' ? fn.call(ctx) : undefined;
}

export function isVec3Like(value: unknown): value is Vec3Like {
  return hasFiniteVec3(value);
}

export function isDoorGroupLike(value: unknown): value is DoorGroupLike {
  const rec = readRecord(value);
  const rotation = rec ? asRecord(rec.rotation) : null;
  return !!rec && isVec3Like(rec.position) && readFiniteNumberOrNull(rotation?.y) !== null;
}

export function isDrawerGroupLike(value: unknown): value is DrawerGroupLike {
  const rec = readRecord(value);
  return !!rec && isVec3Like(rec.position);
}

export function isDoorMotionLike(value: unknown): value is DoorMotionLike {
  return isRecord(value) && (value.group == null || isDoorGroupLike(value.group));
}

export function isDrawerMotionLike(value: unknown): value is DrawerMotionLike {
  return (
    isRecord(value) &&
    isVec3Like(value.closed) &&
    isVec3Like(value.open) &&
    (value.group == null || isDrawerGroupLike(value.group))
  );
}

export function asDoorMotion(v: unknown): DoorMotionLike | undefined {
  return isDoorMotionLike(v) ? v : undefined;
}

export function asDrawerMotion(v: unknown): DrawerMotionLike | undefined {
  return isDrawerMotionLike(v) ? v : undefined;
}

export function moveDrawerGroupPosition(
  group: DrawerGroupLike | null | undefined,
  target: Vec3Like | null | undefined
): boolean {
  if (!group || !target) return false;
  const position = group.position;
  if (!position) return false;

  if (typeof position.lerp === 'function') {
    position.lerp(target, 0.1);
    return hasVec3MotionRemaining(position, target);
  }

  vecCopy(position, target);
  return hasVec3MotionRemaining(position, target);
}

export function readMotionUserData(group: { userData?: UnknownRecord } | null | undefined): UnknownRecord {
  return asRecord<UnknownRecord>(asRecordOrNull(group)?.userData, {});
}

export function readMotionNumber(value: unknown, defaultValue: number): number {
  return readFiniteNumber(value, defaultValue);
}
