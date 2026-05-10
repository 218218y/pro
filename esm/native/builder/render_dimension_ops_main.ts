import { WARDROBE_DIMENSION_GUIDE_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import type { RenderDimensionContext } from './render_dimension_ops_shared.js';

export function applyMainWardrobeDimensionOps(ctx: RenderDimensionContext): void {
  const {
    addDimensionLine,
    totalW,
    noMainWardrobe,
    isCornerMode,
    cornerConnectorEnabled,
    cornerWallLenM,
    yTotal,
    yCells,
    moduleWidthsCm,
    displayH,
    displayD,
    moduleHeightsCm,
    moduleDepthsCm,
    stackSplitActive,
    dimsOnLeft,
    depthOnLeft,
    CELL_DIM_TEXT_SCALE,
    vec,
  } = ctx;
  const guide = WARDROBE_DIMENSION_GUIDE_DIMENSIONS.main;
  const cornerGuide = WARDROBE_DIMENSION_GUIDE_DIMENSIONS.corner;
  const guideTextScale = WARDROBE_DIMENSION_GUIDE_DIMENSIONS.textScale;
  const cornerConnectorActive =
    isCornerMode &&
    cornerConnectorEnabled &&
    Number.isFinite(cornerWallLenM) &&
    cornerWallLenM > cornerGuide.connectorWallMinLengthM;
  const showMainHeight = !noMainWardrobe;
  const showMainDepth = !noMainWardrobe || cornerConnectorActive;

  if (!noMainWardrobe) {
    // Total width (raised slightly above the per-cell lines).
    addDimensionLine(
      vec(-totalW / 2, yTotal, 0),
      vec(totalW / 2, yTotal, 0),
      vec(0, guide.totalWidthTextYOffsetM, 0),
      (totalW * 100).toFixed(0),
      guideTextScale.total
    );
  }

  // Per-cell widths (under the total width line).
  if (!noMainWardrobe && moduleWidthsCm && moduleWidthsCm.length >= 2) {
    let x0 = -totalW / 2;
    const totalWcm = totalW * 100;
    let accCm = 0;
    for (let i = 0; i < moduleWidthsCm.length; i++) {
      let wcm = moduleWidthsCm[i];
      if (!Number.isFinite(wcm) || wcm <= 0) continue;
      if (i === moduleWidthsCm.length - 1) {
        const remain = totalWcm - accCm;
        if (Number.isFinite(remain) && remain > 0) wcm = remain;
      }
      const wm = wcm / 100;
      addDimensionLine(
        vec(x0, yCells, 0),
        vec(x0 + wm, yCells, 0),
        vec(0, guide.cellWidthTextYOffsetM, 0),
        wcm.toFixed(0),
        CELL_DIM_TEXT_SCALE
      );
      x0 += wm;
      accCm += wcm;
    }
  }

  const heightOffsetX = stackSplitActive ? guide.stackSplitHeightLineOffsetM : guide.heightLineOffsetM;
  const heightLineX = dimsOnLeft ? -totalW / 2 - heightOffsetX : totalW / 2 + heightOffsetX;
  const textOffset = dimsOnLeft ? vec(-guide.heightTextOffsetM, 0, 0) : vec(guide.heightTextOffsetM, 0, 0);

  if (showMainHeight) {
    addDimensionLine(
      vec(heightLineX, 0, 0),
      vec(heightLineX, displayH, 0),
      textOffset,
      (displayH * 100).toFixed(0)
    );
  }

  if (!noMainWardrobe && moduleHeightsCm && moduleHeightsCm.length >= 1) {
    const uniq: number[] = [];
    const seen = new Set<number>();
    for (let i = 0; i < moduleHeightsCm.length; i++) {
      const raw = moduleHeightsCm[i];
      if (!Number.isFinite(raw) || raw <= 0) continue;
      const value = Math.round(raw);
      if (seen.has(value)) continue;
      seen.add(value);
      uniq.push(value);
    }
    uniq.sort((a, b) => a - b);

    if (uniq.length >= 2) {
      const cellHeightDeltaX = stackSplitActive
        ? guide.stackSplitCellHeightLineDeltaM
        : guide.cellHeightLineDeltaM;
      const segX = dimsOnLeft ? heightLineX + cellHeightDeltaX : heightLineX - cellHeightDeltaX;
      const segTextOffset = dimsOnLeft
        ? vec(-guide.cellHeightTextOffsetM, 0, 0)
        : vec(guide.cellHeightTextOffsetM, 0, 0);
      let prev = 0;
      for (let i = 0; i < uniq.length; i++) {
        const cur = uniq[i];
        if (!Number.isFinite(cur) || cur <= prev) continue;
        const label = i === 0 ? cur.toFixed(0) : (cur - prev).toFixed(0);
        addDimensionLine(
          vec(segX, prev / 100, 0),
          vec(segX, cur / 100, 0),
          segTextOffset,
          label,
          CELL_DIM_TEXT_SCALE,
          vec(0, guide.cellHeightLabelYOffsetM, 0)
        );
        prev = cur;
      }
    }
  }

  const depthLineX = depthOnLeft
    ? -totalW / 2 - guide.depthLineOffsetXM
    : totalW / 2 + guide.depthLineOffsetXM;
  const depthTextOffset = depthOnLeft
    ? vec(-guide.depthTextOffsetXM, 0, 0)
    : vec(guide.depthTextOffsetXM, 0, 0);
  if (showMainDepth) {
    addDimensionLine(
      vec(depthLineX, displayH - guide.depthStartYOffsetM, displayD / 2),
      vec(depthLineX, displayH - guide.depthEndYOffsetM, -displayD / 2),
      depthTextOffset,
      (displayD * 100).toFixed(0)
    );
  }

  if (!noMainWardrobe && moduleDepthsCm && moduleDepthsCm.length >= 1) {
    let minDcm = Infinity;
    let maxDcm = 0;
    for (let i = 0; i < moduleDepthsCm.length; i++) {
      const raw = moduleDepthsCm[i];
      if (!Number.isFinite(raw) || raw <= 0) continue;
      const value = Math.round(raw);
      if (value < minDcm) minDcm = value;
      if (value > maxDcm) maxDcm = value;
    }
    if (
      Number.isFinite(minDcm) &&
      Number.isFinite(maxDcm) &&
      minDcm > 0 &&
      maxDcm > 0 &&
      maxDcm - minDcm >= guide.minDistinctDepthDeltaCm
    ) {
      const minDm = minDcm / 100;
      const smallX = depthOnLeft
        ? -totalW / 2 - guide.smallDepthLineOffsetXM
        : totalW / 2 + guide.smallDepthLineOffsetXM;
      const smallTextOffset = depthOnLeft
        ? vec(-guide.smallDepthTextOffsetXM, 0, 0)
        : vec(guide.smallDepthTextOffsetXM, 0, 0);
      addDimensionLine(
        vec(smallX, displayH - guide.smallDepthStartYOffsetM, minDm / 2),
        vec(smallX, displayH - guide.smallDepthEndYOffsetM, -minDm / 2),
        smallTextOffset,
        minDcm.toFixed(0),
        CELL_DIM_TEXT_SCALE
      );
    }
  }
}
