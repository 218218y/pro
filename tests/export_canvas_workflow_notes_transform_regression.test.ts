import test from 'node:test';
import assert from 'node:assert/strict';

import { createExportCanvasWorkflowOps } from '../esm/native/ui/export/export_canvas_workflows.ts';
import { shouldPreserveLiveViewportForSketchImageExport } from '../esm/native/ui/export/export_canvas_workflow_viewport_policy.ts';

type MutableApp = {
  sketchMode: boolean;
  doorsOpen: boolean;
  renderLog: unknown[];
  store: { getState: () => Record<string, unknown> };
};

function createVec3(x: number, y: number, z: number) {
  return {
    x,
    y,
    z,
    clone() {
      return createVec3(this.x, this.y, this.z);
    },
    set(x: number, y: number, z: number) {
      this.x = x;
      this.y = y;
      this.z = z;
      return this;
    },
  };
}

function createFakeCanvas() {
  const ctx = {
    drawImageCalls: [] as unknown[],
    drawImage(...args: unknown[]) {
      this.drawImageCalls.push(args);
    },
    fillRect() {},
    clearRect() {},
    beginPath() {},
    rect() {},
    clip() {},
    save() {},
    restore() {},
    fillText() {},
    measureText() {
      return { width: 10 };
    },
    set fillStyle(_value: string) {},
    get fillStyle() {
      return '#fff';
    },
    set font(_value: string) {},
    get font() {
      return '10px sans-serif';
    },
    set textBaseline(_value: CanvasTextBaseline) {},
    get textBaseline() {
      return 'top';
    },
    set textAlign(_value: CanvasTextAlign) {},
    get textAlign() {
      return 'left';
    },
    set direction(_value: CanvasDirection) {},
    get direction() {
      return 'ltr';
    },
  } as unknown as CanvasRenderingContext2D;

  return {
    canvas: {
      width: 0,
      height: 0,
      getContext() {
        return ctx;
      },
      toDataURL() {
        return 'data:image/png;base64,AA==';
      },
    } as unknown as HTMLCanvasElement,
    ctx,
  };
}

function createWorkflowHarness(initial: {
  sketchMode: boolean;
  doorsOpen: boolean;
  ui?: Record<string, unknown>;
}) {
  const App: MutableApp = {
    sketchMode: initial.sketchMode,
    doorsOpen: initial.doorsOpen,
    renderLog: [],
    store: {
      getState: () => ({
        ui: initial.ui || {},
        config: {},
        runtime: {},
        mode: {},
        meta: {},
      }),
    },
  };

  const viewerRect = { left: 0, top: 0, width: 200, height: 100 } as DOMRectReadOnly;
  const rendererSource = {
    getBoundingClientRect() {
      return viewerRect;
    },
  } as unknown as CanvasImageSource;

  const camera = {
    position: createVec3(0, 8.75, 5.5),
    updateProjectionMatrix() {},
  } as any;
  const controls = {
    target: createVec3(0, 8.25, 0),
    update() {},
  } as any;
  const renderer = {} as any;
  const scene = {} as any;

  const notesTransforms: unknown[] = [];
  const cameraWorkflowCalls = { snap: 0, autoZoom: 0, scale: 0 };

  const makeTransformTag = (input?: any) => ({
    panel: App.doorsOpen ? 'open' : 'closed',
    mode: App.sketchMode ? 'sketch' : 'render',
    preCamY: input?.preCamPos?.y,
    postPvY: input?.postPv?.[1],
  });

  const { canvas } = createFakeCanvas();

  const ops = createExportCanvasWorkflowOps({
    _requireApp: (app: unknown) => app as any,
    hasDom: () => true,
    get$: () => (id: string) =>
      id === 'viewer-container'
        ? ({
            getBoundingClientRect: () => viewerRect,
          } as any)
        : null,
    getDoorsOpen: () => App.doorsOpen,
    setDoorsOpen: (_app: unknown, open: boolean) => {
      App.doorsOpen = !!open;
      return undefined;
    },
    getCameraControlsOrNull: () => ({ camera, controls }),
    getCameraOrNull: () => camera,
    _getRenderCore: () => ({ renderer, scene }),
    _applyExportWallColorOverride: () => () => undefined,
    _getRendererSize: () => ({ width: 200, height: 100 }),
    _isNotesEnabled: () => true,
    _renderAllNotesToCanvas: async (_app, _ctx, _w, _h, _y, transform) => {
      notesTransforms.push(transform);
      return true;
    },
    _getProjectName: () => 'demo',
    _renderSceneForExport: () => undefined,
    _getRendererCanvasSource: () => rendererSource,
    _reportExportError: () => undefined,
    _reportExportRecovery: () => undefined,
    _toast: () => undefined,
    shouldFailFast: () => false,
    getExportLogoImage: () => null,
    drawExportLogo: () => undefined,
    _createDomCanvas: () => canvas,
    _handleCanvasExport: () => undefined,
    triggerCanvasDownloadViaBrowser: () => true,
    _setDoorsOpenForExport: (_app, open) => {
      App.doorsOpen = !!open;
    },
    _setBodyDoorStatusForNotes: () => undefined,
    _confirmOrProceed: () => true,
    autoZoomCamera: () => {
      cameraWorkflowCalls.autoZoom += 1;
      camera.position.y = 4.5;
      controls.target.y = 4.25;
    },
    _snapCameraToFrontPreset: () => {
      cameraWorkflowCalls.snap += 1;
      camera.position.y = 2.2;
      controls.target.y = 1.4;
    },
    scaleViewportCameraDistance: () => {
      cameraWorkflowCalls.scale += 1;
      camera.position.y += 0.5;
    },
    _captureExportRefPoints: () => ({
      p0: { x: 0, y: 0 },
      p1: { x: 1, y: 0 },
      p2: { x: 0, y: 1 },
    }),
    _captureCameraPvInfo: () => ({
      pv: [0, camera.position.y, ...new Array(14).fill(0)],
      pvInv: new Array(16).fill(0),
      camPos: { x: camera.position.x, y: camera.position.y, z: camera.position.z },
    }),
    _buildNotesExportTransform: input => makeTransformTag(input) as any,
    _cloneRefTargetLike: () => ({ x: 0, y: 0, z: 0 }),
    _computeNotesRefZ: () => 0,
    _planePointFromRefTarget: () => ({ x: 0, y: 0, z: 0 }),
    restoreViewportCameraPose: (_app, pose: any) => {
      camera.position.x = pose.position.x;
      camera.position.y = pose.position.y;
      camera.position.z = pose.position.z;
      controls.target.x = pose.target.x;
      controls.target.y = pose.target.y;
      controls.target.z = pose.target.z;
    },
    _exportReportThrottled: () => undefined,
    _guard: (_app, _label, fn) => fn(),
    readRuntimeScalarOrDefaultFromApp: () => App.sketchMode,
    applyViewportSketchMode: (_app, next) => {
      App.sketchMode = !!next;
    },
  });

  return { App, ops, notesTransforms, cameraWorkflowCalls };
}

test('render/sketch export recalculates note transform after switching each viewport mode', async () => {
  const { App, ops, notesTransforms, cameraWorkflowCalls } = createWorkflowHarness({
    sketchMode: true,
    doorsOpen: false,
  });

  await ops.exportRenderAndSketch(App as any);

  assert.equal(notesTransforms.length, 2);
  assert.equal((notesTransforms[0] as any)?.mode, 'render');
  assert.equal((notesTransforms[1] as any)?.mode, 'sketch');
  assert.equal((notesTransforms[0] as any)?.preCamY, 2.2);
  assert.equal((notesTransforms[1] as any)?.preCamY, 2.2);
  assert.equal((notesTransforms[0] as any)?.postPvY, 5);
  assert.equal((notesTransforms[1] as any)?.postPvY, 5);
  assert.deepEqual(cameraWorkflowCalls, { snap: 2, autoZoom: 2, scale: 2 });
});

test('open/closed export recalculates note transform after switching each door state', async () => {
  const { App, ops, notesTransforms, cameraWorkflowCalls } = createWorkflowHarness({
    sketchMode: false,
    doorsOpen: true,
  });

  await ops.exportDualImage(App as any);

  assert.equal(notesTransforms.length, 2);
  assert.equal((notesTransforms[0] as any)?.panel, 'closed');
  assert.equal((notesTransforms[1] as any)?.panel, 'open');
  assert.equal((notesTransforms[0] as any)?.preCamY, 2.2);
  assert.equal((notesTransforms[1] as any)?.preCamY, 2.2);
  assert.deepEqual(cameraWorkflowCalls, { snap: 2, autoZoom: 2, scale: 2 });
});

test('chest render/sketch export preserves the live viewport and uses screenshot note mapping', async () => {
  const { App, ops, notesTransforms, cameraWorkflowCalls } = createWorkflowHarness({
    sketchMode: true,
    doorsOpen: false,
    ui: { isChestMode: true },
  });

  await ops.exportRenderAndSketch(App as any);

  assert.deepEqual(cameraWorkflowCalls, { snap: 0, autoZoom: 0, scale: 0 });
  assert.equal(notesTransforms.length, 2);
  for (const transform of notesTransforms as any[]) {
    assert.equal(transform?.sx, 1);
    assert.equal(transform?.sy, 1);
    assert.equal(transform?.dx, 0);
    assert.equal(transform?.dy, 0);
    assert.deepEqual(transform?.sourceRect, { left: 0, top: 0, width: 200, height: 100 });
    assert.equal(transform?.kind, undefined);
  }
});

test('export live viewport policy ignores retired UI aliases and raw flags', () => {
  const { App } = createWorkflowHarness({
    sketchMode: false,
    doorsOpen: false,
    ui: {
      chestMode: true,
      isCornerMode: true,
      cornerConnectorEnabled: true,
      raw: { isChestMode: true, cornerMode: true },
    },
  });

  assert.equal(shouldPreserveLiveViewportForSketchImageExport(App as any), false);
});

test('corner open/closed export preserves the live viewport and uses screenshot note mapping', async () => {
  const { App, ops, notesTransforms, cameraWorkflowCalls } = createWorkflowHarness({
    sketchMode: false,
    doorsOpen: true,
    ui: { cornerMode: true },
  });

  await ops.exportDualImage(App as any);

  assert.deepEqual(cameraWorkflowCalls, { snap: 0, autoZoom: 0, scale: 0 });
  assert.equal(notesTransforms.length, 2);
  for (const transform of notesTransforms as any[]) {
    assert.equal(transform?.sx, 1);
    assert.equal(transform?.sy, 1);
    assert.equal(transform?.dx, 0);
    assert.equal(transform?.dy, 0);
    assert.deepEqual(transform?.sourceRect, { left: 0, top: 0, width: 200, height: 100 });
    assert.equal(transform?.kind, undefined);
  }
});
