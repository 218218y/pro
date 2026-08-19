import { HINGED_DOOR_MOUNT_POLICY } from './door_system_policy.js';
import { MATERIAL_THICKNESS_POLICY } from './material_thickness_policy.js';
import { centimeters, cmToM, mToCm } from './units.js';

export type DoorMountConstructionMode = 'overlay' | 'inset';
export type DoorMountThicknessKind = 'frame' | 'shelf';
export type DoorMountThicknessConfigKey =
  'overlayFrameThicknessCm' | 'overlayShelfThicknessCm' | 'insetFrameThicknessCm' | 'insetShelfThicknessCm';

export const DOOR_MOUNT_THICKNESS_DIMENSIONS = Object.freeze({
  stepCm: centimeters(0.1),
  minCm: centimeters(0.4),
  maxCm: centimeters(8),
});

export const DOOR_MOUNT_THICKNESS_CONFIG_KEYS = Object.freeze({
  overlay: Object.freeze({
    frame: 'overlayFrameThicknessCm',
    shelf: 'overlayShelfThicknessCm',
  }),
  inset: Object.freeze({
    frame: 'insetFrameThicknessCm',
    shelf: 'insetShelfThicknessCm',
  }),
} satisfies Record<DoorMountConstructionMode, Record<DoorMountThicknessKind, DoorMountThicknessConfigKey>>);

function normalizeDoorMountConstructionMode(value: unknown): DoorMountConstructionMode {
  return value === 'inset' ? 'inset' : 'overlay';
}

function decimalPlaces(value: number): number {
  const [coefficient = '', exponentText] = String(value).toLowerCase().split('e');
  const fractionLength = coefficient.split('.')[1]?.length ?? 0;
  const exponent = exponentText ? Number(exponentText) : 0;
  return Math.max(0, fractionLength - exponent);
}

function roundDoorMountThicknessCm(value: number): number {
  const stepCm = Number(DOOR_MOUNT_THICKNESS_DIMENSIONS.stepCm);
  const decimalScale = 10 ** decimalPlaces(stepCm);
  const stepUnits = Math.round(stepCm * decimalScale);
  return (Math.round((value * decimalScale) / stepUnits) * stepUnits) / decimalScale;
}

export function normalizeDoorMountThicknessCm(value: unknown): number | null {
  if (value === null || typeof value === 'undefined' || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const clamped = Math.min(
    DOOR_MOUNT_THICKNESS_DIMENSIONS.maxCm,
    Math.max(DOOR_MOUNT_THICKNESS_DIMENSIONS.minCm, n)
  );
  return roundDoorMountThicknessCm(clamped);
}

export function getDefaultDoorMountThicknessM(mode: unknown): number {
  return normalizeDoorMountConstructionMode(mode) === 'inset'
    ? HINGED_DOOR_MOUNT_POLICY.insetFrameThicknessM
    : MATERIAL_THICKNESS_POLICY.wood.thicknessM;
}

export function getDefaultDoorMountThicknessCm(mode: unknown): number {
  return roundDoorMountThicknessCm(mToCm(getDefaultDoorMountThicknessM(mode)));
}

export function getDoorMountThicknessConfigKey(
  mode: unknown,
  kind: DoorMountThicknessKind
): DoorMountThicknessConfigKey {
  const normalizedMode = normalizeDoorMountConstructionMode(mode);
  return DOOR_MOUNT_THICKNESS_CONFIG_KEYS[normalizedMode][kind];
}

type DoorMountThicknessConfigLike = Partial<
  Record<DoorMountThicknessConfigKey | 'doorMountMode' | 'wardrobeType', unknown>
>;

function normalizeDoorMountConstructionModeFromConfig(
  cfg: DoorMountThicknessConfigLike | null | undefined
): DoorMountConstructionMode {
  return cfg?.wardrobeType === 'sliding' ? 'overlay' : normalizeDoorMountConstructionMode(cfg?.doorMountMode);
}

export function resolveDoorMountThicknessesFromConfig(cfg: DoorMountThicknessConfigLike | null | undefined): {
  mode: DoorMountConstructionMode;
  defaultThicknessCm: number;
  frameKey: DoorMountThicknessConfigKey;
  shelfKey: DoorMountThicknessConfigKey;
  frameThicknessCm: number;
  shelfThicknessCm: number;
  frameThicknessM: number;
  shelfThicknessM: number;
  frameOverrideCm: number | null;
  shelfOverrideCm: number | null;
} {
  const mode = normalizeDoorMountConstructionModeFromConfig(cfg);
  const defaultThicknessCm = getDefaultDoorMountThicknessCm(mode);
  const frameKey = getDoorMountThicknessConfigKey(mode, 'frame');
  const shelfKey = getDoorMountThicknessConfigKey(mode, 'shelf');
  const frameOverrideCm = normalizeDoorMountThicknessCm(cfg?.[frameKey]);
  const shelfOverrideCm = normalizeDoorMountThicknessCm(cfg?.[shelfKey]);
  const frameThicknessCm = frameOverrideCm ?? defaultThicknessCm;
  const shelfThicknessCm = shelfOverrideCm ?? defaultThicknessCm;
  return {
    mode,
    defaultThicknessCm,
    frameKey,
    shelfKey,
    frameThicknessCm,
    shelfThicknessCm,
    frameThicknessM: cmToM(frameThicknessCm),
    shelfThicknessM: cmToM(shelfThicknessCm),
    frameOverrideCm,
    shelfOverrideCm,
  };
}
