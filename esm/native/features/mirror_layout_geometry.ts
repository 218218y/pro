import type { MirrorLayoutEntry } from '../../../types';

import {
  buildCenterNorm,
  CENTER_EPSILON,
  clamp,
  DEFAULT_CENTER_NORM,
  DEFAULT_FACE_SIGN,
  FULL_MIRROR_INSET_M,
  MAX_REMOVE_TOLERANCE_M,
  MIN_MIRROR_SIZE_M,
  MIRROR_CENTER_SNAP_NORM_THRESHOLD,
  normalizeCenterNorm,
  normalizeMirrorFaceSign,
  normalizePositiveCm,
  readFinite,
  readMirrorLayoutEntry,
  readMirrorLayoutFaceSign,
  readMirrorLayoutList,
  DEFAULT_REMOVE_TOLERANCE_M,
  type MirrorDraftInput,
} from './mirror_layout_contracts.js';

export type MirrorRect = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

export type ResolvedMirrorPlacement = {
  mirrorWidthM: number;
  mirrorHeightM: number;
  centerX: number;
  centerY: number;
  offsetX: number;
  offsetY: number;
  centerXNorm: number;
  centerYNorm: number;
  faceSign: number;
};

export type SnappedMirrorCenter = {
  centerXNorm: number;
  centerYNorm: number;
  snappedX: boolean;
  snappedY: boolean;
  isCentered: boolean;
};

export type PreparedMirrorRect = {
  rect: MirrorRect;
  width: number;
  height: number;
};

function normalizeRect(rect: MirrorRect): MirrorRect {
  const minX = Math.min(rect.minX, rect.maxX);
  const maxX = Math.max(rect.minX, rect.maxX);
  const minY = Math.min(rect.minY, rect.maxY);
  const maxY = Math.max(rect.minY, rect.maxY);
  return { minX, maxX, minY, maxY };
}

function rectWidth(rect: MirrorRect): number {
  return Math.max(0, rect.maxX - rect.minX);
}

function rectHeight(rect: MirrorRect): number {
  return Math.max(0, rect.maxY - rect.minY);
}

export function prepareMirrorRect(rect: MirrorRect): PreparedMirrorRect {
  const normalized = normalizeRect(rect);
  return {
    rect: normalized,
    width: rectWidth(normalized),
    height: rectHeight(normalized),
  };
}

function maxMirrorSizeForSpan(span: number): number {
  if (!(span > 0)) return MIN_MIRROR_SIZE_M;
  return Math.max(MIN_MIRROR_SIZE_M, span - FULL_MIRROR_INSET_M);
}

function clampMirrorSizeM(requestedCm: number | null, span: number): number {
  const maxSize = maxMirrorSizeForSpan(span);
  if (requestedCm == null) return maxSize;
  return clamp(requestedCm / 100, MIN_MIRROR_SIZE_M, maxSize);
}

export function buildSnappedMirrorCenterFromPreparedRect(args: {
  preparedRect: PreparedMirrorRect;
  hitX: number;
  hitY: number;
  thresholdNorm?: unknown;
}): SnappedMirrorCenter {
  const { rect, width, height } = args.preparedRect;
  const rawCenterXNorm = buildCenterNorm(args.hitX, rect.minX, width);
  const rawCenterYNorm = buildCenterNorm(args.hitY, rect.minY, height);
  const thresholdValue = readFinite(args.thresholdNorm);
  const thresholdNorm =
    thresholdValue != null && thresholdValue >= 0 ? thresholdValue : MIRROR_CENTER_SNAP_NORM_THRESHOLD;
  const snappedX = Math.abs(rawCenterXNorm - DEFAULT_CENTER_NORM) <= thresholdNorm;
  const snappedY = Math.abs(rawCenterYNorm - DEFAULT_CENTER_NORM) <= thresholdNorm;
  const centerXNorm = snappedX ? DEFAULT_CENTER_NORM : rawCenterXNorm;
  const centerYNorm = snappedY ? DEFAULT_CENTER_NORM : rawCenterYNorm;
  return {
    centerXNorm,
    centerYNorm,
    snappedX,
    snappedY,
    isCentered: snappedX && snappedY,
  };
}

export function buildSnappedMirrorCenterFromHit(args: {
  rect: MirrorRect;
  hitX: number;
  hitY: number;
  thresholdNorm?: unknown;
}): SnappedMirrorCenter {
  return buildSnappedMirrorCenterFromPreparedRect({
    preparedRect: prepareMirrorRect(args.rect),
    hitX: args.hitX,
    hitY: args.hitY,
    thresholdNorm: args.thresholdNorm,
  });
}

export function resolveMirrorPlacementFromPreparedRect(args: {
  preparedRect: PreparedMirrorRect;
  layout?: unknown;
}): ResolvedMirrorPlacement {
  const { rect, width, height } = args.preparedRect;
  const layout = readMirrorLayoutEntry(args.layout);
  const mirrorWidthM = clampMirrorSizeM(layout?.widthCm ?? null, width);
  const mirrorHeightM = clampMirrorSizeM(layout?.heightCm ?? null, height);

  const halfW = mirrorWidthM / 2;
  const halfH = mirrorHeightM / 2;
  const minCenterX = rect.minX + halfW;
  const maxCenterX = rect.maxX - halfW;
  const minCenterY = rect.minY + halfH;
  const maxCenterY = rect.maxY - halfH;

  const rawCenterX = rect.minX + normalizeCenterNorm(layout?.centerXNorm) * width;
  const rawCenterY = rect.minY + normalizeCenterNorm(layout?.centerYNorm) * height;
  const centerX = clamp(rawCenterX, minCenterX, maxCenterX);
  const centerY = clamp(rawCenterY, minCenterY, maxCenterY);
  const offsetX = centerX - (rect.minX + width / 2);
  const offsetY = centerY - (rect.minY + height / 2);

  return {
    mirrorWidthM,
    mirrorHeightM,
    centerX,
    centerY,
    offsetX,
    offsetY,
    centerXNorm: buildCenterNorm(centerX, rect.minX, width),
    centerYNorm: buildCenterNorm(centerY, rect.minY, height),
    faceSign: readMirrorLayoutFaceSign(args.layout, DEFAULT_FACE_SIGN),
  };
}

export function resolveMirrorPlacementInRect(args: {
  rect: MirrorRect;
  layout?: unknown;
}): ResolvedMirrorPlacement {
  return resolveMirrorPlacementFromPreparedRect({
    preparedRect: prepareMirrorRect(args.rect),
    layout: args.layout,
  });
}

export function resolveMirrorPlacementListInRect(args: {
  rect: MirrorRect;
  layouts?: unknown;
}): ResolvedMirrorPlacement[] {
  const preparedRect = prepareMirrorRect(args.rect);
  const layouts = readMirrorLayoutList(args.layouts);
  if (!layouts.length) return [resolveMirrorPlacementFromPreparedRect({ preparedRect, layout: null })];
  const out: ResolvedMirrorPlacement[] = new Array(layouts.length);
  for (let i = 0; i < layouts.length; i += 1) {
    out[i] = resolveMirrorPlacementFromPreparedRect({ preparedRect, layout: layouts[i] });
  }
  return out;
}

export function placementRect(placement: ResolvedMirrorPlacement): MirrorRect {
  const halfW = placement.mirrorWidthM / 2;
  const halfH = placement.mirrorHeightM / 2;
  return {
    minX: placement.centerX - halfW,
    maxX: placement.centerX + halfW,
    minY: placement.centerY - halfH,
    maxY: placement.centerY + halfH,
  };
}

export function distanceFromPointToRect(hitX: number, hitY: number, rect: MirrorRect): number {
  const dx = hitX < rect.minX ? rect.minX - hitX : hitX > rect.maxX ? hitX - rect.maxX : 0;
  const dy = hitY < rect.minY ? rect.minY - hitY : hitY > rect.maxY ? hitY - rect.maxY : 0;
  return Math.sqrt(dx * dx + dy * dy);
}

export function resolveRemoveToleranceM(
  placement: ResolvedMirrorPlacement,
  requested: number | null
): number {
  if (typeof requested === 'number' && Number.isFinite(requested) && requested >= 0) return requested;
  const sizeDriven = Math.min(placement.mirrorWidthM, placement.mirrorHeightM) * 0.18;
  return Math.max(DEFAULT_REMOVE_TOLERANCE_M, Math.min(MAX_REMOVE_TOLERANCE_M, sizeDriven));
}

export function buildMirrorLayoutFromHit(args: {
  rect: MirrorRect;
  hitX: number;
  hitY: number;
  draft?: MirrorDraftInput | null;
  faceSign?: unknown;
}): MirrorLayoutEntry | null {
  const preparedRect = prepareMirrorRect(args.rect);
  const widthCm = normalizePositiveCm(args.draft?.widthCm);
  const heightCm = normalizePositiveCm(args.draft?.heightCm);
  const center = buildSnappedMirrorCenterFromPreparedRect({
    preparedRect,
    hitX: args.hitX,
    hitY: args.hitY,
  });
  const placement = resolveMirrorPlacementFromPreparedRect({
    preparedRect,
    layout: {
      widthCm,
      heightCm,
      centerXNorm: center.centerXNorm,
      centerYNorm: center.centerYNorm,
      faceSign: normalizeMirrorFaceSign(args.faceSign, DEFAULT_FACE_SIGN),
    },
  });

  const out: MirrorLayoutEntry = {};
  if (widthCm != null) out.widthCm = widthCm;
  if (heightCm != null) out.heightCm = heightCm;
  if (Math.abs(placement.centerXNorm - DEFAULT_CENTER_NORM) > CENTER_EPSILON) {
    out.centerXNorm = placement.centerXNorm;
  }
  if (Math.abs(placement.centerYNorm - DEFAULT_CENTER_NORM) > CENTER_EPSILON) {
    out.centerYNorm = placement.centerYNorm;
  }
  if (placement.faceSign !== DEFAULT_FACE_SIGN) out.faceSign = placement.faceSign;
  return Object.keys(out).length ? out : null;
}
