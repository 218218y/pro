import { resolveSketchModuleBoxPlacement } from './canvas_picking_sketch_box_overlap.js';
import type {
  ResolveSketchBoxGeometryFn,
  SketchModuleBoxActionState,
} from './canvas_picking_sketch_module_box_workflow_shared.js';

export function resolveSketchModuleBoxPlacementAction(args: {
  boxes: unknown[];
  cursorY: number;
  boxH: number;
  widthM?: number | null;
  depthM?: number | null;
  bottomY: number;
  spanH: number;
  pad: number;
  innerW: number;
  internalCenterX: number;
  internalDepth: number;
  internalZ: number;
  woodThick: number;
  boxGeo: ReturnType<ResolveSketchBoxGeometryFn>;
  resolveSketchBoxGeometry: ResolveSketchBoxGeometryFn;
}): SketchModuleBoxActionState {
  const widthM = args.widthM != null && Number.isFinite(args.widthM) && args.widthM > 0 ? args.widthM : null;
  const depthM = args.depthM != null && Number.isFinite(args.depthM) && args.depthM > 0 ? args.depthM : null;
  const resolvedPlacement = resolveSketchModuleBoxPlacement({
    boxes: args.boxes,
    desiredCenterX: args.boxGeo.centerX,
    desiredCenterY: Number(args.cursorY),
    boxW: args.boxGeo.outerW,
    boxH: Number(args.boxH),
    bottomY: Number(args.bottomY),
    spanH: Number(args.spanH),
    pad: Number(args.pad),
    innerW: Number(args.innerW),
    internalCenterX: Number(args.internalCenterX),
    internalDepth: Number(args.internalDepth),
    internalZ: Number(args.internalZ),
    woodThick: Number(args.woodThick),
    resolveSketchBoxGeometry: args.resolveSketchBoxGeometry,
  });
  if (resolvedPlacement.blocked) {
    return {
      op: 'blocked',
      centerX: args.boxGeo.centerX,
      centerY: Number(args.cursorY),
      centerZ: args.boxGeo.centerZ,
      outerW: args.boxGeo.outerW,
      outerD: args.boxGeo.outerD,
      boxH: Number(args.boxH),
      xNorm: args.boxGeo.xNorm,
      centered: !!args.boxGeo.centered,
      removeId: '',
      widthM,
      depthM,
      sourceBox: null,
    };
  }

  return {
    op: 'add',
    centerX: args.boxGeo.centerX,
    centerY: resolvedPlacement.centerY,
    centerZ: args.boxGeo.centerZ,
    outerW: args.boxGeo.outerW,
    outerD: args.boxGeo.outerD,
    boxH: Number(args.boxH),
    xNorm: args.boxGeo.xNorm,
    centered: !!args.boxGeo.centered,
    removeId: '',
    widthM,
    depthM,
    sourceBox: null,
  };
}
