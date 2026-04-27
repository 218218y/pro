import type { FindSketchModuleBoxAtPointResult } from './canvas_picking_manual_layout_sketch_contracts.js';
import { asSketchModuleBox, readSketchBoxFiniteNumber } from './canvas_picking_sketch_box_runtime_shared.js';
import { resolveSketchBoxGeometry } from './canvas_picking_sketch_box_runtime_geometry.js';

export function findSketchModuleBoxAtPoint(args: {
  boxes: unknown[];
  cursorY: number;
  cursorX?: number | null;
  bottomY: number;
  spanH: number;
  innerW: number;
  internalCenterX: number;
  internalDepth: number;
  internalZ: number;
  woodThick: number;
}): FindSketchModuleBoxAtPointResult | null {
  const boxes = Array.isArray(args.boxes) ? args.boxes : [];
  const cursorY = Number(args.cursorY);
  const cursorX = readSketchBoxFiniteNumber(args.cursorX);
  const bottomY = Number(args.bottomY);
  const spanH = Number(args.spanH);
  const innerW = Number(args.innerW);
  const internalCenterX = Number(args.internalCenterX);
  const internalDepth = Number(args.internalDepth);
  const internalZ = Number(args.internalZ);
  const woodThick = Number(args.woodThick);
  if (!Number.isFinite(cursorY) || !Number.isFinite(bottomY) || !Number.isFinite(spanH) || !(spanH > 0)) {
    return null;
  }

  let best: FindSketchModuleBoxAtPointResult | null = null;
  let bestDist = Infinity;

  for (let i = 0; i < boxes.length; i++) {
    const box = asSketchModuleBox(boxes[i]);
    if (!box || box.freePlacement === true) continue;
    const yNorm = readSketchBoxFiniteNumber(box.yNorm);
    let hM = readSketchBoxFiniteNumber(box.heightM);
    if (yNorm == null || hM == null || !(hM > 0)) continue;
    hM = Math.max(woodThick * 2 + 0.02, Math.min(spanH, hM));
    const cy = bottomY + Math.max(0, Math.min(1, yNorm)) * spanH;
    const wM = readSketchBoxFiniteNumber(box.widthM);
    const dM = readSketchBoxFiniteNumber(box.depthM);
    const xNorm = readSketchBoxFiniteNumber(box.xNorm);
    const geo = resolveSketchBoxGeometry({
      innerW,
      internalCenterX,
      internalDepth,
      internalZ,
      woodThick,
      widthM: wM != null && wM > 0 ? wM : null,
      depthM: dM != null && dM > 0 ? dM : null,
      xNorm,
    });
    const dy = Math.abs(cursorY - cy);
    const dx = cursorX != null ? Math.abs(cursorX - geo.centerX) : 0;
    const tolX = Math.max(0.02, Math.min(0.06, geo.outerW * 0.18));
    const tolY = Math.max(0.02, Math.min(0.06, hM * 0.18));
    if (dy > hM / 2 + tolY) continue;
    if (cursorX != null && dx > geo.outerW / 2 + tolX) continue;
    const dist = dy + dx;
    if (dist >= bestDist) continue;
    bestDist = dist;
    best = {
      box,
      boxId: box.id != null ? String(box.id) : String(i),
      geo,
      centerY: cy,
      height: hM,
    };
  }

  return best;
}
