// Cross-layer integration types: AppContainer and large platform/render surfaces.
// Extracted from the types barrel to keep dependencies explicit and manageable.

import type { Namespace, UnknownRecord } from './common';
import type { Deps, RootStoreLike } from './state';
import type {
  ActionMetaLike,
  ActionsNamespaceLike,
  ActionsDomainsLike,
  MapsNamespaceLike,
  KernelNamespaceLike,
  UtilNamespaceLike,
} from './kernel';
import type {
  ServicesNamespace,
  BuilderRegistryLike,
  BuilderServiceLike,
  BuilderDepsRootLike,
  BuilderModulesSurfaceLike,
  BuilderContentsSurfaceLike,
} from './build';
import type { HingeDir } from './domain';
import type { Object3DLike, CameraLike, ControlsLike, WebGLRenderTargetLike, Vec3Like } from './three_like';

/** Registry namespace surface (type-only; safe even with cyclic imports). */
export interface RegistriesNamespaceLike extends UnknownRecord {
  builderRegistry?: BuilderRegistryLike;
  [k: string]: unknown;
}

export type PlatformHash32Fn = (value: unknown) => string;
export type PlatformLogArgs = unknown[];
export type PlatformLogFn = (...args: PlatformLogArgs) => unknown;
export type PlatformCanvasLike = HTMLCanvasElement | OffscreenCanvas;

export interface PlatformDimsLike extends UnknownRecord {
  w: number;
  h: number;
  d: number;
}

export interface PlatformActivityLike extends UnknownRecord {
  lastActionTime?: number;
  touch?: () => void;
}

export interface RenderFollowThroughDebugStatsLike extends UnknownRecord {
  renderRequestCount: number;
  triggerRenderCount: number;
  ensureRenderLoopCount: number;
  noOpRenderRequestCount: number;
  wakeupRequestCount: number;
  wakeupEnsureRenderLoopCount: number;
  noOpWakeupCount: number;
  activityTouchCount: number;
  afterTouchCount: number;
  ensureRenderLoopAfterTriggerCount: number;
}

export interface RenderFollowThroughBudgetSummaryLike extends UnknownRecord {
  renderRequestCount: number;
  triggerRenderCount: number;
  ensureRenderLoopCount: number;
  noOpRenderRequestCount: number;
  wakeupRequestCount: number;
  wakeupEnsureRenderLoopCount: number;
  noOpWakeupCount: number;
  activityTouchCount: number;
  afterTouchCount: number;
  ensureRenderLoopAfterTriggerCount: number;
  renderNoOpRate: number;
  wakeupNoOpRate: number;
  renderEnsureFallbackRate: number;
}

export interface PlatformUtilNamespaceLike extends UnknownRecord {
  log?: PlatformLogFn;
  str?: (value: unknown, fallback?: string) => string;
  idle?: (cb: () => void, timeout?: number) => unknown;
  clone?: <T>(value: T, seed?: unknown) => T;
  cleanGroup?: (group: unknown) => unknown;
  pruneCachesSafe?: (rootNode?: unknown) => unknown;
  afterPaint?: (cb: () => void) => unknown;
  hash32?: PlatformHash32Fn;
}

export interface PlatformServiceNamespaceLike extends UnknownRecord {
  getBuildUI?: () => UnknownRecord | null | undefined;
  getDimsM?: (raw?: unknown) => PlatformDimsLike | null | undefined;
  ensureRenderLoop?: () => unknown;
  getRenderDebugStats?: () => RenderFollowThroughDebugStatsLike | null;
  resetRenderDebugStats?: () => RenderFollowThroughDebugStatsLike | null;
  getRenderDebugBudget?: () => RenderFollowThroughBudgetSummaryLike | null;
  computePerfFlags?: () => unknown;
  setAnimate?: (fn: () => unknown) => unknown;
  activity?: PlatformActivityLike;
  perf?: UnknownRecord;
  reportError?: (err: unknown, ctx?: unknown) => void;
  triggerRender?: (updateShadows?: boolean) => void;
  createCanvas?: (width: number, height: number) => PlatformCanvasLike | null | undefined;
  util?: PlatformUtilNamespaceLike;
}

export interface PlatformNamespace extends PlatformServiceNamespaceLike {
  setAnimate?: (fn: () => unknown) => void;
  util?: PlatformUtilNamespaceLike;
  [k: string]: unknown;
}

export interface BootNamespace {
  start?: () => unknown;
  isReady?: () => boolean;
  setReady?: () => unknown;
  [k: string]: unknown;
}

export interface LifecycleNamespace {
  bootReady?: boolean;
  [k: string]: unknown;
}

export interface SmokeReportLike extends UnknownRecord {
  checks: string[];
  ok?: boolean;
  waited?: boolean;
  ready?: boolean;
  scenario?: string[] | null;
  error?: string | null;
  startedAt?: string;
  durationMs?: number;
}

export interface SmokeChecksStateLike extends UnknownRecord {
  failed?: boolean;
  error?: string;
  report?: SmokeReportLike;
}

export interface SmokeRunOptsLike extends UnknownRecord {
  timeoutMs?: number;
  runScenario?: boolean;
}

export interface SmokeChecksNamespaceLike extends UnknownRecord {
  state?: SmokeChecksStateLike;
  run?: (opts?: SmokeRunOptsLike) => boolean;
  waitAndRun?: (opts?: SmokeRunOptsLike) => boolean;
}

// --- Browser/Storage/UI feedback helper namespaces --------------------------
//
// These are optional surfaces installed by adapters/services.
// Keep them small and permissive; refine gradually as migration progresses.

export type BrowserEventHandlerLike = EventListenerOrEventListenerObject;
export type BrowserEventOptionsLike = boolean | AddEventListenerOptions;
export type BrowserTimeoutHandleLike = ReturnType<typeof setTimeout> | number | null;
export type BrowserTimeoutRunnerLike = (fn: () => unknown, ms: number) => BrowserTimeoutHandleLike;
export type BrowserTimeoutCancelerLike = (id: unknown) => void;
export type ClipboardItemCtorLike = new (items: Record<string, Blob | Promise<Blob>>) => ClipboardItem;

export interface BrowserViewportSizeLike {
  width: number;
  height: number;
}

export interface BrowserDomStateLike extends UnknownRecord {
  [k: string]: unknown;
}

export interface BrowserNamespaceLike extends UnknownRecord {
  confirm?: (message: string) => boolean;
  prompt?: (message: string, def?: unknown) => string | null;
  getWindow?: () => Window | null;
  getDocument?: () => Document | null;
  getNavigator?: () => Navigator | null;
  getLocation?: () => Location | null;
  getUserAgent?: () => string;
  getLocationSearch?: () => string;
  raf?: (cb: FrameRequestCallback) => number;
  caf?: (handle: number) => void;
  now?: () => number;
  delay?: (ms: number) => Promise<boolean>;
  onWindow?: (type: string, handler: BrowserEventHandlerLike, opts?: BrowserEventOptionsLike) => void;
  offWindow?: (type: string, handler: BrowserEventHandlerLike, opts?: BrowserEventOptionsLike) => void;
  onDocument?: (type: string, handler: BrowserEventHandlerLike, opts?: BrowserEventOptionsLike) => void;
  offDocument?: (type: string, handler: BrowserEventHandlerLike, opts?: BrowserEventOptionsLike) => void;
  getDPR?: () => number;
  getViewportSize?: () => BrowserViewportSizeLike;
  getDevicePixelRatio?: () => number;
  getComputedStyle?: (el: Element) => CSSStyleDeclaration | null;
  getSelection?: () => Selection | null;
  clearSelection?: () => void;
  setBodyCursor?: (cursor: string) => void;
  blurActiveElement?: () => void;
  getScrollTop?: () => number;
  scrollTo?: (x: number, y: number) => void;
  setTimeout?: BrowserTimeoutRunnerLike;
  clearTimeout?: BrowserTimeoutCancelerLike;
  getClipboardItemCtor?: () => ClipboardItemCtorLike | null;
  clipboardWrite?: (items: ClipboardItems) => Promise<void>;
  clipboardWriteText?: (text: string) => Promise<void>;
  clipboardReadText?: () => Promise<string>;
  hasDOM?: () => boolean;
  hasRAF?: () => boolean;
  hasClipboard?: () => boolean;
  setDoorStatusCss?: (isOpen: boolean) => void;
  dom?: BrowserDomStateLike;
  [k: string]: unknown;
}

export interface StorageKeysLike extends UnknownRecord {
  SAVED_COLORS?: string;
  SAVED_MODELS?: string;
  AUTOSAVE_LATEST?: string;
  [k: string]: unknown;
}

export interface StorageNamespaceLike extends UnknownRecord {
  KEYS?: StorageKeysLike;
  getString?: (key: string) => string | null | undefined;
  setString?: (key: string, value: string) => unknown;
  remove?: (key: string) => unknown;
  getJSON?: <T>(key: string, defaultValue: T) => T;
  setJSON?: (key: string, value: unknown) => unknown;
  [k: string]: unknown;
}

export type UiFeedbackToastKind = 'success' | 'error' | 'info' | string;
export type UiFeedbackPromptCallback = (value: string | null) => void;
export type UiFeedbackConfirmCallback = () => void;
export type UiFeedbackToastFn = (msg: string, kind?: UiFeedbackToastKind) => void;
export type UiFeedbackPromptFn = (title: string, defaultValue: string, cb: UiFeedbackPromptCallback) => void;
export type UiFeedbackConfirmFn = (
  title: string,
  message: string,
  onYes: UiFeedbackConfirmCallback,
  onNo?: UiFeedbackConfirmCallback | null
) => void;
export type UiFeedbackEditToastFn = (text: string | null, isActive: boolean) => unknown;

export interface UiFeedbackReactLike extends UnknownRecord {
  toast?: UiFeedbackToastFn;
  prompt?: (title: string, defaultValue: string, callback: (value: unknown) => void) => void;
  confirm?: (
    title: string,
    message: string,
    callback: UiFeedbackConfirmCallback,
    onCancel?: UiFeedbackConfirmCallback | null
  ) => void;
}

export interface UiFeedbackModalStateLike extends UnknownRecord {
  mode?: 'prompt' | 'confirm' | null;
  onPrompt?: UiFeedbackPromptCallback | null;
  onConfirm?: UiFeedbackConfirmCallback | null;
  onCancel?: UiFeedbackConfirmCallback | null;
  bindingsInstalled?: boolean;
  bindingsCleanup?: (() => void) | null;
  boundConfirmBtn?: unknown;
  boundCancelBtn?: unknown;
  boundInput?: unknown;
}

export interface UiFeedbackRuntimeNamespaceLike extends UnknownRecord {
  reactHost?: UiFeedbackReactLike | null;
  installed?: boolean;
  modeToastSyncInstalled?: boolean;
  modeToastSyncUnsub?: unknown;
  modalState?: UiFeedbackModalStateLike | null;
  stickyStatusToastEl?: unknown | null;
}

export interface UiFeedbackNamespaceLike extends UnknownRecord {
  toast?: UiFeedbackToastFn;
  showToast?: UiFeedbackToastFn;
  openCustomPrompt?: UiFeedbackPromptFn;
  prompt?: UiFeedbackPromptFn;
  openCustomConfirm?: UiFeedbackConfirmFn;
  confirm?: UiFeedbackConfirmFn;
  updateEditStateToast?: UiFeedbackEditToastFn;
  [k: string]: unknown;
}

export interface UiFeedbackStableLike extends UiFeedbackNamespaceLike {
  toast: UiFeedbackToastFn;
  showToast: UiFeedbackToastFn;
  prompt: UiFeedbackPromptFn;
  openCustomPrompt: UiFeedbackPromptFn;
  confirm: UiFeedbackConfirmFn;
  openCustomConfirm: UiFeedbackConfirmFn;
  updateEditStateToast: UiFeedbackEditToastFn;
}

/** View-related APIs installed by platform (sketch mode etc). */
export interface ViewNamespaceLike extends UnknownRecord {
  getSketchMode: () => boolean;
  setSketchMode: (v: boolean, meta?: ActionMetaLike) => unknown;
  toggleSketchMode?: (meta?: ActionMetaLike) => unknown;
  [k: string]: unknown;
}

/** Scene-related APIs installed by services (lights + visibility). */
export interface SceneViewSyncOptsLike extends UnknownRecord {
  updateShadows?: boolean;
  force?: boolean;
  reason?: string;
}

export interface SceneNamespaceLike extends UnknownRecord {
  initLights?: () => void;
  updateLights?: (updateShadows?: boolean) => void;
  updateSceneMode?: () => void;
  applyViewMode?: (updateShadows?: boolean) => void;
  syncFromStore?: (opts?: SceneViewSyncOptsLike) => void;
  scheduleSyncFromStore?: (opts?: SceneViewSyncOptsLike) => void;
  installStoreSync?: () => boolean;
  disposeStoreSync?: () => void;
  [k: string]: unknown;
}

/** Minimal shadow-map surface used by UI boot + lighting toggles. */
export interface ShadowMapLike extends UnknownRecord {
  // Some runtime/test surfaces only expose the mutable flags we actually need
  // (`autoUpdate` / `needsUpdate`). Keep `enabled`/`type` optional so access
  // helpers can accept partial renderer stubs without dropping shadow refreshes.
  enabled?: boolean;
  type?: number;
  autoUpdate: boolean;
  needsUpdate?: boolean;
}

/** Minimal renderer surface used by lighting/shadows toggles. */
export interface RendererLike extends UnknownRecord {
  domElement: HTMLCanvasElement | HTMLElement;
  setClearColor: (color: number, alpha?: number) => unknown;
  setSize: (width: number, height: number) => unknown;
  setPixelRatio: (value: number) => unknown;
  render: (scene: unknown, camera: unknown) => unknown;
  shadowMap: ShadowMapLike;
}

// --- Render namespace (platform-installed 3D surfaces) --------------------
//
// This is a large cross-layer integration surface (builder + platform + UI).
// Keep it permissive but explicit so CheckJS can validate real usage.

export interface DoorVisualEntryLike extends UnknownRecord {
  id?: string | number;
  partId?: string;
  type?: string;
  group: Object3DLike | null;
  hingeSide: HingeDir | null;
  isOpen?: boolean;
  total?: number;
  index?: number;
  width?: number;
  originalX?: number;
  originalZ?: number;
  outerZ?: number;
  innerZ?: number;
  stackZStep?: number;
}

export interface DrawerVisualEntryLike extends UnknownRecord {
  id?: string | number;
  partId?: string;
  group: Object3DLike | null;
  closed: Vec3Like;
  open: Vec3Like;
  dividerKey?: string;
  [k: string]: unknown;
}

export interface PartObjectEntryLike extends UnknownRecord {
  id: string;
  obj: Object3DLike;
  kind?: string;
}

export interface PartIndexLike extends UnknownRecord {
  all: UnknownRecord;
  doors: UnknownRecord;
  drawers: UnknownRecord;
  parts: UnknownRecord;
  modules: UnknownRecord;
}

export interface RenderCacheLike extends UnknownRecord {
  materialCache?: Map<string, unknown>;
  textureCache?: Map<string, unknown>;
  splitHoverMarker?: Object3DLike | null;
  __wpAutoLightBuildKey?: string | null;
  __wpAutoCameraBuildKey?: string | null;
  [k: string]: unknown;
}

export interface RenderCacheMapsLike extends RenderCacheLike {
  materialCache: Map<string, unknown>;
  textureCache: Map<string, unknown>;
  geometryCache?: Map<string, unknown>;
  edgesGeometryCache?: Map<string, unknown>;
}

export interface RenderMetaLike extends UnknownRecord {
  material?: Map<string, number>;
  texture?: Map<string, number>;
  mirrors?: Object3DLike[];
  [k: string]: unknown;
}

export interface RenderMetaMapsLike extends RenderMetaLike {
  material: Map<string, number>;
  texture: Map<string, number>;
  dimLabel?: Map<string, number>;
  edges?: Map<string, number>;
  geometry?: Map<string, number>;
  mirrors: Object3DLike[];
}

export interface RenderMaterialsLike extends UnknownRecord {
  [k: string]: unknown;
}

export interface RenderMaterialSlotsLike extends RenderMaterialsLike {
  dimLineMaterial?: unknown | null;
  dimLineMaterialCell?: unknown | null;
  outlineLineMaterial?: unknown | null;
  sketchFillMaterial?: unknown | null;
}

export interface RendererCompatDefaultsLike extends UnknownRecord {
  [k: string]: unknown;
}

export interface RenderAutoHideFloorCacheLike extends UnknownRecord {
  floor: unknown | null;
  roomKey: unknown | null;
  sceneKey: unknown | null;
}

export interface RenderCoreSurfaceLike extends UnknownRecord {
  renderer: RendererLike;
  scene: Object3DLike;
}

export interface RenderCameraControlsLike extends UnknownRecord {
  camera: CameraLike;
  controls: ControlsLike;
}

export interface RenderViewportSurfaceLike extends UnknownRecord {
  renderer: RendererLike | null;
  scene: Object3DLike | null;
  camera: CameraLike | null;
  controls: ControlsLike | null;
  wardrobeGroup: Object3DLike | null;
  roomGroup: Object3DLike | null;
}

export interface RenderContextLike extends RenderViewportSurfaceLike {
  container?: HTMLElement | null;
}

export interface InitializedViewportSurfaceLike extends RenderViewportSurfaceLike {
  renderer: RendererLike;
  scene: Object3DLike;
  camera: CameraLike;
  controls: ControlsLike;
  wardrobeGroup: Object3DLike;
  roomGroup: Object3DLike | null;
}

export interface RenderNamespaceLike extends UnknownRecord {
  // Core three.js runtime surfaces. These exist on the render namespace but may be null early in boot.
  renderer: RendererLike | null;
  scene: Object3DLike | null;
  camera: CameraLike | null;
  controls: ControlsLike | null;

  // Root groups for built wardrobe / room. Always present (initialized to null), may be replaced during rebuilds.
  wardrobeGroup: Object3DLike | null;
  roomGroup: Object3DLike | null;

  // Stable arrays (never reassign): used by tools + picking.
  doorsArray: DoorVisualEntryLike[];
  drawersArray: DrawerVisualEntryLike[];
  moduleHitBoxes: Object3DLike[];
  _partObjects: PartObjectEntryLike[];

  // Index built by builder/registry.finalize.
  partIndex?: PartIndexLike;

  // Render caches + eviction metadata.
  cache?: RenderCacheLike;
  meta?: RenderMetaLike;
  materials?: RenderMaterialsLike;

  // Optional render targets / lights / loop state.
  mirrorRenderTarget?: WebGLRenderTargetLike | null;
  mirrorCubeCamera?: Object3DLike | null;
  ambLightObj?: Object3DLike | null;
  dirLightObj?: Object3DLike | null;
  animate?: (() => void) | null;
  loopRaf?: number;
  __lastFrameTs?: number;
  __rafScheduledAt?: number;
  __mirrorHideScratch?: Object3DLike[];
  __wpRendererCompatDefaults?: RendererCompatDefaultsLike | null;

  // Render-loop / mirror runtime metadata. Seeded canonically so runtime/services do not need
  // to guess whether a slot exists yet during boot or after cleanup paths.
  __mirrorLastUpdateMs?: number;
  __mirrorDirty?: boolean;
  __mirrorPresenceKnown?: boolean;
  __mirrorPresenceHasMirror?: boolean;
  __mirrorPresenceCheckedAtMs?: number;
  __mirrorTrackedPruneAtMs?: number;
  __mirrorMotionActive?: boolean;
  __mirrorMotionUntilMs?: number;
  __mirrorMotionSnap?: UnknownRecord | null;
  __splitHoverPickablesDirty?: boolean;
  __wpAutoHideFloorRef?: unknown | null;
  __wpAutoHideFloorRoomKey?: unknown | null;
  __wpAutoHideFloorSceneKey?: unknown | null;
  __wpAutoHideFloorTick?: number;
  __wpAutoHideFloorVecFloor?: UnknownRecord | null;
  __wpAutoHideFloorVecCam?: UnknownRecord | null;
  cacheClock?: number;
  lastPruneAt?: number;

  [k: string]: unknown;
}

export interface LayerFacadeLike extends Namespace {
  __installed?: boolean;
  kind?: string;
  api?: Namespace;
  install?: Namespace;
}

export interface CoreLayerFacadeLike extends LayerFacadeLike {
  kind?: 'core';
}

export interface EngineLayerFacadeLike extends LayerFacadeLike {
  kind?: 'engine';
}

export interface AppLayersRootLike extends Namespace {
  core?: CoreLayerFacadeLike;
  engine?: EngineLayerFacadeLike;
}

export interface AppContainer {
  // Explicit DI surface.
  deps: Namespace & Partial<Deps>;

  // Public namespaces.
  config: Namespace;
  flags: Namespace;
  platform: Namespace & PlatformNamespace;
  actions?: Namespace & ActionsNamespaceLike & ActionsDomainsLike;
  maps?: Namespace & MapsNamespaceLike;
  kernel?: Namespace & KernelNamespaceLike;
  util?: Namespace & UtilNamespaceLike;
  boot?: Namespace & BootNamespace;
  lifecycle?: Namespace & LifecycleNamespace;
  render: Namespace & RenderNamespaceLike;
  ui: Namespace;
  layers?: AppLayersRootLike;

  // Platform-installed helper namespaces.
  services: Namespace & ServicesNamespace;
  // Core state surfaces.
  state: Namespace;
  registries: Namespace & RegistriesNamespaceLike;

  // Builder-related namespaces.
  builder: Namespace & BuilderServiceLike;
  builderDeps: Namespace & BuilderDepsRootLike;
  builderModules: Namespace & BuilderModulesSurfaceLike;
  builderContents: Namespace & BuilderContentsSurfaceLike;

  // Optional state-store registry namespace (present in app container).
  stores?: Namespace;

  // Common runtime surfaces (platform installed).
  store?: RootStoreLike;

  // Optional runtime diagnostics surfaces.
  smokeChecks?: Namespace & SmokeChecksNamespaceLike;

  // Optional adapter/service surfaces.
  browser?: Namespace & BrowserNamespaceLike;
  storage?: Namespace & StorageNamespaceLike;

  // Project namespace is used by some services for capture/export flows.
  project?: Namespace;

  // Optional disposal hooks registered during boot.
  disposables: unknown[];

  // Allow future surfaces without churn.
  [k: string]: unknown;
}
// Re-export shared three-like surfaces for convenience.
export type { Object3DLike, CameraLike, ControlsLike, WebGLRenderTargetLike } from './three_like';
