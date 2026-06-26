import {
  buildSketchExternalDrawerBlockers,
  buildSketchInternalDrawerBlockers,
  resolveSketchVerticalStackPlacement,
  type VerticalOccupancyRange,
} from './canvas_picking_manual_layout_sketch_vertical_stack.js';
import {
  DEFAULT_SKETCH_EXTERNAL_DRAWER_HEIGHT_M,
  DEFAULT_SKETCH_INTERNAL_DRAWER_HEIGHT_M,
  resolveSketchExternalDrawerFit,
  resolveSketchInternalDrawerFit,
} from '../features/sketch_drawer_sizing.js';
import { resolveSketchStackCenterYFromNormalizedItem } from '../features/sketch_stack_positioning.js';

type UnknownRecord = Record<string, unknown>;
export type ManualLayoutSketchCenterReader = (item: UnknownRecord, stackH: number) => number | null;

export function readManualLayoutSketchNormalizedCenterY(args: {
  item: UnknownRecord;
  bottomY: number;
  topY?: number;
  totalHeight: number;
  stackH: number;
  pad?: number;
}): number | null {
  const topY = args.topY ?? args.bottomY + args.totalHeight;
  return resolveSketchStackCenterYFromNormalizedItem({
    item: args.item,
    bottomY: args.bottomY,
    topY,
    totalHeight: args.totalHeight,
    stackH: args.stackH,
    pad: args.pad,
  });
}

export function createManualLayoutSketchNormalizedCenterReader(args: {
  bottomY: number;
  topY?: number;
  totalHeight: number;
  pad?: number;
}): ManualLayoutSketchCenterReader {
  return (item, stackH) =>
    readManualLayoutSketchNormalizedCenterY({
      item,
      bottomY: args.bottomY,
      topY: args.topY,
      totalHeight: args.totalHeight,
      stackH,
      pad: args.pad,
    });
}

export function buildManualLayoutSketchInternalDrawerBlockers(args: {
  drawers: UnknownRecord[];
  bottomY: number;
  topY: number;
  pad: number;
  woodThick?: number | null;
  readCenterY: ManualLayoutSketchCenterReader;
}): VerticalOccupancyRange[] {
  const blockerWoodThick =
    typeof args.woodThick === 'number' && Number.isFinite(args.woodThick) && args.woodThick > 0
      ? args.woodThick
      : args.pad;
  return buildSketchInternalDrawerBlockers({
    drawers: args.drawers,
    boxCenterY: (args.bottomY + args.topY) / 2,
    boxHeight: Math.max(0, args.topY - args.bottomY),
    woodThick: blockerWoodThick,
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

export function buildManualLayoutStandardInternalDrawerBlockers(_args: {
  cfgRef: UnknownRecord | null;
  bottomY: number;
  topY: number;
  totalHeight: number;
  gridDivisions?: unknown;
  localGridStep?: unknown;
  drawerSizingGridStep?: unknown;
  keyPrefix?: unknown;
  moduleIndex?: unknown;
}): VerticalOccupancyRange[] {
  return [];
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
  woodThick?: number | null;
  blockers?: VerticalOccupancyRange[];
  gap?: number;
}): {
  op: 'add' | 'remove' | 'blocked';
  removeId: string | null;
  yCenter: number;
  stackH: number;
  drawerH: number;
  drawerGap: number;
  fitsAvailable: boolean;
} {
  const fit = resolveSketchInternalDrawerFit({
    drawerHeightM: args.drawerHeightM ?? DEFAULT_SKETCH_INTERNAL_DRAWER_HEIGHT_M,
    availableHeightM: Math.max(0, args.topY - args.bottomY - args.pad * 2),
  });
  const metrics = fit.metrics;
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
      woodThick: args.woodThick,
      readCenterY: args.readCenterY,
    }),
    blockers: args.blockers,
    gap: args.gap,
    relocateOnCollision: false,
    snapToAvailableSlot: true,
  });
  return {
    op: placement.op,
    removeId: placement.removeId,
    yCenter: placement.centerY,
    stackH,
    drawerH: metrics.drawerH,
    drawerGap: metrics.drawerGap,
    fitsAvailable: fit.fits,
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
  op: 'add' | 'remove' | 'blocked';
  removeId: string | null;
  yCenter: number;
  drawerCount: number;
  drawerH: number;
  stackH: number;
  fitsAvailable: boolean;
} {
  const preferredDrawerH =
    args.drawerHeightM ??
    (typeof args.regH === 'number' && Number.isFinite(args.regH) && args.regH > 0
      ? args.regH
      : DEFAULT_SKETCH_EXTERNAL_DRAWER_HEIGHT_M);
  const fit = resolveSketchExternalDrawerFit({
    drawerCount: args.selectedDrawerCount,
    drawerHeightM: preferredDrawerH,
    availableHeightM: Math.max(0, args.topY - args.bottomY),
  });
  const metrics = fit.metrics;
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
    relocateOnCollision: false,
    snapToAvailableSlot: true,
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
    fitsAvailable: placement.op === 'remove' ? true : fit.fits,
  };
}
