import {
  CM_PER_METER,
  CORNER_WING_DIMENSIONS,
  WARDROBE_DEFAULTS,
} from '../../shared/wardrobe_dimension_tokens_shared.js';

import type { CornerDimensionsState } from './post_build_dimensions_shared.js';
import { asRecord, readKey, type ValueRecord } from './post_build_extras_shared.js';

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
  let cornerWallLenM = CORNER_WING_DIMENSIONS.connector.defaultWallLengthM;
  let cornerOffsetXM = 0;
  let cornerOffsetZM = 0;
  let cornerConnectorEnabled = true;
  let cornerDoorCount: number = WARDROBE_DEFAULTS.corner.doorsCount;
  let cornerWingLenM = CORNER_WING_DIMENSIONS.wing.defaultWidthCm / CM_PER_METER;
  let cornerWingHeightM = NaN;
  let cornerWingDepthM = NaN;

  const ui = asRecord(uiSnapshot);
  const raw = asRecord(readKey(ui, 'raw'));

  const pick = (prefer: 'ui' | 'raw', key: string, altKeys: string[] | null = null): unknown => {
    const keys = [key].concat(altKeys || []);
    const first = (src: ValueRecord | null): unknown => {
      if (!src) return undefined;
      for (const currentKey of keys) {
        const value = readKey(src, currentKey);
        if (typeof value !== 'undefined') return value;
      }
      return undefined;
    };
    if (prefer === 'raw') {
      const rawValue = first(raw);
      if (typeof rawValue !== 'undefined') return rawValue;
      return first(ui);
    }
    const uiValue = first(ui);
    if (typeof uiValue !== 'undefined') return uiValue;
    return first(raw);
  };

  const uiCornerSide = pick('ui', 'cornerSide');
  if (uiCornerSide === 'left') cornerSide = 'left';
  else if (uiCornerSide === 'right') cornerSide = 'right';

  const connectorEnabledRaw = pick('raw', 'cornerConnectorEnabled');
  if (typeof connectorEnabledRaw !== 'undefined') cornerConnectorEnabled = !!connectorEnabledRaw;

  const cornerDoorsRaw = pick('ui', 'cornerDoors', ['cornerDoorCount', 'cornerDoorsCount']);
  const cornerDoorsNum = readSnapshotNumber(cornerDoorsRaw);
  if (Number.isFinite(cornerDoorsNum)) cornerDoorCount = Math.max(0, Math.round(cornerDoorsNum));

  const wingLenRaw = pick('ui', 'cornerWidth');
  let wingLenCm = readSnapshotNumber(wingLenRaw);
  if (!Number.isFinite(wingLenCm)) wingLenCm = CORNER_WING_DIMENSIONS.wing.defaultWidthCm;
  if (wingLenCm < 0) wingLenCm = 0;
  cornerWingLenM = wingLenCm / CM_PER_METER;

  const wingHeightRaw = pick('ui', 'cornerHeight', ['cornerHeightCm']);
  const wingHeightCm = readSnapshotNumber(wingHeightRaw);
  if (Number.isFinite(wingHeightCm) && wingHeightCm > 0) cornerWingHeightM = wingHeightCm / CM_PER_METER;

  const wingDepthRaw = pick('ui', 'cornerDepth', ['cornerDepthCm']);
  const wingDepthCm = readSnapshotNumber(wingDepthRaw);
  if (Number.isFinite(wingDepthCm) && wingDepthCm > 0) cornerWingDepthM = wingDepthCm / CM_PER_METER;

  const wallLenRaw = pick('ui', 'cornerCabinetWallLenCm', [
    'cornerCabinetWallLen',
    'cornerConnectorWallLenCm',
  ]);
  const wallLenCm = readSnapshotNumber(wallLenRaw);
  if (
    Number.isFinite(wallLenCm) &&
    wallLenCm > CORNER_WING_DIMENSIONS.connector.minWallLengthM * CM_PER_METER
  )
    cornerWallLenM = wallLenCm / CM_PER_METER;

  const offsetXRaw = pick('ui', 'cornerCabinetOffsetXcm', ['cornerCabinetOffsetX']);
  const offsetXCm = readSnapshotNumber(offsetXRaw);
  if (Number.isFinite(offsetXCm)) cornerOffsetXM = offsetXCm / CM_PER_METER;

  const offsetZRaw = pick('ui', 'cornerCabinetOffsetZcm', ['cornerCabinetOffsetZ']);
  const offsetZCm = readSnapshotNumber(offsetZRaw);
  if (Number.isFinite(offsetZCm)) cornerOffsetZM = offsetZCm / CM_PER_METER;

  if (cornerSide === 'left') cornerOffsetXM = -cornerOffsetXM;

  if (!Number.isFinite(cornerWingLenM) || cornerWingLenM < 0)
    cornerWingLenM = CORNER_WING_DIMENSIONS.wing.defaultWidthCm / CM_PER_METER;
  if (!Number.isFinite(cornerWingHeightM) || cornerWingHeightM <= 0) cornerWingHeightM = dimH;
  if (!Number.isFinite(cornerWingDepthM) || cornerWingDepthM <= 0) cornerWingDepthM = dimD;

  return {
    cornerSide,
    cornerWallLenM,
    cornerOffsetXM,
    cornerOffsetZM,
    cornerConnectorEnabled,
    cornerDoorCount,
    cornerWingLenM,
    cornerWingHeightM,
    cornerWingDepthM,
  };
}
