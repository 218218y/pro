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
export type WardrobeProTabId = TabId;

/** Supabase Cloud Sync runtime config (injected via deps.config.supabaseCloudSync). */
export interface WardrobeProSupabaseCloudSyncConfig {
  url?: string;
  anonKey?: string;
  storeId?: string;
  gatewayFunction?: string;
  publicRoom?: string;
  roomParam?: string;
  roomTokenParam?: string;
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

/** Store/brand identity injected by a site profile build. */
export interface WardrobeProBrandingConfig {
  storeId?: string;
  displayName?: string;
  [k: string]: unknown;
}

/** Order PDF runtime config. */
export interface WardrobeProOrderPdfConfig {
  /** Site-root-relative PDF template URL, usually generated as order_template.pdf. */
  templateUrl?: string;
  [k: string]: unknown;
}

/** Canonical runtime/boot configuration keys.
 *
 * These values are injected through `deps.config` and materialized on `App.config`.
 * They are deliberately separate from the persistent `store.config` domain slice.
 */
export type RuntimeConfigValueMap = {
  cacheBudgetMb: number;
  cacheMaxItems: number;
  debugBootTimings: boolean;
  siteVariant: WardrobeProSiteVariant;
  site2EnabledTabs: WardrobeProTabId[];
  storageNamespace: string;
  branding: WardrobeProBrandingConfig;
  orderPdf: WardrobeProOrderPdfConfig;
  supabaseCloudSync: WardrobeProSupabaseCloudSyncConfig;

  DOOR_DELAY_MS: number;
  ACTIVE_STATE_MS: number;
  NOTES_THROTTLE_MS: number;
  PIXEL_RATIO_MAX: number;
  MIRROR_CUBE_SIZE: number;
  RENDER_ANTIALIAS: boolean;
  RENDER_SHADOWS_ENABLED: boolean;
  AUTOSAVE_DEBOUNCE_MS: number;
  RESIZE_DEBOUNCE_MS: number;
  PERSIST_EDIT_STATE: boolean;

  TEXTURE_CACHE_MAX: number;
  MATERIAL_CACHE_MAX: number;
  DIM_LABEL_CACHE_MAX: number;
  EDGES_CACHE_MAX: number;
  GEOMETRY_CACHE_MAX: number;
  textures: number;
  materials: number;
  dimLabels: number;
  edges: number;
  geometries: number;

  MIRROR_DISABLE_DURING_MOTION: boolean;
  MIRROR_FRAME_BUDGET_MS: number;
  MIRROR_MOTION_HOLD_MS: number;
  MIRROR_MOVE_FRAME_BUDGET_MS: number;
  MIRROR_MOVE_UPDATE_MS: number;
  MIRROR_NO_MIRROR_RESCAN_MS: number;
  MIRROR_REFLECTOR_BRIGHTNESS: number;
  MIRROR_REFLECTOR_CLIP_BIAS: number;
  MIRROR_REFLECTOR_COLOR: number;
  MIRROR_REFLECTOR_EDGE_FEATHER_UV: number;
  MIRROR_REFLECTOR_LONG_EDGE: number;
  MIRROR_REFLECTOR_MAX_COUNT: number;
  MIRROR_REFLECTOR_MAX_UPDATES_PER_FRAME: number;
  MIRROR_REFLECTOR_MIN_EDGE: number;
  MIRROR_REFLECTOR_MOVE_MAX_UPDATES_PER_FRAME: number;
  MIRROR_REFLECTOR_MOVE_UPDATE_MS: number;
  MIRROR_REFLECTOR_MULTISAMPLE: number;
  MIRROR_REFLECTOR_POLYGON_OFFSET_FACTOR: number;
  MIRROR_REFLECTOR_POLYGON_OFFSET_UNITS: number;
  MIRROR_REFLECTOR_SLIDING_INNER_EDGE_FEATHER_UV: number;
  MIRROR_REFLECTOR_SLIDING_INNER_SURFACE_GAP_M: number;
  MIRROR_REFLECTOR_SLIDING_INNER_SURFACE_INSET_X_M: number;
  MIRROR_REFLECTOR_SLIDING_OCCLUSION_CLEARANCE_M: number;
  MIRROR_REFLECTOR_SLIDING_OCCLUSION_FEATHER_UV: number;
  MIRROR_REFLECTOR_SURFACE_GAP_M: number;
  MIRROR_REFLECTOR_SURFACE_INSET_M: number;
  MIRROR_REFLECTOR_UPDATE_MS: number;
  MIRROR_UPDATE_MS: number;
};

export type RuntimeConfigKey = keyof RuntimeConfigValueMap;
export type RuntimeConfigValue<K extends RuntimeConfigKey> = RuntimeConfigValueMap[K];
export type RuntimeConfigNumberKey = {
  [K in RuntimeConfigKey]: RuntimeConfigValueMap[K] extends number ? K : never;
}[RuntimeConfigKey];
export type RuntimeConfigBooleanKey = {
  [K in RuntimeConfigKey]: RuntimeConfigValueMap[K] extends boolean ? K : never;
}[RuntimeConfigKey];

/** Runtime configuration surface (deps.config / App.config) loaded at boot. */
export type WardrobeProRuntimeConfig = Partial<RuntimeConfigValueMap> & UnknownRecord;

export interface DoorsSetOpenOptionsLike extends ActionMetaLike {
  touch?: boolean;
  forceUpdate?: boolean;
  hardCloseDoors?: boolean;
  hardClose?: boolean;
  /** Hide open sliding doors for edit/export snapshots instead of moving them outside the cabinet. */
  slidingHideOpen?: boolean;
}

export interface DoorsSyncVisualsOptionsLike extends UnknownRecord {
  /** Override the global doorsOpen flag when snapping visuals. */
  open?: boolean;
  /** When true, also snap drawers (default: true). */
  includeDrawers?: boolean;
  /** Hide open sliding doors for edit/export snapshots instead of moving them outside the cabinet. */
  slidingHideOpen?: boolean;
}

export interface DoorsCloseDrawerOptionsLike extends UnknownRecord {
  /** Snap immediately to the closed target. Defaults to true; false lets render motion animate. */
  snap?: boolean;
}

export interface DoorsReleaseEditHoldOptionsLike extends UnknownRecord {
  restore?: boolean;
}

export interface DoorsCaptureLocalOpenOptionsLike extends UnknownRecord {
  includeDrawers?: boolean;
  /** Also preserve per-door sliding-track opens while global door mode is active. */
  includeSlidingTrackDoors?: boolean;
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
  closeDrawerById?: (drawerId: string | number, opts?: DoorsCloseDrawerOptionsLike) => unknown;
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
  rebuildIntentVersion?: number;
  preserveMotionAfterBuild?: boolean;
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

export interface WardrobeProDebugSceneGeometrySummary {
  nodeCount: number;
  visibleNodeCount: number;
  meshCount: number;
  geometryCount: number;
  partNodeCount: number;
  uniquePartCount: number;
  vertexCount: number;
  invalidNumberCount: number;
  maxDepth: number;
}

export interface WardrobeProDebugSceneGeometrySnapshot {
  version: 1;
  fingerprint: string;
  rootName: string;
  summary: WardrobeProDebugSceneGeometrySummary;
  partIds: string[];
  violations: string[];
}

export interface WardrobeProDebugSceneConsoleSurface {
  getGeometrySnapshot: () => WardrobeProDebugSceneGeometrySnapshot | null;
}

/** Browser-only debug helpers attached at runtime for manual inspection. */
export interface WardrobeProDebugConsoleSurface {
  store: WardrobeProDebugStoreConsoleSurface;
  build: WardrobeProDebugBuildConsoleSurface;
  render: WardrobeProDebugRenderConsoleSurface;
  canvas: WardrobeProDebugCanvasConsoleSurface;
  scene: WardrobeProDebugSceneConsoleSurface;
  [k: string]: unknown;
}

export type WardrobeProPerfEntryKind =
  'action' | 'phase' | 'interaction-wait' | 'render-settle' | 'browser-metric' | 'mark';

export type WardrobeProPerfMetricUnit = 'ms' | 'score' | 'count';

export interface WardrobeProPerfEntry {
  id: string;
  name: string;
  kind: WardrobeProPerfEntryKind;
  parentId?: string;
  phase?: string;
  startTime: number;
  endTime: number;
  uxTotalMs: number;
  codeExecutionMs: number;
  interactionWaitMs: number;
  status: 'ok' | 'error' | 'mark';
  metricValue?: number;
  metricUnit?: WardrobeProPerfMetricUnit;
  detail?: unknown;
  error?: string;
}

export interface WardrobeProPerfMetricSummary {
  count: number;
  okCount: number;
  errorCount: number;
  markCount: number;
  errorRate: number;
  uxTotalMs: number;
  uxAverageMs: number;
  uxMinMs: number;
  uxMaxMs: number;
  uxP50Ms: number;
  uxP95Ms: number;
  codeExecutionTotalMs: number;
  codeExecutionAverageMs: number;
  codeExecutionMinMs: number;
  codeExecutionMaxMs: number;
  codeExecutionP50Ms: number;
  codeExecutionP95Ms: number;
  interactionWaitTotalMs: number;
  interactionWaitAverageMs: number;
  interactionWaitP95Ms: number;
  lastUxTotalMs: number;
  lastCodeExecutionMs: number;
  lastInteractionWaitMs: number;
  lastStatus: WardrobeProPerfEntry['status'] | null;
  lastError?: string;
  lastUpdatedAt: number;
}

export interface WardrobeProBrowserPerfMetrics {
  observerSupported: boolean;
  supportedEntryTypes: string[];
  cls: {
    value: number;
    entryCount: number;
    lastUpdatedAt: number;
  };
  lcp: {
    valueMs: number;
    entryCount: number;
    lastUpdatedAt: number;
  };
  inp: {
    valueMs: number;
    interactionCount: number;
    observedInteractionCount: number;
    entryCount: number;
    p98Rank: number;
    interactionId: number;
    source: 'event' | 'first-input' | 'none';
    lastUpdatedAt: number;
  };
  longTasks: {
    count: number;
    totalMs: number;
    maxMs: number;
    p95Ms: number;
    lastUpdatedAt: number;
  };
  renderSettle: {
    count: number;
    totalMs: number;
    maxMs: number;
    p95Ms: number;
    lastUpdatedAt: number;
  };
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
  roundedFrameSideShelfCount: number;
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
  getBrowserMetrics: () => WardrobeProBrowserPerfMetrics;
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
