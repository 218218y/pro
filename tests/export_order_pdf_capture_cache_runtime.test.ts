import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildOrderPdfCompositeCaptureSignature,
  clearOrderPdfCompositeCaptureCache,
  readOrderPdfCompositeCaptureCache,
  writeOrderPdfCompositeCaptureCache,
} from '../esm/native/ui/export/export_order_pdf_capture_cache.ts';
import { captureOrderPdfCompositeImages } from '../esm/native/ui/export/export_order_pdf_builder_layout.ts';

function makeApp(state: Record<string, unknown>) {
  return {
    store: {
      getState() {
        return state;
      },
    },
  };
}

test('order pdf capture cache signature falls back cleanly when state is missing or invalid', () => {
  clearOrderPdfCompositeCaptureCache();
  const appA = makeApp({});
  const appB = makeApp({ ui: null, config: 'bad', runtime: 12, mode: undefined, meta: { version: 99 } });
  const appC = makeApp({ ui: {}, config: {}, runtime: {}, mode: {}, meta: { version: 0, updatedAt: 0 } });
  const draft = { includeRenderSketch: true, includeOpenClosed: false, orderNumber: '55' };

  const signatureA = buildOrderPdfCompositeCaptureSignature(appA as never, draft as never);
  const signatureB = buildOrderPdfCompositeCaptureSignature(appB as never, draft as never);
  const signatureC = buildOrderPdfCompositeCaptureSignature(appC as never, draft as never);

  assert.equal(signatureA, signatureB);
  assert.equal(signatureB, signatureC);
});

test('order pdf capture cache returns cloned bytes instead of live cache buffers', () => {
  clearOrderPdfCompositeCaptureCache();
  writeOrderPdfCompositeCaptureCache({
    signature: 'clone-test',
    pngRenderSketch: Uint8Array.from([1, 2, 3]),
    pngOpenClosed: Uint8Array.from([4, 5, 6]),
  });

  const firstRead = readOrderPdfCompositeCaptureCache('clone-test');
  assert.ok(firstRead);
  firstRead.pngRenderSketch?.set([9, 9, 9]);
  firstRead.pngOpenClosed?.set([8, 8, 8]);

  const secondRead = readOrderPdfCompositeCaptureCache('clone-test');
  assert.ok(secondRead);
  assert.deepEqual(Array.from(secondRead.pngRenderSketch || []), [1, 2, 3]);
  assert.deepEqual(Array.from(secondRead.pngOpenClosed || []), [4, 5, 6]);
});

test('order pdf capture cache reuses sketch base assets while signature is unchanged', async () => {
  clearOrderPdfCompositeCaptureCache();
  const app = makeApp({
    ui: { width: 240, height: 180 },
    config: { carcass: { color: 'white' } },
    runtime: {},
    mode: {},
    build: { signature: [2, 2, 1] },
  });
  const draft = { includeRenderSketch: true, includeOpenClosed: true, orderNumber: '55' };
  const signature = buildOrderPdfCompositeCaptureSignature(app as never, draft);

  writeOrderPdfCompositeCaptureCache({
    signature,
    pngRenderSketch: new Uint8Array([1, 2, 3]),
    pngOpenClosed: new Uint8Array([4, 5, 6]),
  });

  const calls = { render: 0, open: 0, annotate: 0 };
  const out = await captureOrderPdfCompositeImages(
    app as never,
    draft,
    { includeRenderSketch: true, includeOpenClosed: true } as never,
    { _exportReportThrottled() {} } as never,
    {
      async applySketchAnnotationsToCompositePngBytes({ pngBytes }) {
        calls.annotate += 1;
        return pngBytes || null;
      },
      async captureCompositeRenderSketchPngBytes() {
        calls.render += 1;
        return new Uint8Array([9]);
      },
      async captureCompositeOpenClosedPngBytes() {
        calls.open += 1;
        return new Uint8Array([8]);
      },
    }
  );

  assert.deepEqual(Array.from(out.renderSketch || []), [1, 2, 3]);
  assert.deepEqual(Array.from(out.openClosed || []), [4, 5, 6]);
  assert.equal(calls.render, 0);
  assert.equal(calls.open, 0);
  assert.equal(calls.annotate, 2);
});

test('order pdf capture cache ignores pdf editor draft changes but invalidates on build/config changes', () => {
  clearOrderPdfCompositeCaptureCache();
  const baseState = {
    ui: {
      width: 240,
      height: 180,
      orderPdfEditorOpen: true,
      orderPdfEditorDraft: {
        sketchAnnotations: {
          renderSketch: {
            strokes: [{ tool: 'pen', color: '#2563eb', width: 2, points: [{ x: 0.2, y: 0.3 }] }],
          },
        },
      },
      orderPdfEditorZoom: 1.5,
      sketchMode: true,
    },
    config: { carcass: { color: 'white' } },
    runtime: { sketchMode: true, doorsOpen: true },
    mode: {},
    build: { signature: [2, 2, 1] },
    meta: { version: 12, updatedAt: 400 },
  };
  const appA = makeApp(baseState);
  const appB = makeApp({
    ...baseState,
    ui: {
      ...baseState.ui,
      orderPdfEditorDraft: {
        sketchAnnotations: {
          renderSketch: {
            strokes: [{ tool: 'marker', color: '#dc2626', width: 6, points: [{ x: 0.4, y: 0.5 }] }],
          },
        },
      },
      orderPdfEditorZoom: 2,
      orderPdfEditorOpen: false,
      sketchMode: false,
    },
    runtime: { sketchMode: false, doorsOpen: false },
    meta: { version: 99, updatedAt: 999 },
  });
  const appC = makeApp({
    ...baseState,
    config: { carcass: { color: 'black' } },
  });

  const draft = { includeRenderSketch: true, includeOpenClosed: false, orderNumber: '55' };

  const signatureA = buildOrderPdfCompositeCaptureSignature(appA as never, draft as never);
  const signatureB = buildOrderPdfCompositeCaptureSignature(appB as never, draft as never);
  const signatureC = buildOrderPdfCompositeCaptureSignature(appC as never, draft as never);

  assert.equal(signatureA, signatureB);
  assert.notEqual(signatureA, signatureC);
});

test('order pdf capture cache signature ignores sketch-only annotation changes', async () => {
  clearOrderPdfCompositeCaptureCache();
  const app = makeApp({
    ui: { width: 240, height: 180 },
    config: { carcass: { color: 'white' } },
    runtime: {},
    mode: {},
    build: { signature: [2, 2, 1] },
  });
  const draftA = {
    includeRenderSketch: true,
    includeOpenClosed: false,
    sketchAnnotations: {
      renderSketch: {
        strokes: [{ tool: 'pen', color: '#2563eb', width: 2, points: [{ x: 0.2, y: 0.3 }] }],
      },
    },
  };
  const draftB = {
    includeRenderSketch: true,
    includeOpenClosed: false,
    sketchAnnotations: {
      renderSketch: {
        strokes: [{ tool: 'pen', color: '#dc2626', width: 6, points: [{ x: 0.4, y: 0.5 }] }],
      },
    },
  };

  const signatureA = buildOrderPdfCompositeCaptureSignature(app as never, draftA as never);
  const signatureB = buildOrderPdfCompositeCaptureSignature(app as never, draftB as never);
  assert.equal(signatureA, signatureB);

  const calls = { render: 0, annotate: 0 };
  const sharedCaptureOps = {
    async captureCompositeRenderSketchPngBytes() {
      calls.render += 1;
      return Uint8Array.from([7, 7, 7]);
    },
    async captureCompositeOpenClosedPngBytes() {
      throw new Error('open/closed should not run');
    },
  };

  const resultA = await captureOrderPdfCompositeImages(
    app as never,
    draftA as never,
    { includeRenderSketch: true, includeOpenClosed: false } as never,
    { _exportReportThrottled() {} } as never,
    {
      ...sharedCaptureOps,
      async applySketchAnnotationsToCompositePngBytes({ draft, pngBytes }) {
        calls.annotate += 1;
        const color = draft?.sketchAnnotations?.renderSketch?.strokes?.[0]?.color;
        return color === '#dc2626'
          ? Uint8Array.from([...(pngBytes || []), 2])
          : Uint8Array.from([...(pngBytes || []), 1]);
      },
    }
  );

  const resultB = await captureOrderPdfCompositeImages(
    app as never,
    draftB as never,
    { includeRenderSketch: true, includeOpenClosed: false } as never,
    { _exportReportThrottled() {} } as never,
    {
      ...sharedCaptureOps,
      async applySketchAnnotationsToCompositePngBytes({ draft, pngBytes }) {
        calls.annotate += 1;
        const color = draft?.sketchAnnotations?.renderSketch?.strokes?.[0]?.color;
        return color === '#dc2626'
          ? Uint8Array.from([...(pngBytes || []), 2])
          : Uint8Array.from([...(pngBytes || []), 1]);
      },
    }
  );

  assert.deepEqual(Array.from(resultA.renderSketch || []), [7, 7, 7, 1]);
  assert.deepEqual(Array.from(resultB.renderSketch || []), [7, 7, 7, 2]);
  assert.equal(calls.render, 1);
  assert.equal(calls.annotate, 2);
});
