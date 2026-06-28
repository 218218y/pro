import {
  INTERIOR_FITTINGS_DIMENSIONS,
  SKETCH_BOX_DIMENSIONS,
} from '../../shared/wardrobe_dimension_tokens_shared.js';
import type { RenderSketchBoxStaticContentsArgs } from './render_interior_sketch_boxes_contents_parts_types.js';
import type { SketchStorageBarrierExtra } from './render_interior_sketch_shared.js';

import { asRecordArray } from './render_interior_sketch_shared.js';
import { resolveSketchBoxSegmentForContent } from './render_interior_sketch_layout.js';
import { resolveSketchBoxContentPartMaterial } from './render_interior_sketch_boxes_contents_parts_materials.js';

function readPositiveNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}

export function renderSketchBoxContentStorageBarriers(args: RenderSketchBoxStaticContentsArgs): void {
  const { shell, boxDividers, boxHorizontalDividers, yFromBoxNorm } = args;
  const { createBoard, woodThick, bodyMat, getPartMaterial, isFn } = args.args;
  const { box, boxPid, sideH, geometry, frontZ } = shell;

  const boxStorageBarriers = asRecordArray<SketchStorageBarrierExtra>(box.storageBarriers);
  const storageDims = INTERIOR_FITTINGS_DIMENSIONS.storage;
  const previewDims = SKETCH_BOX_DIMENSIONS.preview;
  for (let barrierIndex = 0; barrierIndex < boxStorageBarriers.length; barrierIndex++) {
    const barrier = boxStorageBarriers[barrierIndex] || null;
    if (!barrier) continue;
    let barrierH = readPositiveNumber(barrier.heightM) ?? readPositiveNumber(barrier.hM);
    if (barrierH == null) continue;
    const minBarrierH = woodThick * storageDims.minHeightWoodMultiplier + storageDims.minHeightExtraM;
    barrierH = Math.max(minBarrierH, Math.min(barrierH, Math.max(minBarrierH, sideH)));
    const barrierY = yFromBoxNorm(barrier.yNorm, barrierH / 2);
    if (barrierY == null) continue;
    const barrierPid = `${boxPid}_storage_${String(barrier.id ?? barrierIndex)}`;
    const barrierMat = resolveSketchBoxContentPartMaterial({
      getPartMaterial,
      isFn,
      partId: barrierPid,
      defaultMaterial: bodyMat,
    });
    const barrierSegment = resolveSketchBoxSegmentForContent({
      dividers: boxDividers,
      boxCenterX: geometry.centerX,
      innerW: geometry.innerW,
      woodThick,
      xNorm: barrier.xNorm,
      horizontalDividers: boxHorizontalDividers,
      boxCenterY: shell.centerY,
      innerH: shell.sideH,
      yNorm: barrier.yNorm,
    });
    const barrierW = Math.max(
      storageDims.barrierWidthMinM,
      (barrierSegment ? barrierSegment.width : geometry.innerW) - storageDims.barrierWidthClearanceM
    );
    const barrierX = barrierSegment ? barrierSegment.centerX : geometry.centerX;
    const barrierD = Math.max(storageDims.previewThicknessMinM, woodThick);
    const barrierZ = Math.max(
      geometry.innerBackZ + barrierD / 2,
      frontZ -
        Math.min(
          previewDims.storageBarrierDepthClearanceMaxM,
          Math.max(
            previewDims.storageBarrierDepthClearanceMinM,
            geometry.innerD * previewDims.storageBarrierDepthClearanceRatio
          )
        )
    );
    createBoard(barrierW, barrierH, barrierD, barrierX, barrierY, barrierZ, barrierMat, barrierPid);
  }
}
