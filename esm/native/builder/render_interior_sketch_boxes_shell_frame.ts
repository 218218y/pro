import type {
  RenderInteriorSketchBoxesArgs,
  ResolvedSketchBoxState,
} from './render_interior_sketch_boxes_shared.js';

import { asMesh } from './render_interior_sketch_shared.js';
import { applySketchBoxPickMeta } from './render_interior_sketch_pick_meta.js';
import { renderSketchFreeBoxDimensions } from './render_interior_sketch_layout.js';
import { renderSketchBoxCarcassAdornment } from './render_interior_sketch_visuals.js';

export function renderSketchBoxShellFrame(args: {
  state: ResolvedSketchBoxState;
  renderArgs: RenderInteriorSketchBoxesArgs;
}): void {
  const { state, renderArgs } = args;
  const {
    createBoard,
    group,
    moduleKeyStr,
    input,
    getPartMaterial,
    THREE,
    addDimensionLine,
    renderFreeBoxDimensionsEnabled,
    freeBoxDimensionEntries,
  } = renderArgs;
  const { box, boxId, boxPid, isFreePlacement, height, halfH, centerY, sideH, boxMat, geometry } = state;

  const yTop = centerY + halfH - renderArgs.woodThick / 2;
  const yBot = centerY - halfH + renderArgs.woodThick / 2;
  const xL = geometry.centerX - geometry.outerW / 2 + renderArgs.woodThick / 2;
  const xR = geometry.centerX + geometry.outerW / 2 - renderArgs.woodThick / 2;
  const backPanelZ = geometry.centerZ - geometry.outerD / 2 + renderArgs.woodThick / 2;

  const boxTopMesh = asMesh(
    createBoard(
      geometry.outerW,
      renderArgs.woodThick,
      geometry.outerD,
      geometry.centerX,
      yTop,
      geometry.centerZ,
      boxMat,
      boxPid
    )
  );
  const boxBottomMesh = asMesh(
    createBoard(
      geometry.outerW,
      renderArgs.woodThick,
      geometry.outerD,
      geometry.centerX,
      yBot,
      geometry.centerZ,
      boxMat,
      boxPid
    )
  );
  const boxLeftMesh = asMesh(
    createBoard(renderArgs.woodThick, sideH, geometry.outerD, xL, centerY, geometry.centerZ, boxMat, boxPid)
  );
  const boxRightMesh = asMesh(
    createBoard(renderArgs.woodThick, sideH, geometry.outerD, xR, centerY, geometry.centerZ, boxMat, boxPid)
  );
  const boxBackMesh = asMesh(
    createBoard(
      geometry.innerW,
      sideH,
      renderArgs.woodThick,
      geometry.centerX,
      centerY,
      backPanelZ,
      boxMat,
      boxPid
    )
  );
  applySketchBoxPickMeta(boxTopMesh, boxPid, moduleKeyStr, boxId);
  applySketchBoxPickMeta(boxBottomMesh, boxPid, moduleKeyStr, boxId);
  applySketchBoxPickMeta(boxLeftMesh, boxPid, moduleKeyStr, boxId);
  applySketchBoxPickMeta(boxRightMesh, boxPid, moduleKeyStr, boxId);
  applySketchBoxPickMeta(boxBackMesh, boxPid, moduleKeyStr, boxId);

  if (THREE) {
    renderSketchBoxCarcassAdornment({
      THREE,
      group,
      box,
      boxPid,
      moduleKeyStr,
      boxId,
      boxGeo: {
        centerX: geometry.centerX,
        centerZ: geometry.centerZ,
        outerW: geometry.outerW,
        outerD: geometry.outerD,
      },
      boxCenterY: centerY,
      boxHeight: height,
      woodThick: renderArgs.woodThick,
      bodyMat: boxMat,
      getPartMaterial,
      addOutlines: input.addOutlines,
      isFreePlacement,
    });
  }

  if (isFreePlacement && renderFreeBoxDimensionsEnabled && THREE && addDimensionLine) {
    if (Array.isArray(freeBoxDimensionEntries)) {
      freeBoxDimensionEntries.push({
        centerX: geometry.centerX,
        centerY,
        centerZ: geometry.centerZ,
        width: geometry.outerW,
        height,
        depth: geometry.outerD,
      });
    } else {
      renderSketchFreeBoxDimensions({
        THREE,
        addDimensionLine,
        centerX: geometry.centerX,
        centerY,
        centerZ: geometry.centerZ,
        width: geometry.outerW,
        height,
        depth: geometry.outerD,
      });
    }
  }
}
