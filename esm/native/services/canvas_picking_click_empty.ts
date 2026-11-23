import { MODES } from '../runtime/api.js';
import { __wp_triggerRender } from './canvas_picking_core_helpers.js';
import type { CanvasPickingClickHitState } from './canvas_picking_click_contracts.js';
import type { CanvasPickingClickRouteArgs } from './canvas_picking_click_route_shared.js';
import { resetAllEditModes } from './edit_state.js';

export function resetCanvasPickingEmptyClick({
  App,
  hitState,
  modeState: { __pm: primary },
}: Pick<CanvasPickingClickRouteArgs, 'App' | 'modeState'> & {
  hitState: CanvasPickingClickHitState | null;
}): boolean {
  const primaryHitObject = hitState?.primaryHitObject;
  if (primaryHitObject && primaryHitObject.name !== 'floor' && primaryHitObject.name !== 'smartFloor') {
    return false;
  }

  if (primary && primary !== MODES.NONE && primary !== MODES.SCREEN_NOTE) {
    resetAllEditModes(App);
    __wp_triggerRender(App, true);
  }

  return true;
}
