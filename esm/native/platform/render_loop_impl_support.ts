import type { AppContainer, DrawerVisualEntryLike, DoorVisualEntryLike, UnknownRecord } from '../../../types';

import { reportErrorThrottled, shouldFailFast } from '../runtime/api.js';
import { normalizeUnknownError } from '../runtime/error_normalization.js';
import {
  ensureRenderNamespace,
  getLoopRaf,
  getLastFrameTs,
  getRafScheduledAt,
  setLoopRaf,
  setRafScheduledAt,
} from '../runtime/render_access.js';

export interface RenderLike extends UnknownRecord {
  camera?: unknown;
  roomGroup?: unknown;
  scene?: unknown;
  wardrobeGroup?: unknown;
  doorsArray?: DoorVisualEntryLike[];
  drawersArray?: DrawerVisualEntryLike[];
  controls?: unknown;
  mirrorCubeCamera?: unknown;
  mirrorRenderTarget?: unknown;
  renderer?: unknown;
  loopRaf?: number;
  __rafScheduledAt?: number;
  __lastFrameTs?: number;
  animate?: (() => void) | null;
  __wpSketchDbgLast?: unknown[];
  __wpSketchDbgLastTs?: number;
}

export interface AppLike extends UnknownRecord {
  render: RenderLike;
  services?: UnknownRecord;
  config?: UnknownRecord;
  perf?: UnknownRecord;
  core?: UnknownRecord;
  tools?: UnknownRecord;
  flags?: UnknownRecord;
  lifecycle?: UnknownRecord;
  activity?: UnknownRecord;
  deps?: UnknownRecord;
  view?: UnknownRecord;
  platform?: UnknownRecord;
  ui?: UnknownRecord;
  state?: UnknownRecord;
  registries?: UnknownRecord;
  builder?: UnknownRecord;
  builderDeps?: UnknownRecord;
  builderModules?: UnknownRecord;
  builderContents?: UnknownRecord;
  disposables?: unknown[];
}

export type MaterialUserDataLike = UnknownRecord & {
  __wpBaseOpacity?: number;
  __wpBaseTransparent?: boolean;
};

export type MaterialWithOpacityLike = {
  opacity?: number;
  transparent?: boolean;
  userData?: MaterialUserDataLike;
};

export type TraversableLike = {
  traverse?: (cb: (obj: unknown) => void) => void;
  material?: unknown;
  userData?: UnknownRecord;
  visible?: boolean;
};

export type FrontOverlayCache = {
  wgUuid: string;
  list: TraversableLike[];
  lastAlpha: number | null;
  lastScanFrame: number;
};

export type FrontOverlayState = {
  prevGlobalDoorsOpen: boolean;
  transitionUntilMs: number;
  frameCounter: number;
  cache: FrontOverlayCache | null;
};

export type RenderLoopReportOptions = {
  throttleMs?: number;
  failFast?: boolean;
  reportMeta?: UnknownRecord;
};

export type RenderLoopReportFn = (op: string, err: unknown, opts?: RenderLoopReportOptions) => void;

export function isRecord(v: unknown): v is UnknownRecord {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

export function asRecord(v: unknown, fallback: UnknownRecord = {}): UnknownRecord {
  return isRecord(v) ? v : fallback;
}

export function asRecordOrNull(v: unknown): UnknownRecord | null {
  return isRecord(v) ? v : null;
}

export function asTraversable(v: unknown): TraversableLike | null {
  return isRecord(v) ? v : null;
}

export function asMaterialWithOpacity(v: unknown): MaterialWithOpacityLike | null {
  return isRecord(v) ? v : null;
}

export function asMaterialUserData(v: unknown): MaterialUserDataLike {
  return isRecord(v) ? v : {};
}

export function readRenderLike(v: unknown): RenderLike | null {
  return isRecord(v) ? v : null;
}

export function asRenderLike(v: unknown): RenderLike {
  return readRenderLike(v) || {};
}

export function asAppLike(v: unknown): AppLike {
  if (!isRecord(v)) return { render: {} };
  return { ...v, render: asRenderLike(v.render) };
}

export function toAppContainer(v: AppLike): AppContainer {
  return {
    ...v,
    deps: asRecord(v.deps, {}),
    config: asRecord(v.config, {}),
    flags: asRecord(v.flags, {}),
    platform: asRecord(v.platform, {}),
    render: ensureRenderNamespace(v),
    ui: asRecord(v.ui, {}),
    services: asRecord(v.services, {}),
    state: asRecord(v.state, {}),
    registries: asRecord(v.registries, {}),
    builder: asRecord(v.builder, {}),
    builderDeps: asRecord(v.builderDeps, {}),
    builderModules: asRecord(v.builderModules, {}),
    builderContents: asRecord(v.builderContents, {}),
    disposables: Array.isArray(v.disposables) ? v.disposables.slice() : [],
  };
}

export function asFrameRequestCallback(v: unknown, fallback: FrameRequestCallback): FrameRequestCallback {
  if (typeof v !== 'function') return fallback;
  return (time: number) => Reflect.apply(v, undefined, [time]);
}

// IMPORTANT: many surfaces expose methods that rely on `this`.
// Calling a detached function reference (e.g. `call0(core['computePerfFlags'])`) loses `this` and can crash at runtime.
// These helpers preserve `this` by using `.call` on the original callable.
export function call0m(ctx: unknown, fn: unknown): unknown {
  return typeof fn === 'function' ? fn.call(ctx) : undefined;
}

export function call2m(ctx: unknown, fn: unknown, a: unknown, b: unknown): unknown {
  return typeof fn === 'function' ? fn.call(ctx, a, b) : undefined;
}

export function clearLoopSchedule(A: AppLike): void {
  setLoopRaf(A, 0);
  setRafScheduledAt(A, 0);
}

function isSketchDebugEnabled(): boolean {
  try {
    if (typeof localStorage === 'undefined') return false;
    const v = localStorage.getItem('WP_SKETCH_DEBUG');
    return v === '1' || v === 'true';
  } catch (_e) {
    return false;
  }
}

export function debugSketchLog(A: AppLike, ...args: readonly unknown[]): void {
  try {
    if (!isSketchDebugEnabled()) return;
    console.log('[WardrobePro][sketchdbg]', ...args);
    // Also store last payload for easy copy/paste from the console.
    ensureRenderNamespace(A);
    A.render.__wpSketchDbgLast = Array.from(args);
    A.render.__wpSketchDbgLastTs = Date.now();
  } catch (_e) {
    // ignore
  }
}

export function reportRenderLoop(A: AppLike, op: string, err: unknown, opts?: RenderLoopReportOptions): void {
  const throttleMs = typeof opts?.throttleMs === 'number' ? opts.throttleMs : 5000;

  reportErrorThrottled(A, err, {
    where: 'platform/render_loop_impl',
    op,
    throttleMs,
    failFast: !!opts?.failFast,
    ...(isRecord(opts?.reportMeta) ? { reportMeta: opts.reportMeta } : {}),
  });

  if (opts?.failFast && shouldFailFast(A)) {
    throw err instanceof Error ? err : new Error(normalizeUnknownError(err, op).message);
  }
}

export function hasRenderLoopTimingSlots(A: AppLike): boolean {
  return (
    Number.isFinite(getLoopRaf(A)) &&
    Number.isFinite(getLastFrameTs(A)) &&
    Number.isFinite(getRafScheduledAt(A))
  );
}
