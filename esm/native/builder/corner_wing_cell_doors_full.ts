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
  handleAbsY = clampHandleAbsY(ctx, fullId, handleAbsY, state.doorBottomY, state.effectiveTopLimit - 0.002);

  const isRemovedDoor = ctx.removeDoorsEnabled && ctx.isDoorRemoved(fullId);
  const group = createCornerDoorGroup(ctx, state, fullId, fullH, handleAbsY, isRemovedDoor);
  group.position.set(state.pivotX, fullY, 0.01 + state.doorZShift);

  const added = processCornerDoorVisual(ctx, fullId, {
    partId: fullId,
    width: state.doorW - 0.004,
    height: fullH - 0.004,
    group,
    meshOffset: state.meshOffset,
    groovePartId: fullId,
  });

  ctx.wingGroup.add(group);
  if (added || isRemovedDoor) {
    appendCornerDoorRenderEntry(ctx, group, state.chosenDirection);
  }
}
