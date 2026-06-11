import { findSketchModuleBoxHit } from './canvas_picking_sketch_box_overlap.js';
import {
  findSketchModuleBoxStateById,
  readNumber,
  type ResolveSketchBoxGeometryFn,
  type SketchModuleBoxActionState,
} from './canvas_picking_sketch_module_box_workflow_shared.js';

export function resolveSketchModuleBoxRemoveAction(args: {
  boxes: unknown[];
  removeIdHint?: string | null;
  cursorXHint?: number | null;
  cursorY: number;
  bottomY: number;
  spanH: number;
  innerW: number;
  internalCenterX: number;
  internalDepth: number;
  internalZ: number;
  woodThick: number;
  resolveSketchBoxGeometry: ResolveSketchBoxGeometryFn;
}): SketchModuleBoxActionState | null {
  const removeIdHint = typeof args.removeIdHint === 'string' ? args.removeIdHint : '';
  const byId = findSketchModuleBoxStateById({
    boxes: args.boxes,
    removeId: removeIdHint,
    bottomY: Number(args.bottomY),
    spanH: Number(args.spanH),
    innerW: Number(args.innerW),
    internalCenterX: Number(args.internalCenterX),
    internalDepth: Number(args.internalDepth),
    internalZ: Number(args.internalZ),
    woodThick: Number(args.woodThick),
    resolveSketchBoxGeometry: args.resolveSketchBoxGeometry,
  });
  if (byId) return byId;

  const cursorXHint = readNumber(args.cursorXHint);
  const removeTarget = findSketchModuleBoxHit({
    boxes: args.boxes,
    cursorX: cursorXHint != null ? cursorXHint : Number(args.internalCenterX),
    cursorY: Number(args.cursorY),
    bottomY: Number(args.bottomY),
    spanH: Number(args.spanH),
    innerW: Number(args.innerW),
    internalCenterX: Number(args.internalCenterX),
    internalDepth: Number(args.internalDepth),
    internalZ: Number(args.internalZ),
    woodThick: Number(args.woodThick),
    resolveSketchBoxGeometry: args.resolveSketchBoxGeometry,
  });
  if (!removeTarget) return null;

  const removeGeo = args.resolveSketchBoxGeometry({
    innerW: Number(args.innerW),
    internalCenterX: Number(args.internalCenterX),
    internalDepth: Number(args.internalDepth),
    internalZ: Number(args.internalZ),
    woodThick: Number(args.woodThick),
    widthM: removeTarget.widthM,
    depthM: removeTarget.depthM,
    xNorm: removeTarget.xNorm,
  });
  return {
    op: 'remove',
    centerX: removeGeo.centerX,
    centerY: removeTarget.centerY,
    centerZ: removeGeo.centerZ,
    outerW: removeGeo.outerW,
    outerD: removeGeo.outerD,
    boxH: removeTarget.boxH,
    xNorm: removeTarget.xNorm,
    centered: !!removeGeo.centered,
    removeId: removeTarget.boxId,
    widthM: removeTarget.widthM,
    depthM: removeTarget.depthM,
    sourceBox: removeTarget.box,
  };
}
