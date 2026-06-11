import type { RenderSketchBoxStaticContentsArgs } from './render_interior_sketch_boxes_contents_parts_types.js';
import type { SketchShelfExtra } from './render_interior_sketch_shared.js';

import { asMesh, asRecordArray } from './render_interior_sketch_shared.js';
import {
  normalizeSketchShelfVariant,
  resolveSketchBoxSegmentForContent,
} from './render_interior_sketch_layout.js';
import { resolveSketchBoxShelfMaterial } from './render_interior_sketch_boxes_contents_parts_materials.js';

export function renderSketchBoxContentShelves(args: RenderSketchBoxStaticContentsArgs): void {
  const { shell, boxDividers, yFromBoxNorm } = args;
  const {
    createBoard,
    woodThick,
    currentShelfMat,
    getPartMaterial,
    getPartColorValue,
    THREE,
    glassMat,
    addBraceDarkSeams,
    addShelfPins,
    isFn,
  } = args.args;
  const { box, boxPid, geometry, regularDepth } = shell;

  const boxShelves = asRecordArray<SketchShelfExtra>(box.shelves);
  for (let si = 0; si < boxShelves.length; si++) {
    const shelf = boxShelves[si] || null;
    if (!shelf) continue;
    const variant = normalizeSketchShelfVariant(shelf.variant);
    const isBrace = variant === 'brace';
    const isGlass = variant === 'glass';
    const isDouble = variant === 'double' || !variant;
    const shelfH = isGlass ? 0.018 : isDouble ? Math.max(woodThick, woodThick * 2) : woodThick;
    const shelfY = yFromBoxNorm(shelf.yNorm, shelfH / 2);
    if (shelfY == null) continue;
    const shelfSegment = resolveSketchBoxSegmentForContent({
      dividers: boxDividers,
      boxCenterX: geometry.centerX,
      innerW: geometry.innerW,
      woodThick,
      xNorm: shelf.xNorm,
    });
    let shelfDepth = isBrace ? geometry.innerD : regularDepth;
    const depthRaw = shelf.depthM;
    const depthM = typeof depthRaw === 'number' ? depthRaw : depthRaw != null ? Number(depthRaw) : NaN;
    if (Number.isFinite(depthM) && depthM > 0)
      shelfDepth = Math.min(geometry.innerD, Math.max(woodThick, depthM));
    const shelfPid = `${boxPid}_shelf_${String(shelf.id ?? si)}`;
    const shelfMat = resolveSketchBoxShelfMaterial({
      getPartMaterial,
      getPartColorValue,
      isFn,
      partId: shelfPid,
      isGlass,
      glassMat,
      currentShelfMat,
    });
    const shelfInnerW = shelfSegment ? shelfSegment.width : geometry.innerW;
    const shelfCenterX = shelfSegment ? shelfSegment.centerX : geometry.centerX;
    const shelfW = Math.max(0.02, shelfInnerW - (isBrace ? 0.002 : 0.014));
    const shelfZ = geometry.innerBackZ + shelfDepth / 2;
    const mesh = asMesh(
      createBoard(shelfW, shelfH, shelfDepth, shelfCenterX, shelfY, shelfZ, shelfMat, shelfPid)
    );
    if (isBrace) {
      const boxLeftFaceX = shelfSegment ? shelfSegment.leftX : geometry.centerX - geometry.innerW / 2;
      const boxRightFaceX = shelfSegment ? shelfSegment.rightX : geometry.centerX + geometry.innerW / 2;
      addBraceDarkSeams(shelfY, shelfZ, shelfDepth, true, THREE, boxLeftFaceX, boxRightFaceX);
    }
    if (isGlass && mesh && typeof mesh === 'object') {
      mesh.userData = mesh.userData || {};
      mesh.userData.__keepMaterial = true;
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      mesh.renderOrder = 2;
    }
    addShelfPins(
      shelfCenterX,
      shelfY,
      shelfZ,
      shelfW,
      shelfH,
      shelfDepth,
      !isBrace && (isDouble || isGlass || variant === 'regular')
    );
  }
}
