import { isRecord, readFinite } from './render_drawer_ops_shared_guards.js';
import type { ExternalDrawerOpLike, InternalDrawerOpLike } from './render_drawer_ops_shared_types.js';

function readPositionTriplet(value: unknown): { x?: number; y?: number; z?: number } | undefined {
  if (!isRecord(value)) return undefined;
  return {
    x: typeof value.x === 'number' && Number.isFinite(value.x) ? value.x : undefined,
    y: typeof value.y === 'number' && Number.isFinite(value.y) ? value.y : undefined,
    z: typeof value.z === 'number' && Number.isFinite(value.z) ? value.z : undefined,
  };
}

export function readExternalDrawerOp(value: unknown): ExternalDrawerOpLike | null {
  if (!isRecord(value)) return null;
  const partId = typeof value.partId === 'string' ? value.partId : '';
  const visualW = readFinite(value.visualW, Number.NaN);
  const visualH = readFinite(value.visualH, Number.NaN);
  const boxW = readFinite(value.boxW, Number.NaN);
  const boxH = readFinite(value.boxH, Number.NaN);
  const boxD = readFinite(value.boxD, Number.NaN);
  if (
    !partId ||
    !Number.isFinite(visualW) ||
    !Number.isFinite(visualH) ||
    !Number.isFinite(boxW) ||
    !Number.isFinite(boxH) ||
    !Number.isFinite(boxD)
  ) {
    return null;
  }
  return {
    partId,
    grooveKey: typeof value.grooveKey === 'string' ? value.grooveKey : undefined,
    dividerKey: typeof value.dividerKey === 'string' ? value.dividerKey : undefined,
    visualW,
    visualH,
    visualT: typeof value.visualT === 'number' && Number.isFinite(value.visualT) ? value.visualT : undefined,
    boxW,
    boxH,
    boxD,
    boxOffsetZ:
      typeof value.boxOffsetZ === 'number' && Number.isFinite(value.boxOffsetZ)
        ? value.boxOffsetZ
        : undefined,
    moduleIndex: value.moduleIndex,
    connectW:
      typeof value.connectW === 'number' && Number.isFinite(value.connectW) ? value.connectW : undefined,
    connectH:
      typeof value.connectH === 'number' && Number.isFinite(value.connectH) ? value.connectH : undefined,
    connectD:
      typeof value.connectD === 'number' && Number.isFinite(value.connectD) ? value.connectD : undefined,
    connectZ:
      typeof value.connectZ === 'number' && Number.isFinite(value.connectZ) ? value.connectZ : undefined,
    closed: readPositionTriplet(value.closed),
    open: readPositionTriplet(value.open),
    faceW: typeof value.faceW === 'number' && Number.isFinite(value.faceW) ? value.faceW : undefined,
    faceOffsetX:
      typeof value.faceOffsetX === 'number' && Number.isFinite(value.faceOffsetX)
        ? value.faceOffsetX
        : undefined,
    frontZ: typeof value.frontZ === 'number' && Number.isFinite(value.frontZ) ? value.frontZ : undefined,
  };
}

export function readInternalDrawerOp(value: unknown): InternalDrawerOpLike | null {
  if (!isRecord(value)) return null;
  const partId = typeof value.partId === 'string' ? value.partId : '';
  const width = readFinite(value.width, Number.NaN);
  const height = readFinite(value.height, Number.NaN);
  const depth = readFinite(value.depth, Number.NaN);
  if (!partId || !Number.isFinite(width) || !Number.isFinite(height) || !Number.isFinite(depth)) return null;
  return {
    partId,
    width,
    height,
    depth,
    moduleIndex: value.moduleIndex,
    dividerKey: typeof value.dividerKey === 'string' ? value.dividerKey : undefined,
    hasDivider: value.hasDivider === true,
    x: readFinite(value.x),
    y: readFinite(value.y),
    z: readFinite(value.z),
    openZ: typeof value.openZ === 'number' && Number.isFinite(value.openZ) ? value.openZ : undefined,
  };
}
