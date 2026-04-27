import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distModuleUrl = pathToFileURL(
  path.join(repoRoot, 'dist/esm/native/ui/react/pdf/order_pdf_overlay_export_ops_image_pdf.js')
).href;

function createMockPdfLib() {
  const mockState = { docs: [] };
  const PDFDocument = {
    async create() {
      const doc = {
        pages: [],
        embedded: [],
        async embedPng(bytes) {
          const img = { bytes: Array.from(bytes) };
          this.embedded.push(img);
          return img;
        },
        addPage(size) {
          const page = {
            size,
            draws: [],
            drawImage(img, args) {
              this.draws.push({ img, args });
            },
          };
          this.pages.push(page);
          return page;
        },
        async save() {
          return Uint8Array.of(this.pages.length);
        },
      };
      mockState.docs.push(doc);
      return doc;
    },
  };
  return {
    mockState,
    loadPdfLib: async () => ({ PDFDocument, default: { PDFDocument } }),
  };
}

function createFakeCanvas() {
  const ctx = {
    direction: 'ltr',
    fillStyle: 'black',
    textAlign: 'left',
    textBaseline: 'top',
    font: '',
    save() {},
    restore() {},
    fillRect() {},
    beginPath() {},
    rect() {},
    clip() {},
    fillText() {},
    measureText(text) {
      return { width: String(text).length * 8 };
    },
  };
  return {
    width: 0,
    height: 0,
    getContext(type) {
      return type === '2d' ? ctx : null;
    },
    __ctx: ctx,
  };
}

function createFakeDocument(options = {}) {
  let fontLoaded = false;
  let fontLoads = 0;
  const stickyFontCheck = options.stickyFontCheck !== false;
  return {
    fonts: {
      check() {
        return stickyFontCheck ? fontLoaded : false;
      },
      add() {
        fontLoaded = true;
        fontLoads += 1;
      },
      ready: Promise.resolve(),
    },
    defaultView: {},
    createElement(tag) {
      if (tag !== 'canvas') throw new Error(`unexpected element: ${tag}`);
      return createFakeCanvas();
    },
    getFontLoadCount() {
      return fontLoads;
    },
  };
}

test('[order-pdf] image-pdf export appends a continuation page when details overflow but the source PDF has one page', async () => {
  const { createOrderPdfOverlayImagePdfOps } = await import(`${distModuleUrl}?t=${Date.now()}`);
  const { mockState, loadPdfLib } = createMockPdfLib();

  const fakeDoc = createFakeDocument();
  const fakePage = {
    getViewport({ scale }) {
      return { width: 595 * scale, height: 842 * scale };
    },
    render() {
      return { promise: Promise.resolve() };
    },
  };
  const fakePdfDoc = {
    numPages: 1,
    async getPage(pageNo) {
      assert.equal(pageNo, 1);
      return fakePage;
    },
    destroy() {},
  };

  const ops = createOrderPdfOverlayImagePdfOps({
    docMaybe: fakeDoc,
    winMaybe: null,
    ensurePdfJs: async () => ({
      VerbosityLevel: { ERRORS: 1 },
      getDocument() {
        return {
          promise: Promise.resolve(fakePdfDoc),
          destroy() {},
        };
      },
    }),
    loadPdfLib,
    _buildInteractivePdfBlobForEditorDraft: async () => {
      throw new Error('not used');
    },
    getFn: (obj, key) => (obj && typeof obj === 'object' && typeof obj[key] === 'function' ? obj[key] : null),
    getProp: (obj, key) => (obj && typeof obj === 'object' ? obj[key] : undefined),
    isPromiseLike: value => !!value && typeof value.then === 'function',
    isRecord: value => !!value && typeof value === 'object' && !Array.isArray(value),
    orderPdfOverlayReportNonFatal: () => undefined,
    canvasToPngBytes: async canvas =>
      Uint8Array.of(Math.min(255, canvas.width), Math.min(255, canvas.height)),
  });

  const draft = {
    projectName: 'Overflow Demo',
    autoDetails: '',
    manualDetails: Array.from({ length: 40 }, (_, i) => `שורת פירוט ${i + 1}`).join('\n'),
    detailsFull: true,
    detailsTouched: true,
    notes: '',
    orderNumber: '42',
    orderDate: '2026-03-29',
    deliveryAddress: 'רחוב הבדיקה 1',
    phone: '03-0000000',
    mobile: '050-0000000',
  };

  const result = await ops.rasterizeInteractivePdfBytesToImagePdfBytes({
    inBytes: Uint8Array.of(1, 2, 3),
    baseFileName: 'order.pdf',
    draft,
  });

  assert.equal(result.outName, 'order_image.pdf');
  assert.equal(mockState.docs.length, 1);
  assert.equal(mockState.docs[0].pages.length, 2);
  assert.deepEqual(Array.from(result.outBytes), [2]);
});

test('[order-pdf] image-pdf export bootstraps the font once per rasterization job even across multiple pages', async () => {
  const { createOrderPdfOverlayImagePdfOps } = await import(`${distModuleUrl}?t=${Date.now()}-font-once`);
  const { loadPdfLib } = createMockPdfLib();
  const fakeDoc = createFakeDocument({ stickyFontCheck: false });
  const fakePage = {
    getViewport({ scale }) {
      return { width: 595 * scale, height: 842 * scale };
    },
    render() {
      return { promise: Promise.resolve() };
    },
  };
  const fakePdfDoc = {
    numPages: 2,
    async getPage(pageNo) {
      assert.ok(pageNo === 1 || pageNo === 2);
      return fakePage;
    },
    destroy() {},
  };

  const ops = createOrderPdfOverlayImagePdfOps({
    docMaybe: fakeDoc,
    winMaybe: {
      FontFace: class FontFace {
        constructor() {}
        async load() {
          return this;
        }
      },
    },
    ensurePdfJs: async () => ({
      VerbosityLevel: { ERRORS: 1 },
      getDocument() {
        return {
          promise: Promise.resolve(fakePdfDoc),
          destroy() {},
        };
      },
    }),
    loadPdfLib,
    _buildInteractivePdfBlobForEditorDraft: async () => {
      throw new Error('not used');
    },
    getFn: (obj, key) => (obj && typeof obj === 'object' && typeof obj[key] === 'function' ? obj[key] : null),
    getProp: (obj, key) => (obj && typeof obj === 'object' ? obj[key] : undefined),
    isPromiseLike: value => !!value && typeof value.then === 'function',
    isRecord: value => !!value && typeof value === 'object' && !Array.isArray(value),
    orderPdfOverlayReportNonFatal: () => undefined,
    canvasToPngBytes: async canvas =>
      Uint8Array.of(Math.min(255, canvas.width), Math.min(255, canvas.height)),
  });

  await ops.rasterizeInteractivePdfBytesToImagePdfBytes({
    inBytes: Uint8Array.of(1, 2, 3),
    baseFileName: 'order.pdf',
    draft: {
      projectName: 'Two Pages',
      autoDetails: 'א',
      manualDetails: '',
      detailsFull: true,
      detailsTouched: false,
      notes: '',
      orderNumber: '11',
      orderDate: '2026-04-06',
      deliveryAddress: 'רחוב',
      phone: '03-1111111',
      mobile: '050-1111111',
    },
  });

  assert.equal(fakeDoc.getFontLoadCount(), 1);
});
