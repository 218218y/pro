export type HoverClearanceMeasurementEntry = {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  z?: number;
  label: string;
  labelX?: number;
  labelY?: number;
  styleKey?: 'default' | 'cell';
  textScale?: number;
  faceSign?: number;
  viewFaceSign?: number;
  labelFaceSign?: number;
};

function clampFinite(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeFaceSign(value: unknown): number | undefined {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return undefined;
  return n < 0 ? -1 : 1;
}

function resolveFaceMetadata(args: {
  faceSign?: unknown;
  viewFaceSign?: unknown;
  labelFaceSign?: unknown;
}): Pick<HoverClearanceMeasurementEntry, 'faceSign' | 'viewFaceSign' | 'labelFaceSign'> {
  const meta: Pick<HoverClearanceMeasurementEntry, 'faceSign' | 'viewFaceSign' | 'labelFaceSign'> = {};
  const faceSign = normalizeFaceSign(args.faceSign);
  const viewFaceSign = normalizeFaceSign(args.viewFaceSign);
  const labelFaceSign = normalizeFaceSign(args.labelFaceSign);
  if (faceSign != null) meta.faceSign = faceSign;
  if (viewFaceSign != null) meta.viewFaceSign = viewFaceSign;
  if (labelFaceSign != null) meta.labelFaceSign = labelFaceSign;
  return meta;
}

function roundClearanceCmValue(valueM: number): number {
  return Math.max(0, Math.round(valueM * 100));
}

function roundClearanceCmLabel(valueM: number): string {
  return `${roundClearanceCmValue(valueM)} ס"מ`;
}

function shouldShowClearance(valueM: number, minCm: number): boolean {
  if (!Number.isFinite(valueM)) return false;
  const roundedCm = roundClearanceCmValue(valueM);
  return roundedCm >= Math.max(1, Math.ceil(Math.max(0, minCm)));
}

export function buildVerticalClearanceMeasurementEntries(args: {
  containerMinY: number;
  containerMaxY: number;
  targetCenterX: number;
  targetCenterY: number;
  targetWidth: number;
  targetHeight: number;
  z?: number;
  styleKey?: 'default' | 'cell';
  textScale?: number;
  faceSign?: unknown;
  viewFaceSign?: unknown;
  labelFaceSign?: unknown;
}): HoverClearanceMeasurementEntry[] {
  const targetWidth = Math.max(0.0001, clampFinite(args.targetWidth, 0));
  return buildRectClearanceMeasurementEntries({
    containerMinX: clampFinite(args.targetCenterX, 0) - targetWidth / 2,
    containerMaxX: clampFinite(args.targetCenterX, 0) + targetWidth / 2,
    containerMinY: args.containerMinY,
    containerMaxY: args.containerMaxY,
    targetCenterX: args.targetCenterX,
    targetCenterY: args.targetCenterY,
    targetWidth,
    targetHeight: args.targetHeight,
    z: args.z,
    showTop: true,
    showBottom: true,
    showLeft: false,
    showRight: false,
    styleKey: args.styleKey,
    textScale: args.textScale,
    faceSign: args.faceSign,
    viewFaceSign: args.viewFaceSign,
    labelFaceSign: args.labelFaceSign ?? args.viewFaceSign ?? args.faceSign ?? 1,
  });
}
export function buildRectClearanceMeasurementEntries(args: {
  containerMinX: number;
  containerMaxX: number;
  containerMinY: number;
  containerMaxY: number;
  targetCenterX: number;
  targetCenterY: number;
  targetWidth: number;
  targetHeight: number;
  z?: number;
  showTop?: boolean;
  showBottom?: boolean;
  showLeft?: boolean;
  showRight?: boolean;
  minVerticalCm?: number;
  minHorizontalCm?: number;
  horizontalLabelPlacement?: 'center' | 'outside';
  horizontalLabelOutset?: number;
  styleKey?: 'default' | 'cell';
  textScale?: number;
  faceSign?: unknown;
  viewFaceSign?: unknown;
  labelFaceSign?: unknown;
}): HoverClearanceMeasurementEntry[] {
  const containerMinX = clampFinite(args.containerMinX, 0);
  const containerMaxX = clampFinite(args.containerMaxX, 0);
  const containerMinY = clampFinite(args.containerMinY, 0);
  const containerMaxY = clampFinite(args.containerMaxY, 0);
  const targetCenterX = clampFinite(args.targetCenterX, 0);
  const targetCenterY = clampFinite(args.targetCenterY, 0);
  const targetWidth = Math.max(0, clampFinite(args.targetWidth, 0));
  const targetHeight = Math.max(0, clampFinite(args.targetHeight, 0));
  if (!(targetWidth > 0) || !(targetHeight > 0)) return [];

  const halfW = targetWidth / 2;
  const halfH = targetHeight / 2;
  const targetMinX = Math.max(containerMinX, targetCenterX - halfW);
  const targetMaxX = Math.min(containerMaxX, targetCenterX + halfW);
  const targetMinY = Math.max(containerMinY, targetCenterY - halfH);
  const targetMaxY = Math.min(containerMaxY, targetCenterY + halfH);
  const z = typeof args.z === 'number' && Number.isFinite(args.z) ? args.z : undefined;
  const styleKey = args.styleKey === 'cell' ? 'cell' : 'default';
  const textScale =
    typeof args.textScale === 'number' && Number.isFinite(args.textScale) ? args.textScale : 0.9;
  const minVerticalCm = Math.max(0, clampFinite(args.minVerticalCm, 0));
  const minHorizontalCm = Math.max(0, clampFinite(args.minHorizontalCm, 0));
  const horizontalLabelPlacement = args.horizontalLabelPlacement === 'outside' ? 'outside' : 'center';
  const horizontalLabelOutset = Math.max(0, clampFinite(args.horizontalLabelOutset, 0.06));
  const faceMetadata = resolveFaceMetadata(args);

  const entries: HoverClearanceMeasurementEntry[] = [];

  const topClearance = Math.max(0, containerMaxY - targetMaxY);
  if (args.showTop !== false && shouldShowClearance(topClearance, minVerticalCm)) {
    entries.push({
      startX: targetCenterX,
      startY: targetMaxY,
      endX: targetCenterX,
      endY: containerMaxY,
      z,
      label: roundClearanceCmLabel(topClearance),
      styleKey,
      textScale,
      ...faceMetadata,
    });
  }

  const bottomClearance = Math.max(0, targetMinY - containerMinY);
  if (args.showBottom !== false && shouldShowClearance(bottomClearance, minVerticalCm)) {
    entries.push({
      startX: targetCenterX,
      startY: containerMinY,
      endX: targetCenterX,
      endY: targetMinY,
      z,
      label: roundClearanceCmLabel(bottomClearance),
      styleKey,
      textScale,
      ...faceMetadata,
    });
  }

  const leftClearance = Math.max(0, targetMinX - containerMinX);
  if (args.showLeft === true && shouldShowClearance(leftClearance, minHorizontalCm)) {
    entries.push({
      startX: containerMinX,
      startY: targetCenterY,
      endX: targetMinX,
      endY: targetCenterY,
      z,
      label: roundClearanceCmLabel(leftClearance),
      labelX: horizontalLabelPlacement === 'outside' ? containerMinX - horizontalLabelOutset : undefined,
      labelY: targetCenterY,
      styleKey,
      textScale,
      ...faceMetadata,
    });
  }

  const rightClearance = Math.max(0, containerMaxX - targetMaxX);
  if (args.showRight === true && shouldShowClearance(rightClearance, minHorizontalCm)) {
    entries.push({
      startX: targetMaxX,
      startY: targetCenterY,
      endX: containerMaxX,
      endY: targetCenterY,
      z,
      label: roundClearanceCmLabel(rightClearance),
      labelX: horizontalLabelPlacement === 'outside' ? containerMaxX + horizontalLabelOutset : undefined,
      labelY: targetCenterY,
      styleKey,
      textScale,
      ...faceMetadata,
    });
  }

  return entries;
}
