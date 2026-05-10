import type { UnknownRecord } from './common';
import type { ActionMetaLike } from './kernel';
import type { StoreDebugStats, StoreSourceDebugStat } from './state';
import type { TabId } from './ui_tabs';
import type { RenderFollowThroughBudgetSummaryLike, RenderFollowThroughDebugStatsLike } from './app';
import type {
  BuilderDebugStatsLike,
  BuildReasonDebugStatLike,
  BuildDebugBudgetSummaryLike,
  ErrorsHistoryEntryLike,
} from './build';

// Runtime-configurable globals and injected flag/config surfaces.
//
// These types are intentionally permissive (index signature) but provide
// *named* keys for the most important runtime controls.

/** Feature flags injected at boot (deps.flags). */
export interface WardrobeProRuntimeFlags {
  /** UI framework selector (React-only build uses 'react'). */
  uiFramework?: 'react';

  /** Optional feature gate used by some platform patches. */
  enableThreeGeometryCachePatch?: boolean;

  // Allow additional feature flags without churn.
  [k: string]: unknown;
}

/** Cache sizing controls (injected via deps.config). */
export interface WardrobeProCacheLimits {
  cacheBudgetMb?: number;
  cacheMaxItems?: number;

  // Allow additional limits without churn.
  [k: string]: unknown;
}

/** Site variant selector (main / site2). */
export type WardrobeProSiteVariant = 'main' | 'site2';

/** Known sidebar tab ids used by the React UI (used by site2 gating). */
export type WardrobeProTabId = Exclude<TabId, 'sketch'>;

/** Supabase Cloud Sync runtime config (injected via deps.config.supabaseCloudSync). */
export interface WardrobeProSupabaseCloudSyncConfig {
  url?: string;
  anonKey?: string;
  table?: string;
  publicRoom?: string;
  privateRoom?: string;
  roomParam?: string;
  pollMs?: number;
  shareBaseUrl?: string;
  realtime?: boolean;
  diagnostics?: boolean;
  showRoomWidget?: boolean;

  // Extended (optional) fields used by newer Cloud Sync features
  realtimeMode?: 'broadcast';
  realtimeChannelPrefix?: string;
  site2SketchInitialAutoLoad?: boolean;
  site2SketchInitialMaxAgeHours?: number;

  [k: string]: unknown;
}

/** Runtime configuration surface (deps.config) loaded/injected at boot. */
export interface WardrobeProRuntimeConfig extends WardrobeProCacheLimits {
  /** Enables optional debug timings in boot/initialization. */
  debugBootTimings?: boolean;

  /** Optional site variant selector. */
  siteVariant?: WardrobeProSiteVariant;

  /** Site2: which tabs are allowed to show when the remote gate is OPEN. */
  site2EnabledTabs?: WardrobeProTabId[];

  /** Cloud Sync config (preferred DI/runtime config surface). */
  supabaseCloudSync?: WardrobeProSupabaseCloudSyncConfig;

  // Allow additional config keys without churn.
  [k: string]: unknown;
}
export interface DoorsSetOpenOptionsLike extends ActionMetaLike {
  touch?: boolean;
  forceUpdate?: boolean;
  hardCloseDoors?: boolean;
  hardClose?: boolean;
}

export interface DoorsSyncVisualsOptionsLike extends UnknownRecord {
  /** Override the global doorsOpen flag when snapping visuals. */
  open?: boolean;
  /** When true, also snap drawers (default: true). */
  includeDrawers?: boolean;
}

export interface DoorsReleaseEditHoldOptionsLike extends UnknownRecord {
  restore?: boolean;
}

export interface DoorsCaptureLocalOpenOptionsLike extends UnknownRecord {
  includeDrawers?: boolean;
}

export interface RuntimeMetaActionsAccessLike extends UnknownRecord {
  transient?: (meta?: ActionMetaLike, source?: string) => ActionMetaLike;
}

export interface RuntimeDoorsActionWriteOptsLike extends DoorsSetOpenOptionsLike {
  ts?: number;
}

export interface RuntimeActionsAccessLike extends UnknownRecord {
  setDoorsOpen?: (
    open: boolean,
    optsOrMeta?: RuntimeDoorsActionWriteOptsLike | ActionMetaLike,
    meta?: ActionMetaLike
  ) => unknown;
  patch?: (patch: UnknownRecord, meta?: ActionMetaLike) => unknown;
}

export interface FatalOverlayShowOptionsLike extends UnknownRecord {
  document?: Document | null;
  window?: Window | null;
  doc?: Document | null;
  win?: Window | null;
  title?: string;
  description?: string;
  error?: unknown;
  context?: unknown;
  helpHtml?: string;
  snapshot?: unknown;
  allowClose?: boolean;
  silentConsole?: boolean;
}

export interface FatalOverlayHideOptionsLike extends UnknownRecord {
  keepDom?: boolean;
}

export interface DoorsServiceAccessLike extends UnknownRecord {
  getOpen?: () => unknown;
  getLastToggleTime?: () => unknown;
  setOpen?: (open: boolean, meta?: ActionMetaLike) => unknown;
  toggle?: (meta?: ActionMetaLike) => unknown;
  releaseEditHold?: (opts?: DoorsReleaseEditHoldOptionsLike) => unknown;
  closeDrawerById?: (drawerId: string | number) => unknown;
  captureLocalOpenStateBeforeBuild?: (opts?: DoorsCaptureLocalOpenOptionsLike) => unknown;
  applyLocalOpenStateAfterBuild?: () => unknown;
  applyEditHoldAfterBuild?: () => unknown;
  syncVisualsNow?: (opts?: DoorsSyncVisualsOptionsLike) => unknown;
  snapDrawersToTargets?: () => unknown;
}

export interface DrawerServiceAccessLike extends UnknownRecord {
  metaById?: unknown;
  runtime?: unknown;
}

export interface DrawerRuntimeAccessLike extends UnknownRecord {
  snapAfterBuildId?: string | number | null;
  openAfterBuildId?: string | number | null;
}

export interface DoorsRuntimeAccessLike extends UnknownRecord {
  editHold?: UnknownRecord;
  lastToggleTime?: number | string | null;
  suppressGlobalToggleUntil?: number | string | null;
  hardCloseUntil?: number | string | null;
}

/**
 * Controller object installed on Window to manage the fatal boot overlay.
 * Keep this minimal to avoid type coupling with UI modules.
 */
export interface WardrobeProFatalOverlayController {
  el: HTMLElement;
  show: (opts?: FatalOverlayShowOptionsLike) => unknown;
  hide: (opts?: FatalOverlayHideOptionsLike) => unknown;
  [k: string]: unknown;
}

/** Minimal console-debug surface installed on Window (without exposing App itself). */
export interface WardrobeProDebugStoreConsoleSurface {
  getStats: () => StoreDebugStats | null;
  resetStats: () => StoreDebugStats | null;
  getState: () => unknown;
  getTopSources: (limit?: number) => StoreSourceDebugStat[];
}

export interface WardrobeProDebugBuildConsoleSurface {
  getStats: () => BuilderDebugStatsLike | null;
  resetStats: () => BuilderDebugStatsLike | null;
  getTopReasons: (limit?: number) => BuildReasonDebugStatLike[];
  getBudget: () => BuildDebugBudgetSummaryLike | null;
}

export interface WardrobeProDebugRenderConsoleSurface {
  getStats: () => RenderFollowThroughDebugStatsLike | null;
  resetStats: () => RenderFollowThroughDebugStatsLike | null;
  getBudget: () => RenderFollowThroughBudgetSummaryLike | null;
}

export interface WardrobeProDebugCanvasHitInfo {
  x: number;
  y: number;
  moduleIndex: string | number | null;
  moduleStack: 'top' | 'bottom';
  partId: string | null;
  moduleHitY: number | null;
  isCellDimsMode: boolean;
}

export interface WardrobeProDebugCanvasConsoleSurface {
  clickNdc: (x: number, y: number) => boolean;
  hoverNdc: (x: number, y: number) => boolean;
  inspectNdc: (x: number, y: number) => WardrobeProDebugCanvasHitInfo | null;
}

/** Browser-only debug helpers attached at runtime for manual inspection. */
export interface WardrobeProDebugConsoleSurface {
  store: WardrobeProDebugStoreConsoleSurface;
  build: WardrobeProDebugBuildConsoleSurface;
  render: WardrobeProDebugRenderConsoleSurface;
  canvas: WardrobeProDebugCanvasConsoleSurface;
  [k: string]: unknown;
}

export interface WardrobeProPerfEntry {
  id: string;
  name: string;
  startTime: number;
  endTime: number;
  durationMs: number;
  status: 'ok' | 'error' | 'mark';
  detail?: unknown;
  error?: string;
}

export interface WardrobeProPerfMetricSummary {
  count: number;
  okCount: number;
  errorCount: number;
  markCount: number;
  errorRate: number;
  totalMs: number;
  averageMs: number;
  minMs: number;
  maxMs: number;
  p50Ms: number;
  p95Ms: number;
  lastDurationMs: number;
  lastStatus: WardrobeProPerfEntry['status'] | null;
  lastError?: string;
  lastUpdatedAt: number;
}

export interface WardrobeProPerfStateFingerprint {
  projectName: string;
  savedColorCount: number;
  savedColorValues: string[];
  wardrobeType: string;
  boardMaterial: string;
  doorStyle: string;
  groovesEnabled: boolean;
  grooveLinesCount: number | null;
  splitDoors: boolean;
  removeDoorsEnabled: boolean;
  internalDrawersEnabled: boolean;
  groovesMapCount: number;
  grooveLinesCountMapCount: number;
  splitDoorMapCount: number;
  splitDoorBottomMapCount: number;
  removedDoorMapCount: number;
  doorTrimCount: number;
  drawerDividerCount: number;
  internalDrawerPlacementCount: number;
  externalDrawerSelectionCount: number;
}

export interface WardrobeProPerfConsoleSurface {
  mark: (name: string, detail?: unknown) => WardrobeProPerfEntry;
  start: (name: string, detail?: unknown) => string;
  end: (spanId: string, detail?: unknown) => WardrobeProPerfEntry | null;
  getEntries: (name?: string) => WardrobeProPerfEntry[];
  clear: () => void;
  getSummary: () => Record<string, WardrobeProPerfMetricSummary>;
  getStateFingerprint?: () => WardrobeProPerfStateFingerprint | null;
  getStoreDebugStats?: () => StoreDebugStats | null;
  resetStoreDebugStats?: () => StoreDebugStats | null;
  getBuildDebugStats?: () => BuilderDebugStatsLike | null;
  resetBuildDebugStats?: () => BuilderDebugStatsLike | null;
  getBuildDebugBudget?: () => BuildDebugBudgetSummaryLike | null;
  getRenderDebugStats?: () => RenderFollowThroughDebugStatsLike | null;
  resetRenderDebugStats?: () => RenderFollowThroughDebugStatsLike | null;
  getRenderDebugBudget?: () => RenderFollowThroughBudgetSummaryLike | null;
  getErrorHistory?: () => ErrorsHistoryEntryLike[];
}
