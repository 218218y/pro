import { isRecord, readFinite, readOptionalFinite } from './render_drawer_ops_shared_guards.js';
import type { ExternalDrawerOpLike, InternalDrawerOpLike } from './render_drawer_ops_shared_types.js';

function readPositionTriplet(value: unknown): { x?: number; y?: number; z?: number } | undefined {
  if (!isRecord(value)) return undefined;
  return {
    x: readOptionalFinite(value.x),
    y: readOptionalFinite(value.y),
    z: readOptionalFinite(value.z),
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
    visualT: readOptionalFinite(value.visualT),
    boxW,
    boxH,
    boxD,
    boxOffsetZ: readOptionalFinite(value.boxOffsetZ),
    moduleIndex: value.moduleIndex,
    connectW: readOptionalFinite(value.connectW),
    connectH: readOptionalFinite(value.connectH),
    connectD: readOptionalFinite(value.connectD),
    connectZ: readOptionalFinite(value.connectZ),
    closed: readPositionTriplet(value.closed),
    open: readPositionTriplet(value.open),
    faceW: readOptionalFinite(value.faceW),
    faceOffsetX: readOptionalFinite(value.faceOffsetX),
    frontZ: readOptionalFinite(value.frontZ),
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
    stackPartId:
      typeof value.stackPartId === 'string' && value.stackPartId.trim()
        ? value.stackPartId.trim()
        : undefined,
    width,
    height,
    depth,
    moduleIndex: value.moduleIndex,
    dividerKey: typeof value.dividerKey === 'string' ? value.dividerKey : undefined,
    hasDivider: value.hasDivider === true,
    x: readFinite(value.x),
    y: readFinite(value.y),
    z: readFinite(value.z),
    openZ: readOptionalFinite(value.openZ),
    sketchBoxId:
      typeof value.sketchBoxId === 'string' && value.sketchBoxId.trim()
        ? value.sketchBoxId.trim()
        : undefined,
    sketchModuleKey: value.sketchModuleKey,
    sketchFreePlacement: value.sketchFreePlacement === true,
    sketchStack: value.sketchStack === 'bottom' ? 'bottom' : value.sketchStack === 'top' ? 'top' : undefined,
    cassetteBaseY: readOptionalFinite(value.cassetteBaseY),
    cassetteOuterWidth: readOptionalFinite(value.cassetteOuterWidth),
    cassetteDepth: readOptionalFinite(value.cassetteDepth),
    cassetteCenterX: readOptionalFinite(value.cassetteCenterX),
    cassetteCenterZ: readOptionalFinite(value.cassetteCenterZ),
    cassetteStackH: readOptionalFinite(value.cassetteStackH),
    cassetteWoodThick: readOptionalFinite(value.cassetteWoodThick),
  };
}
