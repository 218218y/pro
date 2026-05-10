import type {
  PlatformCanvasLike,
  PlatformLogArgs,
  PlatformLogFn,
  RenderFollowThroughBudgetSummaryLike,
  RenderFollowThroughDebugStatsLike,
} from '../../../types';

import { bindMethod, getPlatformRoot, getPlatformService, readUtil } from './platform_access_shared.js';
import {
  cloneRenderFollowThroughDebugStats,
  getRenderFollowThroughDebugStats,
  recordPlatformActivityTouchStats,
  recordPlatformEnsureRenderLoopAfterTriggerStats,
  recordPlatformRenderFollowThroughStats,
  recordPlatformWakeupFollowThroughStats,
  resetRenderFollowThroughDebugStats,
  summarizeRenderFollowThroughBudget,
} from './platform_access_debug_stats.js';
import { ensureRenderLoopViaPlatform, touchPlatformActivity } from './platform_access_state.js';
import type { CloneFn, Hash32Fn, StringifierFn } from './platform_access_shared.js';

export type PlatformRenderFollowThroughOpts = {
  updateShadows?: boolean;
  ensureRenderLoop?: boolean;
};

export type PlatformRenderFollowThroughResult = {
  triggeredRender: boolean;
  ensuredRenderLoop: boolean;
};

export type PlatformWakeupFollowThroughOpts = {
  touchActivity?: boolean;
  afterTouch?: (() => unknown) | null;
  ensureRenderLoop?: boolean;
};

export type PlatformWakeupFollowThroughResult = {
  touchedActivity: boolean;
  ranAfterTouch: boolean;
  ensuredRenderLoop: boolean;
};

export type PlatformActivityRenderTouchOpts = PlatformRenderFollowThroughOpts & {
  touchActivity?: boolean;
  ensureRenderLoopAfterTrigger?: boolean;
};

export type PlatformActivityRenderTouchResult = PlatformRenderFollowThroughResult & {
  touchedActivity: boolean;
};

export function getPlatformReportError(App: unknown): ((error: unknown, ctx?: unknown) => unknown) | null {
  return (
    bindMethod<[unknown, unknown?], unknown>(getPlatformService(App), 'reportError') ??
    bindMethod<[unknown, unknown?], unknown>(getPlatformRoot(App), 'reportError')
  );
}

export function reportErrorViaPlatform(App: unknown, error: unknown, ctx?: unknown): boolean {
  try {
    const fn = getPlatformReportError(App);
    if (!fn) return false;
    fn(error, ctx);
    return true;
  } catch {
    return false;
  }
}

export function getPlatformTriggerRender(App: unknown): ((updateShadows?: boolean) => unknown) | null {
  return (
    bindMethod<[boolean?], unknown>(getPlatformService(App), 'triggerRender') ??
    bindMethod<[boolean?], unknown>(getPlatformRoot(App), 'triggerRender')
  );
}

export function triggerRenderViaPlatform(App: unknown, updateShadows?: boolean): boolean {
  try {
    const fn = getPlatformTriggerRender(App);
    if (!fn) return false;
    fn(!!updateShadows);
    return true;
  } catch {
    return false;
  }
}

export function getPlatformRenderDebugStats(App: unknown): RenderFollowThroughDebugStatsLike | null {
  return cloneRenderFollowThroughDebugStats(getRenderFollowThroughDebugStats(getPlatformService(App)));
}

export function resetPlatformRenderDebugStats(App: unknown): RenderFollowThroughDebugStatsLike | null {
  return resetRenderFollowThroughDebugStats(getPlatformService(App));
}

export function getPlatformRenderDebugBudget(App: unknown): RenderFollowThroughBudgetSummaryLike | null {
  const stats = getRenderFollowThroughDebugStats(getPlatformService(App));
  return stats ? summarizeRenderFollowThroughBudget(stats) : null;
}

export function runPlatformRenderFollowThrough(
  App: unknown,
  opts?: PlatformRenderFollowThroughOpts | null
): PlatformRenderFollowThroughResult {
  const updateShadows = !!opts?.updateShadows;
  const triggeredRender = triggerRenderViaPlatform(App, updateShadows);
  const shouldEnsureRenderLoop = opts?.ensureRenderLoop !== false;
  const ensuredRenderLoop = !triggeredRender && shouldEnsureRenderLoop && ensureRenderLoopViaPlatform(App);
  const result = { triggeredRender, ensuredRenderLoop };
  recordPlatformRenderFollowThroughStats(getPlatformService(App), result);
  return result;
}

export function runPlatformWakeupFollowThrough(
  App: unknown,
  opts?: PlatformWakeupFollowThroughOpts | null
): PlatformWakeupFollowThroughResult {
  const touchedActivity = opts?.touchActivity !== false && touchPlatformActivity(App);
  let ranAfterTouch = false;

  if (typeof opts?.afterTouch === 'function') {
    try {
      opts.afterTouch();
      ranAfterTouch = true;
    } catch {
      ranAfterTouch = false;
    }
  }

  const ensuredRenderLoop = opts?.ensureRenderLoop !== false && ensureRenderLoopViaPlatform(App);
  const result = { touchedActivity, ranAfterTouch, ensuredRenderLoop };
  recordPlatformWakeupFollowThroughStats(getPlatformService(App), result);
  return result;
}

export function runPlatformActivityRenderTouch(
  App: unknown,
  opts?: PlatformActivityRenderTouchOpts | null
): PlatformActivityRenderTouchResult {
  const touchedActivity = opts?.touchActivity !== false && touchPlatformActivity(App);
  recordPlatformActivityTouchStats(getPlatformService(App), touchedActivity);
  const renderResult = runPlatformRenderFollowThrough(App, opts);
  let ensuredRenderLoop = renderResult.ensuredRenderLoop;

  if (opts?.ensureRenderLoopAfterTrigger && !ensuredRenderLoop) {
    ensuredRenderLoop = ensureRenderLoopViaPlatform(App) || ensuredRenderLoop;
    recordPlatformEnsureRenderLoopAfterTriggerStats(getPlatformService(App), ensuredRenderLoop);
  }

  return {
    touchedActivity,
    triggeredRender: renderResult.triggeredRender,
    ensuredRenderLoop,
  };
}

export function getPlatformCreateCanvas(
  App: unknown
): ((width: number, height: number) => PlatformCanvasLike | null | undefined) | null {
  return (
    bindMethod<[number, number], PlatformCanvasLike | null | undefined>(
      getPlatformService(App),
      'createCanvas'
    ) ??
    bindMethod<[number, number], PlatformCanvasLike | null | undefined>(getPlatformRoot(App), 'createCanvas')
  );
}

export function createCanvasViaPlatform(
  App: unknown,
  width: number,
  height: number
): PlatformCanvasLike | null {
  try {
    const fn = getPlatformCreateCanvas(App);
    if (fn) return fn(width, height) || null;
  } catch {
    // ignore
  }
  try {
    if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(width, height);
  } catch {
    // ignore
  }
  return null;
}

export function getPlatformLog(App: unknown): PlatformLogFn | null {
  return bindMethod<PlatformLogArgs, unknown>(readUtil(App), 'log');
}

export function logViaPlatform(App: unknown, ...args: PlatformLogArgs): boolean {
  try {
    const fn = getPlatformLog(App);
    if (!fn) return false;
    fn(...args);
    return true;
  } catch {
    return false;
  }
}

export function getPlatformStringifier(App: unknown): StringifierFn | null {
  return bindMethod<[unknown, string?], string>(readUtil(App), 'str');
}

export function stringifyViaPlatform(App: unknown, value: unknown, defaultText = ''): string {
  try {
    const fn = getPlatformStringifier(App);
    if (!fn) return value == null ? String(defaultText || '') : String(value);
    return fn(value, defaultText);
  } catch {
    return value == null ? String(defaultText || '') : String(value);
  }
}

export function getPlatformIdle(App: unknown): ((cb: () => void, timeout?: number) => unknown) | null {
  return bindMethod<[() => void, number?], unknown>(readUtil(App), 'idle');
}

export function idleViaPlatform(App: unknown, cb: () => void, timeout?: number): boolean {
  try {
    const fn = getPlatformIdle(App);
    if (!fn) return false;
    fn(cb, timeout);
    return true;
  } catch {
    return false;
  }
}

export function getPlatformClone(App: unknown): CloneFn | null {
  const util = readUtil(App);
  const clone = util?.clone;
  if (typeof clone !== 'function') return null;
  return <T>(value: T, seed?: unknown): T => clone(value, seed);
}

export function cloneViaPlatform<T>(App: unknown, value: T, seed?: unknown): T {
  try {
    const fn = getPlatformClone(App);
    return fn ? fn(value, seed) : value;
  } catch {
    return value;
  }
}

export function getPlatformCleanGroup(App: unknown): ((group: unknown) => unknown) | null {
  return bindMethod<[unknown], unknown>(readUtil(App), 'cleanGroup');
}

export function cleanGroupViaPlatform(App: unknown, group: unknown): boolean {
  try {
    const fn = getPlatformCleanGroup(App);
    if (!fn) return false;
    fn(group);
    return true;
  } catch {
    return false;
  }
}

export function getPlatformPruneCachesSafe(App: unknown): ((rootNode?: unknown) => unknown) | null {
  return bindMethod<[unknown?], unknown>(readUtil(App), 'pruneCachesSafe');
}

export function pruneCachesSafeViaPlatform(App: unknown, rootNode?: unknown): boolean {
  try {
    const fn = getPlatformPruneCachesSafe(App);
    if (!fn) return false;
    fn(rootNode);
    return true;
  } catch {
    return false;
  }
}

export function getPlatformAfterPaint(App: unknown): ((cb: () => void) => unknown) | null {
  return bindMethod<[() => void], unknown>(readUtil(App), 'afterPaint');
}

export function afterPaintViaPlatform(App: unknown, cb: () => void): boolean {
  try {
    const fn = getPlatformAfterPaint(App);
    if (!fn) return false;
    fn(cb);
    return true;
  } catch {
    return false;
  }
}

export function getPlatformHash32(App: unknown): Hash32Fn | null {
  return bindMethod<[unknown], string>(readUtil(App), 'hash32');
}

export function hash32ViaPlatform(App: unknown, value: unknown): string | null {
  try {
    const fn = getPlatformHash32(App);
    return fn ? fn(value) : null;
  } catch {
    return null;
  }
}

export function ensurePlatformHash32(App: unknown): ((value: unknown) => string) | null {
  return getPlatformHash32(App) ?? null;
}

export function pruneCachesViaPlatform(App: unknown, rootNode?: unknown): boolean {
  return pruneCachesSafeViaPlatform(App, rootNode);
}
