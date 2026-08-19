import { isRecord, readFinite, readOptionalFinite } from './render_drawer_ops_shared_guards.js';
import type { ExternalDrawerOpLike, InternalDrawerOpLike } from './render_drawer_ops_shared_types.js';

function readPositionTriplet(
  value: unknown
): { x: number | undefined; y: number | undefined; z: number | undefined } | undefined {
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
  const runnerMountWidth = readFinite(value.runnerMountWidth, Number.NaN);
  const boxH = readFinite(value.boxH, Number.NaN);
  const boxD = readFinite(value.boxD, Number.NaN);
  if (
    !partId ||
    !Number.isFinite(visualW) ||
    !Number.isFinite(visualH) ||
    !Number.isFinite(boxW) ||
    !Number.isFinite(runnerMountWidth) ||
    runnerMountWidth < boxW ||
    !Number.isFinite(boxH) ||
    !Number.isFinite(boxD)
  ) {
    return null;
  }
  const kind = typeof value.kind === 'string' ? value.kind : undefined;
  const grooveKey = typeof value.grooveKey === 'string' ? value.grooveKey : undefined;
  const dividerKey = typeof value.dividerKey === 'string' ? value.dividerKey : undefined;
  const visualT = readOptionalFinite(value.visualT);
  const boxOffsetZ = readOptionalFinite(value.boxOffsetZ);
  const connectW = readOptionalFinite(value.connectW);
  const connectH = readOptionalFinite(value.connectH);
  const connectD = readOptionalFinite(value.connectD);
  const connectZ = readOptionalFinite(value.connectZ);
  const closed = readPositionTriplet(value.closed);
  const open = readPositionTriplet(value.open);
  const faceW = readOptionalFinite(value.faceW);
  const faceOffsetX = readOptionalFinite(value.faceOffsetX);
  const frontZ = readOptionalFinite(value.frontZ);
  return {
    ...(kind !== undefined ? { kind } : {}),
    partId,
    ...(grooveKey !== undefined ? { grooveKey } : {}),
    ...(dividerKey !== undefined ? { dividerKey } : {}),
    visualW,
    visualH,
    ...(visualT !== undefined ? { visualT } : {}),
    boxW,
    runnerMountWidth,
    boxH,
    boxD,
    ...(boxOffsetZ !== undefined ? { boxOffsetZ } : {}),
    moduleIndex: value.moduleIndex,
    ...(connectW !== undefined ? { connectW } : {}),
    ...(connectH !== undefined ? { connectH } : {}),
    ...(connectD !== undefined ? { connectD } : {}),
    ...(connectZ !== undefined ? { connectZ } : {}),
    ...(closed !== undefined ? { closed } : {}),
    ...(open !== undefined ? { open } : {}),
    ...(faceW !== undefined ? { faceW } : {}),
    ...(faceOffsetX !== undefined ? { faceOffsetX } : {}),
    ...(frontZ !== undefined ? { frontZ } : {}),
  };
}

export function readInternalDrawerOp(value: unknown): InternalDrawerOpLike | null {
  if (!isRecord(value)) return null;
  const partId = typeof value.partId === 'string' ? value.partId : '';
  const width = readFinite(value.width, Number.NaN);
  const runnerMountWidth = readFinite(value.runnerMountWidth, Number.NaN);
  const height = readFinite(value.height, Number.NaN);
  const depth = readFinite(value.depth, Number.NaN);
  if (
    !partId ||
    !Number.isFinite(width) ||
    !Number.isFinite(runnerMountWidth) ||
    runnerMountWidth < width ||
    !Number.isFinite(height) ||
    !Number.isFinite(depth)
  )
    return null;
  const stackPartId =
    typeof value.stackPartId === 'string' && value.stackPartId.trim() ? value.stackPartId.trim() : undefined;
  const dividerKey = typeof value.dividerKey === 'string' ? value.dividerKey : undefined;
  const openZ = readOptionalFinite(value.openZ);
  const sketchBoxId =
    typeof value.sketchBoxId === 'string' && value.sketchBoxId.trim() ? value.sketchBoxId.trim() : undefined;
  const sketchStack =
    value.sketchStack === 'bottom' ? 'bottom' : value.sketchStack === 'top' ? 'top' : undefined;
  const cassetteBaseY = readOptionalFinite(value.cassetteBaseY);
  const cassetteOuterWidth = readOptionalFinite(value.cassetteOuterWidth);
  const cassetteDepth = readOptionalFinite(value.cassetteDepth);
  const cassetteCenterX = readOptionalFinite(value.cassetteCenterX);
  const cassetteCenterZ = readOptionalFinite(value.cassetteCenterZ);
  const cassetteStackH = readOptionalFinite(value.cassetteStackH);
  const cassetteWoodThick = readOptionalFinite(value.cassetteWoodThick);
  return {
    partId,
    ...(stackPartId !== undefined ? { stackPartId } : {}),
    width,
    runnerMountWidth,
    height,
    depth,
    moduleIndex: value.moduleIndex,
    ...(dividerKey !== undefined ? { dividerKey } : {}),
    hasDivider: value.hasDivider === true,
    x: readFinite(value.x),
    y: readFinite(value.y),
    z: readFinite(value.z),
    ...(openZ !== undefined ? { openZ } : {}),
    ...(sketchBoxId !== undefined ? { sketchBoxId } : {}),
    sketchModuleKey: value.sketchModuleKey,
    sketchFreePlacement: value.sketchFreePlacement === true,
    ...(sketchStack !== undefined ? { sketchStack } : {}),
    ...(cassetteBaseY !== undefined ? { cassetteBaseY } : {}),
    ...(cassetteOuterWidth !== undefined ? { cassetteOuterWidth } : {}),
    ...(cassetteDepth !== undefined ? { cassetteDepth } : {}),
    ...(cassetteCenterX !== undefined ? { cassetteCenterX } : {}),
    ...(cassetteCenterZ !== undefined ? { cassetteCenterZ } : {}),
    ...(cassetteStackH !== undefined ? { cassetteStackH } : {}),
    ...(cassetteWoodThick !== undefined ? { cassetteWoodThick } : {}),
  };
}
