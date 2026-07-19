import {
  INTERIOR_STORAGE_BARRIER_POLICY,
  INTERIOR_STORAGE_CLAMP_POLICY,
  INTERIOR_STORAGE_LAYOUT_POLICY,
  INTERIOR_STORAGE_PREVIEW_POLICY,
} from '../../shared/dimensions/interior_storage_policy.js';
import type { ApplySketchStorageBarriersArgs } from './render_interior_sketch_support_contracts.js';
import { toFiniteNumber } from './render_interior_sketch_shared.js';

export function applySketchStorageBarriers(args: ApplySketchStorageBarriersArgs): void {
  const {
    storageBarriers,
    effectiveBottomY,
    effectiveTopY,
    spanH,
    woodThick,
    innerW,
    internalCenterX,
    internalDepth,
    internalZ,
    moduleKeyStr,
    bodyMat,
    getPartMaterial,
    isFn,
    createBoard,
  } = args;
  if (!storageBarriers.length) return;

  const padFront = Math.min(
    INTERIOR_STORAGE_CLAMP_POLICY.clampPadMaxM,
    Math.max(
      INTERIOR_STORAGE_CLAMP_POLICY.clampPadMinM,
      woodThick * INTERIOR_STORAGE_CLAMP_POLICY.clampPadWoodRatio
    )
  );
  const frontZ = internalZ + internalDepth / 2;
  const barrierZ = frontZ + INTERIOR_STORAGE_BARRIER_POLICY.barrierFrontZOffsetM;
  const barrierW = Math.max(
    INTERIOR_STORAGE_BARRIER_POLICY.barrierWidthMinM,
    innerW - INTERIOR_STORAGE_BARRIER_POLICY.barrierWidthClearanceM
  );
  const barrierD = Math.max(INTERIOR_STORAGE_PREVIEW_POLICY.previewThicknessMinM, woodThick);

  for (let i = 0; i < storageBarriers.length; i++) {
    const barrier = storageBarriers[i] || null;
    if (!barrier) continue;

    let heightM = toFiniteNumber(barrier.heightM);
    if (heightM == null) heightM = toFiniteNumber(barrier.hM);
    if (heightM == null) continue;
    if (
      heightM <
      woodThick * INTERIOR_STORAGE_LAYOUT_POLICY.minHeightWoodMultiplier +
        INTERIOR_STORAGE_LAYOUT_POLICY.minHeightExtraM
    ) {
      heightM =
        woodThick * INTERIOR_STORAGE_LAYOUT_POLICY.minHeightWoodMultiplier +
        INTERIOR_STORAGE_LAYOUT_POLICY.minHeightExtraM;
    }
    if (heightM > spanH) heightM = spanH;
    const halfH = heightM / 2;

    const yNorm = toFiniteNumber(barrier.yNorm);
    if (yNorm == null) continue;

    const cy0 = effectiveBottomY + Math.max(0, Math.min(1, yNorm)) * spanH;
    const loC = effectiveBottomY + padFront + halfH;
    const hiC = effectiveTopY - padFront - halfH;
    const cy = hiC > loC ? Math.max(loC, Math.min(hiC, cy0)) : cy0;

    const barrierId = barrier.id != null ? String(barrier.id) : String(i);
    const partId = moduleKeyStr
      ? `sketch_storage_${moduleKeyStr}_${barrierId}`
      : `sketch_storage_${barrierId}`;

    let barrierMat = bodyMat;
    try {
      if (isFn(getPartMaterial)) {
        const resolved = getPartMaterial(partId);
        if (resolved) barrierMat = resolved;
      }
    } catch {
      // ignore
    }

    createBoard(barrierW, heightM, barrierD, internalCenterX, cy, barrierZ, barrierMat, partId);
  }
}
