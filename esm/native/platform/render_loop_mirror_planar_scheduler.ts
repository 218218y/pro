import type { AppContainer } from '../../../types';

import {
  enablePlanarReflectorCubeMode,
  readTrackedPlanarMirrorStats,
  refreshTrackedPlanarMirrorSurfacesNow,
} from '../runtime/render_access.js';
import { readRuntimeConfigNumberFromApp } from '../runtime/runtime_config_selectors.js';
import {
  addRenderSlotCounter,
  incrementRenderSlotCounter,
  markBudgetDeferred,
  markPlanarBatchPending,
  readFiniteSlotNumber,
  resolvePlanarUpdatesPerFrame,
  resolveRemainingFrameBudgetMs,
  type MirrorDriverDeps,
  type MirrorFramePolicy,
} from './render_loop_mirror_shared.js';

export type PlanarMirrorScheduleResult = {
  hasCubeMirrorSurfaces: boolean;
  stopBeforeCubePass: boolean;
};

export function runPlanarMirrorSchedule(
  app: AppContainer,
  deps: Pick<MirrorDriverDeps, 'now' | 'getRenderSlot' | 'setRenderSlot'>,
  policy: MirrorFramePolicy,
  hasMirror: boolean
): PlanarMirrorScheduleResult {
  let stats = hasMirror
    ? readTrackedPlanarMirrorStats(app)
    : { mirrorCount: 0, planarCount: 0, cubeCount: 0, explicitCubeCount: 0 };

  if (hasMirror && stats.planarCount > 0 && (policy.cubeMirrorMode || stats.cubeCount > 0)) {
    enablePlanarReflectorCubeMode(app, { notify: !policy.cubeMirrorMode });
    stats = readTrackedPlanarMirrorStats(app);
  }

  const hasPlanarReflectors = stats.planarCount > 0;
  const hasCubeMirrorSurfaces =
    stats.cubeCount > 0 ||
    stats.explicitCubeCount > 0 ||
    (policy.cubeMirrorMode &&
      (stats.cubeCount > 0 || stats.explicitCubeCount > 0 || (hasMirror && stats.mirrorCount === 0)));

  const planarLastUpdateMs = readFiniteSlotNumber(deps, app, '__mirrorPlanarLastUpdateMs', -1);
  const planarIntervalRaw = policy.motionActive
    ? readRuntimeConfigNumberFromApp(app, 'MIRROR_REFLECTOR_MOVE_UPDATE_MS', 0)
    : readRuntimeConfigNumberFromApp(app, 'MIRROR_REFLECTOR_UPDATE_MS', 120);
  const planarIntervalMs = Math.max(0, Number.isFinite(planarIntervalRaw) ? planarIntervalRaw : 160);
  const batchPending = !!deps.getRenderSlot<boolean>(app, '__mirrorPlanarBatchPending');
  const initialBatchPending = !!deps.getRenderSlot<boolean>(app, '__mirrorPlanarInitialBatchPending');
  const intervalDue =
    policy.mirrorDirty ||
    batchPending ||
    planarIntervalMs === 0 ||
    planarLastUpdateMs < 0 ||
    policy.nowMs - planarLastUpdateMs >= planarIntervalMs;

  let refreshed = false;
  let batchCompleted = !batchPending;

  if (hasPlanarReflectors && intervalDue && !policy.canRunInBudget) {
    markBudgetDeferred(deps, app, policy.nowMs, '__mirrorPlanarBudgetSkipCount');
  }

  if (hasPlanarReflectors && intervalDue && policy.canRunInBudget) {
    const cursor = readFiniteSlotNumber(deps, app, '__mirrorPlanarCursorIndex', 0);
    const refreshInitialOnly = initialBatchPending || (policy.mirrorDirty && !policy.motionActive);
    const result = refreshTrackedPlanarMirrorSurfacesNow(app, {
      startIndex: cursor,
      maxSurfaces: resolvePlanarUpdatesPerFrame(app, policy.motionActive),
      maxBudgetMs: resolveRemainingFrameBudgetMs(policy),
      now: deps.now,
      initialOnly: refreshInitialOnly,
    });

    deps.setRenderSlot(app, '__mirrorPlanarCursorIndex', result.nextIndex);
    addRenderSlotCounter(deps, app, '__mirrorPlanarAttemptCount', result.attemptedCount);
    addRenderSlotCounter(deps, app, '__mirrorPlanarFailureCount', result.failedCount);
    addRenderSlotCounter(deps, app, '__mirrorPlanarDeferredSurfaceCount', result.deferredCount);
    addRenderSlotCounter(deps, app, '__mirrorPlanarBackoffDeferredCount', result.backoffDeferredCount);

    if (result.skippedReason) {
      deps.setRenderSlot(app, '__mirrorPlanarLastSkippedReason', result.skippedReason);
      deps.setRenderSlot(app, '__mirrorPlanarLastSkippedAtMs', policy.nowMs);
    }
    if (result.firstFailureReason) {
      deps.setRenderSlot(app, '__mirrorPlanarLastFailureReason', result.firstFailureReason);
      deps.setRenderSlot(app, '__mirrorPlanarLastFailureAtMs', policy.nowMs);
      deps.setRenderSlot(app, '__mirrorPlanarFailureCounts', result.failureCounts);
    }

    batchCompleted = result.completedCycle;
    deps.setRenderSlot(app, '__mirrorPlanarBatchPending', !batchCompleted);
    deps.setRenderSlot(app, '__mirrorPlanarInitialBatchPending', refreshInitialOnly && !batchCompleted);

    if (result.refreshed) {
      refreshed = true;
      deps.setRenderSlot(app, '__mirrorPlanarLastUpdateMs', policy.nowMs);
      deps.setRenderSlot(app, '__mirrorLastUpdateMs', policy.nowMs);
      incrementRenderSlotCounter(deps, app, '__mirrorPlanarUpdateCount');
      deps.setRenderSlot(app, '__mirrorPresenceKnown', true);
      deps.setRenderSlot(app, '__mirrorPresenceHasMirror', true);
      deps.setRenderSlot(app, '__mirrorPresenceCheckedAtMs', policy.nowMs);
      if (!batchCompleted) {
        markPlanarBatchPending(deps, app, policy.nowMs);
      } else {
        deps.setRenderSlot(app, '__mirrorWorkPending', false);
        if (!hasCubeMirrorSurfaces) deps.setRenderSlot(app, '__mirrorDirty', false);
      }
    } else if (batchCompleted && !hasCubeMirrorSurfaces) {
      deps.setRenderSlot(app, '__mirrorWorkPending', false);
      deps.setRenderSlot(app, '__mirrorDirty', false);
    } else if ((policy.mirrorDirty || !batchCompleted) && !hasCubeMirrorSurfaces) {
      deps.setRenderSlot(app, '__mirrorWorkPending', true);
    }
  }

  if (hasMirror && hasPlanarReflectors && !hasCubeMirrorSurfaces) {
    if (!intervalDue || refreshed) {
      deps.setRenderSlot(app, '__mirrorPresenceKnown', true);
      deps.setRenderSlot(app, '__mirrorPresenceHasMirror', true);
      deps.setRenderSlot(app, '__mirrorPresenceCheckedAtMs', policy.nowMs);
      if (batchCompleted && (!policy.mirrorDirty || refreshed)) {
        deps.setRenderSlot(app, '__mirrorWorkPending', false);
      }
    }
    return { hasCubeMirrorSurfaces: false, stopBeforeCubePass: true };
  }

  if (!policy.cubeMirrorMode && !hasCubeMirrorSurfaces) {
    if (hasMirror) {
      deps.setRenderSlot(app, '__mirrorPresenceKnown', true);
      deps.setRenderSlot(app, '__mirrorPresenceHasMirror', true);
      deps.setRenderSlot(app, '__mirrorPresenceCheckedAtMs', policy.nowMs);
      deps.setRenderSlot(app, '__mirrorDirty', false);
      deps.setRenderSlot(app, '__mirrorWorkPending', false);
    }
    return { hasCubeMirrorSurfaces: false, stopBeforeCubePass: true };
  }

  return { hasCubeMirrorSurfaces, stopBeforeCubePass: !hasMirror };
}
