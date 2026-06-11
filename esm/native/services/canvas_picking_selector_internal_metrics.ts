import type { UnknownRecord } from '../../../types';

import { asRecord } from '../runtime/record.js';

type RecordMap = UnknownRecord;

export type SelectorEnvelopeLike = RecordMap & {
  centerX?: unknown;
  centerY?: unknown;
  centerZ?: unknown;
  width?: unknown;
  height?: unknown;
  depth?: unknown;
  positionX?: unknown;
  positionY?: unknown;
  positionZ?: unknown;
};

export type SelectorInternalMetrics = {
  woodThick: number;
  innerW: number;
  internalCenterX: number;
  internalDepth: number;
  internalZ: number;
};

export type SelectorVerticalBounds = {
  bottomY: number;
  topY: number;
};

function readFiniteNumber(record: unknown, key: string): number | null {
  const rec = asRecord(record);
  const value = rec ? rec[key] : null;
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function readSelectorEnvelopeFromObject(value: unknown): SelectorEnvelopeLike | null {
  const obj = asRecord(value);
  if (!obj) return null;

  const geo = asRecord(obj.geometry);
  const params = asRecord(geo?.parameters);
  const pos = asRecord(obj.position);

  const envelope: SelectorEnvelopeLike = {};
  const width = readFiniteNumber(params, 'width');
  const height = readFiniteNumber(params, 'height');
  const depth = readFiniteNumber(params, 'depth');
  const centerX = readFiniteNumber(pos, 'x');
  const centerY = readFiniteNumber(pos, 'y');
  const centerZ = readFiniteNumber(pos, 'z');

  if (width != null) envelope.width = width;
  if (height != null) envelope.height = height;
  if (depth != null) envelope.depth = depth;
  if (centerX != null) {
    envelope.centerX = centerX;
    envelope.positionX = centerX;
  }
  if (centerY != null) {
    envelope.centerY = centerY;
    envelope.positionY = centerY;
  }
  if (centerZ != null) {
    envelope.centerZ = centerZ;
    envelope.positionZ = centerZ;
  }

  return Object.keys(envelope).length > 0 ? envelope : null;
}

export function applySelectorVerticalBoundsFallback(args: {
  bottomY: number;
  topY: number;
  selectorEnvelope?: SelectorEnvelopeLike | null;
}): SelectorVerticalBounds {
  let { bottomY, topY } = args;
  const selectorEnvelope = args.selectorEnvelope ?? null;
  const centerY =
    readFiniteNumber(selectorEnvelope, 'centerY') ?? readFiniteNumber(selectorEnvelope, 'positionY');
  const height = readFiniteNumber(selectorEnvelope, 'height');

  if (
    (!Number.isFinite(bottomY) || !Number.isFinite(topY) || !(topY > bottomY)) &&
    centerY != null &&
    height != null &&
    height > 0
  ) {
    bottomY = centerY - height / 2;
    topY = centerY + height / 2;
  }

  return { bottomY, topY };
}

export function resolveSelectorInternalMetrics(args: {
  info: unknown;
  selectorEnvelope?: SelectorEnvelopeLike | null;
  woodThickFallback?: number;
  minInnerSize?: number;
  depthClearance?: number;
  centerZInset?: number;
}): SelectorInternalMetrics {
  const {
    info,
    selectorEnvelope = null,
    woodThickFallback = 0.018,
    minInnerSize = 0.05,
    depthClearance = 0.05,
    centerZInset = 0.015,
  } = args;

  let woodThick = readFiniteNumber(info, 'woodThick') ?? woodThickFallback;
  let innerW = readFiniteNumber(info, 'innerW') ?? Number.NaN;
  let internalCenterX = readFiniteNumber(info, 'internalCenterX') ?? Number.NaN;
  let internalDepth = readFiniteNumber(info, 'internalDepth') ?? Number.NaN;
  let internalZ = readFiniteNumber(info, 'internalZ') ?? Number.NaN;

  if (selectorEnvelope) {
    if (!Number.isFinite(woodThick) || woodThick <= 0) woodThick = woodThickFallback;

    const centerX =
      readFiniteNumber(selectorEnvelope, 'centerX') ?? readFiniteNumber(selectorEnvelope, 'positionX');
    const centerZ =
      readFiniteNumber(selectorEnvelope, 'centerZ') ?? readFiniteNumber(selectorEnvelope, 'positionZ');
    const width = readFiniteNumber(selectorEnvelope, 'width') ?? 0;
    const depth = readFiniteNumber(selectorEnvelope, 'depth') ?? 0;

    if (!Number.isFinite(internalCenterX) && centerX != null) internalCenterX = centerX;
    if (!Number.isFinite(internalZ) && centerZ != null) internalZ = centerZ - centerZInset;

    if (!Number.isFinite(innerW) || innerW <= 0) {
      const guessedInnerW = width > 0 ? Math.max(minInnerSize, width - 2 * woodThick) : 0;
      innerW = guessedInnerW > 0 ? guessedInnerW : width;
    }

    if (!Number.isFinite(internalDepth) || internalDepth <= 0) {
      const guessedInternalDepth = depth > 0 ? Math.max(minInnerSize, depth - depthClearance) : 0;
      internalDepth = guessedInternalDepth > 0 ? guessedInternalDepth : depth;
    }
  }

  return {
    woodThick,
    innerW,
    internalCenterX,
    internalDepth,
    internalZ,
  };
}
