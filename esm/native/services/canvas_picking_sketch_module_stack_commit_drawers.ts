import {
  buildManualLayoutSketchExternalDrawerBlockers,
  createManualLayoutSketchNormalizedCenterReader,
  resolveManualLayoutSketchInternalDrawerPlacement,
} from './canvas_picking_manual_layout_sketch_stack_placement.js';
import { createManualLayoutSketchStackHoverRecord } from './canvas_picking_manual_layout_sketch_hover_state.js';
import type {
  CommitSketchModuleInternalDrawerArgs,
  RecordMap,
} from './canvas_picking_sketch_module_stack_commit_contracts.js';
import {
  buildNormalizedStackPosition,
  removeStandardDrawer,
  removeStackItemById,
} from './canvas_picking_sketch_module_stack_commit_mutation.js';
import { resolveInternalDrawerHoverIntent } from './canvas_picking_sketch_module_stack_commit_hover.js';
import { resolveSketchInternalDrawerMetrics } from '../features/sketch_drawer_sizing.js';
import {
  createRandomId,
  ensureRecord,
  ensureRecordList,
} from './canvas_picking_sketch_module_stack_commit_shared.js';

export function commitSketchModuleInternalDrawers(
  args: CommitSketchModuleInternalDrawerArgs
): RecordMap | null {
  const extra = ensureRecord(args.cfg, 'sketchExtras');
  const list = ensureRecordList(extra, 'drawers');

  const stackMetrics = resolveSketchInternalDrawerMetrics({
    drawerHeightM: args.drawerHeightM,
    availableHeightM: Math.max(0, args.topY - args.bottomY - args.pad * 2),
  });
  const stackH = stackMetrics.stackH;

  const clampCenter = (yCenter: number) => {
    const lo = args.bottomY + args.pad + stackH / 2;
    const hi = args.topY - args.pad - stackH / 2;
    if (!(hi > lo)) return Math.max(args.bottomY + args.pad, Math.min(args.topY - args.pad, yCenter));
    return Math.max(lo, Math.min(hi, yCenter));
  };

  const readNormalizedCenterY = createManualLayoutSketchNormalizedCenterReader({
    bottomY: args.bottomY,
    totalHeight: args.totalHeight,
  });

  const hover = resolveInternalDrawerHoverIntent({
    hoverOk: args.hoverOk,
    hoverRec: args.hoverRec,
    hitYClamped: args.hitYClamped,
    clampCenter,
  });

  if (hover.hoverOp === 'remove') {
    if (
      hover.hoverRemoveKind === 'std' &&
      removeStandardDrawer({
        cfg: args.cfg,
        hoverRemovePid: hover.hoverRemovePid,
        hoverRemoveSlot: hover.hoverRemoveSlot,
      })
    ) {
      return null;
    }

    if (removeStackItemById(list, hover.hoverRemoveId)) return null;
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
    blockers: buildManualLayoutSketchExternalDrawerBlockers({
      extDrawers: ensureRecordList(extra, 'extDrawers'),
      bottomY: args.bottomY,
      topY: args.topY,
      pad: args.pad,
      readCenterY: readNormalizedCenterY,
    }),
  });
  if (placement.op === 'remove' && removeStackItemById(list, placement.removeId)) return null;

  const normalized = buildNormalizedStackPosition({
    centerY: placement.yCenter,
    stackH: placement.stackH,
    bottomY: args.bottomY,
    totalHeight: args.totalHeight,
  });
  const item = {
    id: createRandomId('sd'),
    yNormC: normalized.yNormC,
    yNorm: normalized.yNormBase,
    drawerHeightM: args.drawerHeightM,
  };
  list.push(item);
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
