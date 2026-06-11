import type { RenderDimensionContext } from './render_dimension_ops_shared.js';

export function applyMainWardrobeDimensionOps(ctx: RenderDimensionContext): void {
  const {
    addDimensionLine,
    totalW,
    noMainWardrobe,
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

  if (!noMainWardrobe) {
    // Total width (raised slightly above the per-cell lines).
    addDimensionLine(
      vec(-totalW / 2, yTotal, 0),
      vec(totalW / 2, yTotal, 0),
      vec(0, 0.1, 0),
      (totalW * 100).toFixed(0),
      1
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
        vec(0, 0.07, 0),
        wcm.toFixed(0),
        CELL_DIM_TEXT_SCALE
      );
      x0 += wm;
      accCm += wcm;
    }
  }

  const heightOffsetX = stackSplitActive ? 0.54 : 0.3;
  const heightLineX = dimsOnLeft ? -totalW / 2 - heightOffsetX : totalW / 2 + heightOffsetX;
  const textOffset = dimsOnLeft ? vec(-0.1, 0, 0) : vec(0.1, 0, 0);

  if (!noMainWardrobe) {
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
      const cellHeightDeltaX = stackSplitActive ? 0.24 : 0.12;
      const segX = dimsOnLeft ? heightLineX + cellHeightDeltaX : heightLineX - cellHeightDeltaX;
      const segTextOffset = dimsOnLeft ? vec(-0.08, 0, 0) : vec(0.08, 0, 0);
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
          vec(0, -0.26, 0)
        );
        prev = cur;
      }
    }
  }

  const depthLineX = depthOnLeft ? -totalW / 2 - 0.24 : totalW / 2 + 0.24;
  const depthTextOffset = depthOnLeft ? vec(-0.2, 0, 0) : vec(0.2, 0, 0);
  if (!noMainWardrobe) {
    addDimensionLine(
      vec(depthLineX, displayH - 0.35, displayD / 2),
      vec(depthLineX, displayH - 0.15, -displayD / 2),
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
      maxDcm - minDcm >= 1
    ) {
      const minDm = minDcm / 100;
      const smallX = depthOnLeft ? -totalW / 2 - 0.16 : totalW / 2 + 0.16;
      const smallTextOffset = depthOnLeft ? vec(-0.18, 0, 0) : vec(0.18, 0, 0);
      addDimensionLine(
        vec(smallX, displayH - 0.57, minDm / 2),
        vec(smallX, displayH - 0.37, -minDm / 2),
        smallTextOffset,
        minDcm.toFixed(0),
        CELL_DIM_TEXT_SCALE
      );
    }
  }
}
