import { WARDROBE_DIMENSION_GUIDE_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import type { RenderDimensionContext } from './render_dimension_ops_shared.js';

type CornerDimensionGuide = typeof WARDROBE_DIMENSION_GUIDE_DIMENSIONS.corner;
type CornerVerticalPlacement = typeof WARDROBE_DIMENSION_GUIDE_DIMENSIONS.verticalPlacement;

type CornerWingDimensionGeometry = {
  roomCornerZ: number;
  sideGuideLengthM: number;
  wingW: number;
  wingH: number;
  wingD: number;
  zStart: number;
  zEnd: number;
  xBack: number;
  xFront: number;
  xCenter: number;
  xHeight: number;
  yWingTotal: number;
  yWingCells: number;
};

function hasActiveCornerConnector(ctx: RenderDimensionContext, guide: CornerDimensionGuide): boolean {
  return (
    ctx.isCornerMode &&
    ctx.cornerConnectorEnabled &&
    Number.isFinite(ctx.cornerWallLenM) &&
    ctx.cornerWallLenM > guide.connectorWallMinLengthM
  );
}

function resolveCornerWingDimensionGeometry(
  ctx: RenderDimensionContext,
  guide: CornerDimensionGuide,
  guidePlacement: CornerVerticalPlacement
): CornerWingDimensionGeometry | null {
  const {
    totalW,
    D,
    hasCornice,
    isCornerMode,
    cornerSide,
    cornerWallLenM,
    cornerOffsetXM,
    cornerOffsetZM,
    cornerDoorCount,
    cornerWingLenM,
    cornerWingHeightM,
    cornerWingDepthM,
    displayH,
  } = ctx;

  if (!isCornerMode) return null;

  const connectorActive = hasActiveCornerConnector(ctx, guide);
  const showPentagonOnlySideGuide = connectorActive && cornerDoorCount === 0;
  const dimensionWingLenM =
    Number.isFinite(cornerWingLenM) && cornerWingLenM > guide.wingMinLengthM ? cornerWingLenM : 0;

  if (!showPentagonOnlySideGuide && !(dimensionWingLenM > guide.wingMinLengthM)) {
    return null;
  }

  const roomCornerX =
    (cornerSide === 'left' ? -totalW / 2 - cornerWallLenM : totalW / 2 + cornerWallLenM) + cornerOffsetXM;
  const roomCornerZ = -(D / 2) + cornerOffsetZM;
  const wingW = showPentagonOnlySideGuide ? 0 : dimensionWingLenM;
  const sideGuideLengthM = showPentagonOnlySideGuide ? cornerWallLenM : cornerWallLenM + wingW;
  const wingH = Number.isFinite(cornerWingHeightM) && cornerWingHeightM > 0 ? cornerWingHeightM : displayH;
  const wingD = Number.isFinite(cornerWingDepthM) && cornerWingDepthM > 0 ? cornerWingDepthM : D;
  const zStart = roomCornerZ + cornerWallLenM;
  const zEnd = zStart + wingW;
  const xBack = roomCornerX;
  const xFront = cornerSide === 'left' ? roomCornerX + wingD : roomCornerX - wingD;
  const xCenter = (xBack + xFront) / 2;
  const xHeight = xBack + (xFront - xBack) * guide.wingHeightLineRatio;
  const yWingTotal =
    wingH +
    (hasCornice ? guidePlacement.totalYOffsetWithCorniceM : guidePlacement.totalYOffsetWithoutCorniceM);
  const yWingCells =
    wingH + (hasCornice ? guidePlacement.cellYOffsetWithCorniceM : guidePlacement.cellYOffsetWithoutCorniceM);

  return {
    roomCornerZ,
    sideGuideLengthM,
    wingW,
    wingH,
    wingD,
    zStart,
    zEnd,
    xBack,
    xFront,
    xCenter,
    xHeight,
    yWingTotal,
    yWingCells,
  };
}

export function applyCornerDimensionOps(ctx: RenderDimensionContext): void {
  const {
    addDimensionLine,
    totalW,
    isCornerMode,
    cornerSide,
    cornerConnectorEnabled,
    cornerWingVisible,
    cornerWallLenM,
    cornerOffsetXM,
    yTotal,
    CELL_DIM_TEXT_SCALE,
    vec,
  } = ctx;
  const guide = WARDROBE_DIMENSION_GUIDE_DIMENSIONS.corner;
  const guidePlacement = WARDROBE_DIMENSION_GUIDE_DIMENSIONS.verticalPlacement;
  const guideTextScale = WARDROBE_DIMENSION_GUIDE_DIMENSIONS.textScale;
  const wingGeometry = resolveCornerWingDimensionGeometry(ctx, guide, guidePlacement);
  const showCornerWingCabinetWidth =
    cornerWingVisible && !!wingGeometry && wingGeometry.wingW > guide.wingMinLengthM;

  if (isCornerMode && cornerConnectorEnabled && cornerWallLenM > guide.connectorWallMinLengthM) {
    const minX = cornerSide === 'left' ? -totalW / 2 - cornerWallLenM + cornerOffsetXM : -totalW / 2;
    const maxX = cornerSide === 'right' ? totalW / 2 + cornerWallLenM + cornerOffsetXM : totalW / 2;
    const fullWm = maxX - minX;
    if (Number.isFinite(fullWm) && fullWm > totalW + guide.expandedWidthEpsilonM) {
      addDimensionLine(
        vec(minX, yTotal + guide.expandedWidthYOffsetM, 0),
        vec(maxX, yTotal + guide.expandedWidthYOffsetM, 0),
        vec(0, guide.expandedWidthTextYOffsetM, 0),
        (fullWm * 100).toFixed(0),
        guideTextScale.cornerTotal
      );
    }
  }

  if (wingGeometry) {
    const {
      roomCornerZ,
      sideGuideLengthM,
      wingW,
      wingH,
      wingD,
      zStart,
      zEnd,
      xBack,
      xFront,
      xCenter,
      xHeight,
      yWingTotal,
      yWingCells,
    } = wingGeometry;

    if (showCornerWingCabinetWidth) {
      addDimensionLine(
        vec(xCenter, yWingTotal, zStart),
        vec(xCenter, yWingTotal, zEnd),
        vec(0, guide.wingTotalTextYOffsetM, 0),
        (wingW * 100).toFixed(0),
        guideTextScale.total
      );
    }

    if (cornerConnectorEnabled && cornerWallLenM > guide.connectorWallMinLengthM) {
      addDimensionLine(
        vec(xCenter, yWingCells, roomCornerZ),
        vec(xCenter, yWingCells, zEnd),
        vec(0, guide.wingCellTextYOffsetM, 0),
        (sideGuideLengthM * 100).toFixed(0),
        CELL_DIM_TEXT_SCALE
      );
    }

    addDimensionLine(
      vec(xFront, wingH - guide.depthStartYOffsetM, zEnd),
      vec(xBack, wingH - guide.depthEndYOffsetM, zEnd),
      vec(0, 0, guide.depthTextOffsetZM),
      (wingD * 100).toFixed(0)
    );
    addDimensionLine(
      vec(xHeight, 0, zEnd),
      vec(xHeight, wingH, zEnd),
      vec(0, 0, guide.heightTextOffsetZM),
      (wingH * 100).toFixed(0),
      guideTextScale.total
    );
  }
}
