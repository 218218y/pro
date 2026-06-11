import {
  createSketchModuleBoxConfigItem,
  resolveSketchModuleBoxAction,
} from './canvas_picking_sketch_module_box_workflow.js';
import { readManualLayoutSketchBoxHoverIntent } from './canvas_picking_manual_layout_sketch_hover_intent.js';
import {
  ensureRecord,
  ensureRecordList,
  createRandomId,
  parseSketchModuleBoxTool,
  readRecordNumber,
  type CommitSketchModuleSurfaceToolArgs,
} from './canvas_picking_sketch_module_surface_commit_shared.js';

export function tryCommitSketchModuleSurfaceBoxTool(args: CommitSketchModuleSurfaceToolArgs): boolean {
  if (!args.tool.startsWith(args.sketchBoxToolPrefix)) return false;

  const extra = ensureRecord(args.cfg, 'sketchExtras');
  const boxes = ensureRecordList(extra, 'boxes');
  const placement = args.resolveSketchBoxPlacementMetrics();
  const boxHover = args.hoverOk ? readManualLayoutSketchBoxHoverIntent(args.hoverRec) : null;
  const hoverBoxX = boxHover?.xCenter ?? NaN;
  const hoverBoxY = boxHover?.yCenter ?? NaN;
  const hoverRemoveId = boxHover?.op === 'remove' ? boxHover.removeId || '' : '';
  const boxTool = parseSketchModuleBoxTool({
    tool: args.tool,
    parseSketchBoxToolSpec: args.parseSketchBoxToolSpec,
  });
  const resolvedBoxAction = resolveSketchModuleBoxAction({
    boxes,
    cursorXHint: Number.isFinite(hoverBoxX) ? hoverBoxX : readRecordNumber(placement, 'hitLocalX'),
    cursorY: Number.isFinite(hoverBoxY) ? hoverBoxY : args.hitYClamped,
    boxH: boxTool.boxH,
    widthM: boxTool.boxWM,
    depthM: boxTool.boxDM,
    bottomY: args.bottomY,
    topY: args.topY,
    spanH: args.totalHeight,
    pad: args.pad,
    innerW: readRecordNumber(placement, 'innerW') ?? NaN,
    internalCenterX: readRecordNumber(placement, 'internalCenterX') ?? NaN,
    internalDepth: readRecordNumber(placement, 'internalDepth') ?? NaN,
    internalZ: readRecordNumber(placement, 'internalZ') ?? NaN,
    woodThick: args.woodThick,
    resolveSketchBoxGeometry: args.resolveSketchBoxGeometry,
    enableCenterSnap: !Number.isFinite(hoverBoxX),
    removeIdHint: hoverRemoveId || null,
  });
  if (resolvedBoxAction.op === 'remove' && resolvedBoxAction.removeId) {
    const idx = boxes.findIndex(it => String(it?.id ?? '') === resolvedBoxAction.removeId);
    if (idx >= 0) boxes.splice(idx, 1);
    return true;
  }
  if (resolvedBoxAction.op === 'blocked') return true;

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
