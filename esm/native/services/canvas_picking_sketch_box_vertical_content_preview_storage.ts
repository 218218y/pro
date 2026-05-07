import {
  INTERIOR_FITTINGS_DIMENSIONS,
  SKETCH_BOX_DIMENSIONS,
} from '../../shared/wardrobe_dimension_tokens_shared.js';
import { createManualLayoutSketchBoxContentHoverRecord } from './canvas_picking_manual_layout_sketch_hover_state.js';
import type {
  ResolveSketchBoxVerticalContentPreviewArgs,
  ResolveSketchBoxVerticalContentPreviewResult,
  SketchBoxSegmentLike,
} from './canvas_picking_sketch_box_vertical_content_preview_contracts.js';
import {
  clampUnit,
  readFiniteSegmentNumber,
  readRecordArray,
  readRecordNumber,
  readRecordValue,
} from './canvas_picking_sketch_box_vertical_content_preview_records.js';
import type { SketchBoxVerticalPreviewState } from './canvas_picking_sketch_box_vertical_content_preview_state.js';

export function resolveSketchBoxStoragePreview(
  args: ResolveSketchBoxVerticalContentPreviewArgs,
  state: SketchBoxVerticalPreviewState
): ResolveSketchBoxVerticalContentPreviewResult {
  const {
    host,
    boxId,
    freePlacement,
    targetBox,
    pointerY,
    woodThick,
    storageHeight,
    removeEpsBox = SKETCH_BOX_DIMENSIONS.preview.removeEpsBoxM,
    pickSketchBoxSegment,
  } = args;
  const {
    targetGeo,
    activeSegment,
    boxSegments,
    clampBoxCenterY,
    boxYNormFromCenter,
    targetCenterY,
    targetHeight,
  } = state;

  const storageDims = INTERIOR_FITTINGS_DIMENSIONS.storage;
  const previewDims = SKETCH_BOX_DIMENSIONS.preview;
  const barrierHeight =
    storageHeight != null && Number.isFinite(storageHeight) && storageHeight > 0
      ? storageHeight
      : storageDims.barrierHeightM;
  let previewY = clampBoxCenterY(pointerY, barrierHeight / 2);
  let previewSegment: SketchBoxSegmentLike | null = activeSegment;
  let op: 'add' | 'remove' = 'add';
  let removeId: string | null = null;
  let removeIdx: number | null = null;
  let bestDy = Infinity;
  let removePreviewY: number | null = null;

  const localStorage = readRecordArray(targetBox, 'storageBarriers');
  for (let i = 0; i < localStorage.length; i++) {
    const it = localStorage[i];
    const n = readRecordNumber(it, 'yNorm');
    if (n == null) continue;
    const hM = readRecordNumber(it, 'heightM');
    const itemH = hM != null && hM > 0 ? hM : barrierHeight;
    const itemXNorm = readRecordNumber(it, 'xNorm');
    const itemSegment =
      Number.isFinite(itemXNorm) && boxSegments.length
        ? pickSketchBoxSegment({
            segments: boxSegments,
            boxCenterX: targetGeo.centerX,
            innerW: targetGeo.innerW,
            xNorm: itemXNorm,
          })
        : null;
    if (activeSegment && itemSegment && itemSegment.index !== activeSegment.index) continue;
    const yAbs = clampBoxCenterY(targetCenterY - targetHeight / 2 + clampUnit(n) * targetHeight, itemH / 2);
    const dy = Math.abs(previewY - yAbs);
    if (dy < bestDy) {
      bestDy = dy;
      removePreviewY = yAbs;
      const idRaw = readRecordValue(it, 'id');
      removeId = idRaw != null ? String(idRaw) : null;
      removeIdx = i;
      previewSegment = itemSegment || activeSegment;
    }
  }

  if (bestDy <= removeEpsBox && removePreviewY != null) {
    op = 'remove';
    previewY = removePreviewY;
  }

  const storageSegment = previewSegment || activeSegment;
  const barrierCenterX = readFiniteSegmentNumber(storageSegment, 'centerX') ?? targetGeo.centerX;
  const barrierWidth = readFiniteSegmentNumber(storageSegment, 'width') ?? targetGeo.innerW;
  const barrierZ = Math.max(
    targetGeo.innerBackZ + previewDims.storageBarrierBackInsetM,
    targetGeo.innerBackZ +
      targetGeo.innerD -
      Math.min(
        previewDims.storageBarrierDepthClearanceMaxM,
        Math.max(
          previewDims.storageBarrierDepthClearanceMinM,
          targetGeo.innerD * previewDims.storageBarrierDepthClearanceRatio
        )
      )
  );

  return {
    hoverRecord: createManualLayoutSketchBoxContentHoverRecord({
      host,
      contentKind: 'storage',
      boxId,
      freePlacement,
      op,
      boxYNorm: boxYNormFromCenter(previewY),
      contentXNorm: readFiniteSegmentNumber(storageSegment, 'xNorm') ?? 0.5,
      heightM: barrierHeight,
      removeId,
      removeIdx,
    }),
    preview: {
      kind: 'storage',
      x: barrierCenterX,
      y: previewY,
      z: barrierZ,
      w: Math.max(
        SKETCH_BOX_DIMENSIONS.preview.shelfMinWidthM,
        barrierWidth - storageDims.barrierWidthClearanceM
      ),
      h: barrierHeight,
      d: Math.max(storageDims.previewThicknessMinM, woodThick),
      woodThick,
      op,
    },
  };
}
