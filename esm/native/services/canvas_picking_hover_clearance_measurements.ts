export type HoverClearanceMeasurementEntry = {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  z?: number;
  label: string;
  labelX?: number;
  labelY?: number;
  styleKey?: 'default' | 'cell' | 'neighbor';
  textScale?: number;
  faceSign?: number;
  viewFaceSign?: number;
  labelFaceSign?: number;
  role?: 'cell' | 'neighbor';
};

function clampFinite(value: unknown, defaultValue: number): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : defaultValue;
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
  styleKey?: 'default' | 'cell' | 'neighbor';
  textScale?: number;
  faceSign?: unknown;
  viewFaceSign?: unknown;
  labelFaceSign?: unknown;
  minVerticalCm?: number;
  verticalLineX?: number;
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
    minVerticalCm: args.minVerticalCm,
    faceSign: args.faceSign,
    viewFaceSign: args.viewFaceSign,
    labelFaceSign: args.labelFaceSign ?? args.viewFaceSign ?? args.faceSign ?? 1,
    verticalLineX: args.verticalLineX,
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
  styleKey?: 'default' | 'cell' | 'neighbor';
  textScale?: number;
  faceSign?: unknown;
  viewFaceSign?: unknown;
  labelFaceSign?: unknown;
  verticalLineX?: number;
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
  const verticalLineX = clampFinite(args.verticalLineX, targetCenterX);

  const entries: HoverClearanceMeasurementEntry[] = [];

  const topClearance = Math.max(0, containerMaxY - targetMaxY);
  if (args.showTop !== false && shouldShowClearance(topClearance, minVerticalCm)) {
    entries.push({
      startX: verticalLineX,
      startY: targetMaxY,
      endX: verticalLineX,
      endY: containerMaxY,
      z,
      label: roundClearanceCmLabel(topClearance),
      labelX: verticalLineX,
      labelY: containerMaxY,
      styleKey,
      textScale,
      ...faceMetadata,
    });
  }

  const bottomClearance = Math.max(0, targetMinY - containerMinY);
  if (args.showBottom !== false && shouldShowClearance(bottomClearance, minVerticalCm)) {
    entries.push({
      startX: verticalLineX,
      startY: containerMinY,
      endX: verticalLineX,
      endY: targetMinY,
      z,
      label: roundClearanceCmLabel(bottomClearance),
      labelX: verticalLineX,
      labelY: containerMinY,
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

export type VerticalClearanceNeighborKind = 'shelf' | 'drawer';

export type VerticalClearanceNeighborRange = {
  minY: number;
  maxY: number;
  kind: VerticalClearanceNeighborKind;
};

function readFinite(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeNeighborRange(
  value: VerticalClearanceNeighborRange
): VerticalClearanceNeighborRange | null {
  const minY = readFinite(value.minY);
  const maxY = readFinite(value.maxY);
  if (minY == null || maxY == null) return null;
  const lo = Math.min(minY, maxY);
  const hi = Math.max(minY, maxY);
  if (!(hi > lo)) return null;
  return {
    minY: lo,
    maxY: hi,
    kind: value.kind === 'drawer' ? 'drawer' : 'shelf',
  };
}

export function buildStackAwareVerticalClearanceMeasurementEntries(args: {
  containerMinY: number;
  containerMaxY: number;
  targetCenterX: number;
  targetCenterY: number;
  targetWidth: number;
  targetHeight: number;
  neighbors?: VerticalClearanceNeighborRange[];
  z?: number;
  styleKey?: 'default' | 'cell' | 'neighbor';
  textScale?: number;
  minVerticalCm?: number;
  faceSign?: unknown;
  viewFaceSign?: unknown;
  labelFaceSign?: unknown;
  measurementSideSign?: number;
}): HoverClearanceMeasurementEntry[] {
  const targetCenterX = clampFinite(args.targetCenterX, 0);
  const targetCenterY = clampFinite(args.targetCenterY, 0);
  const targetWidth = Math.max(0.0001, clampFinite(args.targetWidth, 0));
  const targetHeight = Math.max(0.0001, clampFinite(args.targetHeight, 0));
  const halfH = targetHeight / 2;
  const targetMinY = targetCenterY - halfH;
  const targetMaxY = targetCenterY + halfH;
  const lineGap = Math.max(0.035, Math.min(0.085, targetWidth * 0.045));
  const maxCenteredOffset = Math.max(0.008, targetWidth / 2 - 0.008);
  const centeredLineOffset = Math.min(lineGap * 0.9, maxCenteredOffset);
  const neighborLineX = targetCenterX - centeredLineOffset;
  const overallLineX = targetCenterX + centeredLineOffset;
  const baseTextScale =
    typeof args.textScale === 'number' && Number.isFinite(args.textScale) ? args.textScale : 0.82;
  const entries: HoverClearanceMeasurementEntry[] = buildVerticalClearanceMeasurementEntries({
    containerMinY: args.containerMinY,
    containerMaxY: args.containerMaxY,
    targetCenterX,
    targetCenterY,
    targetWidth,
    targetHeight,
    z: args.z,
    styleKey: args.styleKey,
    textScale: baseTextScale,
    minVerticalCm: args.minVerticalCm,
    faceSign: args.faceSign,
    viewFaceSign: args.viewFaceSign,
    labelFaceSign: args.labelFaceSign,
    verticalLineX: overallLineX,
  }).map(entry => ({ ...entry, role: 'cell' as const }));

  const faceMetadata = resolveFaceMetadata({
    faceSign: args.faceSign,
    viewFaceSign: args.viewFaceSign,
    labelFaceSign: args.labelFaceSign ?? args.viewFaceSign ?? args.faceSign ?? 1,
  });
  const z = typeof args.z === 'number' && Number.isFinite(args.z) ? args.z : undefined;
  const minVerticalCm = Math.max(0, clampFinite(args.minVerticalCm, 0));
  const neighborTextScale = Math.max(0.74, baseTextScale * 0.94);
  const normalizedNeighbors = (Array.isArray(args.neighbors) ? args.neighbors : [])
    .map(normalizeNeighborRange)
    .filter((range): range is VerticalClearanceNeighborRange => !!range)
    .filter(range => range.maxY <= targetMinY + 0.0005 || range.minY >= targetMaxY - 0.0005);

  const above =
    normalizedNeighbors
      .filter(range => range.minY >= targetMaxY - 0.0005)
      .sort((a, b) => a.minY - b.minY)[0] ?? null;
  const below =
    normalizedNeighbors
      .filter(range => range.maxY <= targetMinY + 0.0005)
      .sort((a, b) => b.maxY - a.maxY)[0] ?? null;

  if (above) {
    const gap = Math.max(0, above.minY - targetMaxY);
    if (shouldShowClearance(gap, minVerticalCm)) {
      entries.push({
        startX: neighborLineX,
        startY: targetMaxY,
        endX: neighborLineX,
        endY: above.minY,
        z,
        label: roundClearanceCmLabel(gap),
        labelX: neighborLineX,
        labelY: above.minY,
        styleKey: 'neighbor',
        textScale: neighborTextScale,
        role: 'neighbor',
        ...faceMetadata,
      });
    }
  }

  if (below) {
    const gap = Math.max(0, targetMinY - below.maxY);
    if (shouldShowClearance(gap, minVerticalCm)) {
      entries.push({
        startX: neighborLineX,
        startY: below.maxY,
        endX: neighborLineX,
        endY: targetMinY,
        z,
        label: roundClearanceCmLabel(gap),
        labelX: neighborLineX,
        labelY: below.maxY,
        styleKey: 'neighbor',
        textScale: neighborTextScale,
        role: 'neighbor',
        ...faceMetadata,
      });
    }
  }

  return entries;
}
