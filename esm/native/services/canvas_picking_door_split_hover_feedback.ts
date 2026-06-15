import type { AppContainer, UnknownRecord } from '../../../types';
import { DOOR_SYSTEM_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import {
  buildRectClearanceMeasurementEntries,
  markCenteredRectClearanceMeasurements,
  resolveCellMeasurementLabelOutsets,
} from './canvas_picking_hover_clearance_measurements.js';
import type {
  GetCanvasPickingRuntimeFn,
  ReadSplitHoverDoorBoundsFn,
  ReadSplitPosListFn,
  TransformNodeLike,
} from './canvas_picking_door_hover_targets_contracts.js';

export type CanvasDoorCustomSplitHoverFeedbackArgs = {
  App: AppContainer;
  setSketchPreview?: ((args: UnknownRecord) => unknown) | null;
  anchor: unknown;
  anchorParent: unknown;
  bounds: { minY: number; maxY: number };
  doorBaseKey: string;
  yAbs: number;
  localY: number;
  localMinY: number;
  localMaxY: number;
  anchorX: number;
  width: number;
  z: number;
  zSign: number;
  isRemove: boolean;
  isBlocked: boolean;
  readSplitPosList: ReadSplitPosListFn;
  readSplitHoverDoorBounds: ReadSplitHoverDoorBoundsFn;
  getCanvasPickingRuntime: GetCanvasPickingRuntimeFn;
};

function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === 'object' ? (value as UnknownRecord) : null;
}

function readFinite(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function clamp01(value: unknown): number | null {
  const n = readFinite(value);
  if (n == null) return null;
  return Math.max(0, Math.min(1, n));
}

function readBounds(value: unknown): { minY: number; maxY: number } | null {
  const rec = asRecord(value);
  const minY = readFinite(rec?.minY);
  const maxY = readFinite(rec?.maxY);
  if (minY == null || maxY == null || !(maxY > minY)) return null;
  return { minY, maxY };
}

function resolveCustomSplitAlignmentTolerance(bounds: { minY: number; maxY: number }): number {
  const height = Math.max(0, Number(bounds.maxY) - Number(bounds.minY));
  const splitDims = DOOR_SYSTEM_DIMENSIONS.hinged.split;
  return Math.max(
    splitDims.duplicateCutToleranceMinM,
    Math.min(splitDims.duplicateCutToleranceMaxM, height * splitDims.duplicateCutToleranceHeightRatio)
  );
}

function readSplitBoundsFromRuntimeMap(args: {
  App: AppContainer;
  key: string;
  runtimeBoundsMap: UnknownRecord;
  readSplitHoverDoorBounds: ReadSplitHoverDoorBoundsFn;
}): { minY: number; maxY: number } | null {
  const direct = args.readSplitHoverDoorBounds(args.App, args.key);
  if (direct) return direct;
  return readBounds(args.runtimeBoundsMap[args.key]);
}

export function hasCanvasDoorCustomSplitHeightAlignment(args: {
  App: AppContainer;
  currentDoorBaseKey: string;
  currentYAbs: number;
  currentBounds: { minY: number; maxY: number };
  readSplitPosList: ReadSplitPosListFn;
  readSplitHoverDoorBounds: ReadSplitHoverDoorBoundsFn;
  getCanvasPickingRuntime: GetCanvasPickingRuntimeFn;
}): boolean {
  const currentKey = String(args.currentDoorBaseKey || '');
  const yAbs = Number(args.currentYAbs);
  if (!currentKey || !Number.isFinite(yAbs)) return false;

  const runtime = asRecord(args.getCanvasPickingRuntime(args.App));
  const boundsMap = asRecord(runtime?.__splitHoverDoorBoundsByBase);
  if (!boundsMap) return false;

  const tolerance = resolveCustomSplitAlignmentTolerance(args.currentBounds);
  for (const rawKey of Object.keys(boundsMap)) {
    const key = String(rawKey || '');
    if (!key || key === currentKey) continue;

    const otherBounds = readSplitBoundsFromRuntimeMap({
      App: args.App,
      key,
      runtimeBoundsMap: boundsMap,
      readSplitHoverDoorBounds: args.readSplitHoverDoorBounds,
    });
    if (!otherBounds) continue;

    const otherHeight = Number(otherBounds.maxY) - Number(otherBounds.minY);
    if (!(otherHeight > 0)) continue;

    const cuts = args.readSplitPosList(args.App, key);
    for (let i = 0; i < cuts.length; i += 1) {
      const n = clamp01(cuts[i]);
      if (n == null) continue;
      const otherYAbs = Number(otherBounds.minY) + n * otherHeight;
      if (Math.abs(otherYAbs - yAbs) <= tolerance) return true;
    }
  }
  return false;
}

export function setCanvasDoorCustomSplitHoverMeasurements(
  args: CanvasDoorCustomSplitHoverFeedbackArgs
): unknown {
  const setSketchPreview = args.setSketchPreview;
  if (!setSketchPreview) return null;

  const doorHeightLocal = Number(args.localMaxY) - Number(args.localMinY);
  const width = Math.max(0.0001, Number(args.width));
  if (!(doorHeightLocal > 0) || !(width > 0)) return null;

  const isAligned =
    !args.isRemove &&
    !args.isBlocked &&
    hasCanvasDoorCustomSplitHeightAlignment({
      App: args.App,
      currentDoorBaseKey: args.doorBaseKey,
      currentYAbs: args.yAbs,
      currentBounds: args.bounds,
      readSplitPosList: args.readSplitPosList,
      readSplitHoverDoorBounds: args.readSplitHoverDoorBounds,
      getCanvasPickingRuntime: args.getCanvasPickingRuntime,
    });

  const textScale = 0.9;
  const { verticalLabelOutset } = resolveCellMeasurementLabelOutsets(textScale);
  const lineHeight = Math.max(0.0001, Math.min(0.001, doorHeightLocal * 0.0005));
  const clearanceMeasurements = markCenteredRectClearanceMeasurements(
    buildRectClearanceMeasurementEntries({
      containerMinX: Number(args.anchorX) - width / 2,
      containerMaxX: Number(args.anchorX) + width / 2,
      containerMinY: Number(args.localMinY),
      containerMaxY: Number(args.localMaxY),
      targetCenterX: Number(args.anchorX),
      targetCenterY: Number(args.localY),
      targetWidth: width,
      targetHeight: lineHeight,
      z: Number(args.z) + (args.zSign < 0 ? -0.0025 : 0.0025),
      showTop: true,
      showBottom: true,
      showLeft: false,
      showRight: false,
      minVerticalCm: 0.5,
      verticalLabelOutset,
      styleKey: 'cell',
      textScale,
      faceSign: args.zSign < 0 ? -1 : 1,
      viewFaceSign: args.zSign < 0 ? -1 : 1,
      labelFaceSign: args.zSign < 0 ? -1 : 1,
    }),
    { centerY: isAligned }
  );

  const previewArgs: UnknownRecord = {
    App: args.App,
    anchor: args.anchor as TransformNodeLike,
    anchorParent: args.anchorParent as TransformNodeLike,
    kind: 'rod',
    x: Number(args.anchorX),
    y: Number(args.localY),
    z: Number(args.z),
    w: width,
    h: lineHeight,
    d: 0.004,
    woodThick: 0.004,
    op: args.isRemove ? 'remove' : args.isBlocked ? 'blocked' : 'add',
    showPrimaryBody: false,
    showCenterXGuide: false,
    showCenterYGuide: isAligned,
    guideWidth: width,
    guideHeight: Math.max(0.0001, doorHeightLocal),
    guideHorizontalX: Number(args.anchorX),
    guideHorizontalY: Number(args.localY),
    clearanceMeasurements,
    __customSplitHeightAligned: isAligned,
  };

  return setSketchPreview(previewArgs);
}
