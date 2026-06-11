import type {
  AppContainer,
  ActionMetaLike,
  CameraLike,
  CameraPoseLike,
  CameraPvInfoLike,
  ControlsLike,
  DoorsSetOpenOptionsLike,
  ExportRefPointsLike,
  Object3DLike,
  RendererLike,
  Vec3Like,
  ViewportRuntimeApplySketchModeOptions,
} from '../../../../types';
import type { NotesExportTransformLike } from './export_canvas_engine.js';

export type RenderCoreLike = { renderer: RendererLike; scene: Object3DLike };
export type CameraControlsLike = { camera: CameraLike; controls: ControlsLike };

export type ExportCanvasWorkflowDeps = {
  _requireApp: (app: AppContainer) => AppContainer;
  hasDom: (app: AppContainer) => boolean;
  get$: (app: AppContainer) => (id: string) => HTMLElement | null;
  getDoorsOpen: (app: AppContainer) => boolean;
  setDoorsOpen: (
    app: AppContainer,
    open: boolean,
    meta?: ActionMetaLike | DoorsSetOpenOptionsLike
  ) => unknown;
  getCameraControlsOrNull: (app: AppContainer) => CameraControlsLike | null;
  getCameraOrNull: (app: AppContainer) => CameraLike | null;
  _getRenderCore: (app: AppContainer) => RenderCoreLike | null;
  _applyExportWallColorOverride: (app: AppContainer) => () => void;
  _getRendererSize: (renderer: RendererLike) => { width: number; height: number };
  _isNotesEnabled: (app: AppContainer) => boolean;
  _renderAllNotesToCanvas: (
    app: AppContainer,
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    titleHeight: number,
    transform: NotesExportTransformLike | null | undefined
  ) => Promise<unknown>;
  _getProjectName: (app: AppContainer) => string;
  _renderSceneForExport: (
    app: AppContainer,
    renderer: RendererLike,
    scene: Object3DLike,
    camera: CameraLike
  ) => void;
  _getRendererCanvasSource: (renderer: RendererLike) => CanvasImageSource;
  _reportExportError: (app: AppContainer, op: string, err: unknown, extra?: Record<string, unknown>) => void;
  _toast: (app: AppContainer, msg: string, kind?: string) => void;
  shouldFailFast: (app: AppContainer) => boolean;
  getExportLogoImage: (app: AppContainer, includeLogo: boolean) => HTMLImageElement | null;
  drawExportLogo: (
    app: AppContainer,
    ctx: CanvasRenderingContext2D,
    width: number,
    img: HTMLImageElement,
    source: string,
    yOffset?: number
  ) => void;
  _createDomCanvas: (app: AppContainer, width: number, height: number) => HTMLCanvasElement;
  _handleCanvasExport: (
    app: AppContainer,
    canvas: HTMLCanvasElement,
    filename: string,
    opts: Record<string, unknown>
  ) => void;
  triggerCanvasDownloadViaBrowser: (
    app: AppContainer,
    canvas: HTMLCanvasElement,
    filename: string
  ) => boolean;
  _setDoorsOpenForExport: (app: AppContainer, open: boolean) => void;
  _setBodyDoorStatusForNotes: (app: AppContainer, open: boolean) => void;
  _confirmOrProceed: (app: AppContainer, title: string, message: string) => Promise<boolean> | boolean;
  autoZoomCamera: (app: AppContainer) => void;
  _snapCameraToFrontPreset: (app: AppContainer) => void;
  scaleViewportCameraDistance: (app: AppContainer, factor: number) => void;
  _captureExportRefPoints: (
    app: AppContainer,
    rect: DOMRectReadOnly,
    width: number,
    height: number,
    target: Partial<Vec3Like> | null
  ) => ExportRefPointsLike | null;
  _captureCameraPvInfo: (app: AppContainer, camera: CameraLike) => CameraPvInfoLike;
  _buildNotesExportTransform: (input: {
    preRef: ExportRefPointsLike | null;
    postRef: ExportRefPointsLike | null;
    prePvInv: number[] | null;
    postPv: number[] | null;
    preCamPos: Vec3Like | null;
    planePoint?: Vec3Like | null;
    planeNormal?: Vec3Like | null;
  }) => NotesExportTransformLike | null;
  _cloneRefTargetLike: (target: unknown) => Partial<Vec3Like> | null;
  _computeNotesRefZ: (app: AppContainer, camera: CameraLike, target: Partial<Vec3Like> | null) => number;
  _planePointFromRefTarget: (target: Partial<Vec3Like> | null, z: number) => Vec3Like | null;
  restoreViewportCameraPose: (app: AppContainer, pose: CameraPoseLike) => void;
  _exportReportThrottled: (
    app: AppContainer,
    op: string,
    err: unknown,
    opts?: Record<string, unknown>
  ) => void;
  _guard: (app: AppContainer, label: string, fn: () => void) => void;
  readRuntimeScalarOrDefaultFromApp: (app: AppContainer, key: 'sketchMode', fallback?: boolean) => boolean;
  applyViewportSketchMode: (
    app: AppContainer,
    next: boolean,
    opts?: ViewportRuntimeApplySketchModeOptions
  ) => void;
};

export type ExportFrontNotesTransformCapture = {
  preRef: ExportRefPointsLike | null;
  postRef: ExportRefPointsLike | null;
  notesTransform: NotesExportTransformLike | null;
};
