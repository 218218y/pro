import {
  buildManualLayoutSketchExternalDrawerBlockers,
  createManualLayoutSketchNormalizedCenterReader,
  resolveManualLayoutSketchInternalDrawerPlacement,
} from './canvas_picking_manual_layout_sketch_stack_placement.js';
import { buildManualLayoutVerticalContentBlockers } from './canvas_picking_manual_layout_vertical_blockers.js';
import { buildSketchModuleBoxVerticalBlockers } from './canvas_picking_sketch_module_box_blockers.js';
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
import { resolveSketchInternalDrawerMetrics } from '../features/sketch_drawer_sizing.js';
import { markSketchInternalDrawersDirty } from '../features/sketch_drawer_sizing.js';
import {
  removeSketchShelvesOverlappingInternalDrawerCassette,
  resolveInternalDrawerCassetteMetrics,
  resolveInternalDrawerCassettePanelThickness,
} from '../features/sketch_internal_drawer_cassette.js';
import {
  createRandomId,
  ensureRecord,
  ensureRecordList,
} from './canvas_picking_sketch_module_stack_commit_shared.js';

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
  const cassetteMetrics = resolveInternalDrawerCassetteMetrics({
    baseY: normalized.baseYAbs,
    drawerStackH: placement.stackH,
    panelThicknessM: resolveInternalDrawerCassettePanelThickness(args.woodThick),
  });
  if (Array.isArray(extra.shelves)) {
    removeSketchShelvesOverlappingInternalDrawerCassette({
      shelves: extra.shelves,
      cassetteMinY: cassetteMetrics.minY,
      cassetteMaxY: cassetteMetrics.maxY,
      bottomY: args.bottomY,
      spanH: args.totalHeight,
      woodThick: args.woodThick,
    });
  }
  const item = {
    id: createRandomId('sd'),
    yNormC: normalized.yNormC,
    yNorm: normalized.yNormBase,
    yAnchor: normalized.yAnchor,
    drawerHeightM: args.drawerHeightM,
  };
  mutableList.push(item);
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
