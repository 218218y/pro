// WardrobePro — Export / Copy / Snapshot owner (Native ESM)

import { readModulesConfigurationListFromConfigSnapshot } from '../features/modules_configuration/modules_config_api.js';
import { createExportOrderPdfOps } from './export/export_order_pdf_ops.js';
import { createExportCanvasWorkflowOps } from './export/export_canvas_workflows.js';
import {
  isRecord,
  asRecord,
  isObjectLike,
  asObject,
  getProp,
  getFn,
  asArray,
  getExportLogoImage,
  drawExportLogo,
  _guard,
  _reportExportError,
  _exportReportThrottled,
  _exportReportNonFatalNoApp,
  _applyExportWallColorOverride,
  _renderSceneForExport,
  _getRendererCanvasSource,
  _getRendererSize,
  _requireApp,
  _getRenderCore,
  getCameraOrNull,
  getCameraControlsOrNull,
  _snapCameraToFrontPreset,
  _toast,
  _confirmOrProceed,
  _cloneRefTargetLike,
  _planePointFromRefTarget,
  _computeNotesRefZ,
  _getProjectName,
  _isNotesEnabled,
  _renderAllNotesToCanvas,
  _setDoorsOpenForExport,
  _setBodyDoorStatusForNotes,
  autoZoomCamera,
  _downloadBlob,
  _createDomCanvas,
  _handleCanvasExport,
  _captureExportRefPoints,
  _captureCameraPvInfo,
  _buildNotesExportTransform,
  type RefTargetLike,
} from './export/export_canvas_shared.js';
import { getCfg, getUi } from './store_access.js';
import {
  getModelById,
  hasDom,
  get$,
  getDoorsOpen,
  setDoorsOpen,
  restoreViewportCameraPose,
  scaleViewportCameraDistance,
  getWindowMaybe,
  readRuntimeScalarOrDefaultFromApp,
  applyViewportSketchMode,
  shouldFailFast,
  triggerCanvasDownloadViaBrowser,
} from '../services/api.js';

import type { AppContainer } from '../../../types/app.js';
import type {
  ExportCanvasOptionsLike,
  ExportCanvasWorkflowOpsLike,
  ExportOrderPdfOpsLike,
  ViewportRuntimeApplySketchModeOptions,
} from '../../../types/build.js';
import type { DoorsSetOpenOptionsLike } from '../../../types/runtime.js';

type ExportCanvasOptions = ExportCanvasOptionsLike;

const __workflowOps: ExportCanvasWorkflowOpsLike = createExportCanvasWorkflowOps({
  _requireApp,
  hasDom,
  get$,
  getDoorsOpen,
  setDoorsOpen: (app: AppContainer, open: boolean, opts?: DoorsSetOpenOptionsLike) =>
    setDoorsOpen(app, open, isRecord(opts) ? opts : undefined),
  getCameraControlsOrNull,
  getCameraOrNull,
  _getRenderCore,
  _applyExportWallColorOverride,
  _getRendererSize,
  _isNotesEnabled,
  _renderAllNotesToCanvas,
  _getProjectName,
  _renderSceneForExport,
  _getRendererCanvasSource,
  _reportExportError,
  _toast,
  shouldFailFast,
  getExportLogoImage,
  drawExportLogo,
  _createDomCanvas,
  _handleCanvasExport,
  triggerCanvasDownloadViaBrowser,
  _setDoorsOpenForExport,
  _setBodyDoorStatusForNotes,
  _confirmOrProceed: async (app: AppContainer, title: string, msg: string) => {
    const out = _confirmOrProceed(app, title, msg);
    return out !== false;
  },
  autoZoomCamera,
  _snapCameraToFrontPreset,
  scaleViewportCameraDistance,
  _captureExportRefPoints: (
    app: AppContainer,
    rect: DOMRectReadOnly,
    width: number,
    height: number,
    target?: RefTargetLike | null
  ) => _captureExportRefPoints(app, rect, width, height, target),
  _captureCameraPvInfo,
  _buildNotesExportTransform,
  _cloneRefTargetLike,
  _computeNotesRefZ,
  _planePointFromRefTarget: (target: RefTargetLike | null, z: number) =>
    target ? _planePointFromRefTarget(target, z) : null,
  restoreViewportCameraPose,
  _exportReportThrottled,
  _guard,
  readRuntimeScalarOrDefaultFromApp,
  applyViewportSketchMode: (app: AppContainer, next: boolean, opts?: ViewportRuntimeApplySketchModeOptions) =>
    applyViewportSketchMode(app, next, isRecord(opts) ? opts : undefined),
});

export const copyToClipboard = __workflowOps.copyToClipboard;
export const exportDualImage = __workflowOps.exportDualImage;
export const exportRenderAndSketch = __workflowOps.exportRenderAndSketch;
export const takeSnapshot = __workflowOps.takeSnapshot;

const __orderPdfOps: ExportOrderPdfOpsLike = createExportOrderPdfOps({
  asRecord,
  isRecord,
  asObject,
  getProp,
  getCfg,
  getUi,
  getModelById,
  getFn,
  asArray,
  isObjectLike,
  getExportLogoImage,
  drawExportLogo,
  _setDoorsOpenForExport,
  _setBodyDoorStatusForNotes,
  _renderAllNotesToCanvas,
  restoreViewportCameraPose,
  _exportReportNonFatalNoApp,
  _exportReportThrottled,
  _getProjectName,
  _requireApp,
  _toast,
  _applyExportWallColorOverride,
  _getRendererSize,
  _isNotesEnabled,
  _snapCameraToFrontPreset,
  _renderSceneForExport,
  _cloneRefTargetLike,
  _computeNotesRefZ,
  _planePointFromRefTarget: (target: RefTargetLike | null, z: number) =>
    target ? _planePointFromRefTarget(target, z) : null,
  _captureExportRefPoints: (
    app: AppContainer,
    rect: DOMRectReadOnly,
    width: number,
    height: number,
    target?: RefTargetLike | null
  ) => _captureExportRefPoints(app, rect, width, height, target),
  _captureCameraPvInfo,
  _buildNotesExportTransform,
  autoZoomCamera,
  scaleViewportCameraDistance,
  getCameraControlsOrNull,
  getCameraOrNull,
  _getRenderCore,
  _createDomCanvas,
  _getRendererCanvasSource,
  _reportExportError,
  _downloadBlob,
  _guard,
  hasDom,
  get$,
  getDoorsOpen,
  setDoorsOpen: (app: AppContainer, open: boolean, opts?: DoorsSetOpenOptionsLike) =>
    setDoorsOpen(app, open, isRecord(opts) ? opts : undefined),
  readRuntimeScalarOrDefaultFromApp,
  applyViewportSketchMode: (app: AppContainer, next: boolean, opts?: ViewportRuntimeApplySketchModeOptions) =>
    applyViewportSketchMode(app, next, isRecord(opts) ? opts : undefined),
  getWindowMaybe,
  readModulesConfigurationListFromConfigSnapshot: (cfg, key) =>
    readModulesConfigurationListFromConfigSnapshot(
      cfg,
      key === 'stackSplitLowerModulesConfiguration'
        ? 'stackSplitLowerModulesConfiguration'
        : 'modulesConfiguration'
    ),
});

export const getOrderPdfDraft = __orderPdfOps.getOrderPdfDraft;
export const buildOrderPdfInteractiveBlobFromDraft = __orderPdfOps.buildOrderPdfInteractiveBlobFromDraft;
export const exportOrderPdfInteractiveFromDraft = __orderPdfOps.exportOrderPdfInteractiveFromDraft;
export { autoZoomCamera };

function readExportAction(options: ExportCanvasOptions | Record<string, unknown>): string {
  const action = typeof options.action === 'string' ? options.action : '';
  const mode = typeof options.mode === 'string' ? options.mode : '';
  const kind = typeof options.kind === 'string' ? options.kind : '';
  return String(action || mode || kind || '').toLowerCase();
}

export function exportCanvas(App: AppContainer, options?: ExportCanvasOptions | null): Promise<void> | void {
  App = _requireApp(App);
  options = options && typeof options === 'object' ? options : {};

  const action = readExportAction(options);
  if (action === 'snapshot' || action === 'save') return takeSnapshot(App);
  if (action === 'dual' || action === 'openclosed') return exportDualImage(App);
  if (action === 'rendersketch' || action === 'sketch') return exportRenderAndSketch(App);
  if (action === 'autozoom') return autoZoomCamera(App);
  return copyToClipboard(App);
}
