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
  const toggles: Array<{ kind: string; value: unknown }> = [];
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
    doorsSetOpen: (value: boolean) => toggles.push({ kind: 'doors', value }),
    view: {},
    originalSketchMode: false,
  } as never);

  assert.deepEqual(toggles, [
    { kind: 'doors', value: true },
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
