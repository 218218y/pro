import type { AppContainer } from '../../../../types/app.js';
import type { UnknownCallable } from '../../../../types/common.js';
import type {
  CameraPoseLike,
  CameraPvInfoLike,
  ExportRefPointsLike,
  Vec3Like,
  ViewportRuntimeApplySketchModeOptions,
} from '../../../../types/build.js';
import type { DoorsSetOpenOptionsLike } from '../../../../types/runtime.js';
import type { NotesExportTransformLike } from './export_canvas_engine.js';
import type {
  CameraControlsPairLike,
  NotesExportTransformArgsLike,
  RefTargetLike,
  UnknownRecord,
} from './export_order_pdf_contracts_shared.js';

type CallableLike = UnknownCallable;

export type ExportOrderPdfDeps = {
  asRecord: (v: unknown) => UnknownRecord | null;
  isRecord: (v: unknown) => v is UnknownRecord;
  asObject: (v: unknown) => UnknownRecord;
  getProp: (obj: unknown, key: string) => unknown;
  getCfg: (app: AppContainer) => unknown;
  getUi: (app: AppContainer) => unknown;
  getModelById: (app: AppContainer, id: string) => unknown;
  getFn: <T extends CallableLike = CallableLike>(obj: unknown, key: string) => T | null;
  asArray: (v: unknown) => unknown[];
  isObjectLike: (v: unknown) => v is object | CallableLike;
  getExportLogoImage: (app: AppContainer, includeLogo: boolean) => HTMLImageElement | null;
  drawExportLogo: (
    app: AppContainer,
    ctx: CanvasRenderingContext2D,
    width: number,
    logo: HTMLImageElement,
    source: string,
    logoY?: number
  ) => unknown;
  _setDoorsOpenForExport: (app: AppContainer, isOpen: boolean) => void;
  _setBodyDoorStatusForNotes: (app: AppContainer, isOpen: boolean) => void;
  _renderAllNotesToCanvas: (
    app: AppContainer,
    ctx: CanvasRenderingContext2D,
    originalWidth: number,
    originalHeight: number,
    titleOffset: number,
    opts: NotesExportTransformLike | null | undefined
  ) => Promise<unknown>;
  restoreViewportCameraPose: (app: AppContainer, pose: CameraPoseLike | null | undefined) => unknown;
  _exportReportNonFatalNoApp: (op: string, err: unknown, dedupeMs?: number) => void;
  _exportReportThrottled: (
    app: AppContainer,
    op: string,
    err: unknown,
    extra?: { throttleMs?: number; failFast?: boolean } | null | undefined
  ) => void;
  _getProjectName: (app: AppContainer) => string;
  _requireApp: (app: unknown) => AppContainer;
  _toast: (app: AppContainer, msg: string, kind?: string) => void;
  _applyExportWallColorOverride: (app: AppContainer) => (() => void) | void;
  _getRendererSize: (renderer: { domElement: unknown }) => { width: number; height: number };
  _isNotesEnabled: (app: AppContainer) => boolean;
  _snapCameraToFrontPreset: (app: AppContainer) => unknown;
  _renderSceneForExport: (app: AppContainer, renderer: unknown, scene: unknown, camera: unknown) => unknown;
  _cloneRefTargetLike: (target: unknown) => RefTargetLike | null;
  _computeNotesRefZ: (app: AppContainer, camera: unknown, refTarget: RefTargetLike | null) => number;
  _planePointFromRefTarget: (refTarget: RefTargetLike | null, z: number) => Vec3Like | null;
  _captureExportRefPoints: (
    app: AppContainer,
    containerRect: DOMRectReadOnly,
    width: number,
    height: number,
    refTarget?: RefTargetLike | null
  ) => ExportRefPointsLike | null;
  _captureCameraPvInfo: (app: AppContainer, camera: unknown) => CameraPvInfoLike;
  _buildNotesExportTransform: (opts: NotesExportTransformArgsLike) => NotesExportTransformLike | null;
  autoZoomCamera: (app: AppContainer) => unknown;
  scaleViewportCameraDistance: (app: AppContainer, factor: number) => unknown;
  getCameraControlsOrNull: (app: AppContainer) => CameraControlsPairLike | null;
  getCameraOrNull: (app: AppContainer) => unknown;
  _getRenderCore: (app: AppContainer) => { renderer: unknown; scene: unknown } | null;
  _createDomCanvas: (app: AppContainer, width: number, height: number) => HTMLCanvasElement;
  _getRendererCanvasSource: (renderer: { domElement: unknown }) => HTMLCanvasElement;
  _reportExportError: (
    app: AppContainer,
    op: string,
    err: unknown,
    extra?: UnknownRecord | null | undefined
  ) => void;
  _downloadBlob: (app: AppContainer, blob: Blob, fileName: string) => void;
  _guard: (app: AppContainer, op: string, fn: () => unknown) => unknown;
  hasDom: (app: AppContainer) => boolean;
  get$: (app: AppContainer) => (id: string) => HTMLElement | null;
  getDoorsOpen: (app: AppContainer) => boolean;
  setDoorsOpen: (app: AppContainer, open: boolean, opts?: DoorsSetOpenOptionsLike) => unknown;
  readRuntimeScalarOrDefaultFromApp: (app: AppContainer, key: 'sketchMode', fallback: boolean) => boolean;
  applyViewportSketchMode: (
    app: AppContainer,
    next: boolean,
    opts?: ViewportRuntimeApplySketchModeOptions
  ) => unknown;
  getWindowMaybe: (app: AppContainer) => (Window & { fetch?: typeof fetch }) | null;
  readModulesConfigurationListFromConfigSnapshot: (cfg: unknown, key?: string) => unknown[];
};
