import test from 'node:test';
import assert from 'node:assert/strict';

import { createExportOrderPdfCaptureOps } from '../esm/native/ui/export/export_order_pdf_capture.ts';

function createCanvasRecorder() {
  const calls: Array<{ kind: string; args: unknown[] }> = [];
  const ctx = {
    fillStyle: '',
    fillRect: (...args: unknown[]) => calls.push({ kind: 'fillRect', args }),
    drawImage: (...args: unknown[]) => calls.push({ kind: 'drawImage', args }),
  };
  const canvas = {
    width: 10,
    height: 20,
    getContext: (kind: string) => (kind === '2d' ? ctx : null),
    toDataURL: () => 'data:image/png;base64,AA==',
    toBlob: (cb: (blob: Blob | null) => void) =>
      cb(new Blob([Uint8Array.from([9, 8, 7])], { type: 'image/png' })),
  };
  return { canvas, calls };
}

test('export order pdf capture viewer toggles doors/sketch canonically and rasterizes the composed canvas', async () => {
  const toggles: Array<{ kind: string; value: unknown; opts?: unknown }> = [];
  const rendered: unknown[] = [];
  const { canvas, calls } = createCanvasRecorder();

  const ops = createExportOrderPdfCaptureOps({
    getWindowMaybe: () => null,
    _exportReportNonFatalNoApp: () => undefined,
    _exportReportThrottled: () => undefined,
    getCameraOrNull: () => ({}),
    _guard: (_app: unknown, _label: string, fn: () => unknown) => fn(),
    readRuntimeScalarOrDefaultFromApp: () => false,
    applyViewportSketchMode: (_app: unknown, enabled: boolean) =>
      toggles.push({ kind: 'sketch', value: enabled }),
    _renderSceneForExport: (_app: unknown, renderer: unknown) => rendered.push(renderer),
    _createDomCanvas: () => canvas,
    _getRendererCanvasSource: () => ({ tag: 'renderer-surface' }),
  } as any);

  const bytes = await ops.captureViewerPng({} as never, { doorsOpen: true, sketchMode: true }, {
    renderer: { id: 'renderer', domElement: {} },
    scene: { id: 'scene' },
    width: 10,
    height: 20,
    originalDoorOpen: false,
    doorsGetOpen: () => false,
    doorsSetOpen: (value: boolean, opts?: unknown) => toggles.push({ kind: 'doors', value, opts }),
    view: {},
    originalSketchMode: false,
  } as never);

  assert.deepEqual(toggles, [
    { kind: 'doors', value: true, opts: { source: 'export:pdf', forceUpdate: true, slidingHideOpen: true } },
    { kind: 'sketch', value: true },
  ]);
  assert.equal(rendered.length, 1);
  assert.deepEqual(Array.from(bytes), [9, 8, 7]);
  assert.equal(
    calls.some(call => call.kind === 'fillRect'),
    true
  );
  assert.equal(
    calls.some(call => call.kind === 'drawImage'),
    true
  );
});

test('export order pdf capture canvas helpers keep first successful fetch result while tolerating earlier failures', async () => {
  const reported: string[] = [];
  const ops = createExportOrderPdfCaptureOps({
    getWindowMaybe: () => ({
      fetch: async (url: string) => {
        if (url.endsWith('broken')) throw new Error('boom');
        if (url.endsWith('skip')) return { ok: false };
        return {
          ok: true,
          arrayBuffer: async () => Uint8Array.from([1, 2, 3, 4]).buffer,
        };
      },
    }),
    _exportReportNonFatalNoApp: () => undefined,
    _exportReportThrottled: (_app: unknown, label: string) => reported.push(label),
  } as any);

  const result = await ops.fetchBytesFirstOk({} as never, ['/broken', '/skip', '/ok']);
  assert.deepEqual(Array.from(result ?? []), [1, 2, 3, 4]);
  assert.deepEqual(reported, ['fetchBytesFirstOk.fetch']);
});

function createCompositeCaptureHarness(ui: Record<string, unknown>) {
  const App: any = { ui, services: {}, sketchMode: true, doorsOpen: true };
  const cameraWorkflowCalls = { snap: 0, autoZoom: 0, scale: 0 };
  const notesTransforms: unknown[] = [];
  const { canvas } = createCanvasRecorder();
  (canvas as any).getContext = () => ({
    fillStyle: '',
    font: '',
    textAlign: '',
    textBaseline: '',
    fillRect: () => undefined,
    drawImage: () => undefined,
    fillText: () => undefined,
  });
  (canvas as any).toBlob = (cb: (blob: Blob | null) => void) =>
    cb(new Blob([Uint8Array.from([4, 5, 6])], { type: 'image/png' }));

  const rendererSource = {
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 320, height: 180 }),
  };
  const camera = {
    position: {
      x: 0,
      y: 8,
      z: 5,
      clone() {
        return { x: this.x, y: this.y, z: this.z };
      },
    },
  };
  const controls = {
    target: {
      x: 0,
      y: 7,
      z: 0,
      clone() {
        return { x: this.x, y: this.y, z: this.z };
      },
    },
  };

  const ops = createExportOrderPdfCaptureOps({
    getWindowMaybe: () => null,
    _exportReportNonFatalNoApp: () => undefined,
    _exportReportThrottled: () => undefined,
    _requireApp: (app: unknown) => app,
    hasDom: () => true,
    get$: () => (id: string) =>
      id === 'viewer-container'
        ? ({ getBoundingClientRect: () => ({ left: 0, top: 0, width: 320, height: 180 }) } as any)
        : null,
    getCameraControlsOrNull: () => ({ camera, controls }),
    _getRenderCore: () => ({ renderer: { domElement: {} }, scene: {} }),
    _getRendererSize: () => ({ width: 320, height: 180 }),
    _isNotesEnabled: () => true,
    _applyExportWallColorOverride: () => () => undefined,
    _setDoorsOpenForExport: (_app: unknown, open: boolean) => {
      App.doorsOpen = !!open;
    },
    _setBodyDoorStatusForNotes: () => undefined,
    getDoorsOpen: () => App.doorsOpen,
    setDoorsOpen: (_app: unknown, open: boolean) => {
      App.doorsOpen = !!open;
    },
    _renderSceneForExport: () => undefined,
    _createDomCanvas: () => canvas,
    _getRendererCanvasSource: () => rendererSource,
    _renderAllNotesToCanvas: async (_app, _ctx, _w, _h, _y, transform) => {
      notesTransforms.push(transform);
    },
    getExportLogoImage: () => null,
    drawExportLogo: () => undefined,
    _getProjectName: () => 'demo',
    readRuntimeScalarOrDefaultFromApp: () => App.sketchMode,
    applyViewportSketchMode: (_app: unknown, next: boolean) => {
      App.sketchMode = !!next;
    },
    restoreViewportCameraPose: (_app: unknown, pose: any) => {
      camera.position.x = pose.position.x;
      camera.position.y = pose.position.y;
      camera.position.z = pose.position.z;
      controls.target.x = pose.target.x;
      controls.target.y = pose.target.y;
      controls.target.z = pose.target.z;
    },
    _snapCameraToFrontPreset: () => {
      cameraWorkflowCalls.snap += 1;
    },
    autoZoomCamera: () => {
      cameraWorkflowCalls.autoZoom += 1;
    },
    scaleViewportCameraDistance: () => {
      cameraWorkflowCalls.scale += 1;
    },
    _cloneRefTargetLike: () => ({ x: 0, y: 0, z: 0 }),
    _computeNotesRefZ: () => 0,
    _planePointFromRefTarget: () => ({ x: 0, y: 0, z: 0 }),
    _captureExportRefPoints: () => ({ p0: { x: 0, y: 0 }, p1: { x: 1, y: 0 }, p2: { x: 0, y: 1 } }),
    _captureCameraPvInfo: () => ({
      pv: new Array(16).fill(0),
      pvInv: new Array(16).fill(0),
      camPos: { x: 0, y: 0, z: 0 },
    }),
    _buildNotesExportTransform: () => ({ kind: 'plane' }),
    getCameraOrNull: () => camera,
    _reportExportError: () => undefined,
    _downloadBlob: () => undefined,
    _guard: (_app: unknown, _label: string, fn: () => unknown) => fn(),
    asRecord: (v: unknown) => (v && typeof v === 'object' ? v : null),
    isRecord: (v: unknown) => !!v && typeof v === 'object',
    asObject: (v: unknown) => (v && typeof v === 'object' ? v : {}),
    getProp: (obj: Record<string, unknown>, key: string) => obj?.[key],
    getCfg: () => ({}),
    getUi: () => ui,
    getModelById: () => null,
    getFn: (obj: Record<string, unknown>, key: string) => obj?.[key],
    asArray: (v: unknown) => (Array.isArray(v) ? v : []),
    isObjectLike: (v: unknown) => !!v && typeof v === 'object',
    _toast: () => undefined,
    readModulesConfigurationListFromConfigSnapshot: () => [],
  } as any);

  return { App, ops, cameraWorkflowCalls, notesTransforms };
}

test('order PDF render/sketch composite preserves chest live viewport and screenshot note mapping', async () => {
  const { App, ops, cameraWorkflowCalls, notesTransforms } = createCompositeCaptureHarness({
    isChestMode: true,
  });

  const bytes = await ops.captureCompositeRenderSketchPngBytes(App as never);

  assert.deepEqual(Array.from(bytes), [4, 5, 6]);
  assert.deepEqual(cameraWorkflowCalls, { snap: 0, autoZoom: 0, scale: 0 });
  assert.equal(notesTransforms.length, 2);
  for (const transform of notesTransforms as any[]) {
    assert.equal(transform?.sx, 1);
    assert.equal(transform?.sy, 1);
    assert.equal(transform?.dx, 0);
    assert.equal(transform?.dy, 0);
    assert.deepEqual(transform?.sourceRect, { left: 0, top: 0, width: 320, height: 180 });
  }
});

test('order PDF open/closed composite preserves corner live viewport and screenshot note mapping', async () => {
  const { App, ops, cameraWorkflowCalls, notesTransforms } = createCompositeCaptureHarness({
    cornerMode: true,
  });

  const bytes = await ops.captureCompositeOpenClosedPngBytes(App as never);

  assert.deepEqual(Array.from(bytes), [4, 5, 6]);
  assert.deepEqual(cameraWorkflowCalls, { snap: 0, autoZoom: 0, scale: 0 });
  assert.equal(notesTransforms.length, 2);
  for (const transform of notesTransforms as any[]) {
    assert.equal(transform?.sx, 1);
    assert.equal(transform?.sy, 1);
    assert.equal(transform?.dx, 0);
    assert.equal(transform?.dy, 0);
    assert.deepEqual(transform?.sourceRect, { left: 0, top: 0, width: 320, height: 180 });
  }
});
