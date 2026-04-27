// Builder/services shared types.
// Split from ./build.ts into domain-focused seams to keep the public type surface stable while reducing monolith churn.

import type { ToolsNamespaceLike } from './tools';
import type { CloudSyncServiceStateLike } from './cloud_sync';
import type { ModelsServiceLike } from './models';
import type { UnknownRecord } from './common';
import type { StateKernelLike } from './state';
import type { MaterialLike } from './three';
import type {
  AppContainer,
  SceneNamespaceLike,
  StorageNamespaceLike,
  PlatformServiceNamespaceLike,
  UiFeedbackNamespaceLike,
  UiFeedbackRuntimeNamespaceLike,
} from './app';
import type { ModeActionOptsLike, ModeTransitionOptsLike } from './kernel';
import type {
  ActionMetaLike,
  HistoryPushRequestLike,
  HistoryStatusLike,
  HistoryStatusListener,
} from './kernel';
import type { NotesNamespaceLike, UiNotesNamespaceLike } from './notes';
import type {
  DoorsServiceAccessLike,
  DrawerServiceAccessLike,
  WardrobeProDebugCanvasHitInfo,
} from './runtime';
import type { BuilderServiceLike, RoomDesignServiceLike } from './build_builder';
import type { ProjectDataLike, ProjectDataEnvelopeLike, ProjectLoadOpts } from './build_state';
import type { Vec3Like } from './build_ops';

export interface HistorySystemLike {
  undoStack?: string[];
  redoStack?: string[];
  maxSteps?: number;
  lastSavedJSON?: string | null;
  isPaused?: boolean;
  _lastCoalesceKey?: string;
  _lastCoalesceAt?: number;
  __didInit?: boolean;
  pause?: () => void;
  resume?: () => void;
  flushPendingPush?: (opts?: HistoryPushRequestLike) => void;
  schedulePush?: (meta?: ActionMetaLike) => void;
  resumeAfterRestore?: (timeoutMs?: unknown) => void;
  getCurrentSnapshot?: () => string;
  pushState?: (opts?: HistoryPushRequestLike) => void;
  undo?: () => void;
  redo?: () => void;
  applyState?: (jsonState: unknown) => void;
  getStatus?: () => HistoryStatusLike;
  updateButtons?: (meta?: ActionMetaLike) => void;
  resetBaseline?: (meta?: ActionMetaLike) => void;
  ensureBaseline?: () => void;
  init?: () => void;
  onStatusChange?: HistoryStatusListener;
  subscribeStatus?: (listener: HistoryStatusListener) => () => void;
  [k: string]: unknown;
}

export interface HistoryServiceLike {
  system?: HistorySystemLike;
  [k: string]: unknown;
}

export interface ErrorsContextLike extends UnknownRecord {
  where?: unknown;
  op?: unknown;
  tag?: unknown;
  fatal?: unknown;
}

export type ErrorsContextInputLike = string | ErrorsContextLike | null | undefined;

export interface ErrorsInfoLike extends UnknownRecord {
  name: string;
  message: string;
  stack: string;
}

export interface ErrorsHistoryEntryLike extends UnknownRecord {
  ts: string;
  kind: string;
  ctx: ErrorsContextLike;
  err: ErrorsInfoLike;
}

export interface ErrorsDebugSnapshotLike extends UnknownRecord {
  ts: string;
  where: string;
  fatal: boolean;
  error: ErrorsInfoLike;
  buildTags: UnknownRecord;
  flags: UnknownRecord;
  config: UnknownRecord;
  configStatic?: UnknownRecord;
  userAgent: string;
  mode: string;
  state: unknown;
  history?: ErrorsHistoryEntryLike[];
}

export interface ErrorsServiceLike extends UnknownRecord {
  install?: () => void;
  report?: (err: unknown, ctx?: ErrorsContextInputLike) => void;
  fatal?: (err: unknown, ctx?: ErrorsContextInputLike) => void;
  getHistory?: () => ErrorsHistoryEntryLike[];
  createDebugSnapshot?: (err: unknown, ctx?: ErrorsContextInputLike) => ErrorsDebugSnapshotLike;
}

export interface ErrorsRuntimeServiceLike extends UnknownRecord {
  fatalShown?: boolean;
  windowEventsCleanup?: (() => void) | null;
}

export interface ConfigCompoundsSeedOptionsLike extends UnknownRecord {
  maxAttempts?: number;
  retryDelayMs?: number;
}

export interface ConfigCompoundsServiceLike extends UnknownRecord {
  seed?: (opts?: ConfigCompoundsSeedOptionsLike) => Promise<boolean>;
  isSeeded?: () => boolean;
  options?: ConfigCompoundsSeedOptionsLike;
}

export type BootStartFn = () => unknown;

export interface AppStartServiceLike extends UnknownRecord {
  start?: BootStartFn;
}

export interface UiBootServiceLike extends UnknownRecord {
  bootMain?: BootStartFn;
  start?: BootStartFn;
}

export interface UiBootRuntimeServiceLike extends UnknownRecord {
  didInit?: boolean;
  booting?: boolean;
  bootBuildScheduled?: boolean;
  bootBuildArgs?: unknown;
}

export type CameraMoveFn = (view: string) => unknown;

export interface CameraServiceLike extends UnknownRecord {
  moveTo?: CameraMoveFn;
}

export interface AutosaveSnapshotLike extends UnknownRecord {
  version?: string;
  timestamp?: number;
  dateString?: string;
  orderPdfEditorDraft?: unknown;
  orderPdfEditorZoom?: number;
}

export interface AutosaveServiceLike extends UnknownRecord {
  allow?: boolean;
  schedule?: () => void;
  cancelPending?: () => boolean;
  flushPending?: () => boolean;
  forceSaveNow?: () => boolean;
}

export type CanvasPickingNdcHandler = (x: number, y: number) => unknown;

export interface CanvasPickingRuntimeLike extends UnknownRecord {
  [k: string]: unknown;
}

export interface CanvasPickingServiceLike extends UnknownRecord {
  handleClickNDC?: CanvasPickingNdcHandler;
  handleHoverNDC?: CanvasPickingNdcHandler;
  inspectClickNDC?: (x: number, y: number) => WardrobeProDebugCanvasHitInfo | null;
  runtime?: CanvasPickingRuntimeLike;
}

export interface EditStateServiceLike extends UnknownRecord {
  resetAllEditModes?: () => void;
}

export interface ProjectCaptureServiceLike extends UnknownRecord {
  capture?: (scope?: unknown) => ProjectDataLike | UnknownRecord | null;
}

export interface ViewportRuntimeApplySketchModeOptions extends UnknownRecord {
  source?: string;
  rebuild?: boolean;
  updateShadows?: boolean;
  forceSync?: boolean;
  reason?: string;
}

export type ExportCanvasAction =
  | 'snapshot'
  | 'save'
  | 'dual'
  | 'openclosed'
  | 'rendersketch'
  | 'sketch'
  | 'autozoom'
  | 'clipboard'
  | 'copy';

export interface ExportCanvasOptionsLike extends UnknownRecord {
  action?: ExportCanvasAction | string;
  mode?: ExportCanvasAction | string;
  kind?: ExportCanvasAction | string;
}

export interface CameraPoseLike {
  position?: Vec3Like | null;
  target?: Vec3Like | null;
}

export interface ExportRefPointLike {
  x: number;
  y: number;
}

export interface ExportRefPointsLike {
  p0: ExportRefPointLike;
  p1: ExportRefPointLike;
  p2: ExportRefPointLike;
}

export interface CameraPvInfoLike extends UnknownRecord {
  pvInv: number[] | null;
  pv: number[] | null;
  camPos: Vec3Like | null;
}

export type OrderPdfSketchAnnotationPageKeyLike = 'renderSketch' | 'openClosed';

export interface OrderPdfSketchPointLike extends UnknownRecord {
  x?: number;
  y?: number;
}

export interface OrderPdfSketchStrokeLike extends UnknownRecord {
  id?: string;
  createdAt?: number;
  tool?: string;
  color?: string;
  width?: number;
  points?: OrderPdfSketchPointLike[];
}

export interface OrderPdfSketchTextBoxLike extends UnknownRecord {
  id?: string;
  createdAt?: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  color?: string;
  fontSize?: number;
  bold?: boolean;
  text?: string;
}

export interface OrderPdfSketchAnnotationLayerLike extends UnknownRecord {
  strokes?: OrderPdfSketchStrokeLike[];
  textBoxes?: OrderPdfSketchTextBoxLike[];
}

export type OrderPdfSketchAnnotationsLike = Partial<
  Record<OrderPdfSketchAnnotationPageKeyLike, OrderPdfSketchAnnotationLayerLike>
>;

export interface OrderPdfDraftLike extends UnknownRecord {
  projectName?: string;
  orderNumber?: string;
  orderDate?: string;
  deliveryAddress?: string;
  phone?: string;
  mobile?: string;
  autoDetails?: string;
  manualDetails?: string;
  detailsFull?: boolean;
  detailsTouched?: boolean;
  manualEnabled?: boolean;
  includeRenderSketch?: boolean;
  includeOpenClosed?: boolean;
  notes?: string;
  sketchAnnotations?: OrderPdfSketchAnnotationsLike;
}

export interface OrderPdfBuildResultLike extends UnknownRecord {
  blob: Blob;
  fileName: string;
  projectName: string;
}

export interface ExportCanvasWorkflowOpsLike extends UnknownRecord {
  copyToClipboard: (app: AppContainer) => Promise<void>;
  exportDualImage: (app: AppContainer) => Promise<void>;
  exportRenderAndSketch: (app: AppContainer) => Promise<void>;
  takeSnapshot: (app: AppContainer) => Promise<void>;
}

export interface ExportOrderPdfOpsLike extends UnknownRecord {
  getOrderPdfDraft: (app: AppContainer) => OrderPdfDraftLike;
  buildOrderPdfInteractiveBlobFromDraft: (
    app: AppContainer,
    draft: OrderPdfDraftLike
  ) => Promise<OrderPdfBuildResultLike | null>;
  exportOrderPdfInteractiveFromDraft: (app: AppContainer, draft: unknown) => Promise<void>;
}

export interface ViewportRuntimeServiceLike extends UnknownRecord {
  setOrbitControlsEnabled?: (enabled: boolean) => boolean;
  applySketchMode?: (sketchMode: boolean, opts?: ViewportRuntimeApplySketchModeOptions) => boolean;
  initializeSceneSync?: () => boolean;
}

export interface ProjectIoRuntimeLike extends UnknownRecord {
  restoreGen?: number;
}

export interface ProjectIoLoadResultLike extends UnknownRecord {
  ok: boolean;
  restoreGen?: number;
  pending?: boolean;
  reason?: string;
  message?: string;
}

export interface ProjectExportResultLike extends UnknownRecord {
  projectData?: ProjectDataLike;
  jsonStr: string;
  defaultBaseName?: string | null;
  projectName?: string;
  meta?: UnknownRecord | null;
}

export type ProjectLoadInputLike = ProjectDataLike | ProjectDataEnvelopeLike | UnknownRecord | object;

export interface ProjectIoServiceLike extends UnknownRecord {
  exportCurrentProject?: (meta?: UnknownRecord) => ProjectExportResultLike | null | undefined;
  handleFileLoad?: (eventOrFile: unknown) => ProjectIoLoadResultLike | unknown;
  loadProjectData?: (data: ProjectLoadInputLike, opts?: ProjectLoadOpts) => ProjectIoLoadResultLike | unknown;
  restoreLastSession?: () => ProjectIoLoadResultLike | unknown;
  buildDefaultProjectData?: () => ProjectDataLike;
  runtime?: ProjectIoRuntimeLike;
  [k: string]: unknown;
}

export interface CommandsServiceLike extends UnknownRecord {
  rebuildWardrobe?: () => unknown;
  rebuildWardrobeDebounced?: () => unknown;
  cleanGroup?: (group: unknown) => unknown;
}

export interface DisposableTextureLike extends UnknownRecord {
  dispose?: () => void;
}

export interface TexturesCacheOptionsLike extends UnknownRecord {
  disposePrev?: boolean;
}

export interface TexturesCacheServiceLike extends UnknownRecord {
  customUploadedTexture?: DisposableTextureLike | null;
  getCustomUploadedTexture?: () => DisposableTextureLike | null;
  setCustomUploadedTexture?: (
    tex: DisposableTextureLike | null,
    opts?: TexturesCacheOptionsLike
  ) => DisposableTextureLike | null;
}

export interface BuildReactionsServiceLike extends UnknownRecord {
  __esm_v1?: true;
  afterBuild?: (ok?: boolean) => void;
}

export interface NotesExportVec3Like extends UnknownRecord {
  x: number;
  y: number;
  z: number;
}

export interface NotesExportTransformLike extends UnknownRecord {
  kind?: 'affine' | 'plane';
  sx?: number;
  sy?: number;
  dx?: number;
  dy?: number;
  a?: number;
  b?: number;
  c?: number;
  d?: number;
  e?: number;
  f?: number;
  prePVInv?: number[];
  postPV?: number[];
  preCamPos?: NotesExportVec3Like;
  planePoint?: NotesExportVec3Like;
  planeNormal?: NotesExportVec3Like;
}

export interface UiNotesExportServiceLike extends UnknownRecord {
  shouldIncludeNotesInExport?: () => boolean;
  renderAllNotesToCanvas?: (
    ctx: CanvasRenderingContext2D | null | undefined,
    w: number,
    h: number,
    titleOffset?: number,
    exportTransform?: NotesExportTransformLike | null
  ) => Promise<boolean | null>;
}

export interface UiNotesExportRuntimeServiceLike extends UnknownRecord {
  installed?: boolean;
  exportTransform?: NotesExportTransformLike | null;
}

export interface UiModesControllerLike extends UnknownRecord {
  apply?: () => void;
  unsub?: (() => void) | { unsubscribe?: () => void } | null;
  getPrimaryMode?: () => string;
  getPrimaryModeOpts?: () => ModeActionOptsLike;
  isModeActive?: (mode: string) => boolean;
  enterPrimaryMode?: (mode?: string, opts?: ModeTransitionOptsLike) => void;
  exitPrimaryMode?: (expectedMode?: string, opts?: ModeTransitionOptsLike) => void;
  togglePrimaryMode?: (mode: string, opts?: ModeActionOptsLike) => void;
}

export interface UiPrimaryModeEffectsStoreLike extends UnknownRecord {
  apply?: (() => void) | null;
  unsub?: (() => void) | { unsubscribe?: () => void } | null;
  render?: ((mode?: string | null, modes?: UnknownRecord | null) => void) | null;
}

export interface UiModesRuntimeServiceLike extends UnknownRecord {
  controller?: UiModesControllerLike | null;
  primaryModeEffects?: UiPrimaryModeEffectsStoreLike | null;
}

export interface ServiceInstallStateLike extends UnknownRecord {
  appStartInstalled?: boolean;
  appStartStarted?: boolean;
  cameraInstalled?: boolean;
  autosaveInstalled?: boolean;
  viewportInstalled?: boolean;
  configCompoundsInstalled?: boolean;
  errorsInstalled?: boolean;
  uiBootMainInstalled?: boolean;
  bootInstalled?: boolean;
  platformInstalled?: boolean;
  smokeChecksInstalled?: boolean;
  browserUiOpsInstalled?: boolean;
  lifecycleVisibilityInstalled?: boolean;
}

export interface PlatformBootRuntimeServiceLike extends UnknownRecord {
  initDone?: boolean;
  initRunning?: boolean;
}

export interface BuildInfoServiceLike extends UnknownRecord {
  tags?: UnknownRecord & {
    builderCore?: unknown;
    projectIO?: unknown;
    kernel?: unknown;
    platform?: unknown;
    core?: unknown;
  };
  slidingDoorsFixTag?: unknown;
}

export interface DoorTrimVisualsServiceLike extends UnknownRecord {
  materialCache?: Record<string, MaterialLike | null | undefined> | null;
}

export interface RuntimeCacheServiceLike extends UnknownRecord {
  stackSplitLowerTopY?: number | null;
  internalGridMap?: UnknownRecord;
  internalGridMapSplitBottom?: UnknownRecord;
}

export interface ServicesNamespace {
  // Core services referenced across layers.
  builder?: BuilderServiceLike;
  buildReactions?: BuildReactionsServiceLike;
  history?: HistoryServiceLike;
  errors?: ErrorsServiceLike;
  errorsRuntime?: ErrorsRuntimeServiceLike;
  appStart?: AppStartServiceLike;
  uiBoot?: UiBootServiceLike;
  uiBootRuntime?: UiBootRuntimeServiceLike;
  storage?: StorageNamespaceLike;
  autosave?: AutosaveServiceLike;
  project?: ProjectCaptureServiceLike;
  notes?: NotesNamespaceLike;
  uiNotes?: UiNotesNamespaceLike;
  uiNotesExport?: UiNotesExportServiceLike;
  uiNotesExportRuntime?: UiNotesExportRuntimeServiceLike;
  uiModesRuntime?: UiModesRuntimeServiceLike;
  serviceInstallState?: ServiceInstallStateLike;
  platformBootRuntime?: PlatformBootRuntimeServiceLike;
  buildInfo?: BuildInfoServiceLike;

  // Common installed services.
  stateKernel?: StateKernelLike;
  camera?: CameraServiceLike;
  canvasPicking?: CanvasPickingServiceLike;
  commands?: CommandsServiceLike;
  cloudSync?: CloudSyncServiceStateLike;
  configCompounds?: ConfigCompoundsServiceLike;
  doors?: DoorsServiceAccessLike;
  drawer?: DrawerServiceAccessLike;
  editState?: EditStateServiceLike;
  models?: ModelsServiceLike;
  platform?: PlatformServiceNamespaceLike;
  projectIO?: ProjectIoServiceLike;
  sceneView?: SceneNamespaceLike;
  viewport?: ViewportRuntimeServiceLike;
  doorTrimVisuals?: DoorTrimVisualsServiceLike;
  roomDesign?: RoomDesignServiceLike;
  runtimeCache?: RuntimeCacheServiceLike;
  textures?: UnknownRecord;
  texturesCache?: TexturesCacheServiceLike;
  ui?: UnknownRecord;

  // Canonical ESM-only helpers. Root legacy aliases were removed; use App.services only.
  tools?: ToolsNamespaceLike;
  uiFeedback?: UiFeedbackNamespaceLike;
  uiFeedbackRuntime?: UiFeedbackRuntimeNamespaceLike;

  // Allow future services without churn.
  [k: string]: unknown;
}

// --- Project I/O data shapes (minimal; evolve gradually) --------------------
