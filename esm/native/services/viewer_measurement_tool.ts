import type { AppContainer } from '../../../types';

import type { CanvasPickingClickHitState } from './canvas_picking_click_contracts.js';
import type { MouseVectorLike, RaycasterLike } from './canvas_picking_engine.js';
import type { ViewerMeasurementToolMode } from './viewer_measurement_tool_contracts.js';
import {
  clearViewerMeasurementOverlayWithRuntime,
  getViewerMeasurementToolModeWithRuntime,
  setViewerMeasurementToolModeWithRuntime,
  tryHandleViewerMeasurementClickWithRuntime,
  tryHandleViewerMeasurementHoverWithRuntime,
} from './viewer_measurement_tool_flow.js';
import { createViewerMeasurementFeatureRuntime } from './viewer_measurement_tool_runtime.js';
import { resolveViewerMeasurementHitStateWithRoom } from './viewer_measurement_room_target.js';

export const VIEWER_MEASUREMENT_MODE_ID = 'measure';
export type { ViewerMeasurementToolMode } from './viewer_measurement_tool_contracts.js';
export { resolveViewerMeasurementPartLabel } from './viewer_measurement_part_label.js';

export function getViewerMeasurementToolMode(App: AppContainer): ViewerMeasurementToolMode {
  return getViewerMeasurementToolModeWithRuntime(createViewerMeasurementFeatureRuntime(App));
}

export function setViewerMeasurementToolMode(
  App: AppContainer,
  mode: ViewerMeasurementToolMode,
  render = true
): void {
  setViewerMeasurementToolModeWithRuntime(createViewerMeasurementFeatureRuntime(App), mode, render);
}

export function clearViewerMeasurementOverlay(App: AppContainer, render = true): void {
  clearViewerMeasurementOverlayWithRuntime(createViewerMeasurementFeatureRuntime(App), render);
}

export function resolveViewerMeasurementHitState(args: {
  App: AppContainer;
  hitState: CanvasPickingClickHitState | null;
  ndcX?: number;
  ndcY?: number;
  raycaster?: RaycasterLike | null;
  mouse?: MouseVectorLike | null;
}): CanvasPickingClickHitState | null {
  return resolveViewerMeasurementHitStateWithRoom(args);
}

export function tryHandleViewerMeasurementHover(args: {
  App: AppContainer;
  hitState: CanvasPickingClickHitState | null;
  ndcX?: number;
  ndcY?: number;
  raycaster?: RaycasterLike | null;
  mouse?: MouseVectorLike | null;
  preResolvedHitState?: CanvasPickingClickHitState | null;
}): boolean {
  const hitState =
    args.preResolvedHitState === undefined
      ? resolveViewerMeasurementHitStateWithRoom(args)
      : args.preResolvedHitState;
  return tryHandleViewerMeasurementHoverWithRuntime({
    runtime: createViewerMeasurementFeatureRuntime(args.App),
    hitState,
    ndcX: args.ndcX,
    ndcY: args.ndcY,
    raycaster: args.raycaster,
    mouse: args.mouse,
  });
}

export function tryHandleViewerMeasurementClick(args: {
  App: AppContainer;
  hitState: CanvasPickingClickHitState | null;
  ndcX?: number;
  ndcY?: number;
  raycaster?: RaycasterLike | null;
  mouse?: MouseVectorLike | null;
}): boolean {
  const hitState = resolveViewerMeasurementHitStateWithRoom(args);
  return tryHandleViewerMeasurementClickWithRuntime({
    runtime: createViewerMeasurementFeatureRuntime(args.App),
    hitState,
    ndcX: args.ndcX,
    ndcY: args.ndcY,
    raycaster: args.raycaster,
    mouse: args.mouse,
  });
}
