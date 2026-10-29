import test from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument } from 'pdf-lib';
import type { AppContainer } from '../types/index.ts';
import {
  A4_PAGE_HEIGHT_PT,
  A4_PAGE_WIDTH_PT,
  fitPdfImageToPage,
} from '../esm/native/ui/export/export_pdf_image_page_layout.ts';
import { exportCanvasAsA4Pdf } from '../esm/native/ui/export/export_canvas_delivery_download.ts';

const ONE_PIXEL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==',
  'base64'
);

function fakeCanvas(toBlob: (callback: BlobCallback) => void): HTMLCanvasElement {
  return { toBlob } as unknown as HTMLCanvasElement;
}

function browserDownloadHarness(downloadError?: Error) {
  const seen: Array<{ name: string; blob: Blob }> = [];
  let blob: Blob | null = null;
  const doc = {
    body: { appendChild() {} },
    createElement() {
      return {
        style: {},
        download: '',
        href: '',
        click() {
          if (downloadError) throw downloadError;
          if (blob) seen.push({ name: this.download, blob });
        },
        remove() {},
      };
    },
  };
  const win = {
    URL: {
      createObjectURL(value: Blob) {
        blob = value;
        return 'blob:test';
      },
      revokeObjectURL() {},
    },
  };
  return { app: { docMaybe: doc, winMaybe: win } as unknown as AppContainer, seen };
}

test('A4 layout has actual physical dimensions independent of input pixel count', () => {
  assert.ok(Math.abs(A4_PAGE_WIDTH_PT - 595.276) < 0.001);
  assert.ok(Math.abs(A4_PAGE_HEIGHT_PT - 841.89) < 0.001);

  // Same actual PNG dimensions as the user's second Acrobat page.
  const placement = fitPdfImageToPage({
    pageWidth: A4_PAGE_WIDTH_PT,
    pageHeight: A4_PAGE_HEIGHT_PT,
    imageWidth: 1533,
    imageHeight: 2242,
    margin: 18,
  });
  assert.ok(placement.x >= 18 - 1e-8);
  assert.ok(placement.y >= 18 - 1e-8);
  assert.ok(placement.x + placement.width <= A4_PAGE_WIDTH_PT - 18 + 1e-8);
  assert.ok(placement.y + placement.height <= A4_PAGE_HEIGHT_PT - 18 + 1e-8);
  assert.ok(Math.abs(placement.width / placement.height - 1533 / 2242) < 1e-12);
});

test('PDF fit fails on invalid dimensions rather than silently producing a broken page', () => {
  for (const imageWidth of [0, -1, NaN, Infinity]) {
    assert.throws(() =>
      fitPdfImageToPage({
        pageWidth: A4_PAGE_WIDTH_PT,
        pageHeight: A4_PAGE_HEIGHT_PT,
        imageWidth,
        imageHeight: 2242,
        margin: 18,
      })
    );
  }
});

test('A4 PDF export writes a one-page real A4 document and reports download only on success', async () => {
  const { app, seen } = browserDownloadHarness();
  const toastLog: string[] = [];
  const result = await exportCanvasAsA4Pdf(
    app,
    fakeCanvas(callback => callback(new Blob([ONE_PIXEL_PNG], { type: 'image/png' }))),
    'cabinet-a4.pdf',
    (_app, text) => {
      toastLog.push(text);
    }
  );
  assert.deepEqual(result, { ok: true, delivery: 'download' });
  assert.equal(seen.length, 1);
  assert.equal(seen[0]?.name, 'cabinet-a4.pdf');
  assert.equal(seen[0]?.blob.type, 'application/pdf');
  assert.equal(toastLog.length, 1);
  const pdf = await PDFDocument.load(await seen[0]!.blob.arrayBuffer());
  assert.equal(pdf.getPageCount(), 1);
  const { width, height } = pdf.getPage(0).getSize();
  assert.ok(Math.abs(width - A4_PAGE_WIDTH_PT) < 0.001);
  assert.ok(Math.abs(height - A4_PAGE_HEIGHT_PT) < 0.001);
});

test('A4 PDF export never reports success if the browser rejects a download', async () => {
  const toastLog: string[] = [];
  await assert.rejects(
    exportCanvasAsA4Pdf(
      {} as AppContainer,
      fakeCanvas(callback => callback(new Blob([ONE_PIXEL_PNG], { type: 'image/png' }))),
      'cabinet-a4.pdf',
      (_app, text) => {
        toastLog.push(text);
      }
    ),
    /download unavailable/i
  );
  assert.deepEqual(toastLog, []);
});

test('security-restricted canvas is surfaced as recoverable encoding failure', async () => {
  const { app } = browserDownloadHarness();
  const error = Object.assign(new Error('Tainted canvas'), { name: 'SecurityError' });
  const result = await exportCanvasAsA4Pdf(
    app,
    fakeCanvas(() => {
      throw error;
    }),
    'cabinet-a4.pdf',
    () => {
      assert.fail('must not report a successful download');
    }
  );
  assert.deepEqual(result, { ok: false, stage: 'encoding', reason: 'security', error });
});

test('A4 PDF export preserves browser click failures without success feedback', async () => {
  const { app, seen } = browserDownloadHarness(new Error('Browser refused PDF download'));
  await assert.rejects(
    exportCanvasAsA4Pdf(
      app,
      fakeCanvas(callback => callback(new Blob([ONE_PIXEL_PNG], { type: 'image/png' }))),
      'cabinet-a4.pdf',
      () => assert.fail('must not report a successful download')
    ),
    /Browser refused PDF download/
  );
  assert.deepEqual(seen, []);
});

test('A4 PDF export reports null PNG encoding as a non-security failure', async () => {
  const { app, seen } = browserDownloadHarness();
  const result = await exportCanvasAsA4Pdf(
    app,
    fakeCanvas(callback => callback(null)),
    'cabinet-a4.pdf',
    () => assert.fail('must not report a successful download')
  );
  assert.equal(result.ok, false);
  if (result.ok || result.stage !== 'encoding') assert.fail('expected an encoding failure');
  assert.equal(result.reason, 'error');
  assert.match(String(result.error), /PNG encoding returned null/);
  assert.deepEqual(seen, []);
});

test('React export action routing exposes both A4 PDF variants without replacing clipboard actions', async () => {
  const { runExportUiActionWithDeps } = await import('../esm/native/ui/react/export_actions.ts');
  const app = { services: {}, deps: { config: {} } } as AppContainer;
  const log: string[] = [];
  const module = {
    exportDualImageA4Pdf: async () => {
      log.push('dual-a4-pdf');
      return { ok: true as const, delivery: 'download' as const };
    },
    exportRenderAndSketchA4Pdf: async () => {
      log.push('render-sketch-a4-pdf');
      return { ok: true as const, delivery: 'download' as const };
    },
  };

  for (const kind of ['dual-a4-pdf', 'render-sketch-a4-pdf'] as const) {
    const result = await runExportUiActionWithDeps({ app, kind, ensureModule: async () => module });
    assert.deepEqual(result, { ok: true, kind, deliveryResult: { ok: true, delivery: 'download' } });
  }
  assert.deepEqual(log, ['dual-a4-pdf', 'render-sketch-a4-pdf']);
});
