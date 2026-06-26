import {
  buildManualLayoutSketchInternalDrawerBlockers,
  buildManualLayoutStandardInternalDrawerBlockers,
  createManualLayoutSketchNormalizedCenterReader,
  resolveManualLayoutSketchExternalDrawerPlacement,
} from './canvas_picking_manual_layout_sketch_stack_placement.js';
import { buildManualLayoutVerticalContentBlockers } from './canvas_picking_manual_layout_vertical_blockers.js';
import { buildSketchModuleBoxVerticalBlockers } from './canvas_picking_sketch_module_box_blockers.js';
import { createManualLayoutSketchStackHoverRecord } from './canvas_picking_manual_layout_sketch_hover_state.js';
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
import { sketchStackFitsAvailableHeight } from '../features/sketch_drawer_sizing.js';

export function commitSketchModuleExternalDrawers(
  args: CommitSketchModuleExternalDrawerArgs
): RecordMap | null {
  const existingExtra =
    args.cfg.sketchExtras &&
    typeof args.cfg.sketchExtras === 'object' &&
    !Array.isArray(args.cfg.sketchExtras)
      ? (args.cfg.sketchExtras as RecordMap)
      : null;
  const list = Array.isArray(existingExtra?.extDrawers) ? (existingExtra.extDrawers as RecordMap[]) : [];
  const internalDrawers = Array.isArray(existingExtra?.drawers) ? (existingExtra.drawers as RecordMap[]) : [];
  const shelves = Array.isArray(existingExtra?.shelves) ? (existingExtra.shelves as RecordMap[]) : [];
  const storageBarriers = Array.isArray(existingExtra?.storageBarriers)
    ? (existingExtra.storageBarriers as RecordMap[])
    : [];
  const boxes = Array.isArray(existingExtra?.boxes) ? (existingExtra.boxes as RecordMap[]) : [];
  const readNormalizedCenterY = createManualLayoutSketchNormalizedCenterReader({
    bottomY: args.bottomY,
    totalHeight: args.totalHeight,
  });
  const internalDrawerBlockers = [
    ...buildManualLayoutSketchInternalDrawerBlockers({
      drawers: internalDrawers,
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
    ...buildManualLayoutVerticalContentBlockers({
      cfgRef: args.cfg,
      shelves,
      rods: Array.isArray(existingExtra?.rods) ? (existingExtra.rods as RecordMap[]) : [],
      storageBarriers,
      bottomY: args.bottomY,
      topY: args.topY,
      totalHeight: args.totalHeight,
      pad: args.pad,
      woodThick: args.woodThick,
    }),
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
    drawerHeightM: args.drawerHeightM,
    bottomY: args.bottomY,
    topY: args.topY,
    pad: args.pad,
    extDrawers: list,
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
  if (!sketchStackFitsAvailableHeight(placement.stackH, Math.max(0, args.topY - args.bottomY))) {
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
    count: placement.drawerCount,
    drawerHeightM: args.drawerHeightM,
  };
  mutableList.push(item);
  return createManualLayoutSketchStackHoverRecord({
    host: args.hoverHost,
    kind: 'ext_drawers',
    op: 'remove',
    removeId: item.id,
    yCenter: placement.yCenter,
    baseY: normalized.baseYAbs,
    drawerCount: placement.drawerCount,
    drawerHeightM: args.drawerHeightM,
    drawerH: placement.drawerH,
    stackH: placement.stackH,
  });
}
