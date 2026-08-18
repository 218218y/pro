// State/runtime shared types (DI deps + store shapes).

import type { UnknownRecord } from './common';
import type { ActionMetaLike } from './kernel';
import type { RootStateLike, RootSliceKey } from './store_state';
import type { ThreeLike } from './three';
import type { WardrobeProRuntimeConfig, WardrobeProRuntimeFlags } from './runtime';

export interface StoreSourceDebugStat {
  source: string;
  type: string;
  slices: string[];
  count: number;
  noBuildCount: number;
  totalMs: number;
  maxMs: number;
  lastMs: number;
  slowCount: number;
  lastUpdatedAt: number;
}

export interface StoreDebugStats {
  commitCount: number;
  noopSkipCount: number;
  noBuildCount: number;
  selectorListenerCount: number;
  selectorFilteredCount: number;
  selectorEvaluationCount: number;
  selectorNotifyCount: number;
  sources: Record<string, StoreSourceDebugStat>;
}

export type StoreChangeDomainKey =
  | 'structure'
  | 'interior'
  | 'appearance'
  | 'room'
  | 'visibility'
  | 'interaction'
  | 'navigation'
  | 'project-data'
  | 'runtime-lifecycle'
  | 'meta';

export type StoreSelectorSliceKey = RootSliceKey | 'root' | 'all';
export type StoreSelectorDomainKey = StoreChangeDomainKey | 'all';

export type TimeoutHandleLike = ReturnType<typeof setTimeout>;
export type IntervalHandleLike = ReturnType<typeof setInterval>;
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

/** Public/read-only store surface. Raw write methods live in backend_store.ts. */
export interface PublicStoreLike<S = RootStateLike> {
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
      slice?: StoreSelectorSliceKey;
      slices?: readonly StoreSelectorSliceKey[];
      domain?: StoreSelectorDomainKey;
      domains?: readonly StoreSelectorDomainKey[];
    }
  ) => () => void;

  /**
   * Meta-aware subscription (same as `subscribe`). Optional alias.
   */
  subscribeMeta?: (fn: (state: S, actionMeta?: ActionMetaLike) => void) => () => void;

  /** Optional store-local diagnostics for patch/source churn analysis. */
  getDebugStats?: () => StoreDebugStats;
  resetDebugStats?: () => void;
}

export type ReadableStoreLike<S = RootStateLike> = PublicStoreLike<S>;
export type RootPublicStoreLike = PublicStoreLike<RootStateLike>;

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
