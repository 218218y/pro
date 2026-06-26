import {
  buildManualLayoutSketchExternalDrawerBlockers,
  createManualLayoutSketchNormalizedCenterReader,
  resolveManualLayoutSketchInternalDrawerPlacement,
} from './canvas_picking_manual_layout_sketch_stack_placement.js';
import {
  buildManualLayoutVerticalContentBlockers,
  type ManualLayoutVerticalContentBlocker,
} from './canvas_picking_manual_layout_vertical_blockers.js';
import { buildSketchModuleBoxVerticalBlockers } from './canvas_picking_sketch_module_box_blockers.js';
import { removeManualLayoutBaseShelf } from './canvas_picking_manual_layout_config_ops_shelf.js';
import { createManualLayoutSketchStackHoverRecord } from './canvas_picking_manual_layout_sketch_hover_state.js';
import type {
  CommitSketchModuleInternalDrawerArgs,
  RecordMap,
} from './canvas_picking_sketch_module_stack_commit_contracts.js';
import {
  buildNormalizedStackPosition,
  removeStackItemById,
} from './canvas_picking_sketch_module_stack_commit_mutation.js';
import { resolveInternalDrawerHoverIntent } from './canvas_picking_sketch_module_stack_commit_hover.js';
import { INTERIOR_FITTINGS_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import { resolveSketchInternalDrawerMetrics } from '../features/sketch_drawer_sizing.js';
import { markSketchInternalDrawersDirty } from '../features/sketch_drawer_sizing.js';
import {
  resolveSketchInternalDrawerCassetteRange,
  verticalRangesTouchOrOverlap,
} from '../features/sketch_internal_drawer_cassette.js';
import {
  createRandomId,
  ensureRecord,
  ensureRecordList,
} from './canvas_picking_sketch_module_stack_commit_shared.js';

function readGridDivisions(cfg: RecordMap): number {
  const raw = cfg.gridDivisions;
  const value = typeof raw === 'number' ? raw : raw != null ? Number(raw) : NaN;
  return Number.isFinite(value) && value > 1
    ? Math.floor(value)
    : INTERIOR_FITTINGS_DIMENSIONS.storage.gridDivisionsDefault;
}

function removeSketchShelfByBlocker(args: {
  extra: RecordMap;
  shelves: RecordMap[];
  blocker: ManualLayoutVerticalContentBlocker;
}): boolean {
  const mutableShelves = ensureRecordList(args.extra, 'shelves');
  const id = args.blocker.id != null ? String(args.blocker.id) : '';
  if (id && !id.startsWith('sketch_shelf_')) {
    const byId = mutableShelves.findIndex(shelf => shelf && shelf.id != null && String(shelf.id) === id);
    if (byId >= 0) {
      mutableShelves.splice(byId, 1);
      return true;
    }
  }
  const index =
    typeof args.blocker.index === 'number' && Number.isFinite(args.blocker.index)
      ? Math.round(args.blocker.index)
      : -1;
  if (index >= 0 && index < mutableShelves.length) {
    mutableShelves.splice(index, 1);
    return true;
  }
  return false;
}

function removeShelvesTouchingInternalDrawerCassette(args: {
  cfg: RecordMap;
  extra: RecordMap;
  shelves: RecordMap[];
  verticalContentBlockers: ManualLayoutVerticalContentBlocker[];
  baseY: number;
  stackH: number;
  bottomY: number;
  topY: number;
  woodThick?: unknown;
}): void {
  const cassette = resolveSketchInternalDrawerCassetteRange({
    baseY: args.baseY,
    stackH: args.stackH,
    woodThick: args.woodThick,
  });
  const shelfBlockers = args.verticalContentBlockers.filter(blocker => blocker.kind === 'shelf');
  if (!shelfBlockers.length) return;

  const baseShelfIndexes = new Set<number>();
  const sketchShelfBlockers: ManualLayoutVerticalContentBlocker[] = [];
  for (const blocker of shelfBlockers) {
    if (
      !verticalRangesTouchOrOverlap({
        minY: cassette.minY,
        maxY: cassette.maxY,
        otherMinY: blocker.minY,
        otherMaxY: blocker.maxY,
      })
    ) {
      continue;
    }
    if (blocker.source === 'base') {
      const index =
        typeof blocker.index === 'number' && Number.isFinite(blocker.index) ? Math.round(blocker.index) : NaN;
      if (Number.isFinite(index) && index > 0) baseShelfIndexes.add(index);
    } else if (blocker.source === 'sketch') {
      sketchShelfBlockers.push(blocker);
    }
  }

  if (baseShelfIndexes.size) {
    const divs = readGridDivisions(args.cfg);
    for (const shelfIndex of Array.from(baseShelfIndexes).sort((a, b) => a - b)) {
      removeManualLayoutBaseShelf(args.cfg, {
        divs,
        shelfIndex,
        topY: args.topY,
        bottomY: args.bottomY,
      });
    }
  }

  if (sketchShelfBlockers.length) {
    sketchShelfBlockers
      .slice()
      .sort((a, b) => (Number(b.index) || 0) - (Number(a.index) || 0))
      .forEach(blocker => {
        removeSketchShelfByBlocker({ extra: args.extra, shelves: args.shelves, blocker });
      });
  }
}

export function commitSketchModuleInternalDrawers(
  args: CommitSketchModuleInternalDrawerArgs
): RecordMap | null {
  const existingExtra =
    args.cfg.sketchExtras &&
    typeof args.cfg.sketchExtras === 'object' &&
    !Array.isArray(args.cfg.sketchExtras)
      ? (args.cfg.sketchExtras as RecordMap)
      : null;
  const list = Array.isArray(existingExtra?.drawers) ? (existingExtra.drawers as RecordMap[]) : [];
  const externalDrawers = Array.isArray(existingExtra?.extDrawers)
    ? (existingExtra.extDrawers as RecordMap[])
    : [];
  const shelves = Array.isArray(existingExtra?.shelves) ? (existingExtra.shelves as RecordMap[]) : [];
  const storageBarriers = Array.isArray(existingExtra?.storageBarriers)
    ? (existingExtra.storageBarriers as RecordMap[])
    : [];
  const boxes = Array.isArray(existingExtra?.boxes) ? (existingExtra.boxes as RecordMap[]) : [];

  const stackMetrics = resolveSketchInternalDrawerMetrics({
    drawerHeightM: args.drawerHeightM,
    availableHeightM: Math.max(0, args.topY - args.bottomY - args.pad * 2),
  });
  const stackH = stackMetrics.stackH;

  const readNormalizedCenterY = createManualLayoutSketchNormalizedCenterReader({
    bottomY: args.bottomY,
    totalHeight: args.totalHeight,
  });

  const hover = resolveInternalDrawerHoverIntent({
    hoverOk: args.hoverOk,
    hoverRec: args.hoverRec,
    hitYClamped: args.hitYClamped,
    clampCenter: yCenter => yCenter,
  });

  if (hover.hoverOp === 'remove') {
    removeStackItemById(list, hover.hoverRemoveId);
    markSketchInternalDrawersDirty(args.cfg);
    return createManualLayoutSketchStackHoverRecord({
      host: args.hoverHost,
      kind: 'drawers',
      op: 'add',
      yCenter: hover.yCenterAbs,
      drawerH: stackMetrics.drawerH,
      drawerGap: stackMetrics.drawerGap,
      drawerHeightM: args.drawerHeightM,
      stackH,
    });
  }

  const verticalContentBlockers = buildManualLayoutVerticalContentBlockers({
    cfgRef: args.cfg,
    shelves,
    rods: Array.isArray(existingExtra?.rods) ? (existingExtra.rods as RecordMap[]) : [],
    storageBarriers,
    bottomY: args.bottomY,
    topY: args.topY,
    totalHeight: args.totalHeight,
    pad: args.pad,
    woodThick: args.woodThick,
  });

  const placement = resolveManualLayoutSketchInternalDrawerPlacement({
    desiredCenterY: hover.yCenterAbs,
    bottomY: args.bottomY,
    topY: args.topY,
    totalHeight: args.totalHeight,
    pad: args.pad,
    drawerHeightM: args.drawerHeightM,
    drawers: list,
    readCenterY: readNormalizedCenterY,
    blockers: [
      ...buildManualLayoutSketchExternalDrawerBlockers({
        extDrawers: externalDrawers,
        bottomY: args.bottomY,
        topY: args.topY,
        pad: args.pad,
        readCenterY: readNormalizedCenterY,
      }),
      ...verticalContentBlockers,
      ...buildSketchModuleBoxVerticalBlockers({
        cfgRef: args.cfg,
        boxes,
        bottomY: args.bottomY,
        topY: args.topY,
        totalHeight: args.totalHeight,
        pad: args.pad,
        woodThick: args.woodThick,
      }),
    ],
  });
  if (placement.op === 'blocked') return null;
  const extra = ensureRecord(args.cfg, 'sketchExtras');
  const mutableList = ensureRecordList(extra, 'drawers');
  if (placement.op === 'remove') {
    removeStackItemById(mutableList, placement.removeId);
    markSketchInternalDrawersDirty(args.cfg);
    return createManualLayoutSketchStackHoverRecord({
      host: args.hoverHost,
      kind: 'drawers',
      op: 'add',
      yCenter: placement.yCenter,
      drawerH: placement.drawerH,
      drawerGap: placement.drawerGap,
      drawerHeightM: args.drawerHeightM,
      stackH: placement.stackH,
    });
  }
  if (!placement.fitsAvailable) return null;

  const normalized = buildNormalizedStackPosition({
    centerY: placement.yCenter,
    stackH: placement.stackH,
    bottomY: args.bottomY,
    topY: args.topY,
    totalHeight: args.totalHeight,
    pad: args.pad,
  });
  const item = {
    id: createRandomId('sd'),
    yNormC: normalized.yNormC,
    yNorm: normalized.yNormBase,
    yAnchor: normalized.yAnchor,
    drawerHeightM: args.drawerHeightM,
  };
  mutableList.push(item);
  removeShelvesTouchingInternalDrawerCassette({
    cfg: args.cfg,
    extra,
    shelves,
    verticalContentBlockers,
    baseY: normalized.baseYAbs,
    stackH: placement.stackH,
    bottomY: args.bottomY,
    topY: args.topY,
    woodThick: args.woodThick,
  });
  markSketchInternalDrawersDirty(args.cfg);
  return createManualLayoutSketchStackHoverRecord({
    host: args.hoverHost,
    kind: 'drawers',
    op: 'remove',
    removeId: item.id,
    yCenter: placement.yCenter,
    removeKind: 'sketch',
    baseY: normalized.baseYAbs,
    drawerH: placement.drawerH,
    drawerGap: placement.drawerGap,
    drawerHeightM: args.drawerHeightM,
    stackH: placement.stackH,
  });
}
