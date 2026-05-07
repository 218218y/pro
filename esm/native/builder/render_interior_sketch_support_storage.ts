import { INTERIOR_FITTINGS_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import type { ApplySketchStorageBarriersArgs } from './render_interior_sketch_support_contracts.js';

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

  const storageDims = INTERIOR_FITTINGS_DIMENSIONS.storage;
  const padFront = Math.min(
    storageDims.clampPadMaxM,
    Math.max(storageDims.clampPadMinM, woodThick * storageDims.clampPadWoodRatio)
  );
  const frontZ = internalZ + internalDepth / 2;
  const barrierZ = frontZ + storageDims.barrierFrontZOffsetM;
  const barrierW = Math.max(storageDims.barrierWidthMinM, innerW - storageDims.barrierWidthClearanceM);
  const barrierD = Math.max(storageDims.previewThicknessMinM, woodThick);

  for (let i = 0; i < storageBarriers.length; i++) {
    const barrier = storageBarriers[i] || null;
    if (!barrier) continue;

    let heightM = Number(barrier.heightM);
    if (!Number.isFinite(heightM)) heightM = Number(barrier.hM);
    if (!Number.isFinite(heightM)) continue;
    if (heightM < woodThick * storageDims.minHeightWoodMultiplier + storageDims.minHeightExtraM) {
      heightM = woodThick * storageDims.minHeightWoodMultiplier + storageDims.minHeightExtraM;
    }
    if (heightM > spanH) heightM = spanH;
    const halfH = heightM / 2;

    const yNormRaw = barrier.yNorm;
    const yNorm = typeof yNormRaw === 'number' ? yNormRaw : Number(yNormRaw);
    if (!Number.isFinite(yNorm)) continue;

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
