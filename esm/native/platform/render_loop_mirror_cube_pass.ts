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
  deps: Pick<MirrorDriverDeps, 'now' | 'tryHideMirrorSurface' | 'getRenderSlot' | 'setRenderSlot'>;
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
  if (!cube || typeof cube['update'] !== 'function' || !texture) {
    deps.setRenderSlot(app, '__mirrorCubeLastSkippedReason', 'mirror-cube-prerequisites-missing');
    deps.setRenderSlot(app, '__mirrorCubeLastSkippedAtMs', policy.nowMs);
    deps.setRenderSlot(app, '__mirrorWorkPending', policy.mirrorDirty);
    incrementRenderSlotCounter(deps, app, '__mirrorCubePrerequisiteSkipCount');
    return;
  }

  const mirrorsToHide = acquireMirrorHideScratch(app);
  try {
    let foundMirrorForUpdate = false;
    for (const entry of mirrors) {
      const mirror = asRecordOrNull(entry);
      if (!mirror) continue;
      const shouldSyncCubeMaterial = policy.cubeMirrorMode || !isPlanarMirrorSurface(mirror);
      if (!deps.tryHideMirrorSurface(mirror, texture, mirrorsToHide)) continue;
      if (!shouldSyncCubeMaterial) continue;
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

    const shadowMap = getShadowMap(app);
    const previousAutoUpdate = shadowMap ? shadowMap['autoUpdate'] : undefined;
    try {
      if (shadowMap && typeof previousAutoUpdate !== 'undefined') shadowMap['autoUpdate'] = false;
      call2m(cube, cube['update'], renderer, scene);
      deps.setRenderSlot(app, '__mirrorLastUpdateMs', policy.nowMs);
      incrementRenderSlotCounter(deps, app, '__mirrorUpdateCount');
      deps.setRenderSlot(app, '__mirrorDirty', false);
      deps.setRenderSlot(app, '__mirrorWorkPending', false);
      deps.setRenderSlot(app, '__mirrorPresenceKnown', true);
      deps.setRenderSlot(app, '__mirrorPresenceHasMirror', true);
      deps.setRenderSlot(app, '__mirrorPresenceCheckedAtMs', policy.nowMs);
    } finally {
      if (shadowMap && typeof previousAutoUpdate !== 'undefined')
        shadowMap['autoUpdate'] = previousAutoUpdate;
    }
  } finally {
    restoreHiddenMirrors(mirrorsToHide);
  }
}
