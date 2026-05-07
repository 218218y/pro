import { readDoorTrimEntry } from './door_trim_map.js';
import type {
  DoorTrimAxis,
  DoorTrimCenterFromLocalArgs,
  DoorTrimPlacementArgs,
  DoorTrimRect,
  DoorTrimSnappedCenterFromLocalArgs,
  DoorTrimSpan,
  ResolvedDoorTrimPlacement,
} from './door_trim_placement_contracts.js';
import {
  DEFAULT_DOOR_TRIM_AXIS,
  DEFAULT_DOOR_TRIM_CENTER_NORM,
  DEFAULT_DOOR_TRIM_COLOR,
  DEFAULT_DOOR_TRIM_SPAN,
  DEFAULT_DOOR_TRIM_THICKNESS_M,
  DOOR_TRIM_CENTER_SNAP_NORM_THRESHOLD,
  MIN_DOOR_TRIM_CROSS_SIZE_CM,
  MIN_DOOR_TRIM_SPAN_M,
  clampDoorTrimNumber,
  normalizeDoorTrimAxis,
  normalizeDoorTrimCenterNorm,
  normalizeDoorTrimColor,
  normalizeDoorTrimCrossSizeCm,
  normalizeDoorTrimCustomSizeCm,
  normalizeDoorTrimSpan,
  resolveDoorTrimCenterPair,
  resolveDoorTrimNormalizedCenter,
} from './door_trim_shared.js';
import { DOOR_TRIM_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';

export function buildDoorTrimCenterFromLocal(args: DoorTrimCenterFromLocalArgs): {
  centerNorm: number;
  centerXNorm: number;
  centerYNorm: number;
} {
  const { rect, localX, localY } = args;
  const width = Math.max(DOOR_TRIM_DIMENSIONS.normalize.rectSpanMinM, rect.maxX - rect.minX);
  const height = Math.max(DOOR_TRIM_DIMENSIONS.normalize.rectSpanMinM, rect.maxY - rect.minY);
  const centerXNorm = normalizeDoorTrimCenterNorm((localX - rect.minX) / width);
  const centerYNorm = normalizeDoorTrimCenterNorm((localY - rect.minY) / height);
  const axis = normalizeDoorTrimAxis(args.axis, DEFAULT_DOOR_TRIM_AXIS);
  return {
    centerNorm: axis === 'vertical' ? centerXNorm : centerYNorm,
    centerXNorm,
    centerYNorm,
  };
}

export function buildSnappedDoorTrimCenterFromLocal(args: DoorTrimSnappedCenterFromLocalArgs): {
  centerNorm: number;
  centerXNorm: number;
  centerYNorm: number;
  snappedX: boolean;
  snappedY: boolean;
  isCentered: boolean;
} {
  const axis = normalizeDoorTrimAxis(args.axis, DEFAULT_DOOR_TRIM_AXIS);
  const thresholdNormRaw =
    typeof args.thresholdNorm === 'number' && Number.isFinite(args.thresholdNorm)
      ? Number(args.thresholdNorm)
      : DOOR_TRIM_CENTER_SNAP_NORM_THRESHOLD;
  const thresholdNorm = Math.max(
    0,
    Math.min(DOOR_TRIM_DIMENSIONS.snap.centerNormThresholdMax, thresholdNormRaw)
  );
  const base = buildDoorTrimCenterFromLocal({
    rect: args.rect,
    localX: args.localX,
    localY: args.localY,
    axis,
  });
  const snappedX = Math.abs(base.centerXNorm - DEFAULT_DOOR_TRIM_CENTER_NORM) <= thresholdNorm;
  const snappedY = Math.abs(base.centerYNorm - DEFAULT_DOOR_TRIM_CENTER_NORM) <= thresholdNorm;
  const centerXNorm = snappedX ? DEFAULT_DOOR_TRIM_CENTER_NORM : base.centerXNorm;
  const centerYNorm = snappedY ? DEFAULT_DOOR_TRIM_CENTER_NORM : base.centerYNorm;
  return {
    centerNorm: axis === 'vertical' ? centerXNorm : centerYNorm,
    centerXNorm,
    centerYNorm,
    snappedX,
    snappedY,
    isCentered: snappedX && snappedY,
  };
}

export function resolveDoorTrimFraction(span: DoorTrimSpan): number {
  switch (span) {
    case 'full':
      return 1;
    case 'three_quarters':
      return 0.75;
    case 'half':
      return 0.5;
    case 'third':
      return 1 / 3;
    case 'quarter':
      return 0.25;
    default:
      return 1;
  }
}

export function resolveDoorTrimSpanM(span: DoorTrimSpan, sizeCm: unknown, fullSpanM: number): number {
  if (!(fullSpanM > 0)) return MIN_DOOR_TRIM_SPAN_M;
  if (span === 'custom') {
    const customCm = normalizeDoorTrimCustomSizeCm(sizeCm);
    if (customCm != null) return clampDoorTrimNumber(customCm / 100, MIN_DOOR_TRIM_SPAN_M, fullSpanM);
    return fullSpanM;
  }
  return clampDoorTrimNumber(fullSpanM * resolveDoorTrimFraction(span), MIN_DOOR_TRIM_SPAN_M, fullSpanM);
}

export function buildDoorTrimCenterNormFromLocal(args: {
  rect: DoorTrimRect;
  axis: DoorTrimAxis;
  localX: number;
  localY: number;
}): number {
  const center = buildDoorTrimCenterFromLocal(args);
  return args.axis === 'vertical' ? center.centerXNorm : center.centerYNorm;
}

export function resolveDoorTrimPlacement(args: DoorTrimPlacementArgs): ResolvedDoorTrimPlacement {
  const rect = args.rect;
  const entry = readDoorTrimEntry(args.entry);
  const axis = normalizeDoorTrimAxis(args.axis ?? entry?.axis, entry?.axis || DEFAULT_DOOR_TRIM_AXIS);
  const color = normalizeDoorTrimColor(args.color ?? entry?.color, entry?.color || DEFAULT_DOOR_TRIM_COLOR);
  const span = normalizeDoorTrimSpan(args.span ?? entry?.span, entry?.span || DEFAULT_DOOR_TRIM_SPAN);
  const sizeCm = normalizeDoorTrimCustomSizeCm(args.sizeCm ?? entry?.sizeCm);
  const crossSizeCm = normalizeDoorTrimCrossSizeCm(args.crossSizeCm ?? entry?.crossSizeCm);
  const baseCenter = resolveDoorTrimCenterPair(
    {
      centerNorm: args.centerNorm ?? entry?.centerNorm,
      centerXNorm: args.centerXNorm ?? entry?.centerXNorm,
      centerYNorm: args.centerYNorm ?? entry?.centerYNorm,
    },
    axis
  );

  const fullWidth = Math.max(0, rect.maxX - rect.minX);
  const fullHeight = Math.max(0, rect.maxY - rect.minY);

  if (axis === 'vertical') {
    const width =
      crossSizeCm != null
        ? clampDoorTrimNumber(crossSizeCm / 100, MIN_DOOR_TRIM_CROSS_SIZE_CM / 100, fullWidth)
        : DEFAULT_DOOR_TRIM_THICKNESS_M;
    const height = resolveDoorTrimSpanM(span, sizeCm, fullHeight);
    const centerX = resolveDoorTrimNormalizedCenter(baseCenter.centerXNorm, rect.minX, rect.maxX, width);
    const centerY = resolveDoorTrimNormalizedCenter(baseCenter.centerYNorm, rect.minY, rect.maxY, height);
    return {
      axis,
      color,
      span,
      sizeCm,
      crossSizeCm,
      centerNorm: baseCenter.centerNorm,
      centerXNorm: baseCenter.centerXNorm,
      centerYNorm: baseCenter.centerYNorm,
      centerX,
      centerY,
      width,
      height,
    };
  }

  const width = resolveDoorTrimSpanM(span, sizeCm, fullWidth);
  const height =
    crossSizeCm != null
      ? clampDoorTrimNumber(crossSizeCm / 100, MIN_DOOR_TRIM_CROSS_SIZE_CM / 100, fullHeight)
      : DEFAULT_DOOR_TRIM_THICKNESS_M;
  const centerX = resolveDoorTrimNormalizedCenter(baseCenter.centerXNorm, rect.minX, rect.maxX, width);
  const centerY = resolveDoorTrimNormalizedCenter(baseCenter.centerYNorm, rect.minY, rect.maxY, height);
  return {
    axis,
    color,
    span,
    sizeCm,
    crossSizeCm,
    centerNorm: baseCenter.centerNorm,
    centerXNorm: baseCenter.centerXNorm,
    centerYNorm: baseCenter.centerYNorm,
    centerX,
    centerY,
    width,
    height,
  };
}

export function buildDoorTrimRectFromPlacement(placement: ResolvedDoorTrimPlacement): DoorTrimRect {
  const halfWidth = placement.width / 2;
  const halfHeight = placement.height / 2;
  return {
    minX: placement.centerX - halfWidth,
    maxX: placement.centerX + halfWidth,
    minY: placement.centerY - halfHeight,
    maxY: placement.centerY + halfHeight,
  };
}

export function buildDoorTrimCenterNormFromResolvedCenter(
  absCenter: number,
  min: number,
  max: number
): number {
  const span = Math.max(0, max - min);
  if (!(span > 0)) return DEFAULT_DOOR_TRIM_CENTER_NORM;
  return normalizeDoorTrimCenterNorm((absCenter - min) / span);
}

export function clampDoorTrimCenterWithinDoor(
  center: number,
  min: number,
  max: number,
  spanSize: number
): number {
  const total = Math.max(0, max - min);
  if (!(total > 0)) return (min + max) / 2;
  const half = Math.max(0, spanSize) / 2;
  const lo = min + Math.min(half, total / 2);
  const hi = max - Math.min(half, total / 2);
  if (!(lo <= hi)) return (min + max) / 2;
  return clampDoorTrimNumber(center, lo, hi);
}
