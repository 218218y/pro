export function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(min) || !Number.isFinite(max)) return value;
  if (!(max > min)) return Math.max(min, Math.min(max, value));
  return Math.max(min, Math.min(max, value));
}

export function clampSketchModuleBoxCenterY(args: {
  centerY: number;
  boxH: number;
  bottomY: number;
  spanH: number;
  pad: number;
}): number {
  const centerY = Number(args.centerY);
  const boxH = Number(args.boxH);
  const bottomY = Number(args.bottomY);
  const spanH = Number(args.spanH);
  const pad = Number(args.pad);
  if (!Number.isFinite(centerY) || !Number.isFinite(boxH) || !(boxH > 0)) return centerY;
  if (!Number.isFinite(bottomY) || !Number.isFinite(spanH) || !(spanH > 0)) return centerY;

  const topY = bottomY + spanH;
  const half = boxH / 2;
  const lo = bottomY + pad + half;
  const hi = topY - pad - half;
  if (!(hi > lo)) return clamp(centerY, bottomY + pad, topY - pad);
  return clamp(centerY, lo, hi);
}

export function isWithinModuleVerticalBounds(args: {
  centerY: number;
  boxH: number;
  bottomY: number;
  spanH: number;
  pad: number;
}): boolean {
  const centerY = Number(args.centerY);
  const boxH = Number(args.boxH);
  const bottomY = Number(args.bottomY);
  const spanH = Number(args.spanH);
  const pad = Number(args.pad);
  if (!Number.isFinite(centerY) || !Number.isFinite(boxH) || !(boxH > 0)) return false;
  if (!Number.isFinite(bottomY) || !Number.isFinite(spanH) || !(spanH > 0)) return false;
  const topY = bottomY + spanH;
  const half = boxH / 2;
  return centerY - half >= bottomY + pad - 1e-6 && centerY + half <= topY - pad + 1e-6;
}
