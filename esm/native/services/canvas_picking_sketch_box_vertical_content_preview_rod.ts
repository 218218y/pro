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

export function resolveSketchBoxRodPreview(
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
    removeEpsShelf = SKETCH_BOX_DIMENSIONS.preview.removeEpsShelfM,
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

  const previewDims = SKETCH_BOX_DIMENSIONS.preview;
  const rodRadius = INTERIOR_FITTINGS_DIMENSIONS.rods.radiusM;
  let previewY = clampBoxCenterY(pointerY, rodRadius);
  let previewSegment: SketchBoxSegmentLike | null = activeSegment;
  let op: 'add' | 'remove' = 'add';
  let removeId: string | null = null;
  let removeIdx: number | null = null;
  let bestDy = Infinity;
  let removePreviewY: number | null = null;

  const localRods = readRecordArray(targetBox, 'rods');
  for (let i = 0; i < localRods.length; i++) {
    const it = localRods[i];
    const n = readRecordNumber(it, 'yNorm');
    if (n == null) continue;
    const itemXNorm = readRecordNumber(it, 'xNorm');
    const itemSegment =
      Number.isFinite(itemXNorm) && boxSegments.length
        ? pickSketchBoxSegment({
            segments: boxSegments,
            boxCenterX: targetGeo.centerX,
            innerW: targetGeo.innerW,
            xNorm: itemXNorm ?? undefined,
          })
        : null;
    if (activeSegment && itemSegment && itemSegment.index !== activeSegment.index) continue;
    const yAbs = clampBoxCenterY(targetCenterY - targetHeight / 2 + clampUnit(n) * targetHeight, rodRadius);
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

  if (bestDy <= removeEpsShelf && removePreviewY != null) {
    op = 'remove';
    previewY = removePreviewY;
  }

  const rodSegment = previewSegment || activeSegment;
  const rodCenterX = readFiniteSegmentNumber(rodSegment, 'centerX') ?? targetGeo.centerX;
  const rodWidth = readFiniteSegmentNumber(rodSegment, 'width') ?? targetGeo.innerW;

  return {
    hoverRecord: createManualLayoutSketchBoxContentHoverRecord({
      host,
      contentKind: 'rod',
      boxId,
      freePlacement,
      op,
      boxYNorm: boxYNormFromCenter(previewY),
      contentXNorm: readFiniteSegmentNumber(rodSegment, 'xNorm') ?? 0.5,
      removeId,
      removeIdx,
    }),
    preview: {
      kind: 'rod',
      x: rodCenterX,
      y: previewY,
      z: targetGeo.innerBackZ + targetGeo.innerD / 2,
      w: Math.max(previewDims.rodMinLengthM, rodWidth - previewDims.rodWidthClearanceM),
      h: previewDims.rodPreviewHeightM,
      d: previewDims.rodPreviewDepthM,
      woodThick,
      op,
    },
  };
}
