// Corner connector door emission owner.
//
// Keep the public pentagon-door layer focused on per-door orchestration while
// shared runtime normalization and split/full segment policy live in dedicated
// helpers.

import {
  createCornerConnectorDoorContext,
  createCornerConnectorDoorState,
  type CornerConnectorDoorFlowParams,
} from './corner_connector_door_emit_shared.js';

const CORNER_CONNECTOR_DOOR_INDICES: ReadonlyArray<1 | 2> = [1, 2];
import { appendCornerConnectorFullDoor } from './corner_connector_door_emit_full.js';
import { appendCornerConnectorSplitDoor } from './corner_connector_door_emit_split.js';

export function applyCornerConnectorDoorFlow(params: CornerConnectorDoorFlowParams): void {
  const ctx = createCornerConnectorDoorContext(params);
  if (!ctx) return;

  for (const doorIndex of CORNER_CONNECTOR_DOOR_INDICES) {
    const state = createCornerConnectorDoorState(ctx, doorIndex);
    if (state.shouldSplit) {
      appendCornerConnectorSplitDoor(ctx, state);
      continue;
    }
    appendCornerConnectorFullDoor(ctx, state);
  }
}
