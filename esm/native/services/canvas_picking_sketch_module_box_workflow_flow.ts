import {
  clampSketchModuleBoxCenterY,
  readNumber,
  type ResolveSketchBoxGeometryFn,
  type SketchModuleBoxActionState,
} from './canvas_picking_sketch_module_box_workflow_shared.js';
import { resolveSketchModuleBoxRemoveAction } from './canvas_picking_sketch_module_box_workflow_remove.js';
import { resolveSketchModuleBoxPlacementAction } from './canvas_picking_sketch_module_box_workflow_placement.js';

export function resolveSketchModuleBoxAction(args: {
  boxes: unknown[];
  cursorXHint?: number | null;
  cursorY: number;
  boxH: number;
  widthM?: number | null;
  depthM?: number | null;
  bottomY: number;
  topY: number;
  spanH: number;
  pad: number;
  innerW: number;
  internalCenterX: number;
  internalDepth: number;
  internalZ: number;
  woodThick: number;
  resolveSketchBoxGeometry: ResolveSketchBoxGeometryFn;
  enableCenterSnap?: boolean;
  removeIdHint?: string | null;
}): SketchModuleBoxActionState {
  const cursorY = clampSketchModuleBoxCenterY({
    centerY: Number(args.cursorY),
    boxH: Number(args.boxH),
    bottomY: Number(args.bottomY),
    topY: Number(args.topY),
    pad: Number(args.pad),
  });
  const widthM = readNumber(args.widthM);
  const depthM = readNumber(args.depthM);
  const boxGeo = args.resolveSketchBoxGeometry({
    innerW: Number(args.innerW),
    internalCenterX: Number(args.internalCenterX),
    internalDepth: Number(args.internalDepth),
    internalZ: Number(args.internalZ),
    woodThick: Number(args.woodThick),
    widthM: widthM != null && widthM > 0 ? widthM : null,
    depthM: depthM != null && depthM > 0 ? depthM : null,
    centerXHint: readNumber(args.cursorXHint),
    enableCenterSnap: !!args.enableCenterSnap,
  });

  const removeAction = resolveSketchModuleBoxRemoveAction({
    boxes: args.boxes,
    removeIdHint: args.removeIdHint,
    cursorXHint: readNumber(args.cursorXHint) ?? boxGeo.centerX,
    cursorY,
    bottomY: Number(args.bottomY),
    spanH: Number(args.spanH),
    innerW: Number(args.innerW),
    internalCenterX: Number(args.internalCenterX),
    internalDepth: Number(args.internalDepth),
    internalZ: Number(args.internalZ),
    woodThick: Number(args.woodThick),
    resolveSketchBoxGeometry: args.resolveSketchBoxGeometry,
  });
  if (removeAction) return removeAction;

  return resolveSketchModuleBoxPlacementAction({
    boxes: args.boxes,
    cursorY,
    boxH: Number(args.boxH),
    widthM,
    depthM,
    bottomY: Number(args.bottomY),
    spanH: Number(args.spanH),
    pad: Number(args.pad),
    innerW: Number(args.innerW),
    internalCenterX: Number(args.internalCenterX),
    internalDepth: Number(args.internalDepth),
    internalZ: Number(args.internalZ),
    woodThick: Number(args.woodThick),
    boxGeo,
    resolveSketchBoxGeometry: args.resolveSketchBoxGeometry,
  });
}
