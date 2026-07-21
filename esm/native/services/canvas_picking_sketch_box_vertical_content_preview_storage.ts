import {
  INTERIOR_STORAGE_BARRIER_POLICY,
  INTERIOR_STORAGE_PREVIEW_POLICY,
} from '../../shared/dimensions/interior_storage_policy.js';
import {
  SKETCH_BOX_PREVIEW_CORE_POLICY,
  SKETCH_BOX_SHELF_PREVIEW_POLICY,
  SKETCH_BOX_STORAGE_PREVIEW_POLICY,
} from '../../shared/dimensions/sketch_box_preview_policy.js';
import { formatIdentityValue, readIdentityValue } from '../../shared/identity_value_shared.js';
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
import {
  buildSketchBoxVerticalPreviewBlockers,
  doesSketchBoxVerticalCandidateCollide,
  findSketchBoxVerticalRemovalBlocker,
  resolveSketchBoxVerticalRemovalPreview,
} from './canvas_picking_sketch_box_vertical_content_occupancy.js';

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
    removeEpsBox = SKETCH_BOX_PREVIEW_CORE_POLICY.removeEpsBoxM,
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
    hasVerticalRoomFor,
  } = state;

  const barrierHeight =
    storageHeight != null && Number.isFinite(storageHeight) && storageHeight > 0
      ? storageHeight
      : INTERIOR_STORAGE_BARRIER_POLICY.barrierHeightM;
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
    const itemXNormRaw = readRecordValue(it, 'xNorm');
    const itemXNorm = readRecordNumber(it, 'xNorm');
    if (itemXNormRaw != null && itemXNorm == null) continue;
    const itemSegment =
      itemXNorm != null && boxSegments.length
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
      removeId = formatIdentityValue(readIdentityValue(idRaw)) || null;
      removeIdx = i;
      previewSegment = itemSegment || activeSegment;
    }
  }

  if (bestDy <= removeEpsBox && removePreviewY != null) {
    op = 'remove';
    previewY = removePreviewY;
  }

  const blockers = buildSketchBoxVerticalPreviewBlockers(args, state);
  if (op === 'add') {
    const storageRemoval = findSketchBoxVerticalRemovalBlocker({
      blockers,
      pointerY,
      allowedKinds: ['storage'],
      toleranceM: removeEpsBox,
    });
    if (storageRemoval) {
      return resolveSketchBoxVerticalRemovalPreview({
        previewArgs: args,
        state,
        blocker: storageRemoval,
        previewSegment,
      });
    }
  }

  const blockedReason =
    op === 'add' && !hasVerticalRoomFor(barrierHeight)
      ? 'no-room'
      : op === 'add' &&
          doesSketchBoxVerticalCandidateCollide({
            blockers,
            centerY: previewY,
            heightM: barrierHeight,
            blockerKinds: ['storage'],
          })
        ? 'collision'
        : null;

  const storageSegment = previewSegment || activeSegment;
  const barrierCenterX = readFiniteSegmentNumber(storageSegment, 'centerX') ?? targetGeo.centerX;
  const barrierWidth = readFiniteSegmentNumber(storageSegment, 'width') ?? targetGeo.innerW;
  const barrierZ = Math.max(
    targetGeo.innerBackZ + SKETCH_BOX_STORAGE_PREVIEW_POLICY.storageBarrierBackInsetM,
    targetGeo.innerBackZ +
      targetGeo.innerD -
      Math.min(
        SKETCH_BOX_STORAGE_PREVIEW_POLICY.storageBarrierDepthClearanceMaxM,
        Math.max(
          SKETCH_BOX_STORAGE_PREVIEW_POLICY.storageBarrierDepthClearanceMinM,
          targetGeo.innerD * SKETCH_BOX_STORAGE_PREVIEW_POLICY.storageBarrierDepthClearanceRatio
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
      blockedReason,
    }),
    preview: {
      kind: 'storage',
      x: barrierCenterX,
      y: previewY,
      z: barrierZ,
      w: Math.max(
        SKETCH_BOX_SHELF_PREVIEW_POLICY.shelfMinWidthM,
        barrierWidth - INTERIOR_STORAGE_BARRIER_POLICY.barrierWidthClearanceM
      ),
      h: barrierHeight,
      d: Math.max(INTERIOR_STORAGE_PREVIEW_POLICY.previewThicknessMinM, woodThick),
      woodThick,
      op: blockedReason ? 'blocked' : op,
      blockedReason: blockedReason ?? undefined,
    },
  };
}
