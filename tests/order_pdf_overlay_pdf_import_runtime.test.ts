import test from 'node:test';
import assert from 'node:assert/strict';

import { PDFDocument } from 'pdf-lib';

import {
  getOrderPdfFieldReadNames,
  ORDER_PDF_DETAILS_CONTINUATION_FIELD_NAMES,
} from '../esm/native/ui/pdf/order_pdf_document_fields_runtime.ts';

import { makeEmptyDraft } from '../esm/native/ui/react/pdf/order_pdf_overlay_text.js';
import {
  applyExtractedLoadedPdfDraft,
  extractLoadedPdfDraftFields,
  readPdfFileBytes,
} from '../esm/native/ui/react/pdf/order_pdf_overlay_pdf_import_extract.js';
import { detectTrailingImportedImagePages } from '../esm/native/ui/react/pdf/order_pdf_overlay_pdf_import_pages.js';
import { maybePreserveImportedImagePagesInInteractivePdf } from '../esm/native/ui/react/pdf/order_pdf_overlay_pdf_import_interactive.js';

type PdfSpec = { width: number; height: number };

async function buildPdf(specs: PdfSpec[]): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (const spec of specs) doc.addPage([spec.width, spec.height]);
  return await doc.save();
}

async function readPageSizes(blob: Blob): Promise<Array<[number, number]>> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const doc = await PDFDocument.load(bytes);
  return doc.getPages().map(page => {
    const { width, height } = page.getSize();
    return [width, height] as [number, number];
  });
}

const builtPdfBytes = () =>
  buildPdf([
    { width: 100, height: 100 },
    { width: 110, height: 110 },
    { width: 120, height: 120 },
  ]);

const importedPdfBytes = () =>
  buildPdf([
    { width: 200, height: 200 },
    { width: 210, height: 210 },
    { width: 220, height: 220 },
  ]);

async function preserveTailPages(draftOverrides: Partial<ReturnType<typeof makeEmptyDraft>>) {
  const builtBytes = await builtPdfBytes();
  const importedBytes = await importedPdfBytes();
  return await maybePreserveImportedImagePagesInInteractivePdf({
    blob: new Blob([builtBytes], { type: 'application/pdf' }),
    fileName: 'built.pdf',
    projectName: 'פרויקט בדיקה',
    draft: {
      ...makeEmptyDraft(),
      projectName: 'פרויקט בדיקה',
      ...draftOverrides,
    },
    loadedPdfOriginalBytes: importedBytes,
    importedTailIndexes: [1, 2],
    winMaybe: globalThis as unknown as Window,
  });
}

test('order pdf pdf-import keeps only imported tail pages when both sketch exports are disabled', async () => {
  const result = await preserveTailPages({ includeRenderSketch: false, includeOpenClosed: false });
  const sizes = await readPageSizes(result.blob);
  assert.deepEqual(sizes, [
    [100, 100],
    [210, 210],
    [220, 220],
  ]);
});

test('order pdf pdf-import keeps built render page and imported open page when only open-closed export is disabled', async () => {
  const result = await preserveTailPages({ includeRenderSketch: true, includeOpenClosed: false });
  const sizes = await readPageSizes(result.blob);
  assert.deepEqual(sizes, [
    [100, 100],
    [110, 110],
    [220, 220],
  ]);
});

test('order pdf pdf-import does not duplicate imported tail pages when both sketch exports stay enabled', async () => {
  const result = await preserveTailPages({ includeRenderSketch: true, includeOpenClosed: true });
  const sizes = await readPageSizes(result.blob);
  assert.deepEqual(sizes, [
    [100, 100],
    [110, 110],
    [120, 120],
  ]);
});

test('order pdf pdf-import detects trailing non-form pages and keeps extracted draft flags aligned with imported tails', async () => {
  const bytes = await builtPdfBytes();
  assert.deepEqual(await detectTrailingImportedImagePages(bytes), [1, 2]);

  const next = applyExtractedLoadedPdfDraft(
    {
      ...makeEmptyDraft(),
      includeRenderSketch: true,
      includeOpenClosed: true,
    },
    {
      orderNumber: '1234',
      manualDetails: 'שורת פרטים',
      notes: 'הערה',
    },
    [1, 2]
  );

  assert.equal(next.orderNumber, '1234');
  assert.equal(next.manualDetails, 'שורת פרטים');
  assert.equal(next.detailsTouched, true);
  assert.equal(next.manualEnabled, true);
  assert.equal(next.includeRenderSketch, false);
  assert.equal(next.includeOpenClosed, false);
  assert.match(next.manualDetailsHtml, /שורת פרטים/);
  assert.match(next.notesHtml, /הערה/);
});

test('order pdf pdf-import extracts fallback field names through the canonical document-field runtime', async () => {
  const doc = await PDFDocument.create();
  const page = doc.addPage([600, 840]);
  const form = doc.getForm();
  const add = (name: string, text: string, y: number) => {
    const field = form.createTextField(name);
    field.setText(text);
    field.addToPage(page, { x: 20, y, width: 200, height: 20 });
  };

  add(getOrderPdfFieldReadNames('orderNumber')[1]!, '9001', 760);
  add(getOrderPdfFieldReadNames('orderDate')[1]!, '12/04/2026', 730);
  add(getOrderPdfFieldReadNames('projectName')[1]!, 'Project Sapphire', 700);
  add(getOrderPdfFieldReadNames('deliveryAddress')[1]!, '7 Shalom St', 670);
  add(getOrderPdfFieldReadNames('phone')[1]!, '03-1111111', 640);
  add(getOrderPdfFieldReadNames('mobile')[1]!, '050-2222222', 610);
  add(getOrderPdfFieldReadNames('details')[1]!, 'Base line', 580);
  add(ORDER_PDF_DETAILS_CONTINUATION_FIELD_NAMES[0]!, 'Overflow line', 550);
  add(getOrderPdfFieldReadNames('notes')[1]!, 'Imported note', 520);

  const extracted = await extractLoadedPdfDraftFields(await doc.save());
  assert.deepEqual(extracted, {
    orderNumber: '9001',
    orderDate: '12/04/2026',
    projectName: 'Project Sapphire',
    deliveryAddress: '7 Shalom St',
    phone: '03-1111111',
    mobile: '050-2222222',
    manualDetails: 'Base line\nOverflow line',
    notes: 'Imported note',
  });
});

test('order pdf pdf-import reads bytes from file-like objects and tolerates read failures', async () => {
  const okFile = {
    async arrayBuffer() {
      return Uint8Array.from([1, 2, 3]).buffer;
    },
  } as File;
  const failFile = {
    async arrayBuffer() {
      throw new Error('boom');
    },
  } as File;

  const bytes = await readPdfFileBytes(okFile);
  assert.ok(bytes instanceof Uint8Array);
  assert.deepEqual(Array.from(bytes || []), [1, 2, 3]);
  assert.equal(await readPdfFileBytes(failFile), null);
});

test('order pdf pdf-import falls back to imported open-closed page when the built pdf only contains one generated tail page', async () => {
  const builtBytes = await buildPdf([
    { width: 100, height: 100 },
    { width: 110, height: 110 },
  ]);
  const importedBytes = await importedPdfBytes();
  const result = await maybePreserveImportedImagePagesInInteractivePdf({
    blob: new Blob([builtBytes], { type: 'application/pdf' }),
    fileName: 'built.pdf',
    projectName: 'פרויקט בדיקה',
    draft: {
      ...makeEmptyDraft(),
      projectName: 'פרויקט בדיקה',
      includeRenderSketch: true,
      includeOpenClosed: true,
    },
    loadedPdfOriginalBytes: importedBytes,
    importedTailIndexes: [1, 2],
    winMaybe: globalThis as unknown as Window,
  });
  const sizes = await readPageSizes(result.blob);
  assert.deepEqual(sizes, [
    [100, 100],
    [110, 110],
    [220, 220],
  ]);
});

test('order pdf pdf-import applies html-only legacy details and notes through the canonical imported-field runtime', () => {
  const next = applyExtractedLoadedPdfDraft(
    {
      ...makeEmptyDraft(),
      autoDetails: 'פרט מובנה',
    },
    {
      manualDetailsHtml: '<div>שורה ידנית</div><div>עוד שורה</div>',
      notesHtml: '<div>הערה אחת</div><div>הערה שתיים</div>',
    },
    []
  );

  assert.equal(next.manualDetails, 'שורה ידנית\nעוד שורה');
  assert.equal(next.detailsTouched, true);
  assert.equal(next.manualEnabled, true);
  assert.equal(next.manualDetailsHtml, '<div>שורה ידנית</div><div>עוד שורה</div>');
  assert.equal(next.notes, 'הערה אחת\nהערה שתיים');
  assert.equal(next.notesHtml, '<div>הערה אחת</div><div>הערה שתיים</div>');
});
