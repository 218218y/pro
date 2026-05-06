import { CORNER_WING_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import {
  clampCornerConnectorHandleAbsY,
  mergeCornerConnectorSplitCuts,
  partIdForCornerConnectorSegment,
  pushCornerConnectorDoorSegment,
  readCornerConnectorCustomSplitCutsY,
  type CornerConnectorDoorContext,
  type CornerConnectorDoorState,
} from './corner_connector_door_emit_shared.js';

export function appendCornerConnectorSplitDoor(
  ctx: CornerConnectorDoorContext,
  state: CornerConnectorDoorState
): void {
  const topId = `${state.doorBaseId}_top`;
  const midId = `${state.doorBaseId}_mid`;
  const botId = `${state.doorBaseId}_bot`;
  const topEdge = ctx.effectiveTopLimit - CORNER_WING_DIMENSIONS.connector.doorTopClearanceM;
  const customSplitCutsY = readCornerConnectorCustomSplitCutsY(ctx, state);

  if (state.topSplitEnabled && customSplitCutsY.length) {
    const mergedCuts = customSplitCutsY.slice();
    if (state.bottomSplitEnabled && Number.isFinite(ctx.bottomLineY)) mergedCuts.push(ctx.bottomLineY);
    const cuts = mergeCornerConnectorSplitCuts(ctx, mergedCuts);
    const segCount = cuts.length + 1;
    for (let segmentIndex = 0; segmentIndex < segCount; segmentIndex++) {
      const segBottomY = segmentIndex === 0 ? ctx.doorBottomY : cuts[segmentIndex - 1] + ctx.splitGap / 2;
      const segTopY = segmentIndex === segCount - 1 ? topEdge : cuts[segmentIndex] - ctx.splitGap / 2;
      const segH = segTopY - segBottomY;
      if (!(segH > CORNER_WING_DIMENSIONS.connector.minRenderableSegmentHeightM)) continue;
      const segY = segBottomY + segH / 2;
      const partId = partIdForCornerConnectorSegment(state, segCount, segmentIndex);
      pushCornerConnectorDoorSegment(
        ctx,
        state,
        partId,
        segH,
        segY,
        clampCornerConnectorHandleAbsY(ctx, partId, state.defaultHandleAbsY, segBottomY, segTopY)
      );
    }
    return;
  }

  if (
    state.topSplitEnabled &&
    state.bottomSplitEnabled &&
    ctx.bottomLineY < ctx.splitLineY - CORNER_WING_DIMENSIONS.connector.minSegmentHeightM
  ) {
    const topTopY = topEdge;
    const topBottomY = ctx.splitLineY + ctx.splitGap / 2;
    const topH = topTopY - topBottomY;
    const topY = topBottomY + topH / 2;

    const midTopY = ctx.splitLineY - ctx.splitGap / 2;
    const midBottomY = ctx.bottomLineY + ctx.splitGap / 2;
    const midH = midTopY - midBottomY;
    const midY = midBottomY + midH / 2;

    const botTopY = ctx.bottomLineY - ctx.splitGap / 2;
    const botBottomY = ctx.doorBottomY;
    const botH = botTopY - botBottomY;
    const botY = botBottomY + botH / 2;

    pushCornerConnectorDoorSegment(
      ctx,
      state,
      topId,
      topH,
      topY,
      clampCornerConnectorHandleAbsY(
        ctx,
        topId,
        topBottomY + ctx.topSplitHandleInsetForPart(ctx.cfg0, topId),
        topBottomY,
        topTopY
      )
    );
    pushCornerConnectorDoorSegment(
      ctx,
      state,
      midId,
      midH,
      midY,
      clampCornerConnectorHandleAbsY(ctx, midId, state.defaultHandleAbsY, midBottomY, midTopY)
    );
    pushCornerConnectorDoorSegment(
      ctx,
      state,
      botId,
      botH,
      botY,
      clampCornerConnectorHandleAbsY(ctx, botId, state.defaultHandleAbsY, botBottomY, botTopY)
    );
    return;
  }

  if (state.topSplitEnabled) {
    const topTopY = topEdge;
    const topBottomY = ctx.splitLineY + ctx.splitGap / 2;
    const topH = topTopY - topBottomY;
    const topY = topBottomY + topH / 2;

    const botTopY = ctx.splitLineY - ctx.splitGap / 2;
    const botBottomY = ctx.doorBottomY;
    const botH = botTopY - botBottomY;
    const botY = botBottomY + botH / 2;

    pushCornerConnectorDoorSegment(
      ctx,
      state,
      topId,
      topH,
      topY,
      clampCornerConnectorHandleAbsY(
        ctx,
        topId,
        topBottomY + ctx.topSplitHandleInsetForPart(ctx.cfg0, topId),
        topBottomY,
        topTopY
      )
    );
    pushCornerConnectorDoorSegment(
      ctx,
      state,
      botId,
      botH,
      botY,
      clampCornerConnectorHandleAbsY(ctx, botId, state.defaultHandleAbsY, botBottomY, botTopY)
    );
    return;
  }

  const fullTopY = topEdge;
  const fullBottomY = ctx.bottomLineY + ctx.splitGap / 2;
  const fullH = fullTopY - fullBottomY;
  const fullY = fullBottomY + fullH / 2;

  const botTopY = ctx.bottomLineY - ctx.splitGap / 2;
  const botBottomY = ctx.doorBottomY;
  const botH = botTopY - botBottomY;
  const botY = botBottomY + botH / 2;

  pushCornerConnectorDoorSegment(
    ctx,
    state,
    topId,
    fullH,
    fullY,
    clampCornerConnectorHandleAbsY(ctx, topId, state.defaultHandleAbsY, fullBottomY, fullTopY)
  );
  pushCornerConnectorDoorSegment(
    ctx,
    state,
    botId,
    botH,
    botY,
    clampCornerConnectorHandleAbsY(ctx, botId, state.defaultHandleAbsY, botBottomY, botTopY)
  );
}
