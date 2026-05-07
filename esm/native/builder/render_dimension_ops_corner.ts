import { WARDROBE_DIMENSION_GUIDE_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import type { RenderDimensionContext } from './render_dimension_ops_shared.js';

export function applyCornerDimensionOps(ctx: RenderDimensionContext): void {
  const {
    addDimensionLine,
    totalW,
    D,
    hasCornice,
    isCornerMode,
    noMainWardrobe,
    cornerSide,
    cornerConnectorEnabled,
    cornerWingVisible,
    cornerWallLenM,
    cornerOffsetXM,
    cornerOffsetZM,
    cornerWingLenM,
    cornerWingHeightM,
    cornerWingDepthM,
    displayH,
    yTotal,
    CELL_DIM_TEXT_SCALE,
    vec,
  } = ctx;
  const guide = WARDROBE_DIMENSION_GUIDE_DIMENSIONS.corner;
  const guidePlacement = WARDROBE_DIMENSION_GUIDE_DIMENSIONS.verticalPlacement;
  const guideTextScale = WARDROBE_DIMENSION_GUIDE_DIMENSIONS.textScale;

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

  if (cornerWingVisible && Number.isFinite(cornerWingLenM) && cornerWingLenM > guide.wingMinLengthM) {
    const roomCornerX =
      (cornerSide === 'left' ? -totalW / 2 - cornerWallLenM : totalW / 2 + cornerWallLenM) + cornerOffsetXM;
    const roomCornerZ = -(D / 2) + cornerOffsetZM;
    const wingW = cornerWingLenM;
    const wingH = Number.isFinite(cornerWingHeightM) && cornerWingHeightM > 0 ? cornerWingHeightM : displayH;
    const wingD = Number.isFinite(cornerWingDepthM) && cornerWingDepthM > 0 ? cornerWingDepthM : D;
    const zStart = roomCornerZ + cornerWallLenM;
    const zEnd = zStart + wingW;
    const xBack = roomCornerX;
    const xFront = cornerSide === 'left' ? roomCornerX + wingD : roomCornerX - wingD;
    const xCenter = (xBack + xFront) / 2;
    const yWingTotal =
      wingH +
      (hasCornice ? guidePlacement.totalYOffsetWithCorniceM : guidePlacement.totalYOffsetWithoutCorniceM);
    const yWingCells =
      wingH +
      (hasCornice ? guidePlacement.cellYOffsetWithCorniceM : guidePlacement.cellYOffsetWithoutCorniceM);

    addDimensionLine(
      vec(xCenter, yWingTotal, zStart),
      vec(xCenter, yWingTotal, zEnd),
      vec(0, guide.wingTotalTextYOffsetM, 0),
      (wingW * 100).toFixed(0),
      guideTextScale.total
    );

    if (cornerConnectorEnabled && cornerWallLenM > guide.connectorWallMinLengthM) {
      const fullWingW = wingW + cornerWallLenM;
      addDimensionLine(
        vec(xCenter, yWingCells, roomCornerZ),
        vec(xCenter, yWingCells, zEnd),
        vec(0, guide.wingCellTextYOffsetM, 0),
        (fullWingW * 100).toFixed(0),
        CELL_DIM_TEXT_SCALE
      );
    }
  }

  if (
    noMainWardrobe &&
    isCornerMode &&
    cornerConnectorEnabled &&
    cornerWallLenM > guide.connectorWallMinLengthM
  ) {
    const connectorH = displayH;
    const connectorD = D;
    const roomCornerX =
      (cornerSide === 'left' ? -totalW / 2 - cornerWallLenM : totalW / 2 + cornerWallLenM) + cornerOffsetXM;
    const roomCornerZ = -(D / 2) + cornerOffsetZM;
    const connectorFrontX = cornerSide === 'left' ? roomCornerX + connectorD : roomCornerX - connectorD;
    const connectorDepthMidZ =
      roomCornerZ +
      Math.min(
        cornerWallLenM * guide.connectorDepthMidRatio,
        Math.max(guide.connectorDepthMinM, cornerWallLenM - guide.connectorDepthInsetM)
      );
    const connectorHeightX = roomCornerX + (connectorFrontX - roomCornerX) * guide.connectorHeightLineRatio;

    addDimensionLine(
      vec(connectorFrontX, connectorH - guide.depthStartYOffsetM, connectorDepthMidZ),
      vec(roomCornerX, connectorH - guide.depthEndYOffsetM, connectorDepthMidZ),
      vec(0, 0, guide.depthTextOffsetZM),
      (connectorD * 100).toFixed(0)
    );
    addDimensionLine(
      vec(connectorHeightX, 0, connectorDepthMidZ),
      vec(connectorHeightX, connectorH, connectorDepthMidZ),
      vec(0, 0, guide.heightTextOffsetZM),
      (connectorH * 100).toFixed(0),
      guideTextScale.total
    );
  }

  if (cornerWingVisible && Number.isFinite(cornerWingLenM) && cornerWingLenM > guide.wingMinLengthM) {
    const roomCornerX =
      (cornerSide === 'left' ? -totalW / 2 - cornerWallLenM : totalW / 2 + cornerWallLenM) + cornerOffsetXM;
    const roomCornerZ = -(D / 2) + cornerOffsetZM;
    const wingW = cornerWingLenM;
    const wingH = Number.isFinite(cornerWingHeightM) && cornerWingHeightM > 0 ? cornerWingHeightM : displayH;
    const wingD = Number.isFinite(cornerWingDepthM) && cornerWingDepthM > 0 ? cornerWingDepthM : D;
    const zEnd = roomCornerZ + cornerWallLenM + wingW;
    const xBack = roomCornerX;
    const xFront = cornerSide === 'left' ? roomCornerX + wingD : roomCornerX - wingD;
    const xHeight = xBack + (xFront - xBack) * guide.wingHeightLineRatio;

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
