import {
  asNumberOrNull,
  asSketchFreePlacementBox,
  clampSketchFreeBoxCenterYToWorkspace,
  resolveSketchFreeBoxGeometry,
} from './canvas_picking_sketch_free_box_shared.js';
import { resolveSketchFreeBoxPlacementGap } from './canvas_picking_sketch_free_box_gap.js';

export function resolveSketchFreeBoxNonOverlappingPlacement(args: {
  centerX: number;
  centerY: number;
  boxW: number;
  boxH: number;
  wardrobeCenterY: number;
  wardrobeHeight: number;
  wardrobeWidth: number;
  wardrobeDepth: number;
  backZ: number;
  woodThick: number;
  freeBoxes: unknown[];
  pad?: number;
  ignoreBoxId?: unknown;
  attachment?: {
    fixedAxis: 'x' | 'y';
    direction: -1 | 1;
    anchorX: number;
    anchorY: number;
  } | null;
}): { centerX: number; centerY: number } {
  let centerX = Number(args.centerX);
  let centerY = clampSketchFreeBoxCenterYToWorkspace({
    centerY: Number(args.centerY),
    boxH: Number(args.boxH),
    wardrobeCenterY: Number(args.wardrobeCenterY),
    wardrobeHeight: Number(args.wardrobeHeight),
    pad: args.pad,
  });
  const boxW = Number(args.boxW);
  const boxH = Number(args.boxH);
  const wardrobeWidth = Number(args.wardrobeWidth);
  const wardrobeDepth = Number(args.wardrobeDepth);
  const backZ = Number(args.backZ);
  const woodThick = Number(args.woodThick);
  const pad = asNumberOrNull(args.pad) ?? 0;
  const freeBoxes = Array.isArray(args.freeBoxes) ? args.freeBoxes : [];
  const ignoreBoxId = args.ignoreBoxId != null ? String(args.ignoreBoxId) : '';
  const attachment = args.attachment && typeof args.attachment === 'object' ? args.attachment : null;
  const attachmentFixedAxis =
    attachment?.fixedAxis === 'x' || attachment?.fixedAxis === 'y' ? attachment.fixedAxis : null;
  const attachmentDirection =
    attachment?.direction === -1 || attachment?.direction === 1 ? attachment.direction : null;
  const attachmentAnchorX =
    attachment && Number.isFinite(Number(attachment.anchorX)) ? Number(attachment.anchorX) : centerX;
  const attachmentAnchorY =
    attachment && Number.isFinite(Number(attachment.anchorY)) ? Number(attachment.anchorY) : centerY;
  if (
    !Number.isFinite(centerX) ||
    !Number.isFinite(centerY) ||
    !(boxW > 0) ||
    !(boxH > 0) ||
    !freeBoxes.length
  ) {
    return { centerX, centerY };
  }

  const halfW = boxW / 2;
  const halfH = boxH / 2;
  const startX = centerX;
  const startY = centerY;
  const gap = resolveSketchFreeBoxPlacementGap({ boxW, boxH });
  const overlapEps = Math.max(1e-7, Math.min(1e-4, gap * 0.05));
  const maxPasses = Math.max(1, freeBoxes.length * 3);

  for (let pass = 0; pass < maxPasses; pass++) {
    let moved = false;
    for (let i = 0; i < freeBoxes.length; i++) {
      const it = asSketchFreePlacementBox(freeBoxes[i]);
      if (!it) continue;
      const boxIdRaw = it.id;
      if (ignoreBoxId && boxIdRaw != null && String(boxIdRaw) === ignoreBoxId) continue;

      const cx = asNumberOrNull(it.absX);
      const cy = asNumberOrNull(it.absY);
      let hM = asNumberOrNull(it.heightM);
      const wM = asNumberOrNull(it.widthM);
      const dM = asNumberOrNull(it.depthM);
      if (cx == null || cy == null || hM == null || !(hM > 0)) continue;
      hM = Math.max(0.05, hM);

      const geo = resolveSketchFreeBoxGeometry({
        wardrobeWidth,
        wardrobeDepth,
        backZ,
        centerX: cx,
        woodThick,
        widthM: wM != null && wM > 0 ? wM : null,
        depthM: dM != null && dM > 0 ? dM : null,
      });
      const otherHalfW = geo.outerW / 2;
      const otherHalfH = hM / 2;
      const overlapX = halfW + otherHalfW + gap - Math.abs(centerX - cx);
      const overlapY = halfH + otherHalfH + gap - Math.abs(centerY - cy);
      if (!(overlapX > overlapEps) || !(overlapY > overlapEps)) continue;

      const sameSideX = {
        centerX: cx + (startX >= cx ? 1 : -1) * (otherHalfW + halfW + gap),
        centerY,
      };
      const oppositeSideX = {
        centerX: cx + (startX >= cx ? -1 : 1) * (otherHalfW + halfW + gap),
        centerY,
      };
      const sameSideY = {
        centerX,
        centerY: clampSketchFreeBoxCenterYToWorkspace({
          centerY: cy + (startY >= cy ? 1 : -1) * (otherHalfH + halfH + gap),
          boxH,
          wardrobeCenterY: Number(args.wardrobeCenterY),
          wardrobeHeight: Number(args.wardrobeHeight),
          pad,
        }),
      };
      const oppositeSideY = {
        centerX,
        centerY: clampSketchFreeBoxCenterYToWorkspace({
          centerY: cy + (startY >= cy ? -1 : 1) * (otherHalfH + halfH + gap),
          boxH,
          wardrobeCenterY: Number(args.wardrobeCenterY),
          wardrobeHeight: Number(args.wardrobeHeight),
          pad,
        }),
      };
      const attachedSideX =
        attachmentFixedAxis === 'x' && attachmentDirection != null
          ? {
              centerX: cx + attachmentDirection * (otherHalfW + halfW + gap),
              centerY,
            }
          : null;
      const attachedSideY =
        attachmentFixedAxis === 'y' && attachmentDirection != null
          ? {
              centerX,
              centerY: clampSketchFreeBoxCenterYToWorkspace({
                centerY: cy + attachmentDirection * (otherHalfH + halfH + gap),
                boxH,
                wardrobeCenterY: Number(args.wardrobeCenterY),
                wardrobeHeight: Number(args.wardrobeHeight),
                pad,
              }),
            }
          : null;
      const candidates =
        attachmentFixedAxis === 'x'
          ? [attachedSideX || sameSideX, sameSideX, oppositeSideX, sameSideY, oppositeSideY]
          : attachmentFixedAxis === 'y'
            ? [attachedSideY || sameSideY, sameSideY, oppositeSideY, sameSideX, oppositeSideX]
            : [sameSideX, oppositeSideX, sameSideY, oppositeSideY];

      let best: {
        centerX: number;
        centerY: number;
        score: number;
      } | null = null;

      for (let ci = 0; ci < candidates.length; ci++) {
        const candidate = candidates[ci];
        const candidateOverlapX = halfW + otherHalfW + gap - Math.abs(candidate.centerX - cx);
        const candidateOverlapY = halfH + otherHalfH + gap - Math.abs(candidate.centerY - cy);
        if (candidateOverlapX > overlapEps && candidateOverlapY > overlapEps) continue;
        let score = Math.abs(candidate.centerX - startX) + Math.abs(candidate.centerY - startY);
        if (attachmentFixedAxis === 'x') {
          score += Math.abs(candidate.centerX - attachmentAnchorX) * 12;
          const candidateDirection = candidate.centerX >= cx ? 1 : -1;
          if (attachmentDirection != null && candidateDirection !== attachmentDirection) score += 1000;
        } else if (attachmentFixedAxis === 'y') {
          score += Math.abs(candidate.centerY - attachmentAnchorY) * 12;
          const candidateDirection = candidate.centerY >= cy ? 1 : -1;
          if (attachmentDirection != null && candidateDirection !== attachmentDirection) score += 1000;
        }
        if (!best || score < best.score) {
          best = {
            centerX: candidate.centerX,
            centerY: candidate.centerY,
            score,
          };
        }
      }
      if (!best) continue;
      if (Math.abs(best.centerX - centerX) <= 0.000001 && Math.abs(best.centerY - centerY) <= 0.000001)
        continue;
      centerX = best.centerX;
      centerY = best.centerY;
      moved = true;
      break;
    }
    if (!moved) break;
  }

  return { centerX, centerY };
}
