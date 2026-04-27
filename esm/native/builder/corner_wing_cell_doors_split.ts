// Corner wing split-door emission.
//
// Own the segmented door policy so the public door owner can stay focused on
// per-door iteration and the full-door path can stay isolated.

import {
  appendCornerDoorRenderEntry,
  clampHandleAbsY,
  createCornerDoorGroup,
  defaultHandleAbsYForPart,
  mergeSplitCuts,
  partIdForSegment,
  processCornerDoorVisual,
  readCustomSplitCutsY,
  type CornerWingDoorContext,
  type CornerWingDoorState,
} from './corner_wing_cell_doors_shared.js';

export function appendCornerWingSplitDoor(ctx: CornerWingDoorContext, state: CornerWingDoorState): void {
  const topId = `${state.doorBaseId}_top`;
  const midId = `${state.doorBaseId}_mid`;
  const botId = `${state.doorBaseId}_bot`;
  const topEdge = state.effectiveTopLimit - 0.002;
  const customSplitCutsY = readCustomSplitCutsY(ctx, state);

  if (state.topSplitEnabled && customSplitCutsY.length) {
    const mergedCuts = customSplitCutsY.slice();
    if (state.bottomSplitEnabled && Number.isFinite(state.bottomLineY)) mergedCuts.push(state.bottomLineY);
    const cuts = mergeSplitCuts(ctx, state, mergedCuts);
    const segCount = cuts.length + 1;
    for (let segmentIndex = 0; segmentIndex < segCount; segmentIndex++) {
      const segBottomY = segmentIndex === 0 ? state.doorBottomY : cuts[segmentIndex - 1] + ctx.splitGap / 2;
      const segTopY = segmentIndex === segCount - 1 ? topEdge : cuts[segmentIndex] - ctx.splitGap / 2;
      const segH = segTopY - segBottomY;
      if (!(segH > 0.1)) continue;
      const segY = segBottomY + segH / 2;
      const partId = partIdForSegment(state, segCount, segmentIndex);
      const defaultHandleAbsY = defaultHandleAbsYForPart(ctx, partId);
      pushSegment(
        ctx,
        state,
        partId,
        segH,
        segY,
        clampHandleAbsY(ctx, partId, defaultHandleAbsY, segBottomY, segTopY)
      );
    }
    return;
  }

  if (state.topSplitEnabled && state.bottomSplitEnabled && state.bottomLineY < state.splitLineY - 0.12) {
    const topTopY = topEdge;
    const topBottomY = state.splitLineY + ctx.splitGap / 2;
    const topH = topTopY - topBottomY;
    const topY = topBottomY + topH / 2;

    const midTopY = state.splitLineY - ctx.splitGap / 2;
    const midBottomY = state.bottomLineY + ctx.splitGap / 2;
    const midH = midTopY - midBottomY;
    const midY = midBottomY + midH / 2;

    const botTopY = state.bottomLineY - ctx.splitGap / 2;
    const botBottomY = state.doorBottomY;
    const botH = botTopY - botBottomY;
    const botY = botBottomY + botH / 2;

    pushSegment(
      ctx,
      state,
      topId,
      topH,
      topY,
      clampHandleAbsY(
        ctx,
        topId,
        topBottomY + ctx.topSplitHandleInsetForPart(ctx.cfg0, topId),
        topBottomY,
        topTopY
      )
    );
    pushSegment(
      ctx,
      state,
      midId,
      midH,
      midY,
      clampHandleAbsY(ctx, midId, defaultHandleAbsYForPart(ctx, midId), midBottomY, midTopY)
    );
    pushSegment(
      ctx,
      state,
      botId,
      botH,
      botY,
      clampHandleAbsY(ctx, botId, defaultHandleAbsYForPart(ctx, botId), botBottomY, botTopY)
    );
    return;
  }

  if (state.topSplitEnabled) {
    const topTopY = topEdge;
    const topBottomY = state.splitLineY + ctx.splitGap / 2;
    const topH = topTopY - topBottomY;
    const topY = topBottomY + topH / 2;

    const botTopY = state.splitLineY - ctx.splitGap / 2;
    const botBottomY = state.doorBottomY;
    const botH = botTopY - botBottomY;
    const botY = botBottomY + botH / 2;

    pushSegment(
      ctx,
      state,
      topId,
      topH,
      topY,
      clampHandleAbsY(
        ctx,
        topId,
        topBottomY + ctx.topSplitHandleInsetForPart(ctx.cfg0, topId),
        topBottomY,
        topTopY
      )
    );
    pushSegment(
      ctx,
      state,
      botId,
      botH,
      botY,
      clampHandleAbsY(ctx, botId, defaultHandleAbsYForPart(ctx, botId), botBottomY, botTopY)
    );
    return;
  }

  const fullTopY = topEdge;
  const fullBottomY = state.bottomLineY + ctx.splitGap / 2;
  const fullH = fullTopY - fullBottomY;
  const fullY = fullBottomY + fullH / 2;

  const botTopY = state.bottomLineY - ctx.splitGap / 2;
  const botBottomY = state.doorBottomY;
  const botH = botTopY - botBottomY;
  const botY = botBottomY + botH / 2;

  pushSegment(
    ctx,
    state,
    topId,
    fullH,
    fullY,
    clampHandleAbsY(ctx, topId, defaultHandleAbsYForPart(ctx, topId), fullBottomY, fullTopY)
  );
  pushSegment(
    ctx,
    state,
    botId,
    botH,
    botY,
    clampHandleAbsY(ctx, botId, defaultHandleAbsYForPart(ctx, botId), botBottomY, botTopY)
  );
}

function pushSegment(
  ctx: CornerWingDoorContext,
  state: CornerWingDoorState,
  partId: string,
  segH: number,
  segY: number,
  handleAbsY: number
): void {
  const isRemovedDoor = ctx.removeDoorsEnabled && ctx.isDoorRemoved(partId);
  const group = createCornerDoorGroup(ctx, state, partId, segH, handleAbsY, isRemovedDoor);
  group.position.set(state.pivotX, segY, 0.01 + state.doorZShift);

  const added = processCornerDoorVisual(ctx, partId, {
    partId,
    width: state.doorW - 0.004,
    height: Math.max(0.15, segH - 0.004),
    group,
    meshOffset: state.meshOffset,
    groovePartId: partId,
  });

  ctx.wingGroup.add(group);
  if (added || isRemovedDoor) {
    appendCornerDoorRenderEntry(ctx, group, state.chosenDirection);
  }
}
