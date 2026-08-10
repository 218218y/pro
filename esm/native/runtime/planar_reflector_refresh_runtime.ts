import type { UnknownRecord } from '../../../types/index.js';

import { getCamera, getRenderer, getScene } from './render_access_surface.js';
import { ensureRenderMetaArray } from './render_access_state_bags.js';
import type {
  PlanarMirrorRefreshOptions,
  PlanarMirrorRefreshResult,
  PlanarReflectorMirrorStats,
  PlanarReflectorRenderFailureReason,
  PlanarReflectorState,
} from './planar_reflector_contracts.js';
import { renderPlanarReflectorSurface } from './planar_reflector_render_pass.js';
import {
  isExplicitCubeReflectionSurface,
  isInitialPlanarReflectorState,
  isTaggedPlanarMirrorSurface,
  readPlanarReflectorRecord,
  readPlanarReflectorState,
} from './planar_reflector_state.js';

const PLANAR_REFLECTOR_FAILURE_BACKOFF_BASE_MS = 16;
const PLANAR_REFLECTOR_FAILURE_BACKOFF_MAX_MS = 256;

function clampNumber(value: unknown, fallback: number, min: number, max: number): number {
  const numeric = typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  return Math.min(max, Math.max(min, numeric));
}

export function readTrackedPlanarMirrorStats(App: unknown): PlanarReflectorMirrorStats {
  const mirrors = ensureRenderMetaArray<UnknownRecord>(App, 'mirrors');
  let mirrorCount = 0;
  let planarCount = 0;
  let cubeCount = 0;
  let explicitCubeCount = 0;
  const seen = new Set<UnknownRecord>();

  for (let index = 0; index < mirrors.length; index += 1) {
    const mirror = readPlanarReflectorRecord(mirrors[index]);
    if (!mirror || seen.has(mirror)) continue;
    seen.add(mirror);
    if (!isTaggedPlanarMirrorSurface(mirror)) continue;

    const hasPlanarReflector = readPlanarReflectorState(mirror) !== null;
    if (isExplicitCubeReflectionSurface(mirror) && !hasPlanarReflector) {
      explicitCubeCount += 1;
      continue;
    }

    mirrorCount += 1;
    if (hasPlanarReflector) planarCount += 1;
    else cubeCount += 1;
  }

  return { mirrorCount, planarCount, cubeCount, explicitCubeCount };
}

function normalizeRefreshStartIndex(startIndex: unknown, length: number): number {
  if (!length) return 0;
  const numeric = typeof startIndex === 'number' && Number.isFinite(startIndex) ? Math.floor(startIndex) : 0;
  return ((numeric % length) + length) % length;
}

function resolveRefreshLimit(value: unknown, defaultValue: number): number {
  return Math.max(1, Math.floor(clampNumber(value, defaultValue, 1, 64)));
}

function readRefreshNow(options: PlanarMirrorRefreshOptions | undefined): number {
  try {
    if (typeof options?.now === 'function') {
      const value = options.now();
      if (typeof value === 'number' && Number.isFinite(value)) return value;
    }
  } catch {
    // Fall through to the native clock.
  }
  return Date.now();
}

function readNonNegativeInteger(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

function readFiniteTimestamp(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function isPlanarReflectorRetryDeferred(state: PlanarReflectorState, nowMs: number): boolean {
  return readFiniteTimestamp(state.retryAfterMs) > nowMs;
}

function recordPlanarReflectorFailure(
  state: PlanarReflectorState,
  reason: PlanarReflectorRenderFailureReason,
  nowMs: number
): void {
  const consecutiveFailureCount = readNonNegativeInteger(state.consecutiveFailureCount) + 1;
  const exponent = Math.max(0, consecutiveFailureCount - 2);
  const backoffMs =
    consecutiveFailureCount <= 1
      ? 0
      : Math.min(
          PLANAR_REFLECTOR_FAILURE_BACKOFF_MAX_MS,
          PLANAR_REFLECTOR_FAILURE_BACKOFF_BASE_MS * 2 ** exponent
        );
  state.consecutiveFailureCount = consecutiveFailureCount;
  state.lastFailureReason = reason;
  state.lastFailureAtMs = nowMs;
  state.retryAfterMs = nowMs + backoffMs;
}

function clearPlanarReflectorFailure(state: PlanarReflectorState): void {
  state.consecutiveFailureCount = 0;
  delete state.lastFailureReason;
  delete state.lastFailureAtMs;
  delete state.retryAfterMs;
}

function isEligiblePlanarRefreshState(
  mirror: UnknownRecord | null,
  initialOnly: boolean
): mirror is UnknownRecord {
  if (!mirror || !isTaggedPlanarMirrorSurface(mirror)) return false;
  const state = readPlanarReflectorState(mirror);
  return !!state && (!initialOnly || isInitialPlanarReflectorState(state));
}

function makeEmptyRefreshResult(): PlanarMirrorRefreshResult {
  return {
    refreshed: false,
    mirrorCount: 0,
    planarCount: 0,
    cubeCount: 0,
    attemptedCount: 0,
    refreshedCount: 0,
    failedCount: 0,
    deferredCount: 0,
    backoffDeferredCount: 0,
    nextIndex: 0,
    completedCycle: true,
    firstFailureReason: null,
    failureCounts: {},
    skippedReason: null,
  };
}

export function refreshTrackedPlanarMirrorSurfacesNow(
  App: unknown,
  options?: PlanarMirrorRefreshOptions
): PlanarMirrorRefreshResult {
  const result = makeEmptyRefreshResult();

  const renderer = readPlanarReflectorRecord(getRenderer(App));
  const scene = getScene(App);
  const camera = readPlanarReflectorRecord(getCamera(App));
  if (!renderer || !scene || !camera) {
    result.skippedReason = 'planar-reflector-surface-incomplete';
    return result;
  }

  const mirrors = ensureRenderMetaArray<UnknownRecord>(App, 'mirrors');
  const stats = readTrackedPlanarMirrorStats(App);
  result.mirrorCount = stats.mirrorCount;
  result.planarCount = stats.planarCount;
  result.cubeCount = stats.cubeCount;
  if (!result.planarCount || !mirrors.length) {
    result.skippedReason = 'no-planar-reflector-surfaces';
    return result;
  }

  const initialOnly = options?.initialOnly === true;
  const maxSurfaces = resolveRefreshLimit(options?.maxSurfaces, result.planarCount);
  const budgetMs = clampNumber(options?.maxBudgetMs, Number.POSITIVE_INFINITY, 1, 1000);
  const startedAt = readRefreshNow(options);
  const startIndex = normalizeRefreshStartIndex(options?.startIndex, mirrors.length);
  let eligibleCount = 0;

  for (let offset = 0; offset < mirrors.length; offset += 1) {
    const mirror = readPlanarReflectorRecord(mirrors[(startIndex + offset) % mirrors.length]);
    if (isEligiblePlanarRefreshState(mirror, initialOnly)) eligibleCount += 1;
  }

  if (eligibleCount <= 0) {
    result.skippedReason = initialOnly
      ? 'no-initial-planar-reflector-surfaces'
      : 'no-planar-reflector-surfaces';
    return result;
  }

  let scannedCount = 0;
  let nextIndex = startIndex;
  while (scannedCount < mirrors.length) {
    if (result.attemptedCount >= maxSurfaces) break;
    if (result.attemptedCount > 0 && readRefreshNow(options) - startedAt >= budgetMs) {
      break;
    }

    const index = (startIndex + scannedCount) % mirrors.length;
    scannedCount += 1;
    nextIndex = (index + 1) % mirrors.length;
    const mirror = readPlanarReflectorRecord(mirrors[index]);
    if (!isEligiblePlanarRefreshState(mirror, initialOnly)) continue;
    const state = readPlanarReflectorState(mirror);
    if (!state) continue;

    const attemptStartedAt = readRefreshNow(options);
    if (isPlanarReflectorRetryDeferred(state, attemptStartedAt)) {
      result.backoffDeferredCount += 1;
      continue;
    }

    result.attemptedCount += 1;
    const renderResult = renderPlanarReflectorSurface({
      App,
      mirror,
      state,
      renderer,
      scene,
      camera,
    });
    const attemptFinishedAt = readRefreshNow(options);

    if (renderResult.ok === true) {
      result.refreshedCount += 1;
      clearPlanarReflectorFailure(state);
    } else {
      const { reason } = renderResult;
      result.failedCount += 1;
      result.firstFailureReason ??= reason;
      result.failureCounts[reason] = (result.failureCounts[reason] ?? 0) + 1;
      recordPlanarReflectorFailure(state, reason, attemptFinishedAt);
    }

    if (attemptFinishedAt - startedAt >= budgetMs) break;
  }

  result.nextIndex = nextIndex;
  result.deferredCount = Math.max(0, eligibleCount - result.attemptedCount);
  result.completedCycle =
    scannedCount >= mirrors.length &&
    result.failedCount === 0 &&
    result.deferredCount === 0 &&
    result.backoffDeferredCount === 0;

  if (result.refreshedCount > 0) {
    result.refreshed = true;
    return result;
  }
  if (result.failedCount > 0) {
    result.skippedReason = 'planar-reflector-render-failed';
  } else if (result.backoffDeferredCount > 0) {
    result.skippedReason = 'planar-reflector-retry-backoff';
  } else {
    result.skippedReason = 'planar-reflector-budget-deferred';
  }

  return result;
}
