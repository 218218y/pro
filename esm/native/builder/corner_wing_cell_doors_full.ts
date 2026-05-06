import { CORNER_WING_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';

// Corner wing full-door emission.
//
// Keep the unsplit path focused so the public door owner does not carry both
// full-height and segmented door policy in the same file.

import {
  appendCornerDoorRenderEntry,
  clampHandleAbsY,
  createCornerDoorGroup,
  defaultHandleAbsYForPart,
  processCornerDoorVisual,
  type CornerWingDoorContext,
  type CornerWingDoorState,
} from './corner_wing_cell_doors_shared.js';

export function appendCornerWingFullDoor(ctx: CornerWingDoorContext, state: CornerWingDoorState): void {
  const fullId = `${state.doorBaseId}_full`;
  const fullH = state.totalDoorH;
  const fullY = state.doorBottomY + fullH / 2;
  let handleAbsY = defaultHandleAbsYForPart(ctx, fullId);
  handleAbsY = clampHandleAbsY(
    ctx,
    fullId,
    handleAbsY,
    state.doorBottomY,
    state.effectiveTopLimit - CORNER_WING_DIMENSIONS.connector.doorTopClearanceM
  );

  const isRemovedDoor = ctx.removeDoorsEnabled && ctx.isDoorRemoved(fullId);
  const group = createCornerDoorGroup(ctx, state, fullId, fullH, handleAbsY, isRemovedDoor);
  group.position.set(
    state.pivotX,
    fullY,
    CORNER_WING_DIMENSIONS.drawers.externalFrontOffsetZM + state.doorZShift
  );

  const added = processCornerDoorVisual(ctx, fullId, {
    partId: fullId,
    width: state.doorW - CORNER_WING_DIMENSIONS.connector.visualWidthClearanceM,
    height: fullH - CORNER_WING_DIMENSIONS.connector.visualHeightClearanceM,
    group,
    meshOffset: state.meshOffset,
    groovePartId: fullId,
  });

  ctx.wingGroup.add(group);
  if (added || isRemovedDoor) {
    appendCornerDoorRenderEntry(ctx, group, state.chosenDirection);
  }
}
