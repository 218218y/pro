import {
  buildSketchExternalDrawerBlockers,
  buildSketchInternalDrawerBlockers,
  resolveSketchVerticalStackPlacement,
  type VerticalOccupancyRange,
} from './canvas_picking_manual_layout_sketch_vertical_stack.js';
import {
  DEFAULT_SKETCH_EXTERNAL_DRAWER_HEIGHT_M,
  DEFAULT_SKETCH_INTERNAL_DRAWER_HEIGHT_M,
  resolveSketchExternalDrawerMetrics,
  resolveSketchInternalDrawerMetrics,
} from '../features/sketch_drawer_sizing.js';

type UnknownRecord = Record<string, unknown>;
export type ManualLayoutSketchCenterReader = (item: UnknownRecord, stackH: number) => number | null;

function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function readNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (value == null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function readRecordValue(record: unknown, key: string): unknown {
  return isRecord(record) ? record[key] : null;
}

function readRecordNumber(record: unknown, key: string): number | null {
  return readNumber(readRecordValue(record, key));
}

export function readManualLayoutSketchNormalizedCenterY(args: {
  item: UnknownRecord;
  bottomY: number;
  totalHeight: number;
  stackH: number;
}): number | null {
  const yNormC = readRecordNumber(args.item, 'yNormC');
  const yNormBase = readRecordNumber(args.item, 'yNorm');
  if (yNormC != null) return args.bottomY + Math.max(0, Math.min(1, yNormC)) * args.totalHeight;
  if (yNormBase != null) {
    return args.bottomY + Math.max(0, Math.min(1, yNormBase)) * args.totalHeight + args.stackH / 2;
  }
  return null;
}

export function createManualLayoutSketchNormalizedCenterReader(args: {
  bottomY: number;
  totalHeight: number;
}): ManualLayoutSketchCenterReader {
  return (item, stackH) =>
    readManualLayoutSketchNormalizedCenterY({
      item,
      bottomY: args.bottomY,
      totalHeight: args.totalHeight,
      stackH,
    });
}

export function buildManualLayoutSketchInternalDrawerBlockers(args: {
  drawers: UnknownRecord[];
  bottomY: number;
  topY: number;
  pad: number;
  readCenterY: ManualLayoutSketchCenterReader;
}): VerticalOccupancyRange[] {
  return buildSketchInternalDrawerBlockers({
    drawers: args.drawers,
    boxCenterY: (args.bottomY + args.topY) / 2,
    boxHeight: Math.max(0, args.topY - args.bottomY),
    woodThick: args.pad,
    readCenterY: args.readCenterY,
  });
}

export function buildManualLayoutSketchExternalDrawerBlockers(args: {
  extDrawers: UnknownRecord[];
  bottomY: number;
  topY: number;
  pad: number;
  readCenterY: ManualLayoutSketchCenterReader;
}): VerticalOccupancyRange[] {
  return buildSketchExternalDrawerBlockers({
    extDrawers: args.extDrawers,
    boxCenterY: (args.bottomY + args.topY) / 2,
    boxHeight: Math.max(0, args.topY - args.bottomY),
    woodThick: args.pad,
    readCenterY: args.readCenterY,
  });
}

export function resolveManualLayoutSketchInternalDrawerPlacement(args: {
  desiredCenterY: number;
  bottomY: number;
  topY: number;
  totalHeight: number;
  pad: number;
  drawerHeightM?: number | null;
  drawers: UnknownRecord[];
  readCenterY: ManualLayoutSketchCenterReader;
  blockers?: VerticalOccupancyRange[];
  gap?: number;
}): {
  op: 'add' | 'remove';
  removeId: string | null;
  yCenter: number;
  stackH: number;
  drawerH: number;
  drawerGap: number;
} {
  const metrics = resolveSketchInternalDrawerMetrics({
    drawerHeightM: args.drawerHeightM ?? DEFAULT_SKETCH_INTERNAL_DRAWER_HEIGHT_M,
    availableHeightM: Math.max(0, args.topY - args.bottomY - args.pad * 2),
  });
  const stackH = metrics.stackH;
  const clampCenter = (centerY: number, selectedStackH: number) => {
    const lo = args.bottomY + args.pad + selectedStackH / 2;
    const hi = args.topY - args.pad - selectedStackH / 2;
    if (!(hi > lo)) return Math.max(args.bottomY + args.pad, Math.min(args.topY - args.pad, centerY));
    return Math.max(lo, Math.min(hi, centerY));
  };
  const placement = resolveSketchVerticalStackPlacement({
    desiredCenterY: args.desiredCenterY,
    selectedStackH: stackH,
    clampCenter,
    sameStacks: buildManualLayoutSketchInternalDrawerBlockers({
      drawers: args.drawers,
      bottomY: args.bottomY,
      topY: args.topY,
      pad: args.pad,
      readCenterY: args.readCenterY,
    }),
    blockers: args.blockers,
    gap: args.gap,
  });
  return {
    op: placement.op,
    removeId: placement.removeId,
    yCenter: placement.centerY,
    stackH,
    drawerH: metrics.drawerH,
    drawerGap: metrics.drawerGap,
  };
}

export function resolveManualLayoutSketchExternalDrawerPlacement(args: {
  desiredCenterY: number;
  selectedDrawerCount: number;
  drawerHeightM?: number | null;
  bottomY: number;
  topY: number;
  pad: number;
  extDrawers: UnknownRecord[];
  readCenterY: ManualLayoutSketchCenterReader;
  blockers?: VerticalOccupancyRange[];
  regH?: number;
  gap?: number;
}): {
  op: 'add' | 'remove';
  removeId: string | null;
  yCenter: number;
  drawerCount: number;
  drawerH: number;
  stackH: number;
} {
  const preferredDrawerH =
    args.drawerHeightM ??
    (typeof args.regH === 'number' && Number.isFinite(args.regH) && args.regH > 0
      ? args.regH
      : DEFAULT_SKETCH_EXTERNAL_DRAWER_HEIGHT_M);
  const metrics = resolveSketchExternalDrawerMetrics({
    drawerCount: args.selectedDrawerCount,
    drawerHeightM: preferredDrawerH,
    availableHeightM: Math.max(0, args.topY - args.bottomY),
  });
  const clampCenter = (yCenter: number, stackH: number) => {
    const lo = args.bottomY + stackH / 2;
    const hi = args.topY - stackH / 2;
    if (!(hi > lo)) return Math.max(args.bottomY, Math.min(args.topY, yCenter));
    return Math.max(lo, Math.min(hi, yCenter));
  };
  const placement = resolveSketchVerticalStackPlacement({
    desiredCenterY: args.desiredCenterY,
    selectedStackH: metrics.stackH,
    clampCenter,
    sameStacks: buildManualLayoutSketchExternalDrawerBlockers({
      extDrawers: args.extDrawers,
      bottomY: args.bottomY,
      topY: args.topY,
      pad: args.pad,
      readCenterY: args.readCenterY,
    }),
    blockers: args.blockers,
    gap: args.gap,
  });
  const match = placement.range;
  const drawerCount =
    placement.op === 'remove' && match?.count != null ? Number(match.count) : metrics.drawerCount;
  const stackH = placement.op === 'remove' && match?.stackH != null ? Number(match.stackH) : metrics.stackH;
  const drawerH = drawerCount > 0 ? stackH / drawerCount : metrics.drawerH;
  return {
    op: placement.op,
    removeId: placement.removeId,
    yCenter: placement.centerY,
    drawerCount,
    drawerH,
    stackH,
  };
}
