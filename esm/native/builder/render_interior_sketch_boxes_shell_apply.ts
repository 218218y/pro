import { INTERIOR_FITTINGS_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import type {
  RenderInteriorSketchBoxesArgs,
  RenderSketchBoxShellResult,
  ResolvedSketchBoxState,
} from './render_interior_sketch_boxes_shared.js';

import { resolveSketchBoxHeight } from './render_interior_sketch_boxes_shell_height.js';
import { resolveSketchBoxShellGeometry } from './render_interior_sketch_boxes_shell_geometry.js';
import { resolveSketchBoxShellMaterial } from './render_interior_sketch_boxes_shell_materials.js';
import { renderSketchBoxShellFrame } from './render_interior_sketch_boxes_shell_frame.js';

export function renderSketchBoxShell(args: {
  box: RenderInteriorSketchBoxesArgs['boxes'][number];
  boxIndex: number;
  renderArgs: RenderInteriorSketchBoxesArgs;
  freeWardrobeBox: ReturnType<RenderInteriorSketchBoxesArgs['measureWardrobeLocalBox']>;
}): RenderSketchBoxShellResult | null {
  const { box, boxIndex, renderArgs, freeWardrobeBox } = args;
  if (!box) return null;

  const isFreePlacement = box.freePlacement === true;
  const height = resolveSketchBoxHeight({
    rawHeight: box.heightM,
    fallbackHeight: box.hM,
    woodThick: renderArgs.woodThick,
    spanH: renderArgs.spanH,
    isFreePlacement,
  });
  if (height == null) return null;

  const geometryResolved = resolveSketchBoxShellGeometry({
    box,
    isFreePlacement,
    height,
    renderArgs,
    freeWardrobeBox,
  });
  if (!geometryResolved || !Number.isFinite(geometryResolved.centerY)) return null;

  const boxIdRaw = box.id;
  const boxId = boxIdRaw != null ? String(boxIdRaw) : String(boxIndex);
  const boxPid = isFreePlacement
    ? renderArgs.moduleKeyStr
      ? `sketch_box_free_${renderArgs.moduleKeyStr}_${boxId}`
      : `sketch_box_free_${boxId}`
    : renderArgs.moduleKeyStr
      ? `sketch_box_${renderArgs.moduleKeyStr}_${boxId}`
      : `sketch_box_${boxId}`;

  const boxMat = resolveSketchBoxShellMaterial({
    getPartMaterial: renderArgs.getPartMaterial,
    isFn: renderArgs.isFn,
    boxPid,
    fallback: renderArgs.bodyMat,
  });

  const halfH = height / 2;
  const state: ResolvedSketchBoxState = {
    box,
    boxId,
    boxPid,
    isFreePlacement,
    height,
    halfH,
    centerY: geometryResolved.centerY,
    sideH: Math.max(renderArgs.woodThick, height - 2 * renderArgs.woodThick),
    boxMat,
    geometry: geometryResolved.geometry,
    innerBottomY: geometryResolved.centerY - halfH + renderArgs.woodThick,
    innerTopY: geometryResolved.centerY + halfH - renderArgs.woodThick,
    regularDepth:
      geometryResolved.geometry.innerD > 0
        ? Math.min(geometryResolved.geometry.innerD, INTERIOR_FITTINGS_DIMENSIONS.shelves.regularDepthM)
        : geometryResolved.geometry.innerD,
    frontZ: geometryResolved.geometry.innerBackZ + geometryResolved.geometry.innerD,
  };

  renderSketchBoxShellFrame({ state, renderArgs });
  return { state, absEntry: geometryResolved.absEntry };
}
