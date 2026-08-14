import { EXTERNAL_DRAWER_SIZE_POLICY } from './dimensions/external_drawer_policy.js';
import { HINGED_DOOR_SPLIT_GEOMETRY_POLICY } from './dimensions/door_system_policy.js';
import { EDGE_HANDLE_SIZE_POLICY, STANDARD_HANDLE_RENDER_POLICY } from './dimensions/handle_policy.js';
import { resolveDoorVisualSegmentIdentity } from './door_visual_key_contracts_shared.js';

const FIT_EPSILON_M = 1e-9;

export type ExternalDrawerFitInput = {
  startY: number;
  effectiveTopY: number;
  woodThick: number;
  hasShoe: unknown;
  regCount: unknown;
};

export type ExternalDrawerBodyFitInput = Omit<ExternalDrawerFitInput, 'effectiveTopY'> & {
  cabinetBodyHeight: number;
};

export type ExternalDrawerFitResult = {
  requestedHasShoe: boolean;
  requestedRegCount: number;
  hasShoe: boolean;
  regCount: number;
  drawerHeightTotal: number;
  availableInternalHeightM: number;
  usableDrawerStackHeightM: number;
  maxRegularDrawers: number;
  fitsRequested: boolean;
};

export type DoorHandleFitInput = {
  handleType: unknown;
  edgeHandleVariant?: unknown;
  doorHeightM: number;
  localCenterYM: number;
};

export type DoorHandleFitResult = {
  fits: boolean;
  handleHeightM: number;
  minCenterYM: number;
  maxCenterYM: number;
};

export type DoorSegmentConstructionSizeInput = {
  partId: unknown;
  doorHeightM: unknown;
  isSketchSegment: unknown;
};

function readFiniteNumber(value: unknown): number | null {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  return Number.isFinite(n) ? n : null;
}

function normalizeExternalDrawerCount(value: unknown): number {
  const n = readFiniteNumber(value);
  if (n == null || n <= 0) return 0;
  return Math.floor(n);
}

function clampNonNegative(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export function getExternalDrawerStackHeightM(args: { hasShoe: unknown; regCount: unknown }): number {
  const hasShoe = args.hasShoe === true;
  const regCount = normalizeExternalDrawerCount(args.regCount);
  return (
    (hasShoe ? EXTERNAL_DRAWER_SIZE_POLICY.shoeHeightM : 0) +
    regCount * EXTERNAL_DRAWER_SIZE_POLICY.regularHeightM
  );
}

export function resolveExternalDrawerFitFromBody(input: ExternalDrawerBodyFitInput): ExternalDrawerFitResult {
  const startY = readFiniteNumber(input.startY) ?? 0;
  const bodyHeight = readFiniteNumber(input.cabinetBodyHeight) ?? 0;
  const woodThick = readFiniteNumber(input.woodThick) ?? 0;
  return resolveExternalDrawerFitFromBounds({
    startY,
    woodThick,
    effectiveTopY: startY + bodyHeight - woodThick,
    hasShoe: input.hasShoe,
    regCount: input.regCount,
  });
}

export function resolveExternalDrawerFitFromBounds(input: ExternalDrawerFitInput): ExternalDrawerFitResult {
  const startY = readFiniteNumber(input.startY) ?? 0;
  const effectiveTopY = readFiniteNumber(input.effectiveTopY) ?? startY;
  const woodThick = readFiniteNumber(input.woodThick) ?? 0;
  const requestedHasShoe = input.hasShoe === true;
  const requestedRegCount = normalizeExternalDrawerCount(input.regCount);

  const internalStartY = startY + woodThick;
  const availableInternalHeightM = clampNonNegative(effectiveTopY - internalStartY);
  const usableDrawerStackHeightM = clampNonNegative(availableInternalHeightM - woodThick);

  const shoeHeight = EXTERNAL_DRAWER_SIZE_POLICY.shoeHeightM;
  const regHeight = EXTERNAL_DRAWER_SIZE_POLICY.regularHeightM;
  const hasShoe = requestedHasShoe && shoeHeight <= usableDrawerStackHeightM + FIT_EPSILON_M;
  const remainingForRegular = clampNonNegative(usableDrawerStackHeightM - (hasShoe ? shoeHeight : 0));
  const maxRegularDrawers = Math.max(0, Math.floor((remainingForRegular + FIT_EPSILON_M) / regHeight));
  const regCount = Math.min(requestedRegCount, maxRegularDrawers);
  const drawerHeightTotal = getExternalDrawerStackHeightM({ hasShoe, regCount });
  const fitsRequested = hasShoe === requestedHasShoe && regCount === requestedRegCount;

  return {
    requestedHasShoe,
    requestedRegCount,
    hasShoe,
    regCount,
    drawerHeightTotal,
    availableInternalHeightM,
    usableDrawerStackHeightM,
    maxRegularDrawers,
    fitsRequested,
  };
}

export function getDoorHandleFootprintHeightM(handleType: unknown, edgeHandleVariant?: unknown): number {
  if (handleType === 'none' || handleType == null) return 0;
  if (handleType === 'edge') {
    return edgeHandleVariant === 'long'
      ? EDGE_HANDLE_SIZE_POLICY.longLengthM
      : EDGE_HANDLE_SIZE_POLICY.shortLengthM;
  }
  return STANDARD_HANDLE_RENDER_POLICY.doorHeightM;
}

export function resolveDoorHandleVerticalFit(input: DoorHandleFitInput): DoorHandleFitResult {
  const doorHeight = readFiniteNumber(input.doorHeightM) ?? 0;
  const localCenterY = readFiniteNumber(input.localCenterYM) ?? 0;
  const handleHeightM = getDoorHandleFootprintHeightM(input.handleType, input.edgeHandleVariant);
  const halfDoor = doorHeight / 2;
  const halfHandle = handleHeightM / 2;
  const minCenterYM = -halfDoor + halfHandle;
  const maxCenterYM = halfDoor - halfHandle;
  const hasRoom = doorHeight > 0 && handleHeightM > 0 && minCenterYM <= maxCenterYM + FIT_EPSILON_M;
  const within = localCenterY >= minCenterYM - FIT_EPSILON_M && localCenterY <= maxCenterYM + FIT_EPSILON_M;
  return {
    fits: hasRoom && within,
    handleHeightM,
    minCenterYM,
    maxCenterYM,
  };
}

export function clampDoorHandleLocalCenterYToFit(input: DoorHandleFitInput): number | null {
  const fit = resolveDoorHandleVerticalFit(input);
  if (fit.handleHeightM <= 0 || fit.minCenterYM > fit.maxCenterYM + FIT_EPSILON_M) return null;
  const y = readFiniteNumber(input.localCenterYM) ?? 0;
  if (y < fit.minCenterYM) return fit.minCenterYM;
  if (y > fit.maxCenterYM) return fit.maxCenterYM;
  return y;
}

export function isUnusuallySmallDoorSegment(input: DoorSegmentConstructionSizeInput): boolean {
  const doorHeightM =
    typeof input.doorHeightM === 'number' && Number.isFinite(input.doorHeightM) ? input.doorHeightM : null;
  if (doorHeightM == null || !(doorHeightM > 0)) return false;

  const isCutSegment =
    input.isSketchSegment === true || resolveDoorVisualSegmentIdentity(input.partId).isSegment;
  if (!isCutSegment) return false;

  return doorHeightM < HINGED_DOOR_SPLIT_GEOMETRY_POLICY.minSegmentHeightM - FIT_EPSILON_M;
}
