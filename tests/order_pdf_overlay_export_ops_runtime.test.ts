import test from 'node:test';
import assert from 'node:assert/strict';

import { createOrderPdfOverlayExportOps } from '../esm/native/ui/react/pdf/order_pdf_overlay_export_ops_attachment.ts';
import type { OrderPdfDraft } from '../esm/native/ui/react/pdf/order_pdf_overlay_contracts.js';

function createDraft(): OrderPdfDraft {
  return {
    projectName: 'פרויקט בדיקה',
    orderNumber: '420',
    orderDate: '2026-04-07',
    deliveryAddress: '',
    phone: '',
    mobile: '',
    autoDetails: '',
    manualDetails: '',
    manualEnabled: false,
    notes: '',
    includeRenderSketch: false,
    includeOpenClosed: false,
  };
}

test('order pdf overlay export ops fail fast when rasterization has no document seam', async () => {
  const ops = createOrderPdfOverlayExportOps({
    docMaybe: null,
    winMaybe: null,
    ensurePdfJs: async () => ({ getDocument: () => null }) as any,
    _buildInteractivePdfBlobForEditorDraft: async () => ({
      blob: new Blob([Uint8Array.from([1, 2, 3])], { type: 'application/pdf' }),
      fileName: 'order.pdf',
      projectName: 'Demo Project',
    }),
    getFn: (obj: unknown, key: string) => {
      const candidate = (obj as Record<string, unknown> | null)?.[key];
      return typeof candidate === 'function' ? (candidate as any).bind(obj) : null;
    },
    getProp: (obj: unknown, key: string) => (obj as Record<string, unknown> | null)?.[key],
    isPromiseLike: (value: unknown): value is Promise<unknown> =>
      !!value && typeof (value as Promise<unknown>).then === 'function',
    isRecord: (value: unknown): value is Record<string, unknown> =>
      !!value && typeof value === 'object' && !Array.isArray(value),
    orderPdfOverlayReportNonFatal: () => undefined,
    canvasToPngBytes: async () => Uint8Array.from([1]),
  });

  await assert.rejects(
    () =>
      ops.rasterizeInteractivePdfBytesToImagePdfBytes({
        inBytes: Uint8Array.from([1, 2, 3]),
        baseFileName: 'order.pdf',
        draft: createDraft(),
      }),
    /אין Document/
  );
});

test('order pdf overlay export ops build image attachments through the canonical attachment seam', async () => {
  const calls: Array<unknown> = [];

  const ctx = {
    save() {},
    restore() {},
    fillRect() {},
    beginPath() {},
    rect() {},
    clip() {},
    fillText() {},
    measureText(text: string) {
      return { width: String(text).length * 6 };
    },
    textAlign: 'right',
    textBaseline: 'top',
    fillStyle: 'black',
    font: '12px Arial',
  } as unknown as CanvasRenderingContext2D;

  const canvas = {
    width: 0,
    height: 0,
    getContext(kind: string) {
      return kind === '2d' ? ctx : null;
    },
  } as unknown as HTMLCanvasElement;

  const pdfDoc = {
    numPages: 1,
    async getPage(_index: number) {
      return {
        getViewport({ scale }: { scale: number }) {
          return { width: 300 * scale, height: 400 * scale };
        },
        render() {
          return { promise: Promise.resolve() };
        },
      };
    },
    destroy() {
      calls.push('pdfDoc.destroy');
    },
  };

  const ops = createOrderPdfOverlayExportOps({
    docMaybe: {
      fonts: {
        check() {
          return true;
        },
      },
      createElement(tag: string) {
        assert.equal(tag, 'canvas');
        return canvas;
      },
    } as unknown as Document,
    winMaybe: { Blob } as Window,
    ensurePdfJs: async () =>
      ({
        VerbosityLevel: { ERRORS: 0 },
        getDocument() {
          return {
            promise: Promise.resolve(pdfDoc),
            destroy() {
              calls.push('pdfTask.destroy');
            },
          };
        },
      }) as any,
    loadPdfLib: async () => ({
      PDFDocument: {
        create: async () => ({
          async embedPng(bytes: Uint8Array) {
            calls.push(['embedPng', Array.from(bytes)]);
            return { kind: 'png' };
          },
          addPage(size: [number, number]) {
            calls.push(['addPage', size]);
            return {
              drawImage(_img: unknown, opts: { x: number; y: number; width: number; height: number }) {
                calls.push(['drawImage', opts]);
              },
            };
          },
          async save() {
            return Uint8Array.from([9, 8, 7]);
          },
        }),
      },
    }),
    _buildInteractivePdfBlobForEditorDraft: async () => ({
      blob: new Blob([Uint8Array.from([1, 2, 3])], { type: 'application/pdf' }),
      fileName: 'order.pdf',
      projectName: 'Demo Project',
    }),
    getFn: (obj: unknown, key: string) => {
      const candidate = (obj as Record<string, unknown> | null)?.[key];
      return typeof candidate === 'function' ? (candidate as any).bind(obj) : null;
    },
    getProp: (obj: unknown, key: string) => (obj as Record<string, unknown> | null)?.[key],
    isPromiseLike: (value: unknown): value is Promise<unknown> =>
      !!value && typeof (value as Promise<unknown>).then === 'function',
    isRecord: (value: unknown): value is Record<string, unknown> =>
      !!value && typeof value === 'object' && !Array.isArray(value),
    orderPdfOverlayReportNonFatal: (op: string) => {
      calls.push(['report', op]);
    },
    canvasToPngBytes: async () => Uint8Array.from([4, 5, 6]),
  });

  const result = await ops.buildImagePdfAttachmentFromDraft(createDraft());

  assert.equal(result.fileName, 'order_image.pdf');
  assert.equal(result.projectName, 'Demo Project');
  assert.equal(result.orderNumber, '420');
  assert.deepEqual(Array.from(result.pdfBytes), [9, 8, 7]);
  assert.ok(result.blob instanceof Blob);
  assert.deepEqual(
    calls.filter(call => Array.isArray(call) && call[0] === 'drawImage'),
    [['drawImage', { x: 0, y: 0, width: 300, height: 400 }]]
  );
  assert.ok(calls.includes('pdfDoc.destroy'));
  assert.ok(calls.includes('pdfTask.destroy'));
});

test('order pdf overlay image rasterization does not repaint sketch annotations already baked into sketch pages', async () => {
  let annotationStrokeCalls = 0;

  const ctx = {
    save() {},
    restore() {},
    fillRect() {},
    beginPath() {},
    rect() {},
    clip() {},
    fillText() {},
    measureText(text: string) {
      return { width: String(text).length * 6 };
    },
    moveTo() {
      annotationStrokeCalls += 1;
    },
    lineTo() {
      annotationStrokeCalls += 1;
    },
    arc() {
      annotationStrokeCalls += 1;
    },
    stroke() {
      annotationStrokeCalls += 1;
    },
    fill() {
      annotationStrokeCalls += 1;
    },
    textAlign: 'right',
    textBaseline: 'top',
    fillStyle: 'black',
    font: '12px Arial',
    lineCap: 'round',
    lineJoin: 'round',
    lineWidth: 1,
    strokeStyle: '#000000',
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    direction: 'rtl',
  } as unknown as CanvasRenderingContext2D;

  const canvas = {
    width: 0,
    height: 0,
    getContext(kind: string) {
      return kind === '2d' ? ctx : null;
    },
  } as unknown as HTMLCanvasElement;

  const ops = createOrderPdfOverlayExportOps({
    docMaybe: {
      fonts: {
        check() {
          return true;
        },
      },
      createElement(tag: string) {
        assert.equal(tag, 'canvas');
        return canvas;
      },
    } as unknown as Document,
    winMaybe: { Blob } as Window,
    ensurePdfJs: async () =>
      ({
        VerbosityLevel: { ERRORS: 0 },
        getDocument() {
          return {
            promise: Promise.resolve({
              numPages: 2,
              async getPage(_index: number) {
                return {
                  getViewport({ scale }: { scale: number }) {
                    return { width: 300 * scale, height: 400 * scale };
                  },
                  render() {
                    return { promise: Promise.resolve() };
                  },
                };
              },
              destroy() {},
            }),
            destroy() {},
          };
        },
      }) as any,
    loadPdfLib: async () => ({
      PDFDocument: {
        create: async () => ({
          async embedPng(_bytes: Uint8Array) {
            return { kind: 'png' };
          },
          addPage(_size: [number, number]) {
            return {
              drawImage() {},
            };
          },
          async save() {
            return Uint8Array.from([1, 2]);
          },
        }),
        async load() {
          return {
            getPages() {
              return [{ ref: 'page-1' }, { ref: 'page-2' }];
            },
            getForm() {
              return {
                getFields() {
                  return [
                    {
                      getWidgets() {
                        return [
                          {
                            dict: {
                              get() {
                                return 'page-1';
                              },
                            },
                          },
                        ];
                      },
                    },
                  ];
                },
              };
            },
          };
        },
      },
    }),
    _buildInteractivePdfBlobForEditorDraft: async () => ({
      blob: new Blob([Uint8Array.from([1, 2, 3])], { type: 'application/pdf' }),
      fileName: 'order.pdf',
      projectName: 'Demo Project',
    }),
    getFn: (obj: unknown, key: string) => {
      const candidate = (obj as Record<string, unknown> | null)?.[key];
      return typeof candidate === 'function' ? (candidate as any).bind(obj) : null;
    },
    getProp: (obj: unknown, key: string) => (obj as Record<string, unknown> | null)?.[key],
    isPromiseLike: (value: unknown): value is Promise<unknown> =>
      !!value && typeof (value as Promise<unknown>).then === 'function',
    isRecord: (value: unknown): value is Record<string, unknown> =>
      !!value && typeof value === 'object' && !Array.isArray(value),
    orderPdfOverlayReportNonFatal: () => undefined,
    canvasToPngBytes: async () => Uint8Array.from([4, 5, 6]),
  });

  await ops.rasterizeInteractivePdfBytesToImagePdfBytes({
    inBytes: Uint8Array.from([1, 2, 3]),
    baseFileName: 'order.pdf',
    draft: {
      ...createDraft(),
      includeRenderSketch: true,
      sketchAnnotations: {
        renderSketch: {
          strokes: [
            {
              tool: 'pen',
              color: '#ff0000',
              width: 3,
              points: [
                { x: 0.1, y: 0.1 },
                { x: 0.8, y: 0.8 },
              ],
            },
          ],
          textBoxes: [],
        },
      },
    },
  });

  assert.equal(annotationStrokeCalls, 0);
});
