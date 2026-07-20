import {
  CORNER_CONNECTOR_LAYOUT_POLICY,
  CORNER_WING_BODY_POLICY,
} from '../../shared/dimensions/corner_system_policy.js';
import { CM_PER_METER } from '../../shared/dimensions/units.js';
import { WARDROBE_DEFAULTS } from '../../shared/dimensions/wardrobe_defaults.js';

import type { CornerDimensionsState } from './post_build_dimensions_shared.js';
import { asRecord, readKey } from './post_build_extras_shared.js';

function readSnapshotNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : NaN;
}

export function readPostBuildCornerDimensions(args: {
  uiSnapshot: unknown;
  dimH: number;
  dimD: number;
}): CornerDimensionsState {
  const { uiSnapshot, dimH, dimD } = args;

  let cornerSide: 'left' | 'right' = 'right';
  let cornerWallLenM: number = CORNER_CONNECTOR_LAYOUT_POLICY.defaultWallLengthM;
  let cornerOffsetXM = 0;
  let cornerOffsetZM = 0;
  const cornerConnectorActive = true;
  let cornerWingDoorCount: number = WARDROBE_DEFAULTS.corner.doorsCount;
  let cornerWingLenM = CORNER_WING_BODY_POLICY.defaultWidthCm / CM_PER_METER;
  let cornerWingHeightM = NaN;
  let cornerWingDepthM = NaN;

  const ui = asRecord(uiSnapshot);

  const uiCornerSide = readKey(ui, 'cornerSide');
  if (uiCornerSide === 'left') cornerSide = 'left';
  else if (uiCornerSide === 'right') cornerSide = 'right';

  const cornerDoorsRaw = readKey(ui, 'cornerDoors');
  const cornerDoorsNum = readSnapshotNumber(cornerDoorsRaw);
  if (Number.isFinite(cornerDoorsNum)) cornerWingDoorCount = Math.max(0, Math.round(cornerDoorsNum));

  const wingLenRaw = readKey(ui, 'cornerWidth');
  let wingLenCm = readSnapshotNumber(wingLenRaw);
  if (!Number.isFinite(wingLenCm)) wingLenCm = CORNER_WING_BODY_POLICY.defaultWidthCm;
  if (wingLenCm < 0) wingLenCm = 0;
  cornerWingLenM = wingLenCm / CM_PER_METER;

  const wingHeightRaw = readKey(ui, 'cornerHeight');
  const wingHeightCm = readSnapshotNumber(wingHeightRaw);
  if (Number.isFinite(wingHeightCm) && wingHeightCm > 0) cornerWingHeightM = wingHeightCm / CM_PER_METER;

  const wingDepthRaw = readKey(ui, 'cornerDepth');
  const wingDepthCm = readSnapshotNumber(wingDepthRaw);
  if (Number.isFinite(wingDepthCm) && wingDepthCm > 0) cornerWingDepthM = wingDepthCm / CM_PER_METER;

  const wallLenRaw = readKey(ui, 'cornerCabinetWallLenCm');
  const wallLenCm = readSnapshotNumber(wallLenRaw);
  if (Number.isFinite(wallLenCm) && wallLenCm > CORNER_CONNECTOR_LAYOUT_POLICY.minWallLengthM * CM_PER_METER)
    cornerWallLenM = wallLenCm / CM_PER_METER;

  const offsetXRaw = readKey(ui, 'cornerCabinetOffsetXcm');
  const offsetXCm = readSnapshotNumber(offsetXRaw);
  if (Number.isFinite(offsetXCm)) cornerOffsetXM = offsetXCm / CM_PER_METER;

  const offsetZRaw = readKey(ui, 'cornerCabinetOffsetZcm');
  const offsetZCm = readSnapshotNumber(offsetZRaw);
  if (Number.isFinite(offsetZCm)) cornerOffsetZM = offsetZCm / CM_PER_METER;

  if (cornerSide === 'left') cornerOffsetXM = -cornerOffsetXM;

  if (!Number.isFinite(cornerWingLenM) || cornerWingLenM < 0)
    cornerWingLenM = CORNER_WING_BODY_POLICY.defaultWidthCm / CM_PER_METER;
  if (!Number.isFinite(cornerWingHeightM) || cornerWingHeightM <= 0) cornerWingHeightM = dimH;
  if (!Number.isFinite(cornerWingDepthM) || cornerWingDepthM <= 0) cornerWingDepthM = dimD;

  return {
    cornerSide,
    cornerWallLenM,
    cornerOffsetXM,
    cornerOffsetZM,
    cornerConnectorActive,
    cornerWingDoorCount,
    cornerWingLenM,
    cornerWingHeightM,
    cornerWingDepthM,
  };
}
