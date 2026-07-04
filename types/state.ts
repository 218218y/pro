// State/runtime shared types (DI deps + store shapes).

import type { UnknownRecord } from './common';
import type { DispatchOptionsLike } from './actions';
import type { StorePatchPayload } from './backend_patch_payload';
import type { ActionMetaLike, ModeActionOptsLike } from './kernel';
import type {
  ConfigSlicePatch,
  MetaSlicePatch,
  ModeSlicePatch,
  RuntimeSlicePatch,
  UiSlicePatch,
} from './patch_payload';
import type { RootStateLike } from './store_state';
import type { ThreeLike } from './three';
import type { WardrobeProRuntimeConfig, WardrobeProRuntimeFlags } from './runtime';

export interface StoreSourceDebugStat {
  source: string;
  type: string;
  slices: string[];
  count: number;
  totalMs: number;
  maxMs: number;
  lastMs: number;
  slowCount: number;
  lastUpdatedAt: number;
}

export interface StoreDebugStats {
  commitCount: number;
  noopSkipCount: number;
  selectorListenerCount: number;
  selectorNotifyCount: number;
  sources: Record<string, StoreSourceDebugStat>;
}

export type TimeoutHandleLike = ReturnType<typeof setTimeout> | number;
export type IntervalHandleLike = ReturnType<typeof setInterval> | number;
export type BrowserTimerCallback = () => void;
export type BrowserSetTimeoutLike = (fn: BrowserTimerCallback, ms?: number) => TimeoutHandleLike;
export type BrowserClearTimeoutLike = (handle: TimeoutHandleLike | undefined) => void;
export type BrowserSetIntervalLike = (fn: BrowserTimerCallback, ms?: number) => IntervalHandleLike;
export type BrowserClearIntervalLike = (handle: IntervalHandleLike | undefined) => void;

export interface BrowserDeps {
  window: Window;
  document: Document;
  location?: Location;
  navigator?: Navigator;

  // Timing / async surfaces (optional DI seams).
  setTimeout?: BrowserSetTimeoutLike;
  clearTimeout?: BrowserClearTimeoutLike;
  setInterval?: BrowserSetIntervalLike;
  clearInterval?: BrowserClearIntervalLike;
  requestAnimationFrame?: (cb: FrameRequestCallback) => number;
  cancelAnimationFrame?: (handle: number) => void;
  requestIdleCallback?: (cb: IdleRequestCallback, opts?: IdleRequestOptions) => number;
  queueMicrotask?: (cb: () => void) => void;
  performanceNow?: () => number;

  // Networking (optional DI seam).
  fetch?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
}

/**
 * Minimal store interface used across the codebase.
 *
 * Keep this intentionally small and permissive during migration.
 */
export interface StoreLike<S = RootStateLike> {
  getState: () => S;
  subscribe: (fn: (state: S, actionMeta?: ActionMetaLike) => void) => () => void;

  /**
   * State-only subscription for React and other consumers that must observe every commit.
   * Optional for non-platform stores.
   */
  subscribeState?: (fn: () => void) => () => void;

  /**
   * Selector-level subscription for high-churn services / React hooks.
   * The callback is invoked only when the selected value changes according to `equalityFn`.
   * Optional for non-platform stores.
   */
  subscribeSelector?: <T>(
    selector: (state: S) => T,
    fn: (selected: T, previous: T, actionMeta?: ActionMetaLike) => void,
    opts?: {
      equalityFn?: (a: T, b: T) => boolean;
      fireImmediately?: boolean;
    }
  ) => () => void;

  /**
   * Meta-aware subscription (same as `subscribe`). Optional alias.
   */
  subscribeMeta?: (fn: (state: S, actionMeta?: ActionMetaLike) => void) => () => void;

  /**
   * Raw/backend store patch boundary (Zustand-only).
   *
   * This accepts StorePatchPayload for platform/kernel/runtime owner commits,
   * including snapshot/map-owner paths. UI, services, builder, and public
   * callers must use App.actions.* or the focused semantic writer facade.
   */
  patch: (
    payload: StorePatchPayload | UnknownRecord,
    meta?: ActionMetaLike | UnknownRecord,
    opts?: DispatchOptionsLike
  ) => unknown;

  /** Rare root replacement helper (primarily for tests/tooling). */
  setRoot?: (nextRoot: unknown, meta?: ActionMetaLike | UnknownRecord, opts?: DispatchOptionsLike) => unknown;

  /** Optional store-local diagnostics for patch/source churn analysis. */
  getDebugStats?: () => StoreDebugStats;
  resetDebugStats?: () => void;

  // Optional convenience methods (present in some builds / legacy callers).
  setMode?: (primary: unknown, opts?: ModeActionOptsLike, meta?: ActionMetaLike | UnknownRecord) => void;
  setRuntime?: (patch: RuntimeSlicePatch | UnknownRecord, meta?: ActionMetaLike | UnknownRecord) => void;
  setMeta?: (patch: MetaSlicePatch | UnknownRecord, meta?: ActionMetaLike | UnknownRecord) => void;
  setDirty?: (isDirty: boolean, meta?: ActionMetaLike | UnknownRecord) => void;
  setUi?: (patch: UiSlicePatch | UnknownRecord, meta?: ActionMetaLike | UnknownRecord) => void;
  /** Backend-only convenience writer. Not for UI/service/domain callers. */
  setConfig?: (patch: ConfigSlicePatch | UnknownRecord, meta?: ActionMetaLike | UnknownRecord) => void;
  setModePatch?: (patch: ModeSlicePatch | UnknownRecord, meta?: ActionMetaLike | UnknownRecord) => void;
}

// Default root-store shape (used by most ESM modules).
export type RootStoreLike = StoreLike<RootStateLike>;

export interface StateKernelLike extends UnknownRecord {
  // Internal kernel snapshot helpers. Not UI/service/domain config writers.
  captureConfig?: () => UnknownRecord;
  patchConfigScalar?: (key: string, valueOrFn: unknown, meta?: ActionMetaLike) => unknown;
  applyKernelConfigMapSnapshot?: (patchObj: unknown, meta?: ActionMetaLike) => unknown;
  commit?: (meta?: ActionMetaLike) => unknown;

  // Common kernel APIs used across builder/services.
  getStoreConfig?: () => UnknownRecord;
  applyKernelConfigSnapshot?: (cfgIn: unknown, metaIn?: ActionMetaLike) => unknown;
  getBuildState?: (stateOrOverride?: unknown) => UnknownRecord;
  commitFromSnapshot?: (snapshot: unknown, meta?: ActionMetaLike) => unknown;
  setDirty?: (isDirty: boolean, meta?: ActionMetaLike) => unknown;
  touch?: (meta?: ActionMetaLike) => unknown;

  // Optional batching helper used by cfg.batch().
  __cfgBatch?: {
    depth?: number;
    dirty?: boolean;
    flags?: UnknownRecord;
    lastSource?: string;
    meta?: ActionMetaLike;
    hasChanges?: boolean;
    patch?: UnknownRecord;
    _reset?: () => void;
    [k: string]: unknown;
  };

  // Optional history system pointer (used by UI context helper).
  historySystem?: unknown;

  // Keep flexible during migration.
  [k: string]: unknown;
}

// Base injected deps: keep this flexible while we migrate.
// NOTE: `THREE` is optional at the type-level because some tooling/tests
// may import code without a 3D runtime. Use runtime assertions when needed.
export interface Deps {
  THREE?: ThreeLike;
  browser?: Partial<BrowserDeps>;
  /** Runtime feature flags (prefer typed keys; still allows extension). */
  flags?: WardrobeProRuntimeFlags | UnknownRecord;

  /** Runtime config (prefer typed keys; still allows extension). */
  config?: WardrobeProRuntimeConfig | UnknownRecord;
  // Allow future injected deps without churn.
  [k: string]: unknown;
}

export interface Deps3D extends Deps {
  THREE: ThreeLike;
}
