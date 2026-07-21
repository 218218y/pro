import {
  INTERIOR_STORAGE_BARRIER_POLICY,
  INTERIOR_STORAGE_LAYOUT_POLICY,
  INTERIOR_STORAGE_PREVIEW_POLICY,
} from '../../shared/dimensions/interior_storage_policy.js';
import { SKETCH_BOX_STORAGE_PREVIEW_POLICY } from '../../shared/dimensions/sketch_box_preview_policy.js';
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
  for (let barrierIndex = 0; barrierIndex < boxStorageBarriers.length; barrierIndex++) {
    const barrier = boxStorageBarriers[barrierIndex] || null;
    if (!barrier) continue;
    let barrierH = readPositiveNumber(barrier.heightM) ?? readPositiveNumber(barrier.hM);
    if (barrierH == null) continue;
    const minBarrierH =
      woodThick * INTERIOR_STORAGE_LAYOUT_POLICY.minHeightWoodMultiplier +
      INTERIOR_STORAGE_LAYOUT_POLICY.minHeightExtraM;
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
      INTERIOR_STORAGE_BARRIER_POLICY.barrierWidthMinM,
      (barrierSegment ? barrierSegment.width : geometry.innerW) -
        INTERIOR_STORAGE_BARRIER_POLICY.barrierWidthClearanceM
    );
    const barrierX = barrierSegment ? barrierSegment.centerX : geometry.centerX;
    const barrierD = Math.max(INTERIOR_STORAGE_PREVIEW_POLICY.previewThicknessMinM, woodThick);
    const barrierZ = Math.max(
      geometry.innerBackZ + barrierD / 2,
      frontZ -
        Math.min(
          SKETCH_BOX_STORAGE_PREVIEW_POLICY.storageBarrierDepthClearanceMaxM,
          Math.max(
            SKETCH_BOX_STORAGE_PREVIEW_POLICY.storageBarrierDepthClearanceMinM,
            geometry.innerD * SKETCH_BOX_STORAGE_PREVIEW_POLICY.storageBarrierDepthClearanceRatio
          )
        )
    );
    createBoard(barrierW, barrierH, barrierD, barrierX, barrierY, barrierZ, barrierMat, barrierPid);
  }
}
