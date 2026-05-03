import type { RenderSketchBoxStaticContentsArgs } from './render_interior_sketch_boxes_contents_parts_types.js';
import type { SketchStorageBarrierExtra } from './render_interior_sketch_shared.js';

import { asRecordArray } from './render_interior_sketch_shared.js';
import { resolveSketchBoxSegmentForContent } from './render_interior_sketch_layout.js';
import { resolveSketchBoxContentPartMaterial } from './render_interior_sketch_boxes_contents_parts_materials.js';

export function renderSketchBoxContentStorageBarriers(args: RenderSketchBoxStaticContentsArgs): void {
  const { shell, boxDividers, yFromBoxNorm } = args;
  const { createBoard, woodThick, bodyMat, getPartMaterial, isFn } = args.args;
  const { box, boxPid, sideH, geometry, frontZ } = shell;

  const boxStorageBarriers = asRecordArray<SketchStorageBarrierExtra>(box.storageBarriers);
  for (let barrierIndex = 0; barrierIndex < boxStorageBarriers.length; barrierIndex++) {
    const barrier = boxStorageBarriers[barrierIndex] || null;
    if (!barrier) continue;
    let barrierH = Number(barrier.heightM);
    if (!Number.isFinite(barrierH)) barrierH = Number(barrier.hM);
    if (!Number.isFinite(barrierH)) continue;
    barrierH = Math.max(woodThick * 2 + 0.02, Math.min(barrierH, Math.max(woodThick * 2 + 0.02, sideH)));
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
    });
    const barrierW = Math.max(0.02, (barrierSegment ? barrierSegment.width : geometry.innerW) - 0.025);
    const barrierX = barrierSegment ? barrierSegment.centerX : geometry.centerX;
    const barrierD = Math.max(0.0001, woodThick);
    const barrierZ = Math.max(
      geometry.innerBackZ + barrierD / 2,
      frontZ - Math.min(0.06, Math.max(0.02, geometry.innerD * 0.35))
    );
    createBoard(barrierW, barrierH, barrierD, barrierX, barrierY, barrierZ, barrierMat, barrierPid);
  }
}
