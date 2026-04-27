import {
  asNumberOrNull,
  asSketchFreePlacementBox,
  resolveSketchFreeBoxGeometry,
} from './canvas_picking_sketch_free_box_shared.js';
import type { SketchFreeBoxAttachPlacement } from './canvas_picking_sketch_free_box_placement_shared.js';

export function isSketchFreeInwardSideAttachmentBlocked(args: {
  targetCenterX: number;
  targetCenterY: number;
  targetW: number;
  targetH: number;
  previewW: number;
  pointX: number;
  pointY: number;
  candidate: SketchFreeBoxAttachPlacement;
  freeBoxes: unknown[];
  ignoreBoxId?: unknown;
  wardrobeWidth: number;
  wardrobeDepth: number;
  backZ: number;
  woodThick: number;
}): boolean {
  const candidate = args.candidate;
  if (!candidate || candidate.fixedAxis !== 'x') return false;

  const targetCenterX = Number(args.targetCenterX);
  const targetCenterY = Number(args.targetCenterY);
  const targetW = Number(args.targetW);
  const targetH = Number(args.targetH);
  const previewW = Number(args.previewW);
  const pointX = Number(args.pointX);
  const pointY = Number(args.pointY);
  const direction = candidate.direction;
  const ignoreBoxId = args.ignoreBoxId != null ? String(args.ignoreBoxId) : '';
  if (
    !Number.isFinite(targetCenterX) ||
    !Number.isFinite(targetCenterY) ||
    !Number.isFinite(targetW) ||
    !(targetW > 0) ||
    !Number.isFinite(targetH) ||
    !(targetH > 0) ||
    !Number.isFinite(previewW) ||
    !(previewW > 0) ||
    !Number.isFinite(pointX) ||
    !Number.isFinite(pointY) ||
    !(direction === -1 || direction === 1)
  ) {
    return false;
  }

  const targetHalfW = targetW / 2;
  const targetHalfH = targetH / 2;
  const targetEdge = targetCenterX + direction * targetHalfW;
  const targetTop = targetCenterY + targetHalfH;
  const targetBottom = targetCenterY - targetHalfH;
  const freeBoxes = Array.isArray(args.freeBoxes) ? args.freeBoxes : [];
  const gapThreshold = Math.max(0.03, Math.min(0.16, previewW * 0.24));
  const corridorPad = Math.max(0.012, Math.min(0.05, previewW * 0.08));

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
    if ((direction === 1 && !(cx > targetCenterX)) || (direction === -1 && !(cx < targetCenterX))) continue;

    const geo = resolveSketchFreeBoxGeometry({
      wardrobeWidth: Number(args.wardrobeWidth),
      wardrobeDepth: Number(args.wardrobeDepth),
      backZ: Number(args.backZ),
      centerX: cx,
      woodThick: Number(args.woodThick),
      widthM: wM != null && wM > 0 ? wM : null,
      depthM: dM != null && dM > 0 ? dM : null,
    });
    const neighborHalfW = geo.outerW / 2;
    const neighborHalfH = hM / 2;
    const neighborInnerEdge = cx - direction * neighborHalfW;
    const corridorMin = Math.min(targetEdge, neighborInnerEdge) - corridorPad;
    const corridorMax = Math.max(targetEdge, neighborInnerEdge) + corridorPad;
    const verticalOverlap =
      Math.min(targetTop, cy + neighborHalfH) - Math.max(targetBottom, cy - neighborHalfH);
    const minSharedHeight = Math.max(0.02, Math.min(targetH, hM) * 0.25);
    const gapSize = Math.max(0, (neighborInnerEdge - targetEdge) * direction);
    if (verticalOverlap < minSharedHeight || gapSize > gapThreshold) continue;
    if (pointX < corridorMin || pointX > corridorMax) continue;
    const hoverBandMin = Math.min(targetBottom, cy - neighborHalfH) - (targetH / 2 + corridorPad);
    const hoverBandMax = Math.max(targetTop, cy + neighborHalfH) + (targetH / 2 + corridorPad);
    if (pointY < hoverBandMin || pointY > hoverBandMax) continue;
    return true;
  }

  return false;
}
