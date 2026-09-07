import {
  buildManualLayoutSketchExternalDrawerBlockers,
  createManualLayoutSketchNormalizedCenterReader,
  resolveManualLayoutSketchInternalDrawerPlacement,
} from './canvas_picking_manual_layout_sketch_stack_placement.js';
import { formatIdentityValue, readIdentityValue } from '../../shared/identity_value_shared.js';
import {
  buildManualLayoutVerticalContentBlockers,
  type ManualLayoutVerticalContentBlocker,
} from './canvas_picking_manual_layout_vertical_blockers.js';
import { buildSketchModuleBoxVerticalBlockers } from './canvas_picking_sketch_module_box_blockers.js';
import {
  toastInternalDrawerRemovedShelves,
  withoutInternalDrawerReplaceableShelfBlockers,
} from './canvas_picking_internal_drawer_shelf_replacement.js';
import { removeManualLayoutBaseShelf } from './canvas_picking_manual_layout_config_ops_shelf.js';
import { createManualLayoutSketchStackHoverRecord } from './canvas_picking_manual_layout_sketch_hover_state.js';
import { readManualLayoutSketchStackHoverIntent } from './canvas_picking_manual_layout_sketch_hover_intent.js';
import {
  doesSketchModuleContentItemBelongToCell,
  filterSketchModuleContentItemsForCell,
  isSketchModuleBaseShelfSuppressedInCell,
  resolveSketchModulePartitionCellAtNorm,
  suppressSketchModuleBaseShelfInCell,
} from './canvas_picking_sketch_module_partition.js';
import type {
  CommitSketchModuleInternalDrawerArgs,
  RecordMap,
} from './canvas_picking_sketch_module_stack_commit_contracts.js';
import {
  buildNormalizedStackPosition,
  removeStackItemById,
} from './canvas_picking_sketch_module_stack_commit_mutation.js';
import { resolveInternalDrawerHoverIntent } from './canvas_picking_sketch_module_stack_commit_hover.js';
import { INTERIOR_STORAGE_GRID_POLICY } from '../../shared/dimensions/interior_storage_policy.js';
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
  const value = typeof raw === 'number' && Number.isFinite(raw) ? raw : NaN;
  return Number.isFinite(value) && value > 1
    ? Math.floor(value)
    : INTERIOR_STORAGE_GRID_POLICY.gridDivisionsDefault;
}

function removeSketchShelfByBlocker(args: {
  extra: RecordMap;
  shelves: RecordMap[];
  blocker: ManualLayoutVerticalContentBlocker;
}): boolean {
  const mutableShelves = ensureRecordList(args.extra, 'shelves');
  const id = formatIdentityValue(readIdentityValue(args.blocker.id));
  if (id && !id.startsWith('sketch_shelf_')) {
    const byId = mutableShelves.findIndex(shelf => formatIdentityValue(readIdentityValue(shelf?.id)) === id);
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
  targetCell: ReturnType<typeof resolveSketchModulePartitionCellAtNorm>;
  targetOwnership: { xNorm: number; scopeOrder: number } | null;
}): number {
  const cassette = resolveSketchInternalDrawerCassetteRange({
    baseY: args.baseY,
    stackH: args.stackH,
    woodThick: args.woodThick,
  });
  const shelfBlockers = args.verticalContentBlockers.filter(blocker => blocker.kind === 'shelf');
  if (!shelfBlockers.length) return 0;

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

  let removedCount = 0;
  if (baseShelfIndexes.size) {
    const divs = readGridDivisions(args.cfg);
    for (const shelfIndex of Array.from(baseShelfIndexes).sort((a, b) => a - b)) {
      if (args.targetCell && args.targetOwnership) {
        if (
          suppressSketchModuleBaseShelfInCell({
            cfg: args.cfg,
            shelfIndex,
            xNorm: args.targetOwnership.xNorm,
            yNorm: args.targetCell.yNorm,
            scopeOrder: args.targetOwnership.scopeOrder,
          })
        ) {
          removedCount += 1;
        }
        continue;
      }
      removeManualLayoutBaseShelf(args.cfg, {
        divs,
        shelfIndex,
        topY: args.topY,
        bottomY: args.bottomY,
      });
      removedCount += 1;
    }
  }

  if (sketchShelfBlockers.length) {
    sketchShelfBlockers
      .toSorted((a, b) => (Number(b.index) || 0) - (Number(a.index) || 0))
      .forEach(blocker => {
        if (removeSketchShelfByBlocker({ extra: args.extra, shelves: args.shelves, blocker })) {
          removedCount += 1;
        }
      });
  }
  return removedCount;
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
  const stackHover = args.hoverOk ? readManualLayoutSketchStackHoverIntent(args.hoverRec) : null;
  const targetOwnership =
    stackHover?.kind === 'drawers' &&
    typeof stackHover.xNorm === 'number' &&
    Number.isFinite(stackHover.xNorm) &&
    typeof stackHover.scopeOrder === 'number' &&
    Number.isFinite(stackHover.scopeOrder)
      ? { hover: stackHover, xNorm: stackHover.xNorm, scopeOrder: stackHover.scopeOrder }
      : null;
  const targetCell = targetOwnership
    ? resolveSketchModulePartitionCellAtNorm({
        sketchExtras: existingExtra ?? {},
        bottomY: args.bottomY,
        topY: args.topY,
        woodThick:
          typeof args.woodThick === 'number' && Number.isFinite(args.woodThick) ? args.woodThick : 0.018,
        xNorm: targetOwnership.xNorm,
        yNorm: Math.max(
          0,
          Math.min(1, (targetOwnership.hover.yCenter - args.bottomY) / Math.max(0.0001, args.totalHeight))
        ),
      })
    : null;
  const targetBottomY = targetCell?.bottomY ?? args.bottomY;
  const targetTopY = targetCell?.topY ?? args.topY;
  const list = Array.isArray(existingExtra?.drawers) ? (existingExtra.drawers as RecordMap[]) : [];
  const externalDrawers = Array.isArray(existingExtra?.extDrawers)
    ? (existingExtra.extDrawers as RecordMap[])
    : [];
  const shelves = Array.isArray(existingExtra?.shelves) ? (existingExtra.shelves as RecordMap[]) : [];
  const rods = Array.isArray(existingExtra?.rods) ? (existingExtra.rods as RecordMap[]) : [];
  const storageBarriers = Array.isArray(existingExtra?.storageBarriers)
    ? (existingExtra.storageBarriers as RecordMap[])
    : [];
  const boxes = Array.isArray(existingExtra?.boxes) ? (existingExtra.boxes as RecordMap[]) : [];
  const partitionGeometry = {
    innerW: 1,
    internalCenterX: 0,
    bottomY: args.bottomY,
    topY: args.topY,
    woodThick: typeof args.woodThick === 'number' && Number.isFinite(args.woodThick) ? args.woodThick : 0.018,
  };
  const targetDrawers = filterSketchModuleContentItemsForCell({
    sketchExtras: existingExtra ?? {},
    geometry: partitionGeometry,
    items: list,
    cell: targetCell,
  }).map(candidate => candidate.item);
  const targetExternalDrawers = filterSketchModuleContentItemsForCell({
    sketchExtras: existingExtra ?? {},
    geometry: partitionGeometry,
    items: externalDrawers,
    cell: targetCell,
  }).map(candidate => candidate.item);

  const stackMetrics = resolveSketchInternalDrawerMetrics({
    drawerHeightM: args.drawerHeightM,
    availableHeightM: Math.max(0, targetTopY - targetBottomY - args.pad * 2),
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
    rods,
    storageBarriers,
    bottomY: args.bottomY,
    topY: args.topY,
    totalHeight: args.totalHeight,
    pad: args.pad,
    woodThick: args.woodThick,
  }).filter(blocker => {
    if (!targetCell) return true;
    if (blocker.source === 'base') {
      const shelfIndex =
        typeof blocker.index === 'number' && Number.isFinite(blocker.index)
          ? Math.round(blocker.index)
          : null;
      return (
        shelfIndex == null ||
        !isSketchModuleBaseShelfSuppressedInCell({
          sketchExtras: existingExtra ?? {},
          shelfIndex,
          cell: targetCell,
        })
      );
    }
    const index =
      typeof blocker.index === 'number' && Number.isFinite(blocker.index) ? Math.round(blocker.index) : -1;
    const item =
      blocker.kind === 'shelf'
        ? shelves[index]
        : blocker.kind === 'rod'
          ? rods[index]
          : blocker.kind === 'storage'
            ? storageBarriers[index]
            : null;
    return (
      !!item &&
      doesSketchModuleContentItemBelongToCell({
        sketchExtras: existingExtra ?? {},
        geometry: partitionGeometry,
        item,
        cell: targetCell,
      })
    );
  });

  const placementBlockers = [
    ...buildManualLayoutSketchExternalDrawerBlockers({
      extDrawers: targetExternalDrawers,
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
  ];
  let placement = resolveManualLayoutSketchInternalDrawerPlacement({
    desiredCenterY: hover.yCenterAbs,
    bottomY: targetBottomY,
    topY: targetTopY,
    totalHeight: args.totalHeight,
    pad: args.pad,
    drawerHeightM: args.drawerHeightM,
    drawers: targetDrawers,
    readCenterY: readNormalizedCenterY,
    woodThick: args.woodThick,
    blockers: placementBlockers,
  });
  if (placement.op === 'blocked') {
    placement = resolveManualLayoutSketchInternalDrawerPlacement({
      desiredCenterY: hover.yCenterAbs,
      bottomY: targetBottomY,
      topY: targetTopY,
      totalHeight: args.totalHeight,
      pad: args.pad,
      drawerHeightM: args.drawerHeightM,
      drawers: targetDrawers,
      readCenterY: readNormalizedCenterY,
      woodThick: args.woodThick,
      blockers: withoutInternalDrawerReplaceableShelfBlockers(placementBlockers),
    });
  }
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
    ...(targetOwnership ? { xNorm: targetOwnership.xNorm, scopeOrder: targetOwnership.scopeOrder } : {}),
  };
  mutableList.push(item);
  const removedShelfCount = removeShelvesTouchingInternalDrawerCassette({
    cfg: args.cfg,
    extra,
    shelves,
    verticalContentBlockers,
    baseY: normalized.baseYAbs,
    stackH: placement.stackH,
    bottomY: args.bottomY,
    topY: args.topY,
    woodThick: args.woodThick,
    targetCell,
    targetOwnership: targetOwnership
      ? { xNorm: targetOwnership.xNorm, scopeOrder: targetOwnership.scopeOrder }
      : null,
  });
  toastInternalDrawerRemovedShelves(args.App, removedShelfCount);
  markSketchInternalDrawersDirty(args.cfg);
  return createManualLayoutSketchStackHoverRecord({
    host: args.hoverHost,
    kind: 'drawers',
    op: 'remove',
    removeId: item.id,
    xNorm: targetOwnership?.xNorm,
    scopeOrder: targetOwnership?.scopeOrder,
    yCenter: placement.yCenter,
    removeKind: 'sketch',
    baseY: normalized.baseYAbs,
    drawerH: placement.drawerH,
    drawerGap: placement.drawerGap,
    drawerHeightM: args.drawerHeightM,
    stackH: placement.stackH,
  });
}
