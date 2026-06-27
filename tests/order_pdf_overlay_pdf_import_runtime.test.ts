import test from 'node:test';
import assert from 'node:assert/strict';

import { PDFDocument, PDFName } from 'pdf-lib';

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
import {
  cleanPdfForEditorBackground,
  detectTrailingImportedImagePages,
} from '../esm/native/ui/react/pdf/order_pdf_overlay_pdf_import_pages.js';
import { maybePreserveImportedImagePagesInInteractivePdf } from '../esm/native/ui/react/pdf/order_pdf_overlay_pdf_import_interactive.js';
import { writeOrderPdfImagePdfHiddenImportFields } from '../esm/native/ui/react/pdf/order_pdf_overlay_export_ops_image_pdf_import_fields.js';
import {
  extractOrderPdfDraftFieldsFromPdfTextItems,
  type PdfTextLayerItem,
} from '../esm/native/ui/react/pdf/order_pdf_overlay_pdf_import_text.js';

type PdfSpec = { width: number; height: number };

async function buildPdf(specs: PdfSpec[]): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (const spec of specs) doc.addPage([spec.width, spec.height]);
  return await doc.save();
}

function textItem(
  input: Partial<PdfTextLayerItem> & { str: string; x: number; y: number }
): PdfTextLayerItem {
  return {
    width: input.width ?? Math.max(12, input.str.length * 6),
    height: input.height ?? 12,
    dir: input.dir,
    hasEOL: input.hasEOL,
    ...input,
  };
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

test('order pdf pdf-import clears saved form text and stale widget appearances for editor background', async () => {
  const doc = await PDFDocument.create();
  const page = doc.addPage([600, 840]);
  const form = doc.getForm();
  const field = form.createTextField('wp_project_name');
  field.setText('stale text saved in PDF');
  field.addToPage(page, { x: 20, y: 700, width: 260, height: 24 });
  form.acroForm.dict.set(PDFName.of('NeedAppearances'), doc.context.obj(true));

  const cleaned = await cleanPdfForEditorBackground(await doc.save());
  const cleanedDoc = await PDFDocument.load(cleaned);
  const cleanedForm = cleanedDoc.getForm();
  const cleanedField = cleanedForm.getTextField('wp_project_name');

  assert.equal(cleanedField.getText() || '', '');
  const cleanedAcroField = (cleanedField as unknown as { acroField?: unknown }).acroField as {
    getWidgets?: () => Array<{ dict?: { get?: (key: unknown) => unknown } }>;
  };
  const widgets = cleanedAcroField.getWidgets ? cleanedAcroField.getWidgets() : [];
  assert.equal(widgets[0]?.dict?.get?.(PDFName.of('AP')), undefined);

  const acroForm = cleanedDoc.catalog.get(PDFName.of('AcroForm')) as
    { get?: (key: unknown) => unknown } | undefined;
  assert.equal(acroForm?.get?.(PDFName.of('NeedAppearances')), undefined);
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
      detailsText: 'שורת פרטים',
      notes: 'הערה',
    },
    [1, 2]
  );

  assert.equal(next.orderNumber, '1234');
  assert.equal(next.detailsText, 'שורת פרטים');
  assert.equal(next.detailsTouched, true);
  assert.equal(next.includeRenderSketch, false);
  assert.equal(next.includeOpenClosed, false);
  assert.match(next.detailsHtml, /שורת פרטים/);
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
    detailsText: 'Base line\nOverflow line',
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

test('order pdf pdf-import applies canonical html-only details and notes through the imported-field runtime', () => {
  const next = applyExtractedLoadedPdfDraft(
    {
      ...makeEmptyDraft(),
      autoDetails: 'פרט מובנה',
    },
    {
      detailsHtml: '<div>שורה ידנית</div><div>עוד שורה</div>',
      notesHtml: '<div>הערה אחת</div><div>הערה שתיים</div>',
    },
    []
  );

  assert.equal(next.detailsText, 'שורה ידנית\nעוד שורה');
  assert.equal(next.detailsTouched, true);
  assert.equal(next.detailsHtml, '<div>שורה ידנית</div><div>עוד שורה</div>');
  assert.equal(next.notes, 'הערה אחת\nהערה שתיים');
  assert.equal(next.notesHtml, '<div>הערה אחת</div><div>הערה שתיים</div>');
});

test('order pdf pdf-import extracts editor fields from an existing PDF text/OCR layer', () => {
  const extracted = extractOrderPdfDraftFieldsFromPdfTextItems({
    pages: [
      {
        width: 595,
        height: 842,
        items: [
          textItem({ str: '9001', x: 410, y: 665, width: 36, height: 10, dir: 'ltr' }),
          textItem({ str: '12/04/2026', x: 70, y: 668, width: 70, height: 10, dir: 'ltr' }),
          textItem({ str: 'פרויקט בדיקה', x: 430, y: 610, width: 74, height: 11, dir: 'rtl' }),
          textItem({ str: 'רחוב שלום 7', x: 90, y: 610, width: 90, height: 11, dir: 'rtl' }),
          textItem({ str: '03-1111111', x: 410, y: 575, width: 64, height: 10, dir: 'ltr' }),
          textItem({ str: '050-2222222', x: 235, y: 575, width: 70, height: 10, dir: 'ltr' }),
          textItem({ str: 'שורת פרטים ראשונה', x: 390, y: 470, width: 112, height: 12, dir: 'rtl' }),
          textItem({ str: 'שורת פרטים שניה', x: 395, y: 450, width: 104, height: 12, dir: 'rtl' }),
          textItem({ str: 'הערה חשובה', x: 430, y: 205, width: 72, height: 12, dir: 'rtl' }),
        ],
      },
    ],
  });

  assert.deepEqual(extracted, {
    orderNumber: '9001',
    orderDate: '12/04/2026',
    projectName: 'פרויקט בדיקה',
    deliveryAddress: 'רחוב שלום 7',
    phone: '03-1111111',
    mobile: '050-2222222',
    detailsText: 'שורת פרטים ראשונה\nשורת פרטים שניה',
    notes: 'הערה חשובה',
  });
});

test('order pdf image-pdf export writes hidden import fields that load back into the editor', async () => {
  const doc = await PDFDocument.create();
  doc.addPage([595, 842]);

  writeOrderPdfImagePdfHiddenImportFields({
    outDoc: doc,
    draft: {
      ...makeEmptyDraft(),
      orderNumber: '77',
      orderDate: '31/05/2026',
      projectName: 'ייבוא תמונה',
      deliveryAddress: 'כתובת בדיקה',
      phone: '03-3333333',
      mobile: '050-4444444',
      detailsText: 'פרטים מתוך PDF תמונה',
      detailsTouched: true,
      notes: 'הערה מתוך PDF תמונה',
    },
  });

  const loaded = await PDFDocument.load(await doc.save({ updateFieldAppearances: false }));
  const fields = loaded.getForm().getFields();
  assert.ok(fields.length >= 8);
  assert.ok(
    fields.every(field => {
      const widgets = (
        field as unknown as { acroField?: { getWidgets?: () => unknown[] } }
      ).acroField?.getWidgets?.();
      return !Array.isArray(widgets) || widgets.length === 0;
    })
  );

  const loadedBytes = await loaded.save({ updateFieldAppearances: false });
  const extracted = await extractLoadedPdfDraftFields(loadedBytes);
  assert.equal(extracted.orderNumber, '77');
  assert.equal(extracted.orderDate, '31/05/2026');
  assert.equal(extracted.projectName, 'ייבוא תמונה');
  assert.equal(extracted.deliveryAddress, 'כתובת בדיקה');
  assert.equal(extracted.phone, '03-3333333');
  assert.equal(extracted.mobile, '050-4444444');
  assert.equal(extracted.detailsText, 'פרטים מתוך PDF תמונה');
  assert.equal(extracted.notes, 'הערה מתוך PDF תמונה');

  const cleaned = await cleanPdfForEditorBackground(loadedBytes);
  const cleanedDoc = await PDFDocument.load(cleaned);
  const cleanedPage = cleanedDoc.getPages()[0] as unknown as {
    node?: { normalizedEntries?: () => { Contents?: unknown } };
  };
  assert.ok(
    cleanedPage.node?.normalizedEntries?.().Contents,
    'widgetless image-PDF import fields should trigger first-page text-box redaction for the editor background'
  );
});
