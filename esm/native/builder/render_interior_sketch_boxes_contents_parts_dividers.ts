import type { RenderSketchBoxStaticContentsArgs } from './render_interior_sketch_boxes_contents_parts_types.js';

import { resolveSketchBoxDividerPlacement } from './render_interior_sketch_layout.js';
import { resolveSketchBoxContentPartMaterial } from './render_interior_sketch_boxes_contents_parts_materials.js';

export function renderSketchBoxContentDividers(args: RenderSketchBoxStaticContentsArgs): void {
  const { shell, boxDividers } = args;
  const { createBoard, woodThick, getPartMaterial, isFn } = args.args;
  const { boxPid, centerY, sideH, boxMat, geometry } = shell;

  for (let di = 0; di < boxDividers.length; di++) {
    const divider = boxDividers[di];
    const dividerPlacement = resolveSketchBoxDividerPlacement({
      boxCenterX: geometry.centerX,
      innerW: geometry.innerW,
      woodThick,
      dividerXNorm: divider.xNorm,
    });
    const dividerPid = `${boxPid}_divider_${String(divider.id || di)}`;
    const dividerMat = resolveSketchBoxContentPartMaterial({
      getPartMaterial,
      isFn,
      partId: dividerPid,
      defaultMaterial: boxMat,
    });
    createBoard(
      Math.max(0.0001, woodThick),
      Math.max(0.0001, sideH),
      Math.max(0.0001, geometry.innerD),
      dividerPlacement.centerX,
      centerY,
      geometry.innerBackZ + geometry.innerD / 2,
      dividerMat,
      dividerPid
    );
  }
}
