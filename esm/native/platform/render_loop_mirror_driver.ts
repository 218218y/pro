import type { AppContainer, UnknownRecord } from '../../../types';

import {
  ensureRenderMetaArray,
  getMirrorCubeCamera,
  getMirrorHideScratch,
  getMirrorRenderTarget,
  getRenderer,
  getScene,
  getShadowMap,
} from '../runtime/render_access.js';
import { readConfigLooseScalarFromApp, readConfigNumberLooseFromApp } from '../runtime/config_selectors.js';

type ReportFn = (
  app: AppContainer,
  op: string,
  err: unknown,
  opts?: { throttleMs?: number; failFast?: boolean; reportMeta?: UnknownRecord }
) => void;

type TaggedMirrorFn = (obj: UnknownRecord | null) => boolean;
type HideMirrorFn = (obj: UnknownRecord | null, tex: unknown, mirrorsToHide: UnknownRecord[]) => boolean;

type RenderSlotReader = <T = unknown>(app: AppContainer, key: string) => T | null;
type RenderSlotWriter = (app: AppContainer, key: string, value: unknown) => void;

function isRecord(v: unknown): v is UnknownRecord {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function asRecordOrNull(v: unknown): UnknownRecord | null {
  return isRecord(v) ? v : null;
}

function call2m(ctx: unknown, fn: unknown, a: unknown, b: unknown): unknown {
  return typeof fn === 'function' ? fn.call(ctx, a, b) : undefined;
}

function readFiniteSlotNumber(
  getRenderSlot: RenderSlotReader,
  app: AppContainer,
  key: string,
  fallback = 0
): number {
  const value = getRenderSlot<number>(app, key);
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function incrementRenderSlotCounter(
  getRenderSlot: RenderSlotReader,
  setRenderSlot: RenderSlotWriter,
  app: AppContainer,
  key: string
): number {
  const next = readFiniteSlotNumber(getRenderSlot, app, key, 0) + 1;
  setRenderSlot(app, key, next);
  return next;
}

function isFrameWithinBudget(nowMs: number, frameStartMs: number, budgetMs: number): boolean {
  const elapsed = frameStartMs > 0 ? nowMs - frameStartMs : 0;
  return !elapsed || elapsed < budgetMs;
}

function markBudgetDeferred(
  getRenderSlot: RenderSlotReader,
  setRenderSlot: RenderSlotWriter,
  app: AppContainer,
  nowMs: number,
  counterKey: string
): void {
  setRenderSlot(app, '__mirrorBudgetDeferredAtMs', nowMs);
  incrementRenderSlotCounter(getRenderSlot, setRenderSlot, app, '__mirrorBudgetDeferredCount');
  incrementRenderSlotCounter(getRenderSlot, setRenderSlot, app, counterKey);
}

function getMirrorHideScratchList(A: AppContainer): UnknownRecord[] {
  const scratch = getMirrorHideScratch(A);
  return Array.isArray(scratch) ? scratch.filter(isRecord) : [];
}

export function createRenderLoopMirrorDriver(
  App: AppContainer,
  deps: {
    report: ReportFn;
    now: () => number;
    isTaggedMirrorSurface: TaggedMirrorFn;
    tryHideMirrorSurface: HideMirrorFn;
    getRenderSlot: RenderSlotReader;
    setRenderSlot: RenderSlotWriter;
  }
) {
  const A = App;
  const {
    report: __renderLoopReport,
    now: __now,
    isTaggedMirrorSurface: __isTaggedMirrorSurface,
    tryHideMirrorSurface: __tryHideMirrorSurface,
    getRenderSlot,
    setRenderSlot,
  } = deps;

  let mirrorUpdateErrAt = -1;
  let mirrorUpdateErrCount = 0;

  function updateMirrorCube(): void {
    const cube0 = getMirrorCubeCamera(A);
    const rt0 = getMirrorRenderTarget(A);
    const scene0 = getScene(A);
    const renderer0 = getRenderer(A);

    const cube = asRecordOrNull(cube0);
    const rt = asRecordOrNull(rt0);
    const scene = asRecordOrNull(scene0);
    const renderer = asRecordOrNull(renderer0);
    const tex = rt ? rt['texture'] : null;
    if (!(cube && typeof cube['update'] === 'function' && scene && renderer && tex)) return;

    const mirrorsToHide = getMirrorHideScratchList(A);
    const last0 = getRenderSlot<number>(A, '__mirrorLastUpdateMs');
    const last = typeof last0 === 'number' && Number.isFinite(last0) ? last0 : -1;
    const mirrorNow = __now();
    let hasMirror = false;

    const baseInterval = readConfigNumberLooseFromApp(A, 'MIRROR_UPDATE_MS', 500);
    const moveIntervalRaw = readConfigNumberLooseFromApp(A, 'MIRROR_MOVE_UPDATE_MS', baseInterval);
    const moveInterval = Number.isFinite(moveIntervalRaw)
      ? Math.max(baseInterval, moveIntervalRaw)
      : Math.max(baseInterval, 250);
    const motionActive = !!getRenderSlot<boolean>(A, '__mirrorMotionActive');
    const interval = motionActive ? moveInterval : baseInterval;
    const disableDuringMotion = !!readConfigLooseScalarFromApp(A, 'MIRROR_DISABLE_DURING_MOTION', true);

    const frameStart0 = getRenderSlot<number>(A, '__frameStartMs');
    const frameStart = typeof frameStart0 === 'number' && Number.isFinite(frameStart0) ? frameStart0 : 0;
    const idleBudgetMs = Math.max(4, readConfigNumberLooseFromApp(A, 'MIRROR_FRAME_BUDGET_MS', 16));
    const moveBudgetMs = Math.max(
      4,
      readConfigNumberLooseFromApp(A, 'MIRROR_MOVE_FRAME_BUDGET_MS', Math.max(4, Math.min(idleBudgetMs, 10)))
    );
    const budgetMs = motionActive ? moveBudgetMs : idleBudgetMs;
    const canRunInBudget = isFrameWithinBudget(mirrorNow, frameStart, budgetMs);

    try {
      const mirrorsArr = ensureRenderMetaArray<UnknownRecord>(A, 'mirrors');

      const mirrorDirty = !!getRenderSlot<boolean>(A, '__mirrorDirty');
      const trackedMirrorCount = mirrorsArr && mirrorsArr.length ? mirrorsArr.length : 0;
      const lastPrune = readFiniteSlotNumber(getRenderSlot, A, '__mirrorTrackedPruneAtMs', -1);
      const shouldPruneTracked =
        trackedMirrorCount > 0 && (mirrorDirty || lastPrune < 0 || mirrorNow - lastPrune >= 1500);

      const presenceKnown = !!getRenderSlot<boolean>(A, '__mirrorPresenceKnown');
      const presenceHasMirror = !!getRenderSlot<boolean>(A, '__mirrorPresenceHasMirror');
      const checkedAt = readFiniteSlotNumber(getRenderSlot, A, '__mirrorPresenceCheckedAtMs', -1);
      const noMirrorRescanMs = Math.max(
        100,
        readConfigNumberLooseFromApp(A, 'MIRROR_NO_MIRROR_RESCAN_MS', 1200)
      );
      const shouldCheckPresence =
        !presenceKnown ||
        mirrorDirty ||
        checkedAt < 0 ||
        (!presenceHasMirror && mirrorNow - checkedAt >= noMirrorRescanMs);
      const canReuseTrackedPresence = presenceKnown && presenceHasMirror && trackedMirrorCount > 0;
      const shouldDeferTrackedBudgetWork =
        !canRunInBudget && trackedMirrorCount > 0 && (shouldPruneTracked || shouldCheckPresence);

      if (shouldDeferTrackedBudgetWork) {
        setRenderSlot(A, '__mirrorBudgetDeferredAtMs', mirrorNow);
        incrementRenderSlotCounter(getRenderSlot, setRenderSlot, A, '__mirrorBudgetDeferredCount');
        if (shouldPruneTracked) {
          incrementRenderSlotCounter(getRenderSlot, setRenderSlot, A, '__mirrorPruneBudgetSkipCount');
        }
        if (shouldCheckPresence) {
          incrementRenderSlotCounter(getRenderSlot, setRenderSlot, A, '__mirrorPresenceBudgetSkipCount');
        }
      } else {
        if (shouldPruneTracked && mirrorsArr) {
          const seen = new Set<UnknownRecord>();
          let w = 0;
          for (let i = 0; i < mirrorsArr.length; i++) {
            const o = asRecordOrNull(mirrorsArr[i]);
            if (!o || seen.has(o)) continue;
            if (typeof o['parent'] === 'undefined') continue;
            seen.add(o);
            mirrorsArr[w++] = o;
          }
          if (mirrorsArr.length !== w) mirrorsArr.length = w;
          setRenderSlot(A, '__mirrorTrackedPruneAtMs', mirrorNow);
        }

        if (!shouldCheckPresence && canReuseTrackedPresence) {
          hasMirror = true;
        }

        if (shouldCheckPresence && trackedMirrorCount > 0 && mirrorsArr) {
          for (let i = 0; i < mirrorsArr.length; i++) {
            const o = asRecordOrNull(mirrorsArr[i]);
            if (!o || !o['isMesh']) continue;
            if (!__isTaggedMirrorSurface(o)) continue;
            hasMirror = true;
            break;
          }
        }

        if (shouldCheckPresence) {
          setRenderSlot(A, '__mirrorPresenceKnown', true);
          setRenderSlot(A, '__mirrorPresenceHasMirror', hasMirror);
          setRenderSlot(A, '__mirrorPresenceCheckedAtMs', mirrorNow);
          if (!hasMirror) setRenderSlot(A, '__mirrorDirty', false);
        } else if (canReuseTrackedPresence && !hasMirror) {
          hasMirror = true;
        } else if (presenceKnown && presenceHasMirror && !hasMirror) {
          hasMirror = trackedMirrorCount > 0;
        }
      }

      const intervalDue = interval === 0 || last < 0 || mirrorNow - last >= interval;
      const mirrorDisabledForMotion = motionActive && disableDuringMotion;
      if (hasMirror && canRunInBudget && mirrorDisabledForMotion && intervalDue) {
        setRenderSlot(A, '__mirrorMotionDeferredAtMs', mirrorNow);
        incrementRenderSlotCounter(getRenderSlot, setRenderSlot, A, '__mirrorMotionDeferredCount');
      }

      let shouldRunMirrorCube = hasMirror && canRunInBudget && !mirrorDisabledForMotion && intervalDue;

      if (shouldRunMirrorCube && mirrorsArr && mirrorsArr.length) {
        let foundMirrorForUpdate = false;
        for (let i = 0; i < mirrorsArr.length; i++) {
          const o = asRecordOrNull(mirrorsArr[i]);
          if (!o) continue;
          if (__tryHideMirrorSurface(o, tex, mirrorsToHide)) foundMirrorForUpdate = true;
        }
        if (!foundMirrorForUpdate) hasMirror = false;
      }

      if (shouldRunMirrorCube && hasMirror) {
        const beforeCubeUpdateNow = __now();
        if (!isFrameWithinBudget(beforeCubeUpdateNow, frameStart, budgetMs)) {
          markBudgetDeferred(
            getRenderSlot,
            setRenderSlot,
            A,
            beforeCubeUpdateNow,
            '__mirrorCubeBudgetSkipCount'
          );
          shouldRunMirrorCube = false;
        }
      }

      if (shouldRunMirrorCube && hasMirror) {
        const sm = getShadowMap(A);
        const prevAuto = sm ? sm['autoUpdate'] : undefined;
        try {
          if (sm && typeof prevAuto !== 'undefined') sm['autoUpdate'] = false;
          call2m(cube, cube['update'], renderer0, scene0);
          setRenderSlot(A, '__mirrorLastUpdateMs', mirrorNow);
          incrementRenderSlotCounter(getRenderSlot, setRenderSlot, A, '__mirrorUpdateCount');
          setRenderSlot(A, '__mirrorDirty', false);
          setRenderSlot(A, '__mirrorPresenceKnown', true);
          setRenderSlot(A, '__mirrorPresenceHasMirror', true);
          setRenderSlot(A, '__mirrorPresenceCheckedAtMs', mirrorNow);
        } finally {
          if (sm && typeof prevAuto !== 'undefined') sm['autoUpdate'] = prevAuto;
        }
      }
    } catch (err) {
      const ts = __now();
      if (mirrorUpdateErrAt < 0 || ts - mirrorUpdateErrAt >= 10000) {
        mirrorUpdateErrAt = ts;
        mirrorUpdateErrCount++;
        __renderLoopReport(A, 'mirrorCube.update', err, {
          throttleMs: 0,
          failFast: true,
          reportMeta: { count: mirrorUpdateErrCount },
        });
      }
    } finally {
      for (let i = 0; i < mirrorsToHide.length; i++) {
        const object = asRecordOrNull(mirrorsToHide[i]);
        if (object) object['visible'] = true;
      }
      mirrorsToHide.length = 0;
    }
  }

  return {
    updateMirrorCube,
  };
}
