import { CORNER_CONNECTOR_DOOR_RENDER_POLICY } from '../../shared/dimensions/corner_system_policy.js';
import {
  clampCornerConnectorHandleAbsY,
  pushCornerConnectorDoorSegment,
  type CornerConnectorDoorContext,
  type CornerConnectorDoorState,
} from './corner_connector_door_emit_shared.js';

export function appendCornerConnectorFullDoor(
  ctx: CornerConnectorDoorContext,
  state: CornerConnectorDoorState
): void {
  const fullId = `${state.doorBaseId}_full`;
  pushCornerConnectorDoorSegment(
    ctx,
    state,
    fullId,
    ctx.doorH,
    ctx.doorCenterY,
    clampCornerConnectorHandleAbsY(
      ctx,
      fullId,
      state.defaultHandleAbsY,
      ctx.doorBottomY,
      ctx.effectiveTopLimit - CORNER_CONNECTOR_DOOR_RENDER_POLICY.fullDoorTopHandleClearanceM
    )
  );
}
