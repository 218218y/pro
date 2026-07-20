import {
  CORNER_CONNECTOR_DOOR_RENDER_POLICY,
  CORNER_WING_DRAWER_POLICY,
} from '../../shared/dimensions/corner_system_policy.js';

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
    state.effectiveTopLimit - CORNER_CONNECTOR_DOOR_RENDER_POLICY.doorTopClearanceM
  );

  const isRemovedDoor = ctx.removeDoorsEnabled && ctx.isDoorRemoved(fullId);
  const group = createCornerDoorGroup(ctx, state, fullId, fullH, handleAbsY, isRemovedDoor);
  group.position.set(state.pivotX, fullY, CORNER_WING_DRAWER_POLICY.externalFrontOffsetZM + state.doorZShift);

  const added = processCornerDoorVisual(ctx, fullId, {
    partId: fullId,
    width: state.doorW - CORNER_CONNECTOR_DOOR_RENDER_POLICY.visualWidthClearanceM,
    height: fullH - CORNER_CONNECTOR_DOOR_RENDER_POLICY.visualHeightClearanceM,
    group,
    meshOffset: state.meshOffset,
    groovePartId: fullId,
  });

  ctx.wingGroup.add(group);
  if (added || isRemovedDoor) {
    appendCornerDoorRenderEntry(ctx, group, state.chosenDirection);
  }
}
