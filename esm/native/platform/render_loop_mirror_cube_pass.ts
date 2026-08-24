import type { AppContainer, UnknownRecord } from '../../../types';

import {
  getMirrorCubeCamera,
  getMirrorHideScratch,
  getMirrorRenderTarget,
  getShadowMap,
  isPlanarMirrorSurface,
} from '../runtime/render_access.js';
import {
  asRecordOrNull,
  incrementRenderSlotCounter,
  isFrameWithinBudget,
  markBudgetDeferred,
  readFiniteSlotNumber,
  type MirrorDriverDeps,
  type MirrorFramePolicy,
} from './render_loop_mirror_shared.js';

function call2m(ctx: unknown, fn: unknown, first: unknown, second: unknown): unknown {
  return typeof fn === 'function' ? fn.call(ctx, first, second) : undefined;
}

type RendererCounters = {
  calls: number;
  triangles: number;
  programs: number;
};

function readFiniteCount(value: unknown): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(0, numeric) : 0;
}

function readRendererCounters(renderer: UnknownRecord): RendererCounters {
  const info = asRecordOrNull(renderer['info']);
  const render = asRecordOrNull(info?.['render']);
  return {
    calls: readFiniteCount(render?.['calls']),
    triangles: readFiniteCount(render?.['triangles']),
    programs: Array.isArray(info?.['programs']) ? info['programs'].length : 0,
  };
}

function readCubeRenderTargetSize(renderTarget: UnknownRecord): number {
  return Math.max(readFiniteCount(renderTarget['width']), readFiniteCount(renderTarget['height']));
}

type MirrorCubeRefreshMode = 'baseline' | 'defer-first-presentation' | 'first-refresh-128';

function getMirrorCubeRefreshMode(): MirrorCubeRefreshMode {
  const mode = typeof __WP_MIRROR_CUBE_EXPERIMENT__ === 'string' ? __WP_MIRROR_CUBE_EXPERIMENT__ : 'baseline';
  return mode === 'defer-first-presentation' || mode === 'first-refresh-128' ? mode : 'baseline';
}

function setMirrorPresentationPending(
  deps: Pick<MirrorDriverDeps, 'setRenderSlot'>,
  app: AppContainer,
  detail: UnknownRecord
): void {
  if (typeof __WP_BUILD_PERF__ === 'undefined' || __WP_BUILD_PERF__ !== true) return;
  deps.setRenderSlot(app, '__mirrorCubePresentationPending', detail);
}

function scheduleFullResolutionRefresh(
  app: AppContainer,
  deps: Pick<MirrorDriverDeps, 'setRenderSlot' | 'scheduleIdleTask' | 'wakeRenderLoop'>,
  renderTarget: UnknownRecord,
  fullSize: number
): void {
  const resizeAndRefresh = () => {
    call2m(renderTarget, renderTarget['setSize'], fullSize, fullSize);
    deps.setRenderSlot(app, '__mirrorCubeHighQualityPending', false);
    deps.setRenderSlot(app, '__mirrorDirty', true);
    deps.setRenderSlot(app, '__mirrorWorkPending', true);
    deps.wakeRenderLoop?.();
  };
  deps.scheduleIdleTask?.(resizeAndRefresh, 1000);
}

function scheduleDeferredCubeRefresh(
  app: AppContainer,
  deps: Pick<MirrorDriverDeps, 'setRenderSlot' | 'scheduleIdleTask' | 'wakeRenderLoop'>
): void {
  const refresh = () => {
    deps.setRenderSlot(app, '__mirrorCubeDeferredUntilIdle', false);
    deps.setRenderSlot(app, '__mirrorDirty', true);
    deps.setRenderSlot(app, '__mirrorWorkPending', true);
    deps.wakeRenderLoop?.();
  };
  deps.setRenderSlot(app, '__mirrorCubeDeferredUntilIdle', true);
  deps.scheduleIdleTask?.(refresh, 1000);
}

function readMaterialRecords(object: UnknownRecord | null): UnknownRecord[] {
  if (!object) return [];
  const material = object['material'];
  if (!material) return [];
  if (Array.isArray(material)) {
    return material.filter((entry): entry is UnknownRecord => !!asRecordOrNull(entry));
  }
  const single = asRecordOrNull(material);
  return single ? [single] : [];
}

function syncTrackedMirrorMaterialEnvMap(object: UnknownRecord | null, texture: unknown): boolean {
  if (!object || !texture) return false;
  let changed = false;
  for (const material of readMaterialRecords(object)) {
    if (material['envMap'] === texture) continue;
    material['envMap'] = texture;
    material['needsUpdate'] = true;
    changed = true;
  }
  return changed;
}

function acquireMirrorHideScratch(app: AppContainer): UnknownRecord[] {
  const scratch = getMirrorHideScratch(app) as unknown as UnknownRecord[];
  for (const entry of scratch) {
    const object = asRecordOrNull(entry);
    if (object) object['visible'] = true;
  }
  scratch.length = 0;
  return scratch;
}

function restoreHiddenMirrors(mirrors: UnknownRecord[]): void {
  for (const entry of mirrors) {
    const object = asRecordOrNull(entry);
    if (object) object['visible'] = true;
  }
  mirrors.length = 0;
}

export function runMirrorCubePass(args: {
  app: AppContainer;
  deps: Pick<
    MirrorDriverDeps,
    | 'now'
    | 'recordMetric'
    | 'scheduleIdleTask'
    | 'wakeRenderLoop'
    | 'tryHideMirrorSurface'
    | 'getRenderSlot'
    | 'setRenderSlot'
  >;
  policy: MirrorFramePolicy;
  mirrors: UnknownRecord[];
  hasMirror: boolean;
  hasCubeMirrorSurfaces: boolean;
  scene: UnknownRecord;
  renderer: UnknownRecord;
}): void {
  const { app, deps, policy, mirrors, hasCubeMirrorSurfaces, scene, renderer } = args;
  let hasMirror = args.hasMirror;
  const intervalDue =
    policy.mirrorDirty ||
    policy.updateIntervalMs === 0 ||
    policy.lastUpdateMs < 0 ||
    policy.nowMs - policy.lastUpdateMs >= policy.updateIntervalMs;

  if (!hasCubeMirrorSurfaces || !hasMirror || !intervalDue) return;

  if (!policy.canRunInBudget) {
    markBudgetDeferred(deps, app, policy.nowMs, '__mirrorCubeBudgetSkipCount');
    return;
  }

  const updateCount = readFiniteSlotNumber(deps, app, '__mirrorUpdateCount', 0);
  const disabledForMotion = policy.motionActive && policy.disableDuringMotion && updateCount > 0;
  if (disabledForMotion) {
    deps.setRenderSlot(app, '__mirrorMotionDeferredAtMs', policy.nowMs);
    deps.setRenderSlot(app, '__mirrorWorkPending', true);
    incrementRenderSlotCounter(deps, app, '__mirrorMotionDeferredCount');
    return;
  }

  const cube = asRecordOrNull(getMirrorCubeCamera(app));
  const renderTarget = asRecordOrNull(getMirrorRenderTarget(app));
  const texture = renderTarget?.['texture'] ?? null;
  if (!cube || !renderTarget || typeof cube['update'] !== 'function' || !texture) {
    deps.setRenderSlot(app, '__mirrorCubeLastSkippedReason', 'mirror-cube-prerequisites-missing');
    deps.setRenderSlot(app, '__mirrorCubeLastSkippedAtMs', policy.nowMs);
    deps.setRenderSlot(app, '__mirrorWorkPending', policy.mirrorDirty);
    incrementRenderSlotCounter(deps, app, '__mirrorCubePrerequisiteSkipCount');
    return;
  }

  const mirrorsToHide = acquireMirrorHideScratch(app);
  try {
    let foundMirrorForUpdate = false;
    let mirrorCount = 0;
    let cubeSurfaceCount = 0;
    for (const entry of mirrors) {
      const mirror = asRecordOrNull(entry);
      if (!mirror) continue;
      mirrorCount += 1;
      const shouldSyncCubeMaterial = policy.cubeMirrorMode || !isPlanarMirrorSurface(mirror);
      if (!deps.tryHideMirrorSurface(mirror, texture, mirrorsToHide)) continue;
      if (!shouldSyncCubeMaterial) continue;
      cubeSurfaceCount += 1;
      syncTrackedMirrorMaterialEnvMap(mirror, texture);
      foundMirrorForUpdate = true;
    }
    if (!foundMirrorForUpdate) hasMirror = false;

    if (hasMirror) {
      const beforeUpdateMs = deps.now();
      if (!isFrameWithinBudget(beforeUpdateMs, policy.frameStartMs, policy.frameBudgetMs)) {
        markBudgetDeferred(deps, app, beforeUpdateMs, '__mirrorCubeBudgetSkipCount');
        return;
      }
    }

    if (!hasMirror) return;

    const refreshMode = getMirrorCubeRefreshMode();
    if (
      refreshMode === 'defer-first-presentation' &&
      updateCount === 0 &&
      deps.getRenderSlot<boolean>(app, '__mirrorCubeFirstPresentationDeferralConsumed') !== true
    ) {
      const deferredAtMs = deps.now();
      deps.setRenderSlot(app, '__mirrorCubeFirstPresentationDeferralConsumed', true);
      deps.setRenderSlot(app, '__mirrorWorkPending', false);
      setMirrorPresentationPending(deps, app, {
        startTime: deferredAtMs,
        updateNumber: 1,
        isFirstUpdate: true,
        highQuality: false,
        deferredBeforeCube: true,
        cubeRenderTargetSize: readCubeRenderTargetSize(renderTarget),
      });
      scheduleDeferredCubeRefresh(app, deps);
      return;
    }

    const shadowMap = getShadowMap(app);
    const previousAutoUpdate = shadowMap ? shadowMap['autoUpdate'] : undefined;
    const beforeUpdateMs = deps.now();
    const elapsedBeforeStartMs =
      policy.frameStartMs > 0 ? Math.max(0, beforeUpdateMs - policy.frameStartMs) : 0;
    const remainingBudgetBeforeStartMs = Math.max(0, policy.frameBudgetMs - elapsedBeforeStartMs);
    const rendererBefore = readRendererCounters(renderer);
    const updateNumber = updateCount + 1;
    const fullCubeSize = readCubeRenderTargetSize(renderTarget);
    const useTemporaryFirstResolution =
      refreshMode === 'first-refresh-128' &&
      updateCount === 0 &&
      fullCubeSize > 128 &&
      typeof renderTarget['setSize'] === 'function';
    if (useTemporaryFirstResolution) {
      call2m(renderTarget, renderTarget['setSize'], 128, 128);
      deps.setRenderSlot(app, '__mirrorCubeHighQualityPending', true);
    }
    let updateError: unknown = null;
    try {
      if (shadowMap && typeof previousAutoUpdate !== 'undefined') shadowMap['autoUpdate'] = false;
      try {
        call2m(cube, cube['update'], renderer, scene);
      } catch (error) {
        updateError = error;
        if (useTemporaryFirstResolution) {
          call2m(renderTarget, renderTarget['setSize'], fullCubeSize, fullCubeSize);
          deps.setRenderSlot(app, '__mirrorCubeHighQualityPending', false);
        }
        throw error;
      } finally {
        if (typeof __WP_BUILD_PERF__ !== 'undefined' && __WP_BUILD_PERF__ === true) {
          const endTime = deps.now();
          const durationMs = Math.max(0, endTime - beforeUpdateMs);
          const rendererAfter = readRendererCounters(renderer);
          deps.recordMetric?.(
            'mirror.cube.update',
            durationMs,
            {
              startTime: beforeUpdateMs,
              endTime,
              updateNumber,
              updateCountBefore: updateCount,
              isFirstUpdate: updateCount === 0,
              mirrorDirty: policy.mirrorDirty,
              mirrorCount,
              cubeSurfaceCount,
              cubeRenderTargetSize: readCubeRenderTargetSize(renderTarget),
              resolutionStage: useTemporaryFirstResolution ? 'temporary-first-128' : 'full',
              motionActive: policy.motionActive,
              frameBudgetMs: policy.frameBudgetMs,
              elapsedBeforeStartMs,
              remainingBudgetBeforeStartMs,
              budgetOverrunMs: Math.max(0, durationMs - remainingBudgetBeforeStartMs),
              rendererBefore,
              rendererAfter,
              rendererDelta: {
                calls: rendererAfter.calls - rendererBefore.calls,
                triangles: rendererAfter.triangles - rendererBefore.triangles,
                programs: rendererAfter.programs - rendererBefore.programs,
              },
            },
            updateError || undefined
          );
        }
      }
      deps.setRenderSlot(app, '__mirrorLastUpdateMs', policy.nowMs);
      incrementRenderSlotCounter(deps, app, '__mirrorUpdateCount');
      deps.setRenderSlot(app, '__mirrorDirty', false);
      deps.setRenderSlot(app, '__mirrorWorkPending', false);
      deps.setRenderSlot(app, '__mirrorPresenceKnown', true);
      deps.setRenderSlot(app, '__mirrorPresenceHasMirror', true);
      deps.setRenderSlot(app, '__mirrorPresenceCheckedAtMs', policy.nowMs);
      setMirrorPresentationPending(deps, app, {
        startTime: beforeUpdateMs,
        updateNumber,
        isFirstUpdate: updateCount === 0,
        highQuality: !useTemporaryFirstResolution,
        deferredBeforeCube: false,
        cubeRenderTargetSize: readCubeRenderTargetSize(renderTarget),
      });
      if (useTemporaryFirstResolution) {
        scheduleFullResolutionRefresh(app, deps, renderTarget, fullCubeSize);
      } else if (deps.getRenderSlot<boolean>(app, '__mirrorCubeHighQualityPending') === true) {
        deps.setRenderSlot(app, '__mirrorCubeHighQualityPending', false);
      }
    } finally {
      if (shadowMap && typeof previousAutoUpdate !== 'undefined')
        shadowMap['autoUpdate'] = previousAutoUpdate;
    }
  } finally {
    restoreHiddenMirrors(mirrorsToHide);
  }
}
