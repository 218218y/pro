import type {
  ResolveSketchBoxGeometryFn,
  ResolvedModuleBoxLike,
} from './canvas_picking_sketch_box_overlap_contracts.js';
import { clamp } from './canvas_picking_sketch_box_overlap_bounds.js';
import {
  isPlacementBoxLike,
  readRecordNumber,
  readRecordString,
} from './canvas_picking_sketch_box_overlap_records.js';

export function resolveModuleBoxes(args: {
  boxes: unknown[];
  bottomY: number;
  spanH: number;
  innerW: number;
  internalCenterX: number;
  internalDepth: number;
  internalZ: number;
  woodThick: number;
  resolveSketchBoxGeometry: ResolveSketchBoxGeometryFn;
  ignoreBoxId?: unknown;
}): ResolvedModuleBoxLike[] {
  const boxes = Array.isArray(args.boxes) ? args.boxes : [];
  const bottomY = Number(args.bottomY);
  const spanH = Number(args.spanH);
  const innerW = Number(args.innerW);
  const internalCenterX = Number(args.internalCenterX);
  const internalDepth = Number(args.internalDepth);
  const internalZ = Number(args.internalZ);
  const woodThick = Number(args.woodThick);
  const ignoreBoxId = args.ignoreBoxId != null ? String(args.ignoreBoxId) : '';
  const resolveSketchBoxGeometry = args.resolveSketchBoxGeometry;
  if (
    !Number.isFinite(bottomY) ||
    !Number.isFinite(spanH) ||
    !(spanH > 0) ||
    !Number.isFinite(innerW) ||
    !(innerW > 0) ||
    !Number.isFinite(internalCenterX) ||
    !Number.isFinite(internalDepth) ||
    !Number.isFinite(internalZ) ||
    !Number.isFinite(woodThick) ||
    typeof resolveSketchBoxGeometry !== 'function'
  ) {
    return [];
  }

  const resolved: ResolvedModuleBoxLike[] = [];
  for (let i = 0; i < boxes.length; i++) {
    const rawBox = boxes[i];
    const box = isPlacementBoxLike(rawBox) ? rawBox : null;
    if (!box || box.freePlacement === true) continue;
    const boxId = readRecordString(box, 'id') || String(i);
    if (ignoreBoxId && boxId === ignoreBoxId) continue;

    const yNorm = readRecordNumber(box, 'yNorm');
    let hM = readRecordNumber(box, 'heightM');
    if (yNorm == null || hM == null || !(hM > 0)) continue;
    hM = Math.max(woodThick * 2 + 0.02, Math.min(spanH, hM));

    const centerY = bottomY + clamp(yNorm, 0, 1) * spanH;
    const wM = readRecordNumber(box, 'widthM');
    const dM = readRecordNumber(box, 'depthM');
    const xNorm = readRecordNumber(box, 'xNorm');
    const geo = resolveSketchBoxGeometry({
      innerW,
      internalCenterX,
      internalDepth,
      internalZ,
      woodThick,
      widthM: wM != null && wM > 0 ? wM : null,
      depthM: dM != null && dM > 0 ? dM : null,
      xNorm: xNorm != null ? xNorm : null,
    });

    resolved.push({
      id: boxId,
      box,
      centerX: geo.centerX,
      centerY,
      boxW: geo.outerW,
      boxH: hM,
      widthM: wM != null && wM > 0 ? wM : null,
      depthM: dM != null && dM > 0 ? dM : null,
      xNorm: xNorm != null ? xNorm : null,
    });
  }
  return resolved;
}
