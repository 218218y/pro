import { readModuleShoeDrawerState } from './canvas_picking_shoe_drawer_module_state.js';
import {
  buildManualLayoutSketchInternalDrawerBlockers,
  buildManualLayoutStandardInternalDrawerBlockers,
  createManualLayoutSketchNormalizedCenterReader,
  resolveManualLayoutSketchExternalDrawerPlacement,
} from './canvas_picking_manual_layout_sketch_stack_placement.js';
import { buildManualLayoutVerticalContentBlockers } from './canvas_picking_manual_layout_vertical_blockers.js';
import { buildSketchModuleBoxVerticalBlockers } from './canvas_picking_sketch_module_box_blockers.js';
import { createManualLayoutSketchStackHoverRecord } from './canvas_picking_manual_layout_sketch_hover_state.js';
import { readManualLayoutSketchStackHoverIntent } from './canvas_picking_manual_layout_sketch_hover_intent.js';
import {
  doesSketchModuleContentItemBelongToCell,
  filterSketchModuleContentItemsForCell,
  resolveSketchModulePartitionCellAtNorm,
} from './canvas_picking_sketch_module_partition.js';
import type {
  CommitSketchModuleExternalDrawerArgs,
  RecordMap,
} from './canvas_picking_sketch_module_stack_commit_contracts.js';
import { maybeOverrideExternalDrawerPlacement } from './canvas_picking_sketch_module_stack_commit_hover.js';
import {
  buildNormalizedStackPosition,
  removeStackItemById,
} from './canvas_picking_sketch_module_stack_commit_mutation.js';
import {
  createRandomId,
  ensureRecord,
  ensureRecordList,
} from './canvas_picking_sketch_module_stack_commit_shared.js';
import {
  resolveSketchExternalDrawerMetrics,
  sketchStackFitsAvailableHeight,
} from './canvas_picking_external_drawer_count_policy.js';

export function commitSketchModuleExternalDrawers(
  args: CommitSketchModuleExternalDrawerArgs
): RecordMap | null {
  if (args.drawerType === 'shoe') {
    const shoeState = readModuleShoeDrawerState(args.cfg, args.drawerHeightM);
    const hoverIntent = args.hoverOk ? readManualLayoutSketchStackHoverIntent(args.hoverRec) : null;
    const explicitlyRemovingSketchShoe =
      hoverIntent?.kind === 'ext_drawers' &&
      hoverIntent.op === 'remove' &&
      hoverIntent.removeKind !== 'std' &&
      !!hoverIntent.removeId;

    if (shoeState.hasStandard && !explicitlyRemovingSketchShoe) {
      args.cfg.hasShoeDrawer = false;
      const metrics = resolveSketchExternalDrawerMetrics({
        drawerCount: 1,
        drawerHeightM: args.drawerHeightM,
      });
      return createManualLayoutSketchStackHoverRecord({
        host: args.hoverHost,
        kind: 'ext_drawers',
        op: 'add',
        yCenter: args.bottomY + metrics.stackH / 2,
        drawerCount: 1,
        drawerHeightM: args.drawerHeightM,
        drawerH: metrics.drawerH,
        stackH: metrics.stackH,
      });
    }
  }
  const existingExtra =
    args.cfg.sketchExtras &&
    typeof args.cfg.sketchExtras === 'object' &&
    !Array.isArray(args.cfg.sketchExtras)
      ? (args.cfg.sketchExtras as RecordMap)
      : null;
  const stackHover = args.hoverOk ? readManualLayoutSketchStackHoverIntent(args.hoverRec) : null;
  const targetHover = stackHover?.kind === 'ext_drawers' ? stackHover : null;
  const targetCell = targetHover
    ? resolveSketchModulePartitionCellAtNorm({
        sketchExtras: existingExtra ?? {},
        bottomY: args.bottomY,
        topY: args.topY,
        woodThick:
          typeof args.woodThick === 'number' && Number.isFinite(args.woodThick) ? args.woodThick : 0.018,
        xNorm: targetHover.xNorm,
        yNorm: Math.max(
          0,
          Math.min(1, (targetHover.yCenter - args.bottomY) / Math.max(0.0001, args.totalHeight))
        ),
      })
    : null;
  const targetBottomY = targetCell?.bottomY ?? args.bottomY;
  const targetTopY = targetCell?.topY ?? args.topY;
  const list = Array.isArray(existingExtra?.extDrawers) ? (existingExtra.extDrawers as RecordMap[]) : [];
  const internalDrawers = Array.isArray(existingExtra?.drawers) ? (existingExtra.drawers as RecordMap[]) : [];
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
  const targetExternalDrawers = filterSketchModuleContentItemsForCell({
    sketchExtras: existingExtra ?? {},
    geometry: partitionGeometry,
    items: list,
    cell: targetCell,
  }).map(candidate => candidate.item);
  const targetInternalDrawers = filterSketchModuleContentItemsForCell({
    sketchExtras: existingExtra ?? {},
    geometry: partitionGeometry,
    items: internalDrawers,
    cell: targetCell,
  }).map(candidate => candidate.item);
  const readNormalizedCenterY = createManualLayoutSketchNormalizedCenterReader({
    bottomY: args.bottomY,
    totalHeight: args.totalHeight,
  });
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
    if (!targetCell || blocker.source === 'base') return true;
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
  const internalDrawerBlockers = [
    ...buildManualLayoutSketchInternalDrawerBlockers({
      drawers: targetInternalDrawers,
      bottomY: args.bottomY,
      topY: args.topY,
      pad: args.pad,
      woodThick: args.woodThick,
      readCenterY: readNormalizedCenterY,
    }),
    ...buildManualLayoutStandardInternalDrawerBlockers({
      cfgRef: args.cfg,
      bottomY: args.bottomY,
      topY: args.topY,
      totalHeight: args.totalHeight,
      moduleIndex: args.hoverHost.moduleKey,
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

  const basePlacement = resolveManualLayoutSketchExternalDrawerPlacement({
    desiredCenterY: args.hitYClamped,
    selectedDrawerCount: args.requestedDrawerCount,
    drawerType: args.drawerType,
    drawerHeightM: args.drawerHeightM,
    bottomY: targetBottomY,
    topY: targetTopY,
    pad: args.pad,
    extDrawers: targetExternalDrawers,
    readCenterY: readNormalizedCenterY,
    blockers: internalDrawerBlockers,
  });
  const placement = maybeOverrideExternalDrawerPlacement({
    hoverOk: args.hoverOk,
    hoverRec: args.hoverRec,
    requestedDrawerCount: args.requestedDrawerCount,
    drawerHeightM: args.drawerHeightM,
    placement: basePlacement,
  });

  if (placement.op === 'blocked') return null;
  const extra = ensureRecord(args.cfg, 'sketchExtras');
  const mutableList = ensureRecordList(extra, 'extDrawers');
  if (placement.op === 'remove') {
    removeStackItemById(mutableList, placement.removeId);
    return createManualLayoutSketchStackHoverRecord({
      host: args.hoverHost,
      kind: 'ext_drawers',
      op: 'add',
      yCenter: placement.yCenter,
      drawerCount: placement.drawerCount,
      drawerHeightM: args.drawerHeightM,
      drawerH: placement.drawerH,
      stackH: placement.stackH,
    });
  }
  if (!sketchStackFitsAvailableHeight(placement.stackH, Math.max(0, targetTopY - targetBottomY))) {
    return null;
  }

  const normalized = buildNormalizedStackPosition({
    centerY: placement.yCenter,
    stackH: placement.stackH,
    bottomY: args.bottomY,
    topY: args.topY,
    totalHeight: args.totalHeight,
  });
  const item = {
    id: createRandomId('sed'),
    yNormC: normalized.yNormC,
    yNorm: normalized.yNormBase,
    yAnchor: normalized.yAnchor,
    count: args.drawerType === 'shoe' ? 0 : placement.drawerCount,
    drawerHeightM: args.drawerHeightM,
    ...(args.drawerType === 'shoe' ? { hasShoeDrawer: true } : {}),
    ...(targetHover ? { xNorm: targetHover.xNorm, scopeOrder: targetHover.scopeOrder } : {}),
  };
  mutableList.push(item);
  return createManualLayoutSketchStackHoverRecord({
    host: args.hoverHost,
    kind: 'ext_drawers',
    op: 'remove',
    removeId: item.id,
    xNorm: targetHover?.xNorm,
    scopeOrder: targetHover?.scopeOrder,
    yCenter: placement.yCenter,
    baseY: normalized.baseYAbs,
    drawerCount: placement.drawerCount,
    drawerHeightM: args.drawerHeightM,
    drawerH: placement.drawerH,
    stackH: placement.stackH,
  });
}
