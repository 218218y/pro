import type { ResolvedModuleBoxLike } from './canvas_picking_sketch_box_overlap_contracts.js';

export function doSketchBoxesOverlap(args: {
  centerX: number;
  centerY: number;
  boxW: number;
  boxH: number;
  otherCenterX: number;
  otherCenterY: number;
  otherW: number;
  otherH: number;
  gap?: number;
}): boolean {
  const centerX = Number(args.centerX);
  const centerY = Number(args.centerY);
  const boxW = Number(args.boxW);
  const boxH = Number(args.boxH);
  const otherCenterX = Number(args.otherCenterX);
  const otherCenterY = Number(args.otherCenterY);
  const otherW = Number(args.otherW);
  const otherH = Number(args.otherH);
  const gap = Number.isFinite(Number(args.gap)) ? Math.max(0, Number(args.gap)) : 0;
  if (
    !Number.isFinite(centerX) ||
    !Number.isFinite(centerY) ||
    !Number.isFinite(boxW) ||
    !(boxW > 0) ||
    !Number.isFinite(boxH) ||
    !(boxH > 0) ||
    !Number.isFinite(otherCenterX) ||
    !Number.isFinite(otherCenterY) ||
    !Number.isFinite(otherW) ||
    !(otherW > 0) ||
    !Number.isFinite(otherH) ||
    !(otherH > 0)
  ) {
    return false;
  }

  const overlapX = boxW / 2 + otherW / 2 + gap - Math.abs(centerX - otherCenterX);
  const overlapY = boxH / 2 + otherH / 2 + gap - Math.abs(centerY - otherCenterY);
  const eps = Math.max(1e-7, Math.min(1e-4, Math.max(gap, 0.001) * 0.05));
  return overlapX > eps && overlapY > eps;
}

export function collectOverlaps(args: {
  centerX: number;
  centerY: number;
  boxW: number;
  boxH: number;
  boxes: ResolvedModuleBoxLike[];
  gap?: number;
}): ResolvedModuleBoxLike[] {
  const result: ResolvedModuleBoxLike[] = [];
  for (let i = 0; i < args.boxes.length; i++) {
    const box = args.boxes[i];
    if (
      doSketchBoxesOverlap({
        centerX: args.centerX,
        centerY: args.centerY,
        boxW: args.boxW,
        boxH: args.boxH,
        otherCenterX: box.centerX,
        otherCenterY: box.centerY,
        otherW: box.boxW,
        otherH: box.boxH,
        gap: args.gap,
      })
    ) {
      result.push(box);
    }
  }
  return result;
}
