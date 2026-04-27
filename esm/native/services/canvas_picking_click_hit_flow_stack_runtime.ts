import type { AppContainer } from '../../../types';

import { computeDesiredStackSplit } from '../features/stack_split/index.js';
import { readStackSplitLowerTopY } from '../runtime/cache_access.js';
import { getScene, getWardrobeGroup } from '../runtime/render_access.js';
import { getThreeMaybe } from '../runtime/three_access.js';
import { __wp_reportPickingIssue, __wp_toModuleKey, __wp_ui } from './canvas_picking_core_helpers.js';
import type { RaycastHitLike } from './canvas_picking_engine.js';
import type { MutableCanvasPickingClickHitState } from './canvas_picking_click_hit_flow_state.js';
import { readFallbackPrimaryHitY, readUiStackSplitEnabled } from './canvas_picking_click_hit_flow_shared.js';
import { findModuleCandidateForStack } from './canvas_picking_module_selector_hits.js';

export function readStackBoundaryY(App: AppContainer): number | null {
  const boundaryY = readStackSplitLowerTopY(App);
  return typeof boundaryY === 'number' && Number.isFinite(boundaryY) ? boundaryY : null;
}

export function readStackSplitCameraLike(
  value: unknown
): { updateMatrixWorld?: (force?: boolean) => void } | null {
  if (!value || typeof value !== 'object') return null;
  const updateMatrixWorld = Reflect.get(value, 'updateMatrixWorld');
  if (typeof updateMatrixWorld !== 'function') return {};
  return {
    updateMatrixWorld: (force?: boolean) => {
      Reflect.apply(updateMatrixWorld, value, [force]);
    },
  };
}

export function readStackStopAt(App: AppContainer) {
  return (node: unknown) => {
    const scene = getScene(App);
    const wardrobeRoot = getWardrobeGroup(App);
    return node === scene || node === wardrobeRoot;
  };
}

export function repairCanvasPickingClickStack(args: {
  App: AppContainer;
  cam: unknown;
  intersects: RaycastHitLike[];
  ndcY: number;
  state: MutableCanvasPickingClickHitState;
}): void {
  const { App, cam, intersects, ndcY, state } = args;

  try {
    const splitOn = readUiStackSplitEnabled(__wp_ui(App));
    if (splitOn && state.stackHintSource !== 'objectTag') {
      try {
        if (state.foundDrawerId && String(state.foundDrawerId).startsWith('lower_')) {
          state.foundModuleStack = 'bottom';
          state.stackHintSource = 'id';
        }
      } catch (err) {
        __wp_reportPickingIssue(App, err, {
          where: 'canvasPicking.click',
          op: 'stackHint.lowerDrawerId',
          throttleMs: 1000,
        });
      }
      try {
        const m = state.effectiveDoorId ? /^d(\d+)/.exec(String(state.effectiveDoorId)) : null;
        if (m && m[1] && Number(m[1]) >= 1000) {
          state.foundModuleStack = 'bottom';
          state.stackHintSource = 'id';
        }
      } catch (err) {
        __wp_reportPickingIssue(App, err, {
          where: 'canvasPicking.click',
          op: 'stackHint.lowerDoorId',
          throttleMs: 1000,
        });
      }
    }
  } catch (err) {
    __wp_reportPickingIssue(App, err, {
      where: 'canvasPicking.click',
      op: 'stackHint.outer',
      throttleMs: 1000,
    });
  }

  try {
    const splitOn = readUiStackSplitEnabled(__wp_ui(App));
    if (!splitOn) return;

    const boundaryY = readStackBoundaryY(App);
    let desiredStack: 'top' | 'bottom' | null = null;

    try {
      const THREE = getThreeMaybe(App);
      desiredStack = computeDesiredStackSplit({
        THREE,
        camera: readStackSplitCameraLike(cam),
        boundaryWorldY: boundaryY ?? NaN,
        ndcY: typeof ndcY === 'number' && Number.isFinite(ndcY) ? ndcY : null,
        fallbackHitWorldY: readFallbackPrimaryHitY(state, intersects),
      });
    } catch (err) {
      __wp_reportPickingIssue(App, err, {
        where: 'canvasPicking.click',
        op: 'stackHint.computeDesiredStackSplit',
        throttleMs: 1000,
      });
    }

    if (!desiredStack) return;

    const canOverride = state.stackHintSource !== 'objectTag' && state.stackHintSource !== 'id';
    const selCand = desiredStack === 'bottom' ? state.selectorHitBottom : state.selectorHitTop;
    const pickCand = () =>
      selCand
        ? { moduleKey: selCand.mi, hitY: selCand.hitY }
        : findModuleCandidateForStack({
            intersects,
            desiredStack,
            boundaryY,
            toModuleKey: __wp_toModuleKey,
            stopAt: readStackStopAt(App),
          });

    if (canOverride && (state.foundModuleIndex === null || state.foundModuleStack !== desiredStack)) {
      const cand = pickCand();
      if (cand && cand.moduleKey != null) {
        state.foundModuleIndex = cand.moduleKey;
        if (typeof cand.hitY === 'number') state.moduleHitY = cand.hitY;
        state.foundModuleStack = desiredStack;
        state.stackHintSource = 'y';
      } else if (state.foundModuleIndex !== null) {
        state.foundModuleStack = desiredStack;
        state.stackHintSource = 'y';
      }
      return;
    }

    if (state.foundModuleIndex === null) {
      const cand = pickCand();
      if (cand && cand.moduleKey != null) {
        state.foundModuleIndex = cand.moduleKey;
        if (typeof cand.hitY === 'number') state.moduleHitY = cand.hitY;
      }
    }
  } catch (err) {
    __wp_reportPickingIssue(App, err, {
      where: 'canvasPicking.click',
      op: 'stackHint.inferRepair',
      throttleMs: 1000,
    });
  }
}
