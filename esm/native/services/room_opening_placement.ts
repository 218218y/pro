import type { AppContainer, RoomOpeningKind } from '../../../types';

import type { MouseVectorLike, RaycasterLike } from './canvas_picking_engine.js';
import { createRoomOpeningPlacementAppCapabilities } from './room_opening_placement_app_capabilities.js';
import type { RoomOpeningPlacementInput } from './room_opening_placement_plan.js';
import {
  createRoomOpeningPlacementRuntime,
  type RoomOpeningPlacementHoverFeedback,
  type RoomOpeningPlacementRuntime,
} from './room_opening_placement_runtime.js';

export type { RoomOpeningPlacementHoverFeedback } from './room_opening_placement_runtime.js';

const runtimes = new WeakMap<AppContainer, RoomOpeningPlacementRuntime>();

function getRoomOpeningPlacementRuntime(App: AppContainer): RoomOpeningPlacementRuntime {
  const current = runtimes.get(App);
  if (current) return current;
  const runtime = createRoomOpeningPlacementRuntime(createRoomOpeningPlacementAppCapabilities(App));
  runtimes.set(App, runtime);
  return runtime;
}

export function beginRoomOpeningPlacement(
  App: AppContainer,
  input: { kind: RoomOpeningKind; widthCm?: number | null; heightCm?: number | null }
): boolean {
  return getRoomOpeningPlacementRuntime(App).begin(input satisfies RoomOpeningPlacementInput);
}

export function cancelRoomOpeningPlacement(App: AppContainer): void {
  getRoomOpeningPlacementRuntime(App).cancel();
}

export function isRoomOpeningPlacementActive(App: AppContainer): boolean {
  return getRoomOpeningPlacementRuntime(App).isActive();
}

export function tryHandleRoomOpeningPlacementHover(args: {
  App: AppContainer;
  ndcX: number;
  ndcY: number;
  raycaster: RaycasterLike;
  mouse: MouseVectorLike;
}): RoomOpeningPlacementHoverFeedback | null {
  return getRoomOpeningPlacementRuntime(args.App).hover(args);
}

export function tryHandleRoomOpeningPlacementClick(args: {
  App: AppContainer;
  ndcX: number;
  ndcY: number;
  raycaster: RaycasterLike;
  mouse: MouseVectorLike;
}): boolean {
  return getRoomOpeningPlacementRuntime(args.App).click(args);
}

export function removeRoomOpening(App: AppContainer, openingId: string): boolean {
  return getRoomOpeningPlacementRuntime(App).remove(openingId);
}
