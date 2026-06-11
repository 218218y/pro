import { SKETCH_BOX_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import {
  buildStackAwareHorizontalClearanceMeasurementEntries,
  buildStackAwareVerticalClearanceMeasurementEntries,
  type HorizontalClearanceNeighborRange,
  type VerticalClearanceNeighborRange,
  type HoverClearanceMeasurementEntry,
} from './canvas_picking_hover_clearance_measurements.js';
import type {
  SketchBoxDividerState,
  SketchBoxHorizontalDividerState,
} from './canvas_picking_sketch_box_dividers.js';

function readFiniteNumber(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function buildDividerNeighborRanges(args: {
  dividers: SketchBoxDividerState[];
  boxCenterX: number;
  innerW: number;
  woodThick: number;
  resolveSketchBoxDividerPlacement: (args: {
    boxCenterX: number;
    innerW: number;
    woodThick: number;
    dividerXNorm: number | null;
    enableCenterSnap?: boolean;
  }) => { centerX: number };
}): HorizontalClearanceNeighborRange[] {
  const ranges: HorizontalClearanceNeighborRange[] = [];
  const woodThick = Math.max(0.0001, readFiniteNumber(args.woodThick) ?? 0.018);
  const dividers = Array.isArray(args.dividers) ? args.dividers : [];
  for (const divider of dividers) {
    const xNorm = readFiniteNumber(divider?.xNorm);
    if (xNorm == null) continue;
    const placement = args.resolveSketchBoxDividerPlacement({
      boxCenterX: args.boxCenterX,
      innerW: args.innerW,
      woodThick,
      dividerXNorm: xNorm,
      enableCenterSnap: true,
    });
    const centerX = readFiniteNumber(placement?.centerX);
    if (centerX == null) continue;
    ranges.push({
      minX: centerX - woodThick / 2,
      maxX: centerX + woodThick / 2,
      kind: 'divider',
    });
  }
  return ranges;
}

export function buildSketchBoxDividerMeasurementEntries(args: {
  dividers: SketchBoxDividerState[];
  boxCenterX: number;
  innerW: number;
  woodThick: number;
  dividerCenterX: number;
  dividerCenterY: number;
  dividerHeight: number;
  dividerCenterZ: number;
  dividerDepth: number;
  resolveSketchBoxDividerPlacement: (args: {
    boxCenterX: number;
    innerW: number;
    woodThick: number;
    dividerXNorm: number | null;
    enableCenterSnap?: boolean;
  }) => { centerX: number };
}): HoverClearanceMeasurementEntry[] {
  const innerW = Math.max(0.0001, readFiniteNumber(args.innerW) ?? 0);
  const dividerCenterX = readFiniteNumber(args.dividerCenterX);
  const dividerCenterY = readFiniteNumber(args.dividerCenterY);
  const dividerHeight = Math.max(0.0001, readFiniteNumber(args.dividerHeight) ?? 0);
  const dividerCenterZ = readFiniteNumber(args.dividerCenterZ);
  const dividerDepth = Math.max(0.0001, readFiniteNumber(args.dividerDepth) ?? 0);
  const woodThick = Math.max(0.0001, readFiniteNumber(args.woodThick) ?? 0.018);
  if (dividerCenterX == null || dividerCenterY == null || dividerCenterZ == null) return [];

  const previewDims = SKETCH_BOX_DIMENSIONS.preview;
  const z =
    dividerCenterZ +
    dividerDepth / 2 +
    Math.max(previewDims.measurementZOffsetMinM, dividerDepth * previewDims.measurementZOffsetDepthRatio);
  const dividerTopY = dividerCenterY + dividerHeight / 2;
  const dividerBottomY = dividerCenterY - dividerHeight / 2;
  const overallOutset = Math.max(0.09, Math.min(0.18, dividerHeight * 0.12));
  const neighborOutset = Math.max(0.045, Math.min(0.11, dividerHeight * 0.07));
  const overallLabelOutsetX = Math.max(0.035, Math.min(0.085, innerW * 0.075));
  const neighborLabelOutsetX = Math.max(0.025, Math.min(0.065, innerW * 0.055));

  return buildStackAwareHorizontalClearanceMeasurementEntries({
    containerMinX: args.boxCenterX - innerW / 2,
    containerMaxX: args.boxCenterX + innerW / 2,
    targetCenterX: dividerCenterX,
    targetCenterY: dividerCenterY,
    targetWidth: woodThick,
    targetHeight: dividerHeight,
    neighbors: buildDividerNeighborRanges({
      dividers: args.dividers,
      boxCenterX: args.boxCenterX,
      innerW,
      woodThick,
      resolveSketchBoxDividerPlacement: args.resolveSketchBoxDividerPlacement,
    }),
    z,
    styleKey: 'cell',
    textScale: previewDims.measurementTextScale,
    faceSign: 1,
    viewFaceSign: 1,
    labelFaceSign: 1,
    overallLineY: dividerTopY + overallOutset,
    neighborLineY: dividerBottomY - neighborOutset,
    overallLabelOutsetX,
    neighborLabelOutsetX,
  });
}

function buildHorizontalDividerNeighborRanges(args: {
  dividers: SketchBoxHorizontalDividerState[];
  boxCenterY: number;
  innerH: number;
  woodThick: number;
  resolveSketchBoxHorizontalDividerPlacement: (args: {
    boxCenterY: number;
    innerH: number;
    woodThick: number;
    dividerYNorm: number | null;
    enableCenterSnap?: boolean;
  }) => { centerY: number };
}): VerticalClearanceNeighborRange[] {
  const ranges: VerticalClearanceNeighborRange[] = [];
  const woodThick = Math.max(0.0001, readFiniteNumber(args.woodThick) ?? 0.018);
  for (const divider of Array.isArray(args.dividers) ? args.dividers : []) {
    const yNorm = readFiniteNumber(divider?.yNorm);
    if (yNorm == null) continue;
    const placement = args.resolveSketchBoxHorizontalDividerPlacement({
      boxCenterY: args.boxCenterY,
      innerH: args.innerH,
      woodThick,
      dividerYNorm: yNorm,
      enableCenterSnap: true,
    });
    const centerY = readFiniteNumber(placement?.centerY);
    if (centerY == null) continue;
    ranges.push({ minY: centerY - woodThick / 2, maxY: centerY + woodThick / 2, kind: 'shelf' });
  }
  return ranges;
}

export function buildSketchBoxHorizontalDividerMeasurementEntries(args: {
  dividers: SketchBoxHorizontalDividerState[];
  boxCenterY: number;
  innerH: number;
  woodThick: number;
  dividerCenterX: number;
  dividerWidth: number;
  dividerCenterY: number;
  dividerCenterZ: number;
  dividerDepth: number;
  resolveSketchBoxHorizontalDividerPlacement: (args: {
    boxCenterY: number;
    innerH: number;
    woodThick: number;
    dividerYNorm: number | null;
    enableCenterSnap?: boolean;
  }) => { centerY: number };
}): HoverClearanceMeasurementEntry[] {
  const innerH = Math.max(0.0001, readFiniteNumber(args.innerH) ?? 0);
  const dividerCenterX = readFiniteNumber(args.dividerCenterX);
  const dividerWidth = Math.max(0.0001, readFiniteNumber(args.dividerWidth) ?? 0);
  const dividerCenterY = readFiniteNumber(args.dividerCenterY);
  const dividerCenterZ = readFiniteNumber(args.dividerCenterZ);
  const dividerDepth = Math.max(0.0001, readFiniteNumber(args.dividerDepth) ?? 0);
  const woodThick = Math.max(0.0001, readFiniteNumber(args.woodThick) ?? 0.018);
  if (dividerCenterX == null || dividerCenterY == null || dividerCenterZ == null) return [];
  const previewDims = SKETCH_BOX_DIMENSIONS.preview;
  const z =
    dividerCenterZ +
    dividerDepth / 2 +
    Math.max(previewDims.measurementZOffsetMinM, dividerDepth * previewDims.measurementZOffsetDepthRatio);
  return buildStackAwareVerticalClearanceMeasurementEntries({
    containerMinY: args.boxCenterY - innerH / 2,
    containerMaxY: args.boxCenterY + innerH / 2,
    targetCenterX: dividerCenterX,
    targetCenterY: dividerCenterY,
    targetWidth: dividerWidth,
    targetHeight: woodThick,
    neighbors: buildHorizontalDividerNeighborRanges({
      dividers: args.dividers,
      boxCenterY: args.boxCenterY,
      innerH,
      woodThick,
      resolveSketchBoxHorizontalDividerPlacement: args.resolveSketchBoxHorizontalDividerPlacement,
    }),
    z,
    styleKey: 'cell',
    textScale: previewDims.measurementTextScale,
    faceSign: 1,
    viewFaceSign: 1,
    labelFaceSign: 1,
  });
}
