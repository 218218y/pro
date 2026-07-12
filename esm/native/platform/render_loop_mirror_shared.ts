import type { AppContainer, UnknownRecord } from '../../../types';

import { readConfigLooseScalarFromApp, readConfigNumberLooseFromApp } from '../runtime/config_selectors.js';

export type MirrorReportFn = (
  app: AppContainer,
  op: string,
  err: unknown,
  opts?: { throttleMs?: number; failFast?: boolean; reportMeta?: UnknownRecord }
) => void;

export type TaggedMirrorFn = (obj: UnknownRecord | null) => boolean;
export type HideMirrorFn = (
  obj: UnknownRecord | null,
  tex: unknown,
  mirrorsToHide: UnknownRecord[]
) => boolean;

export type RenderSlotReader = <T = unknown>(app: AppContainer, key: string) => T | null;
export type RenderSlotWriter = (app: AppContainer, key: string, value: unknown) => void;

export type MirrorDriverDeps = {
  report: MirrorReportFn;
  now: () => number;
  isTaggedMirrorSurface: TaggedMirrorFn;
  tryHideMirrorSurface: HideMirrorFn;
  getRenderSlot: RenderSlotReader;
  setRenderSlot: RenderSlotWriter;
};

export type MirrorFramePolicy = {
  nowMs: number;
  lastUpdateMs: number;
  frameStartMs: number;
  motionActive: boolean;
  mirrorDirty: boolean;
  cubeMirrorMode: boolean;
  disableDuringMotion: boolean;
  updateIntervalMs: number;
  frameBudgetMs: number;
  canRunInBudget: boolean;
};

export function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function asRecordOrNull(value: unknown): UnknownRecord | null {
  return isRecord(value) ? value : null;
}

export function readFiniteSlotNumber(
  deps: Pick<MirrorDriverDeps, 'getRenderSlot'>,
  app: AppContainer,
  key: string,
  defaultValue = 0
): number {
  const value = deps.getRenderSlot<number>(app, key);
  return typeof value === 'number' && Number.isFinite(value) ? value : defaultValue;
}

export function incrementRenderSlotCounter(
  deps: Pick<MirrorDriverDeps, 'getRenderSlot' | 'setRenderSlot'>,
  app: AppContainer,
  key: string
): number {
  const next = readFiniteSlotNumber(deps, app, key, 0) + 1;
  deps.setRenderSlot(app, key, next);
  return next;
}

export function addRenderSlotCounter(
  deps: Pick<MirrorDriverDeps, 'getRenderSlot' | 'setRenderSlot'>,
  app: AppContainer,
  key: string,
  amount: number
): number {
  const delta = Number.isFinite(amount) && amount > 0 ? amount : 0;
  const next = readFiniteSlotNumber(deps, app, key, 0) + delta;
  deps.setRenderSlot(app, key, next);
  return next;
}

export function isFrameWithinBudget(nowMs: number, frameStartMs: number, budgetMs: number): boolean {
  const elapsed = frameStartMs > 0 ? nowMs - frameStartMs : 0;
  return !elapsed || elapsed < budgetMs;
}

export function markBudgetDeferred(
  deps: Pick<MirrorDriverDeps, 'getRenderSlot' | 'setRenderSlot'>,
  app: AppContainer,
  nowMs: number,
  counterKey: string
): void {
  deps.setRenderSlot(app, '__mirrorBudgetDeferredAtMs', nowMs);
  deps.setRenderSlot(app, '__mirrorWorkPending', true);
  incrementRenderSlotCounter(deps, app, '__mirrorBudgetDeferredCount');
  incrementRenderSlotCounter(deps, app, counterKey);
}

export function markPlanarBatchPending(
  deps: Pick<MirrorDriverDeps, 'getRenderSlot' | 'setRenderSlot'>,
  app: AppContainer,
  nowMs: number
): void {
  deps.setRenderSlot(app, '__mirrorBudgetDeferredAtMs', nowMs);
  deps.setRenderSlot(app, '__mirrorWorkPending', true);
  incrementRenderSlotCounter(deps, app, '__mirrorPlanarBatchDeferredCount');
}

export function resolveRemainingFrameBudgetMs(policy: MirrorFramePolicy): number {
  const elapsed = policy.frameStartMs > 0 ? Math.max(0, policy.nowMs - policy.frameStartMs) : 0;
  return Math.max(1, policy.frameBudgetMs - elapsed);
}

export function resolvePlanarUpdatesPerFrame(app: AppContainer, motionActive: boolean): number {
  const raw = motionActive
    ? readConfigNumberLooseFromApp(app, 'MIRROR_REFLECTOR_MOVE_MAX_UPDATES_PER_FRAME', 8)
    : readConfigNumberLooseFromApp(app, 'MIRROR_REFLECTOR_MAX_UPDATES_PER_FRAME', 3);
  return Math.max(1, Math.floor(Number.isFinite(raw) ? raw : motionActive ? 8 : 3));
}

export function resolveMirrorFramePolicy(
  app: AppContainer,
  deps: Pick<MirrorDriverDeps, 'now' | 'getRenderSlot'>
): MirrorFramePolicy {
  const nowMs = deps.now();
  const lastUpdateMs = readFiniteSlotNumber(deps, app, '__mirrorLastUpdateMs', -1);
  const motionActive = !!deps.getRenderSlot<boolean>(app, '__mirrorMotionActive');
  const mirrorDirty = !!deps.getRenderSlot<boolean>(app, '__mirrorDirty');

  const baseInterval = readConfigNumberLooseFromApp(app, 'MIRROR_UPDATE_MS', 500);
  const moveIntervalRaw = readConfigNumberLooseFromApp(app, 'MIRROR_MOVE_UPDATE_MS', baseInterval);
  const moveInterval = Number.isFinite(moveIntervalRaw)
    ? Math.max(baseInterval, moveIntervalRaw)
    : Math.max(baseInterval, 250);
  const updateIntervalMs = motionActive ? moveInterval : baseInterval;

  const frameStartMs = readFiniteSlotNumber(deps, app, '__frameStartMs', 0);
  const idleBudgetMs = Math.max(4, readConfigNumberLooseFromApp(app, 'MIRROR_FRAME_BUDGET_MS', 16));
  const moveBudgetMs = Math.max(
    4,
    readConfigNumberLooseFromApp(app, 'MIRROR_MOVE_FRAME_BUDGET_MS', Math.max(4, Math.min(idleBudgetMs, 10)))
  );
  const frameBudgetMs = motionActive ? moveBudgetMs : idleBudgetMs;

  return {
    nowMs,
    lastUpdateMs,
    frameStartMs,
    motionActive,
    mirrorDirty,
    cubeMirrorMode: readConfigLooseScalarFromApp(app, 'MIRROR_REFLECTOR_ENABLED', true) === false,
    disableDuringMotion: !!readConfigLooseScalarFromApp(app, 'MIRROR_DISABLE_DURING_MOTION', true),
    updateIntervalMs,
    frameBudgetMs,
    canRunInBudget: isFrameWithinBudget(nowMs, frameStartMs, frameBudgetMs),
  };
}
