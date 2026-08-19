import test from 'node:test';
import assert from 'node:assert/strict';

import { _handleCanvasExport } from '../esm/native/ui/export/export_canvas_delivery_clipboard.ts';
import { createExportCanvasWorkflowOps } from '../esm/native/ui/export/export_canvas_workflows.ts';

type Deferred = {
  promise: Promise<void>;
  resolve: () => void;
  reject: (error: unknown) => void;
};

type FakeCanvasState = {
  encodeCount: number;
  dataUrlCount: number;
};

function createDeferred(): Deferred {
  let resolve!: () => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<void>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function createVec3(x: number, y: number, z: number) {
  return {
    x,
    y,
    z,
    clone() {
      return createVec3(this.x, this.y, this.z);
    },
  };
}

function createFakeCanvas(onEncode: (callback: BlobCallback) => void): {
  canvas: HTMLCanvasElement;
  state: FakeCanvasState;
} {
  const state: FakeCanvasState = { encodeCount: 0, dataUrlCount: 0 };
  const ctx = {
    drawImage() {},
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
      return 'top' as CanvasTextBaseline;
    },
    set textAlign(_value: CanvasTextAlign) {},
    get textAlign() {
      return 'left' as CanvasTextAlign;
    },
    set direction(_value: CanvasDirection) {},
    get direction() {
      return 'ltr' as CanvasDirection;
    },
  } as unknown as CanvasRenderingContext2D;

  const canvas = {
    width: 0,
    height: 0,
    getContext() {
      return ctx;
    },
    toDataURL() {
      state.dataUrlCount += 1;
      return 'data:image/png;base64,AA==';
    },
    toBlob(callback: BlobCallback) {
      state.encodeCount += 1;
      onEncode(callback);
    },
  } as unknown as HTMLCanvasElement;

  return { canvas, state };
}

function createDualWorkflowHarness(args: {
  encodeAttempt: (attempt: number, callback: BlobCallback) => void;
  clipboardWrite: (items: ClipboardItems) => Promise<void>;
}) {
  const canvasStates: FakeCanvasState[] = [];
  const toasts: Array<{ message: string; kind?: string }> = [];
  const reports: unknown[] = [];
  let doorsOpen = false;
  let renderCount = 0;
  let logoDrawCount = 0;
  let clipboardWriteCount = 0;

  class FakeClipboardItem {
    readonly items: Record<string, Blob | Promise<Blob>>;

    constructor(items: Record<string, Blob | Promise<Blob>>) {
      this.items = items;
    }
  }

  const App = {
    browser: {
      getClipboardItemCtor: () => FakeClipboardItem,
      getNavigator: () => ({
        userAgent: 'export-canvas-delivery-test',
        clipboard: {
          write: async (items: ClipboardItems) => {
            clipboardWriteCount += 1;
            const first = items[0] as unknown as FakeClipboardItem;
            await first.items['image/png'];
            await args.clipboardWrite(items);
          },
        },
      }),
    },
    services: {
      errors: {
        report(error: unknown, context: unknown) {
          reports.push({ error, context });
        },
      },
      uiFeedback: {
        toast(message: string, kind?: string) {
          toasts.push({ message, kind });
        },
      },
    },
    store: {
      getState: () => ({ runtime: { failFast: false } }),
    },
    deps: { config: {} },
  };

  const camera = { position: createVec3(0, 2, 5) };
  const controls = { target: createVec3(0, 1, 0) };
  const renderer = {};
  const scene = {};

  const ops = createExportCanvasWorkflowOps({
    _requireApp: app => app,
    hasDom: () => true,
    get$: () => () => null,
    getDoorsOpen: () => doorsOpen,
    setDoorsOpen: (_app, open) => {
      doorsOpen = open;
    },
    getCameraControlsOrNull: () => ({ camera, controls }) as never,
    getCameraOrNull: () => camera as never,
    _getRenderCore: () => ({ renderer, scene }) as never,
    _applyExportWallColorOverride: () => () => undefined,
    _getRendererSize: () => ({ width: 120, height: 80 }),
    _isNotesEnabled: () => false,
    _renderAllNotesToCanvas: async () => undefined,
    _getProjectName: () => 'delivery-test',
    _renderSceneForExport: () => {
      renderCount += 1;
    },
    _getRendererCanvasSource: () => ({}) as CanvasImageSource,
    _reportExportError: () => undefined,
    _reportExportRecovery: (_app, op, error, extra) => {
      reports.push({ op, error, extra });
    },
    _toast: (_app, message, kind) => {
      toasts.push({ message, kind });
    },
    shouldFailFast: () => false,
    getExportLogoImage: (_app, includeLogo) => (includeLogo ? ({} as HTMLImageElement) : null),
    drawExportLogo: () => {
      logoDrawCount += 1;
    },
    _createDomCanvas: () => {
      const attempt = canvasStates.length;
      const created = createFakeCanvas(callback => args.encodeAttempt(attempt, callback));
      canvasStates.push(created.state);
      return created.canvas;
    },
    _handleCanvasExport,
    triggerCanvasDownloadViaBrowser: () => true,
    _setDoorsOpenForExport: (_app, open) => {
      doorsOpen = open;
    },
    _setBodyDoorStatusForNotes: () => undefined,
    _confirmOrProceed: () => true,
    autoZoomCamera: () => undefined,
    _snapCameraToFrontPreset: () => undefined,
    scaleViewportCameraDistance: () => undefined,
    _captureExportRefPoints: () => null,
    _captureCameraPvInfo: () => ({ pv: [], pvInv: [], camPos: { x: 0, y: 0, z: 0 } }),
    _buildNotesExportTransform: () => null,
    _cloneRefTargetLike: () => null,
    _computeNotesRefZ: () => 0,
    _planePointFromRefTarget: () => null,
    restoreViewportCameraPose: () => undefined,
    _exportReportThrottled: () => undefined,
    _guard: (_app, _label, fn) => fn(),
    readRuntimeScalarOrDefaultFromApp: () => false,
    applyViewportSketchMode: () => undefined,
  });

  return {
    App,
    ops,
    canvasStates,
    toasts,
    reports,
    readRenderCount: () => renderCount,
    readLogoDrawCount: () => logoDrawCount,
    readClipboardWriteCount: () => clipboardWriteCount,
  };
}

test('dual export encodes PNG once per attempt and retries without logo only after a security failure', async () => {
  const harness = createDualWorkflowHarness({
    encodeAttempt: (attempt, callback) => {
      if (attempt === 0) {
        throw new DOMException('Canvas is not origin-clean', 'SecurityError');
      }
      callback(new Blob(['png'], { type: 'image/png' }));
    },
    clipboardWrite: async () => undefined,
  });

  await harness.ops.exportDualImage(harness.App as never);

  assert.equal(harness.canvasStates.length, 2);
  assert.deepEqual(
    harness.canvasStates.map(state => state.encodeCount),
    [1, 1],
    'each logo/no-logo attempt must own exactly one PNG encoding'
  );
  assert.deepEqual(
    harness.canvasStates.map(state => state.dataUrlCount),
    [0, 0],
    'a toDataURL probe must not precede clipboard Blob encoding'
  );
  assert.equal(harness.readLogoDrawCount(), 1);
  assert.ok(harness.readRenderCount() > 0);
  assert.equal(harness.readClipboardWriteCount(), 1);
  assert.ok(harness.reports.some(item => /retryWithoutLogo/.test(String((item as { op?: string }).op))));
  assert.deepEqual(
    harness.toasts.map(item => item.kind),
    ['success']
  );
});

test('dual export action waits for clipboard settlement and does not rebuild after a clipboard failure', async () => {
  const clipboard = createDeferred();
  const harness = createDualWorkflowHarness({
    encodeAttempt: (_attempt, callback) => {
      callback(new Blob(['png'], { type: 'image/png' }));
    },
    clipboardWrite: async () => await clipboard.promise,
  });

  let settled = false;
  const action = harness.ops.exportDualImage(harness.App as never).then(() => {
    settled = true;
  });
  await new Promise<void>(resolve => setImmediate(resolve));

  assert.equal(settled, false, 'the action promise must remain pending while clipboard delivery is pending');
  assert.equal(harness.canvasStates.length, 1);
  const renderCountBeforeClipboardSettlement = harness.readRenderCount();
  assert.ok(renderCountBeforeClipboardSettlement > 0);

  clipboard.reject(new Error('clipboard blocked'));
  await action;

  assert.equal(settled, true);
  assert.equal(harness.canvasStates.length, 1, 'clipboard failure must not render a no-logo composite');
  assert.equal(harness.readRenderCount(), renderCountBeforeClipboardSettlement);
  assert.equal(harness.canvasStates[0]?.encodeCount, 1);
  assert.equal(harness.canvasStates[0]?.dataUrlCount, 0);
  assert.equal(harness.readClipboardWriteCount(), 1);
  assert.deepEqual(
    harness.toasts.map(item => item.kind),
    ['error']
  );
});

test('clipboard-unavailable delivery keeps the no-download behavior without starting PNG encoding', async () => {
  const created = createFakeCanvas(callback => callback(new Blob(['unused'])));
  const toasts: Array<{ message: string; kind?: string }> = [];
  const App = {
    browser: { getClipboardItemCtor: () => null },
    services: {
      uiFeedback: {
        toast(message: string, kind?: string) {
          toasts.push({ message, kind });
        },
      },
    },
    store: { getState: () => ({ runtime: { failFast: false } }) },
    deps: { config: {} },
  };

  const result = await _handleCanvasExport(App as never, created.canvas, 'unavailable.png', {
    mode: 'clipboard',
    clipboardFailureMode: 'none',
  });

  assert.deepEqual(result, { ok: false, stage: 'clipboard', reason: 'unavailable' });
  assert.equal(created.state.encodeCount, 0);
  assert.deepEqual(
    toasts.map(item => item.kind),
    ['error']
  );
});

test('fail-fast delivery rejects a tainted canvas instead of converting it into a background failure', async () => {
  class FakeClipboardItem {
    constructor(_items: Record<string, Blob | Promise<Blob>>) {}
  }
  const created = createFakeCanvas(() => {
    throw new DOMException('Canvas is not origin-clean', 'SecurityError');
  });
  const App = {
    browser: {
      getClipboardItemCtor: () => FakeClipboardItem,
      getNavigator: () => ({ userAgent: 'fail-fast-test', clipboard: { write: async () => undefined } }),
    },
    services: { errors: { report: () => undefined } },
    store: { getState: () => ({ runtime: { failFast: true } }) },
    deps: { config: {} },
  };

  await assert.rejects(
    _handleCanvasExport(App as never, created.canvas, 'tainted.png', {
      mode: 'clipboard',
      deferSecurityEncodingFailureToast: true,
    }),
    (error: unknown) => error instanceof DOMException && error.name === 'SecurityError'
  );
  assert.equal(created.state.encodeCount, 1);
  assert.equal(created.state.dataUrlCount, 0);
});
