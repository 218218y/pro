import {
  buildManualLayoutSketchInternalDrawerBlockers,
  createManualLayoutSketchNormalizedCenterReader,
  resolveManualLayoutSketchExternalDrawerPlacement,
} from './canvas_picking_manual_layout_sketch_stack_placement.js';
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

export function commitSketchModuleExternalDrawers(
  args: CommitSketchModuleExternalDrawerArgs
): RecordMap | null {
  const extra = ensureRecord(args.cfg, 'sketchExtras');
  const list = ensureRecordList(extra, 'extDrawers');
  const readNormalizedCenterY = createManualLayoutSketchNormalizedCenterReader({
    bottomY: args.bottomY,
    totalHeight: args.totalHeight,
  });

  const basePlacement = resolveManualLayoutSketchExternalDrawerPlacement({
    desiredCenterY: args.hitYClamped,
    selectedDrawerCount: args.requestedDrawerCount,
    drawerHeightM: args.drawerHeightM,
    bottomY: args.bottomY,
    topY: args.topY,
    pad: args.pad,
    extDrawers: list,
    readCenterY: readNormalizedCenterY,
    blockers: buildManualLayoutSketchInternalDrawerBlockers({
      drawers: ensureRecordList(extra, 'drawers'),
      bottomY: args.bottomY,
      topY: args.topY,
      pad: args.pad,
      readCenterY: readNormalizedCenterY,
    }),
  });
  const placement = maybeOverrideExternalDrawerPlacement({
    hoverOk: args.hoverOk,
    hoverRec: args.hoverRec,
    requestedDrawerCount: args.requestedDrawerCount,
    drawerHeightM: args.drawerHeightM,
    placement: basePlacement,
  });

  if (placement.op === 'remove' && removeStackItemById(list, placement.removeId)) return null;

  const normalized = buildNormalizedStackPosition({
    centerY: placement.yCenter,
    stackH: placement.stackH,
    bottomY: args.bottomY,
    totalHeight: args.totalHeight,
  });
  const item = {
    id: createRandomId('sed'),
    yNormC: normalized.yNormC,
    yNorm: normalized.yNormBase,
    count: placement.drawerCount,
    drawerHeightM: args.drawerHeightM,
  };
  list.push(item);
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
