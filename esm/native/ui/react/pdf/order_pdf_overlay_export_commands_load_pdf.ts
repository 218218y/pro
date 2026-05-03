import { hasAnyOrderPdfImportedRichDraftFieldValue } from './order_pdf_overlay_imported_draft_fields_runtime.js';
import type { LoadPdfActionResult } from './order_pdf_overlay_contracts.js';
import { buildLoadPdfError } from './order_pdf_overlay_export_commands_errors.js';
import type { LoadPdfCommandArgs } from './order_pdf_overlay_export_commands_types.js';

export async function loadOrderPdfIntoEditorWithDeps(args: LoadPdfCommandArgs): Promise<LoadPdfActionResult> {
  const {
    file,
    draft,
    pdfImportApi,
    loadedPdfOriginalBytesRef,
    loadedPdfTailNonFormPageIndexesRef,
    setImportedPdfImagePageCount,
    persistDraft,
    pdfBytesRef,
    setPdfSourceTick,
    reportError,
  } = args;

  try {
    const bytes = await pdfImportApi.readPdfFileBytes(file);
    if (!bytes || !bytes.length) {
      return { ok: false, kind: 'load-pdf', reason: 'invalid-file' };
    }

    const importedTailPages = await pdfImportApi.detectTrailingImportedImagePages(bytes);
    const extracted = await pdfImportApi.extractLoadedPdfDraftFields(bytes);
    const next = pdfImportApi.applyExtractedLoadedPdfDraft(draft, extracted, importedTailPages);
    const fieldsFound = hasAnyOrderPdfImportedRichDraftFieldValue(extracted);
    const cleaned = await pdfImportApi.cleanPdfForEditorBackground(bytes);

    loadedPdfOriginalBytesRef.current = bytes;
    loadedPdfTailNonFormPageIndexesRef.current = importedTailPages;
    setImportedPdfImagePageCount(importedTailPages.length);
    persistDraft(next);
    pdfBytesRef.current = cleaned;
    setPdfSourceTick(t => Number(t) + 1);

    return { ok: true, kind: 'load-pdf', fieldsFound };
  } catch (error) {
    reportError('orderPdfLoad:command', error);
    return buildLoadPdfError(error);
  }
}
