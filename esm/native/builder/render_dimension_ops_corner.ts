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

  if (isCornerMode && cornerConnectorEnabled && cornerWallLenM > 0.05) {
    const minX = cornerSide === 'left' ? -totalW / 2 - cornerWallLenM + cornerOffsetXM : -totalW / 2;
    const maxX = cornerSide === 'right' ? totalW / 2 + cornerWallLenM + cornerOffsetXM : totalW / 2;
    const fullWm = maxX - minX;
    if (Number.isFinite(fullWm) && fullWm > totalW + 0.01) {
      addDimensionLine(
        vec(minX, yTotal + 0.12, 0),
        vec(maxX, yTotal + 0.12, 0),
        vec(0, 0.1, 0),
        (fullWm * 100).toFixed(0),
        0.9
      );
    }
  }

  if (cornerWingVisible && Number.isFinite(cornerWingLenM) && cornerWingLenM > 0.01) {
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
    const yWingTotal = wingH + (hasCornice ? 0.28 : 0.23);
    const yWingCells = wingH + (hasCornice ? 0.2 : 0.15);

    addDimensionLine(
      vec(xCenter, yWingTotal, zStart),
      vec(xCenter, yWingTotal, zEnd),
      vec(0, 0.1, 0),
      (wingW * 100).toFixed(0),
      1
    );

    if (cornerConnectorEnabled && cornerWallLenM > 0.05) {
      const fullWingW = wingW + cornerWallLenM;
      addDimensionLine(
        vec(xCenter, yWingCells, roomCornerZ),
        vec(xCenter, yWingCells, zEnd),
        vec(0, 0.07, 0),
        (fullWingW * 100).toFixed(0),
        CELL_DIM_TEXT_SCALE
      );
    }
  }

  if (noMainWardrobe && isCornerMode && cornerConnectorEnabled && cornerWallLenM > 0.05) {
    const connectorH = displayH;
    const connectorD = D;
    const roomCornerX =
      (cornerSide === 'left' ? -totalW / 2 - cornerWallLenM : totalW / 2 + cornerWallLenM) + cornerOffsetXM;
    const roomCornerZ = -(D / 2) + cornerOffsetZM;
    const connectorFrontX = cornerSide === 'left' ? roomCornerX + connectorD : roomCornerX - connectorD;
    const connectorDepthMidZ =
      roomCornerZ + Math.min(cornerWallLenM * 0.55, Math.max(0.2, cornerWallLenM - 0.08));
    const connectorHeightX = roomCornerX + (connectorFrontX - roomCornerX) * 0.55;

    addDimensionLine(
      vec(connectorFrontX, connectorH - 0.35, connectorDepthMidZ),
      vec(roomCornerX, connectorH - 0.15, connectorDepthMidZ),
      vec(0, 0, 0.28),
      (connectorD * 100).toFixed(0)
    );
    addDimensionLine(
      vec(connectorHeightX, 0, connectorDepthMidZ),
      vec(connectorHeightX, connectorH, connectorDepthMidZ),
      vec(0, 0, 0.46),
      (connectorH * 100).toFixed(0),
      1
    );
  }

  if (cornerWingVisible && Number.isFinite(cornerWingLenM) && cornerWingLenM > 0.01) {
    const roomCornerX =
      (cornerSide === 'left' ? -totalW / 2 - cornerWallLenM : totalW / 2 + cornerWallLenM) + cornerOffsetXM;
    const roomCornerZ = -(D / 2) + cornerOffsetZM;
    const wingW = cornerWingLenM;
    const wingH = Number.isFinite(cornerWingHeightM) && cornerWingHeightM > 0 ? cornerWingHeightM : displayH;
    const wingD = Number.isFinite(cornerWingDepthM) && cornerWingDepthM > 0 ? cornerWingDepthM : D;
    const zEnd = roomCornerZ + cornerWallLenM + wingW;
    const xBack = roomCornerX;
    const xFront = cornerSide === 'left' ? roomCornerX + wingD : roomCornerX - wingD;
    const xHeight = xBack + (xFront - xBack) * 0.55;

    addDimensionLine(
      vec(xFront, wingH - 0.35, zEnd),
      vec(xBack, wingH - 0.15, zEnd),
      vec(0, 0, 0.28),
      (wingD * 100).toFixed(0)
    );
    addDimensionLine(
      vec(xHeight, 0, zEnd),
      vec(xHeight, wingH, zEnd),
      vec(0, 0, 0.46),
      (wingH * 100).toFixed(0),
      1
    );
  }
}
