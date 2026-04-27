export type {
  CornerConnectorDoorContext,
  CornerConnectorDoorState,
} from './corner_connector_door_emit_contracts.js';
export type { CornerConnectorDoorFlowParams } from './corner_connector_door_emit_flow_contracts.js';
import type {
  CornerConnectorDoorContext,
  CornerConnectorDoorState,
} from './corner_connector_door_emit_contracts.js';
import type { CornerConnectorDoorFlowParams } from './corner_connector_door_emit_flow_contracts.js';
import { createCornerConnectorDoorContextInternal } from './corner_connector_door_emit_context.js';
import {
  clampCornerConnectorHandleAbsYInternal,
  createCornerConnectorDoorStateInternal,
  mergeCornerConnectorSplitCutsInternal,
  partIdForCornerConnectorSegmentInternal,
  pushCornerConnectorDoorSegmentInternal,
  readCornerConnectorCustomSplitCutsYInternal,
} from './corner_connector_door_emit_state.js';
import { readCurtainType } from './corner_connector_door_emit_runtime.js';

export function createCornerConnectorDoorContext(
  params: CornerConnectorDoorFlowParams
): CornerConnectorDoorContext | null {
  return createCornerConnectorDoorContextInternal(params);
}

export function createCornerConnectorDoorState(
  ctx: CornerConnectorDoorContext,
  doorIndex: 1 | 2
): CornerConnectorDoorState {
  return createCornerConnectorDoorStateInternal(ctx, doorIndex);
}

export function readCornerConnectorCustomSplitCutsY(
  ctx: CornerConnectorDoorContext,
  state: CornerConnectorDoorState
): number[] {
  return readCornerConnectorCustomSplitCutsYInternal(ctx, state);
}

export function mergeCornerConnectorSplitCuts(
  ctx: CornerConnectorDoorContext,
  cutsMerged0: number[]
): number[] {
  return mergeCornerConnectorSplitCutsInternal(ctx, cutsMerged0);
}

export function partIdForCornerConnectorSegment(
  state: CornerConnectorDoorState,
  segCount: number,
  segIndexFromBottom: number
): string {
  return partIdForCornerConnectorSegmentInternal(state, segCount, segIndexFromBottom);
}

export function clampCornerConnectorHandleAbsY(
  ctx: CornerConnectorDoorContext,
  partId: string,
  absY: number,
  segBottomY: number,
  segTopY: number
): number {
  return clampCornerConnectorHandleAbsYInternal(ctx, partId, absY, segBottomY, segTopY);
}

export function pushCornerConnectorDoorSegment(
  ctx: CornerConnectorDoorContext,
  state: CornerConnectorDoorState,
  partId: string,
  segH: number,
  segY: number,
  handleAbsY: number
): void {
  pushCornerConnectorDoorSegmentInternal(ctx, state, partId, segH, segY, handleAbsY);
}

export { readCurtainType };
