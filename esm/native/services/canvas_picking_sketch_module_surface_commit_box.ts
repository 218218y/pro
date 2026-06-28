import {
  createSketchModuleBoxConfigItem,
  resolveSketchModuleBoxAction,
} from './canvas_picking_sketch_module_box_workflow.js';
import { readManualLayoutSketchBoxHoverIntent } from './canvas_picking_manual_layout_sketch_hover_intent.js';
import { __wp_toast } from './canvas_picking_core_helpers.js';
import { buildSketchModuleBoxPlacementBlockers } from './canvas_picking_sketch_module_box_blockers.js';
import {
  ensureRecord,
  ensureRecordList,
  createRandomId,
  parseSketchModuleBoxTool,
  readRecordNumber,
  type CommitSketchModuleSurfaceToolArgs,
} from './canvas_picking_sketch_module_surface_commit_shared.js';

function readSketchExtrasRecordList(extra: Record<string, unknown>, key: string): Record<string, unknown>[] {
  const value = extra[key];
  return Array.isArray(value)
    ? value.filter(
        (item): item is Record<string, unknown> => !!item && typeof item === 'object' && !Array.isArray(item)
      )
    : [];
}

function toastSketchModuleBoxCollisionFailure(args: {
  App?: CommitSketchModuleSurfaceToolArgs['App'];
}): void {
  if (!args.App) return;
  __wp_toast(
    args.App,
    'לא ניתן לבנות קופסא במיקום זה, כי היא מתנגשת במדפים, במגירות או בפריטים קיימים.',
    'error'
  );
}

export function tryCommitSketchModuleSurfaceBoxTool(args: CommitSketchModuleSurfaceToolArgs): boolean {
  if (!args.tool.startsWith(args.sketchBoxToolPrefix)) return false;

  const placement = args.resolveSketchBoxPlacementMetrics();
  const placementInnerW = readRecordNumber(placement, 'innerW');
  const placementInternalCenterX = readRecordNumber(placement, 'internalCenterX');
  const placementInternalDepth = readRecordNumber(placement, 'internalDepth');
  const placementInternalZ = readRecordNumber(placement, 'internalZ');
  const placementHitLocalX = readRecordNumber(placement, 'hitLocalX');
  if (
    placementInnerW == null ||
    placementInternalCenterX == null ||
    placementInternalDepth == null ||
    placementInternalZ == null
  ) {
    return true;
  }

  const extra = ensureRecord(args.cfg, 'sketchExtras');
  const boxes = ensureRecordList(extra, 'boxes');
  const boxHover = args.hoverOk ? readManualLayoutSketchBoxHoverIntent(args.hoverRec) : null;
  const hoverBoxX = boxHover?.xCenter ?? NaN;
  const hoverBoxY = boxHover?.yCenter ?? NaN;
  const hoverRemoveId = boxHover?.op === 'remove' ? boxHover.removeId || '' : '';
  const boxTool = parseSketchModuleBoxTool({
    tool: args.tool,
    parseSketchBoxToolSpec: args.parseSketchBoxToolSpec,
    maxHeightM: args.totalHeight,
  });
  if (boxHover?.op !== 'remove' && boxHover?.blockedReason === 'collision') {
    toastSketchModuleBoxCollisionFailure({ App: args.App });
    return true;
  }

  const placementBlockers = buildSketchModuleBoxPlacementBlockers({
    cfgRef: args.cfg,
    info: args.cfg,
    shelves: readSketchExtrasRecordList(extra, 'shelves'),
    rods: readSketchExtrasRecordList(extra, 'rods'),
    storageBarriers: readSketchExtrasRecordList(extra, 'storageBarriers'),
    drawers: readSketchExtrasRecordList(extra, 'drawers'),
    extDrawers: readSketchExtrasRecordList(extra, 'extDrawers'),
    bottomY: args.bottomY,
    topY: args.topY,
    totalHeight: args.totalHeight,
    pad: args.pad,
    woodThick: args.woodThick,
  });
  const resolvedBoxAction = resolveSketchModuleBoxAction({
    boxes,
    cursorXHint: Number.isFinite(hoverBoxX) ? hoverBoxX : placementHitLocalX,
    cursorY: Number.isFinite(hoverBoxY) ? hoverBoxY : args.hitYClamped,
    boxH: boxTool.boxH,
    widthM: boxTool.boxWM,
    depthM: boxTool.boxDM,
    bottomY: args.bottomY,
    topY: args.topY,
    spanH: args.totalHeight,
    pad: args.pad,
    innerW: placementInnerW,
    internalCenterX: placementInternalCenterX,
    internalDepth: placementInternalDepth,
    internalZ: placementInternalZ,
    woodThick: args.woodThick,
    resolveSketchBoxGeometry: args.resolveSketchBoxGeometry,
    enableCenterSnap: !Number.isFinite(hoverBoxX),
    removeIdHint: hoverRemoveId || null,
    placementBlockers,
  });
  if (resolvedBoxAction.op === 'remove' && resolvedBoxAction.removeId) {
    const idx = boxes.findIndex(it => String(it?.id ?? '') === resolvedBoxAction.removeId);
    if (idx >= 0) boxes.splice(idx, 1);
    return true;
  }
  if (resolvedBoxAction.op === 'blocked') {
    toastSketchModuleBoxCollisionFailure({ App: args.App });
    return true;
  }

  boxes.push(
    createSketchModuleBoxConfigItem({
      idFactory: () => createRandomId('sb'),
      state: resolvedBoxAction,
      bottomY: args.bottomY,
      spanH: args.totalHeight,
    })
  );
  return true;
}
