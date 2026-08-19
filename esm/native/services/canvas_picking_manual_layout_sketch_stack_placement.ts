import {
  buildSketchExternalDrawerBlockers,
  buildSketchInternalDrawerBlockers,
  resolveSketchVerticalStackCollisionGapM,
  resolveSketchVerticalStackPlacement,
  type VerticalOccupancyRange,
} from './canvas_picking_manual_layout_sketch_vertical_stack.js';
import {
  DEFAULT_SKETCH_EXTERNAL_DRAWER_HEIGHT_M,
  DEFAULT_SKETCH_INTERNAL_DRAWER_HEIGHT_M,
  isSketchExternalShoeDrawerItem,
  resolveSketchExternalDrawerFit,
  resolveSketchInternalDrawerFit,
} from '../features/sketch_drawer_sizing.js';
import { resolveSketchStackCenterYFromNormalizedItem } from '../features/sketch_stack_positioning.js';

type UnknownRecord = Record<string, unknown>;
export type ManualLayoutSketchCenterReader = (item: UnknownRecord, stackH: number) => number | null;

function readFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

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
    ...(args.pad !== undefined ? { pad: args.pad } : {}),
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
      ...(args.topY !== undefined ? { topY: args.topY } : {}),
      totalHeight: args.totalHeight,
      stackH,
      ...(args.pad !== undefined ? { pad: args.pad } : {}),
    });
}

export function buildManualLayoutSketchInternalDrawerBlockers(args: {
  drawers: UnknownRecord[];
  bottomY: number;
  topY: number;
  pad: number;
  woodThick?: number | null | undefined;
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
  drawerHeightM?: number | null | undefined;
  drawers: UnknownRecord[];
  readCenterY: ManualLayoutSketchCenterReader;
  woodThick?: number | null | undefined;
  blockers?: VerticalOccupancyRange[];
  gap?: number | undefined;
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
  const baseCollisionGapM = resolveSketchVerticalStackCollisionGapM(args.gap);
  const selectedCassettePaddingM =
    typeof args.woodThick === 'number' && Number.isFinite(args.woodThick) && args.woodThick > 0
      ? args.woodThick
      : args.pad;
  const sameStacks = buildManualLayoutSketchInternalDrawerBlockers({
    drawers: args.drawers,
    bottomY: args.bottomY,
    topY: args.topY,
    pad: args.pad,
    ...(args.woodThick !== undefined ? { woodThick: args.woodThick } : {}),
    readCenterY: args.readCenterY,
  }).map(stack => ({
    ...stack,
    // Existing internal blockers already include their cassette. Add only the
    // selected cassette skin so independently-added stacks can physically touch
    // without their cassette frames overlapping.
    collisionGapM: selectedCassettePaddingM,
  }));
  const blockers = (args.blockers || []).map(stack =>
    stack.kind === 'sketch_ext_drawers'
      ? {
          ...stack,
          // External blockers represent drawer fronts only. Reserve the selected
          // internal cassette skin in addition to the normal cross-stack gap.
          collisionGapM: baseCollisionGapM + selectedCassettePaddingM,
        }
      : stack
  );
  const placement = resolveSketchVerticalStackPlacement({
    desiredCenterY: args.desiredCenterY,
    selectedStackH: stackH,
    clampCenter,
    sameStacks,
    blockers,
    ...(args.gap !== undefined ? { gap: args.gap } : {}),
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
  drawerType?: 'regular' | 'shoe' | undefined;
  drawerHeightM?: number | null | undefined;
  bottomY: number;
  topY: number;
  pad: number;
  extDrawers: UnknownRecord[];
  readCenterY: ManualLayoutSketchCenterReader;
  blockers?: VerticalOccupancyRange[];
  regH?: number | undefined;
  gap?: number | undefined;
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
  const isShoeDrawer = args.drawerType === 'shoe';
  const clampCenter = (yCenter: number, stackH: number) => {
    if (isShoeDrawer) return args.bottomY + stackH / 2;
    const lo = args.bottomY + stackH / 2;
    const hi = args.topY - stackH / 2;
    if (!(hi > lo)) return Math.max(args.bottomY, Math.min(args.topY, yCenter));
    return Math.max(lo, Math.min(hi, yCenter));
  };
  const sameTypeItems = args.extDrawers.filter(item => isSketchExternalShoeDrawerItem(item) === isShoeDrawer);
  const otherTypeItems = args.extDrawers.filter(
    item => isSketchExternalShoeDrawerItem(item) !== isShoeDrawer
  );
  const placement = resolveSketchVerticalStackPlacement({
    desiredCenterY: isShoeDrawer ? args.bottomY + metrics.stackH / 2 : args.desiredCenterY,
    selectedStackH: metrics.stackH,
    clampCenter,
    sameStacks: buildManualLayoutSketchExternalDrawerBlockers({
      extDrawers: sameTypeItems,
      bottomY: args.bottomY,
      topY: args.topY,
      pad: args.pad,
      readCenterY: args.readCenterY,
    }).map(stack => ({ ...stack, collisionGapM: 0 })),
    blockers: buildManualLayoutSketchExternalDrawerBlockers({
      extDrawers: otherTypeItems,
      bottomY: args.bottomY,
      topY: args.topY,
      pad: args.pad,
      readCenterY: args.readCenterY,
    }).concat(args.blockers || []),
    ...(args.gap !== undefined ? { gap: args.gap } : {}),
    relocateOnCollision: false,
    snapToAvailableSlot: !isShoeDrawer,
  });
  const match = placement.range;
  const matchCount = readFiniteNumber(match?.count);
  const matchStackH = readFiniteNumber(match?.stackH);
  const drawerCount = placement.op === 'remove' && matchCount != null ? matchCount : metrics.drawerCount;
  const stackH = placement.op === 'remove' && matchStackH != null ? matchStackH : metrics.stackH;
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
