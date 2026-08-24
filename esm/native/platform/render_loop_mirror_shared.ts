import type { AppContainer, UnknownRecord } from '../../../types';

import {
  readMirrorFrameConfigFromApp,
  readMirrorPlanarUpdateLimitFromApp,
} from '../runtime/mirror_config_access.js';

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
  recordMetric?: (name: string, durationMs: number, detail: UnknownRecord, error?: unknown) => void;
  scheduleIdleTask?: (run: () => void, timeoutMs: number) => void;
  wakeRenderLoop?: () => void;
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
  return readMirrorPlanarUpdateLimitFromApp(app, motionActive);
}

export function resolveMirrorFramePolicy(
  app: AppContainer,
  deps: Pick<MirrorDriverDeps, 'now' | 'getRenderSlot'>
): MirrorFramePolicy {
  const nowMs = deps.now();
  const lastUpdateMs = readFiniteSlotNumber(deps, app, '__mirrorLastUpdateMs', -1);
  const motionActive = !!deps.getRenderSlot<boolean>(app, '__mirrorMotionActive');
  const mirrorDirty = !!deps.getRenderSlot<boolean>(app, '__mirrorDirty');

  const config = readMirrorFrameConfigFromApp(app);
  const updateIntervalMs = motionActive ? config.moveIntervalMs : config.baseIntervalMs;

  const frameStartMs = readFiniteSlotNumber(deps, app, '__frameStartMs', 0);
  const frameBudgetMs = motionActive ? config.moveFrameBudgetMs : config.idleFrameBudgetMs;

  return {
    nowMs,
    lastUpdateMs,
    frameStartMs,
    motionActive,
    mirrorDirty,
    cubeMirrorMode: !config.reflectorEnabled,
    disableDuringMotion: config.disableDuringMotion,
    updateIntervalMs,
    frameBudgetMs,
    canRunInBudget: isFrameWithinBudget(nowMs, frameStartMs, frameBudgetMs),
  };
}
