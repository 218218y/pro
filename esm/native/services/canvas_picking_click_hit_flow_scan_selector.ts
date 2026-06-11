import type { AppContainer } from '../../../types';

import { __wp_reportPickingIssue, __wp_toModuleKey } from './canvas_picking_core_helpers.js';
import type { RaycastHitLike } from './canvas_picking_engine.js';
import { __wp_isViewportRoot } from './canvas_picking_local_helpers.js';
import type { MutableCanvasPickingClickHitState } from './canvas_picking_click_hit_flow_state.js';
import {
  readModuleHitCandidateFromIntersection,
  readModuleSelectorHit,
} from './canvas_picking_module_selector_hits.js';

export function scanCanvasPickingClickSelectorHits(args: {
  App: AppContainer;
  hit: RaycastHitLike;
  state: MutableCanvasPickingClickHitState;
}): boolean {
  const { App, hit, state } = args;

  const selectorHit = readModuleSelectorHit(hit, __wp_toModuleKey);
  if (selectorHit) {
    const selectorCandidate = {
      mi: selectorHit.moduleKey,
      hitY: selectorHit.hitY,
    };
    if (selectorHit.stack === 'bottom') {
      if (!state.selectorHitBottom) state.selectorHitBottom = selectorCandidate;
    } else if (!state.selectorHitTop) {
      state.selectorHitTop = selectorCandidate;
    }

    if (state.foundModuleIndex === null) {
      state.foundModuleIndex = selectorHit.moduleKey;
      state.moduleHitY = selectorHit.hitY;
      state.foundModuleStack = selectorHit.stack;
      state.stackHintSource = 'moduleSelector';
    }
    return true;
  }

  const moduleCandidate = readModuleHitCandidateFromIntersection({
    hit,
    toModuleKey: __wp_toModuleKey,
    stopAt: node => __wp_isViewportRoot(App, node),
    includeSketchModuleKey: true,
  });
  if (!moduleCandidate) return false;

  if (moduleCandidate.stackHint && state.stackHintSource !== 'objectTag') {
    state.foundModuleStack = moduleCandidate.stackHint;
    state.stackHintSource = 'objectTag';
  }
  if (state.foundModuleIndex === null) {
    state.foundModuleIndex = moduleCandidate.moduleKey;
    state.moduleHitY = moduleCandidate.hitY;
  }
  return false;
}

export function promoteSelectorPrimaryClickHit(args: {
  App: AppContainer;
  intersects: RaycastHitLike[];
  state: MutableCanvasPickingClickHitState;
}): void {
  const { App, intersects, state } = args;
  if (state.primaryHitObject || state.foundModuleIndex === null) return;

  try {
    const selHit = intersects.map(hit => readModuleSelectorHit(hit, __wp_toModuleKey)).find(Boolean) || null;
    if (selHit && selHit.object) {
      state.primaryHitObject = selHit.object;
      state.primaryHitPoint = selHit.hit.point || null;
      if (state.primaryHitY == null && typeof selHit.hitY === 'number') {
        state.primaryHitY = selHit.hitY;
      }
    }
  } catch (err) {
    __wp_reportPickingIssue(App, err, {
      where: 'canvasPicking.click',
      op: 'selectorPromotion',
      throttleMs: 1000,
    });
  }

  if (state.primaryHitY == null && typeof state.moduleHitY === 'number') state.primaryHitY = state.moduleHitY;
}
