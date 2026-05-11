import test from 'node:test';
import assert from 'node:assert/strict';

import { createExportCanvasWorkflowOps } from '../esm/native/ui/export/export_canvas_workflows.ts';

test('export canvas workflow factory exposes stable user-facing workflow surface', async () => {
  const ops = createExportCanvasWorkflowOps({
    _requireApp: (app: unknown) => app,
    hasDom: () => false,
    get$: () => null,
    getDoorsOpen: () => false,
    setDoorsOpen: () => undefined,
    getCameraControlsOrNull: () => null,
    getCameraOrNull: () => null,
    _getRenderCore: () => null,
    _applyExportWallColorOverride: () => () => undefined,
    _getRendererSize: () => ({ width: 0, height: 0 }),
    _isNotesEnabled: () => false,
    _renderAllNotesToCanvas: async () => undefined,
    _getProjectName: () => 'demo',
    _renderSceneForExport: async () => undefined,
    _getRendererCanvasSource: () => null,
    _reportExportError: () => undefined,
    _reportExportRecovery: () => undefined,
    _toast: () => undefined,
    shouldFailFast: () => false,
    getExportLogoImage: () => null,
    drawExportLogo: () => undefined,
    _createDomCanvas: () => ({ getContext: () => null }),
    _handleCanvasExport: async () => undefined,
    triggerCanvasDownloadViaBrowser: () => undefined,
    _setDoorsOpenForExport: async () => undefined,
    _setBodyDoorStatusForNotes: async () => undefined,
    _confirmOrProceed: async () => true,
    autoZoomCamera: () => undefined,
    _snapCameraToFrontPreset: () => undefined,
    scaleViewportCameraDistance: () => undefined,
    _captureExportRefPoints: () => null,
    _captureCameraPvInfo: () => null,
    _buildNotesExportTransform: () => null,
    _cloneRefTargetLike: () => null,
    _computeNotesRefZ: () => 0,
    _planePointFromRefTarget: () => null,
    restoreViewportCameraPose: () => undefined,
    _exportReportThrottled: () => undefined,
    _guard: () => undefined,
    readRuntimeScalarOrDefaultFromApp: () => false,
    applyViewportSketchMode: () => undefined,
  });

  assert.equal(typeof ops.copyToClipboard, 'function');
  assert.equal(typeof ops.exportDualImage, 'function');
  assert.equal(typeof ops.exportRenderAndSketch, 'function');
  assert.equal(typeof ops.takeSnapshot, 'function');

  await ops.copyToClipboard({} as any);
  await ops.exportDualImage({} as any);
  await ops.exportRenderAndSketch({} as any);
  await ops.takeSnapshot({} as any);
});
