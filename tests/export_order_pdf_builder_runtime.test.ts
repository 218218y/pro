import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PDFDict, PDFDocument, PDFName, PDFString, PDFHexString } from 'pdf-lib';

import * as shared from '../esm/native/ui/export/export_canvas_shared.ts';
import { createExportOrderPdfBuilderOps } from '../esm/native/ui/export/export_order_pdf_builder.ts';
import { createExportOrderPdfCaptureOps } from '../esm/native/ui/export/export_order_pdf_capture.ts';
import { createExportOrderPdfTextOps } from '../esm/native/ui/export/export_order_pdf_text.ts';

function createBuilderDeps() {
  return {
    isRecord: shared.isRecord,
    asRecord: shared.asRecord,
    isObjectLike: shared.isObjectLike,
    asObject: shared.asObject,
    getProp: shared.getProp,
    getFn: shared.getFn,
    asArray: shared.asArray,
    getCtor: shared.getCtor,
    getCfg: () => ({}),
    getUi: () => ({}),
    getModelById: () => null,
    hasDom: () => true,
    get$: () => null,
    getDoorsOpen: () => false,
    setDoorsOpen: () => undefined,
    getCameraControlsOrNull: () => null,
    getCameraOrNull: () => null,
    _getRenderCore: () => null,
    _applyExportWallColorOverride: () => () => undefined,
    _getRendererSize: () => ({ width: 1, height: 1 }),
    _isNotesEnabled: () => false,
    _renderAllNotesToCanvas: async () => undefined,
    _getProjectName: () => '',
    _renderSceneForExport: () => undefined,
    _getRendererCanvasSource: () => null,
    _reportExportError: () => undefined,
    _toast: () => undefined,
    shouldFailFast: () => false,
    getExportLogoImage: () => null,
    drawExportLogo: () => undefined,
    _createDomCanvas: () => {
      throw new Error('not used in builder test');
    },
    _handleCanvasExport: () => undefined,
    triggerCanvasDownloadViaBrowser: () => true,
    _setDoorsOpenForExport: () => undefined,
    _setBodyDoorStatusForNotes: () => undefined,
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
    _guard: (_app: unknown, _op: string, fn: (() => unknown) | null | undefined) =>
      typeof fn === 'function' ? fn() : undefined,
    readRuntimeScalarOrDefaultFromApp: () => false,
    applyViewportSketchMode: () => undefined,
    _exportReportNonFatalNoApp: () => undefined,
    _requireApp: <T>(app: T) => app,
    _downloadBlob: () => undefined,
    readModulesConfigurationListFromConfigSnapshot: () => [],
  };
}

test('buildOrderPdfInteractiveBlobFromDraft keeps the embedded AcroForm template usable', async () => {
  const deps = createBuilderDeps();
  const textOps = createExportOrderPdfTextOps(deps as never);
  const captureOps = createExportOrderPdfCaptureOps(deps as never);

  captureOps.fetchBytesFirstOk = async (_app, urls) => {
    const rel = `public/${String(urls[0]).replace(/^\//, '')}`;
    return new Uint8Array(fs.readFileSync(rel));
  };
  captureOps.captureCompositeRenderSketchPngBytes = async () => null;
  captureOps.captureCompositeOpenClosedPngBytes = async () => null;

  const builder = createExportOrderPdfBuilderOps(deps as never, textOps, captureOps);
  const built = await builder.buildOrderPdfInteractiveBlobFromDraft(
    { services: { uiFeedback: { toast: () => undefined } } } as never,
    {
      projectName: 'בדיקת PDF',
      orderNumber: '1234',
      orderDate: '2026-03-26',
      deliveryAddress: 'רחוב לדוגמה 1',
      phone: '03-5555555',
      mobile: '050-5555555',
      notes: 'הערה',
      detailsText: 'פרטי הזמנה',
      detailsTouched: true,
      includeRenderSketch: false,
      includeOpenClosed: false,
    } as never
  );

  assert.ok(built);
  assert.ok(built?.blob instanceof Blob);
  assert.ok((built?.blob.size ?? 0) > 1000);

  const outputBytes = new Uint8Array(await built.blob.arrayBuffer());
  const outputPdf = await PDFDocument.load(outputBytes);
  const outputForm = outputPdf.getForm();
  const notesField = outputForm.getTextField('notes');
  const notesWidgets = notesField.acroField.getWidgets();
  assert.equal(notesWidgets.length, 1);
  assert.equal(notesWidgets[0]?.getRectangle().y, 62);

  const readPdfText = (value: unknown): string => {
    if (value instanceof PDFString) return value.asString();
    if (value instanceof PDFHexString) return value.decodeText();
    return '';
  };
  const decodeDefaultAppearance = (fieldName: string) => {
    const field = outputForm.getTextField(fieldName);
    const da = field.acroField.dict.get(PDFName.of('DA'));
    return readPdfText(da).replace(/\\([0-7]{1,3})/g, (_match, octal: string) =>
      String.fromCharCode(Number.parseInt(octal, 8))
    );
  };

  const detailsDa = decodeDefaultAppearance('order_details');
  const notesDa = decodeDefaultAppearance('notes');
  assert.match(detailsDa, /\/[^\s]+\s+12\s+Tf\b/);
  assert.match(notesDa, /\/[^\s]+\s+12\s+Tf\b/);

  const notesFontAlias = /\/([^\s]+)\s+12\s+Tf\b/.exec(notesDa)?.[1];
  assert.ok(notesFontAlias);
  const acroFormObject = outputPdf.catalog.get(PDFName.of('AcroForm'));
  const acroForm = acroFormObject ? outputPdf.context.lookup(acroFormObject, PDFDict) : null;
  const drObject = acroForm?.get(PDFName.of('DR'));
  const dr = drObject ? outputPdf.context.lookup(drObject, PDFDict) : null;
  const fontObject = dr?.get(PDFName.of('Font'));
  const fonts = fontObject ? outputPdf.context.lookup(fontObject, PDFDict) : null;
  const fontResourceObject = fonts?.get(PDFName.of(notesFontAlias));
  const fontResource = fontResourceObject ? outputPdf.context.lookup(fontResourceObject, PDFDict) : null;
  const baseFont = fontResource?.get(PDFName.of('BaseFont'));
  const baseFontName =
    baseFont && typeof (baseFont as { decodeText?: () => string }).decodeText === 'function'
      ? (baseFont as { decodeText: () => string }).decodeText()
      : '';
  assert.equal(baseFontName, 'Arimo-Regular');
});
