import type { AppContainer } from '../../../types';

import { __wp_reportPickingIssue, __wp_toModuleKey, __wp_ui } from './canvas_picking_core_helpers.js';
import type { RaycastHitLike } from './canvas_picking_engine.js';
import type { MutableCanvasPickingClickHitState } from './canvas_picking_click_hit_flow_state.js';
import { readUiStackSplitEnabled } from './canvas_picking_click_hit_flow_shared.js';
import {
  findPreferredCornerCellCandidate,
  isSpecificCornerCellKey,
} from './canvas_picking_module_selector_hits.js';
import { readStackBoundaryY, readStackStopAt } from './canvas_picking_click_hit_flow_stack_runtime.js';

export function promoteCornerCellCanvasPickingClickHit(args: {
  App: AppContainer;
  intersects: RaycastHitLike[];
  state: MutableCanvasPickingClickHitState;
}): void {
  const { App, intersects, state } = args;
  try {
    if (state.foundModuleIndex !== 'corner') return;

    const selectorCandidate =
      state.foundModuleStack === 'bottom' ? state.selectorHitBottom : state.selectorHitTop;
    if (selectorCandidate && isSpecificCornerCellKey(selectorCandidate.mi)) {
      state.foundModuleIndex = selectorCandidate.mi;
      if (typeof selectorCandidate.hitY === 'number') state.moduleHitY = selectorCandidate.hitY;
      return;
    }

    const preferred = findPreferredCornerCellCandidate({
      intersects,
      desiredStack: state.foundModuleStack,
      boundaryY: readUiStackSplitEnabled(__wp_ui(App)) ? readStackBoundaryY(App) : null,
      toModuleKey: __wp_toModuleKey,
      stopAt: readStackStopAt(App),
    });
    if (preferred && isSpecificCornerCellKey(preferred.moduleKey)) {
      state.foundModuleIndex = preferred.moduleKey;
      if (typeof preferred.hitY === 'number') state.moduleHitY = preferred.hitY;
    }
  } catch (err) {
    __wp_reportPickingIssue(App, err, {
      where: 'canvasPicking.click',
      op: 'cornerCell.promoteFromGenericCorner',
      throttleMs: 1000,
    });
  }
}
