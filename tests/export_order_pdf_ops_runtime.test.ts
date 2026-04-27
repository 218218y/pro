import test from 'node:test';
import assert from 'node:assert/strict';

import { createExportOrderPdfOps } from '../esm/native/ui/export/export_order_pdf_ops.ts';

test('export order pdf ops factory exposes stable draft/export surface', () => {
  const ops = createExportOrderPdfOps({
    asRecord: (v: unknown) => (v && typeof v === 'object' ? v : null),
    isRecord: (v: unknown) => !!v && typeof v === 'object',
    asObject: (v: unknown) => (v && typeof v === 'object' ? v : {}),
    getProp: (obj: Record<string, unknown>, key: string) => obj?.[key],
    getCfg: () => ({}),
    getUi: () => ({}),
    getModelById: () => null,
    getFn: (obj: Record<string, unknown>, key: string) => obj?.[key],
    asArray: (v: unknown) => (Array.isArray(v) ? v : []),
    isObjectLike: (v: unknown) => !!v && typeof v === 'object',
    getExportLogoImage: () => null,
    drawExportLogo: () => undefined,
    _setDoorsOpenForExport: async () => undefined,
    _setBodyDoorStatusForNotes: async () => undefined,
    _renderAllNotesToCanvas: async () => undefined,
    restoreViewportCameraPose: () => undefined,
    _exportReportNonFatalNoApp: () => undefined,
    _exportReportThrottled: () => undefined,
    _getProjectName: () => 'Demo Project',
    _requireApp: (app: unknown) => app,
    _toast: () => undefined,
    _applyExportWallColorOverride: () => () => undefined,
    _getRendererSize: () => ({ width: 0, height: 0 }),
    _isNotesEnabled: () => false,
    _snapCameraToFrontPreset: () => undefined,
    _renderSceneForExport: () => undefined,
    _cloneRefTargetLike: () => null,
    _computeNotesRefZ: () => 0,
    _planePointFromRefTarget: () => null,
    _captureExportRefPoints: () => null,
    _captureCameraPvInfo: () => null,
    _buildNotesExportTransform: () => null,
    autoZoomCamera: () => undefined,
    scaleViewportCameraDistance: () => undefined,
    getCameraControlsOrNull: () => null,
    getCameraOrNull: () => null,
    _getRenderCore: () => null,
    _createDomCanvas: () => ({ getContext: () => null }),
    _getRendererCanvasSource: () => null,
    _reportExportError: () => undefined,
    _downloadBlob: () => undefined,
    _guard: (_app: unknown, _label: string, fn: () => unknown) => fn(),
    hasDom: () => false,
    get$: () => null,
    getDoorsOpen: () => false,
    setDoorsOpen: () => undefined,
    readRuntimeScalarOrDefaultFromApp: () => false,
    applyViewportSketchMode: () => undefined,
    getWindowMaybe: () => null,
    readModulesConfigurationListFromConfigSnapshot: () => [],
  });

  assert.equal(typeof ops.getOrderPdfDraft, 'function');
  assert.equal(typeof ops.buildOrderPdfInteractiveBlobFromDraft, 'function');
  assert.equal(typeof ops.exportOrderPdfInteractiveFromDraft, 'function');

  const draft = ops.getOrderPdfDraft({} as any);
  assert.equal(draft.projectName, 'Demo Project');
  assert.equal(typeof draft.autoDetails, 'string');
});
