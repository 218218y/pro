import { MATERIAL_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import { buildSketchBoxStackAwareMeasurementEntries } from './canvas_picking_sketch_neighbor_measurements.js';
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

export function resolveSketchBoxShelfPreview(
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
    shelfVariant,
    shelfDepthOverrideM,
    removeEpsShelf = 0.02,
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

  const variant = shelfVariant || 'regular';
  const isBrace = variant === 'brace';
  const isDouble = variant === 'double' || !variant;
  const shelfH =
    variant === 'glass'
      ? MATERIAL_DIMENSIONS.glassShelf.thicknessM
      : isDouble
        ? Math.max(woodThick, woodThick * 2)
        : woodThick;
  let previewY = clampBoxCenterY(pointerY, shelfH / 2);
  const localShelves = readRecordArray(targetBox, 'shelves');
  let previewSegment: SketchBoxSegmentLike | null = activeSegment;
  let op: 'add' | 'remove' = 'add';
  let removeId: string | null = null;
  let removeIdx: number | null = null;
  let bestDy = Infinity;
  let removePreviewY: number | null = null;

  for (let i = 0; i < localShelves.length; i++) {
    const it = localShelves[i];
    const n = readRecordNumber(it, 'yNorm');
    if (n == null) continue;
    const itemXNormRaw = readRecordValue(it, 'xNorm');
    const itemXNorm =
      typeof itemXNormRaw === 'number' ? itemXNormRaw : itemXNormRaw != null ? Number(itemXNormRaw) : NaN;
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
    const yAbs = clampBoxCenterY(targetCenterY - targetHeight / 2 + clampUnit(n) * targetHeight, shelfH / 2);
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

  const shelfDepth =
    shelfDepthOverrideM != null && Number.isFinite(shelfDepthOverrideM) && shelfDepthOverrideM > 0
      ? Math.min(targetGeo.innerD, Math.max(woodThick, shelfDepthOverrideM))
      : isBrace
        ? targetGeo.innerD
        : Math.min(targetGeo.innerD, 0.45);
  const shelfSegment = previewSegment || activeSegment;
  const shelfCenterX = readFiniteSegmentNumber(shelfSegment, 'centerX') ?? targetGeo.centerX;
  const shelfInnerW = readFiniteSegmentNumber(shelfSegment, 'width') ?? targetGeo.innerW;
  const previewW = Math.max(0.02, shelfInnerW - (isBrace ? 0.002 : 0.014));
  const previewZ = targetGeo.innerBackZ + shelfDepth / 2;
  const clearanceMeasurements = buildSketchBoxStackAwareMeasurementEntries({
    bottomY: targetCenterY - targetHeight / 2 + woodThick,
    topY: targetCenterY + targetHeight / 2 - woodThick,
    totalHeight: targetHeight,
    pad: woodThick,
    woodThick,
    neighborBottomY: targetCenterY - targetHeight / 2,
    neighborTopY: targetCenterY + targetHeight / 2,
    neighborTotalHeight: targetHeight,
    neighborPad: woodThick,
    targetBox,
    targetGeo,
    activeSegment: shelfSegment,
    boxSegments,
    pickSegment: pickSketchBoxSegment,
    targetCenterX: shelfCenterX,
    targetCenterY: previewY,
    targetWidth: previewW,
    targetHeight: shelfH,
    z: previewZ + shelfDepth / 2 + Math.max(0.004, shelfDepth * 0.08),
    styleKey: 'cell',
    textScale: 0.82,
  });

  return {
    hoverRecord: createManualLayoutSketchBoxContentHoverRecord({
      host,
      contentKind: 'shelf',
      boxId,
      freePlacement,
      op,
      boxYNorm: boxYNormFromCenter(previewY),
      contentXNorm: readFiniteSegmentNumber(shelfSegment, 'xNorm') ?? 0.5,
      variant,
      depthM: shelfDepth,
      removeId,
      removeIdx,
    }),
    preview: {
      kind: 'shelf',
      variant,
      x: shelfCenterX,
      y: previewY,
      z: previewZ,
      w: previewW,
      h: shelfH,
      d: shelfDepth,
      woodThick,
      op,
      clearanceMeasurements,
    },
  };
}
