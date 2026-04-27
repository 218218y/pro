// State/runtime shared types (DI deps + store shapes).

import type { UnknownRecord } from './common';
import type { DispatchOptionsLike } from './actions';
import type { ActionMetaLike, ModeActionOptsLike } from './kernel';
import type {
  ConfigSlicePatch,
  MetaSlicePatch,
  ModeSlicePatch,
  PatchPayload,
  RuntimeSlicePatch,
  UiSlicePatch,
} from './patch_payload';
import type { RootStateLike } from './store_state';
import type { ThreeLike } from './three';
import type { WardrobeProRuntimeConfig, WardrobeProRuntimeFlags } from './runtime';
import type {
  CornerConfigurationLike,
  ModuleConfigLike,
  ModuleConfigPatchLike,
  NormalizedTopModuleConfigLike,
  ModulesConfigurationLike,
} from './modules_configuration';

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
   * Canonical write path (Zustand-only):
   * Patch the root state directly (no dispatch envelopes).
   */
  patch: (
    payload: PatchPayload | UnknownRecord,
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
  setConfig?: (patch: ConfigSlicePatch | UnknownRecord, meta?: ActionMetaLike | UnknownRecord) => void;
  setModePatch?: (patch: ModeSlicePatch | UnknownRecord, meta?: ActionMetaLike | UnknownRecord) => void;
}

// Default root-store shape (used by most ESM modules).
export type RootStoreLike = StoreLike<RootStateLike>;

export interface StateKernelLike extends UnknownRecord {
  // Snapshot helpers used by cfg surface (compat).
  captureConfig?: () => UnknownRecord;
  patchConfigScalar?: (key: string, valueOrFn: unknown, meta?: ActionMetaLike) => unknown;
  patchConfigMaps?: (patchObj: unknown, meta?: ActionMetaLike) => unknown;
  commit?: (meta?: ActionMetaLike) => unknown;

  // Module config patch helpers (used by domain APIs; avoids unsafe stateKernel casts everywhere).
  patchModuleConfig: (
    indexOrKey: number | string,
    patch: ModuleConfigPatchLike,
    meta?: ActionMetaLike
  ) => unknown;
  /**
   * Split-lower module key is historically overloaded in the codebase:
   * - numeric module index (most common)
   * - string keys coming from UI / picking code (e.g. `corner:${n}` or stringified numbers)
   *
   * Keep the surface permissive here to avoid forcing unsafe casts at call-sites.
   */
  patchSplitLowerModuleConfig: (
    indexOrKey: number | string,
    patch: ModuleConfigPatchLike,
    meta?: ActionMetaLike
  ) => unknown;

  patchSplitLowerCornerCellConfig: (
    indexOrKey: number | string,
    patch: ModuleConfigPatchLike,
    meta?: ActionMetaLike
  ) => unknown;

  // Common kernel APIs used across builder/services.
  getStoreConfig?: () => UnknownRecord;
  applyConfig?: (cfgIn: unknown, metaIn?: ActionMetaLike) => unknown;
  getBuildState?: (stateOrOverride?: unknown) => UnknownRecord;
  commitFromSnapshot?: (snapshot: unknown, meta?: ActionMetaLike) => unknown;
  setDirty?: (isDirty: boolean, meta?: ActionMetaLike) => unknown;
  touch?: (meta?: ActionMetaLike) => unknown;

  // Config ref helpers used by canvas picking / UI.
  ensureModuleConfig?: (indexOrKey: number | string) => NormalizedTopModuleConfigLike | null;
  ensureSplitLowerModuleConfig?: (indexOrKey: number | string) => ModuleConfigLike | null;
  ensureCornerConfig?: () => CornerConfigurationLike | null;
  ensureCornerCellConfig?: (indexOrKey: number | string) => NormalizedTopModuleConfigLike | null;
  ensureSplitLowerCornerConfig?: () => CornerConfigurationLike | null;

  // Stack-aware variants used by newer picking code.
  ensureModuleConfigForStack?: (
    stackKey: 'top' | 'bottom',
    indexOrKey: number | string | 'corner'
  ) => ModuleConfigLike | CornerConfigurationLike | null;
  patchModuleConfigForStack?: (
    stackKey: 'top' | 'bottom',
    indexOrKey: number | string | 'corner',
    patch: ModuleConfigPatchLike,
    meta?: ActionMetaLike
  ) => unknown;

  // Bulk replace helpers used by domain API (optional).
  replaceModulesConfiguration?: (next: ModulesConfigurationLike, meta?: ActionMetaLike) => unknown;
  replaceSplitLowerModulesConfiguration?: (next: ModulesConfigurationLike, meta?: ActionMetaLike) => unknown;

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
