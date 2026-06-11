import type { InteractivePdfBuildResult, OrderPdfDraft } from './order_pdf_overlay_contracts.js';
import { asExportApiLike, ensureExportApiReady, getBlobCtor, getProp } from './order_pdf_overlay_runtime.js';
import type { PdfLibLoadedDocumentLike } from './order_pdf_overlay_pdf_lib.js';
import { collectTrailingNonFormPageIndexes, isBlobLike } from './order_pdf_overlay_pdf_import_shared.js';
import { loadPdfDocumentCtor } from './order_pdf_overlay_pdf_lib.js';
import { resolveOrderPdfSketchImageAppendPlan } from './order_pdf_overlay_sketch_image_slots_runtime.js';

export async function maybePreserveImportedImagePagesInInteractivePdf(args: {
  blob: Blob;
  fileName?: string;
  projectName?: string;
  draft: OrderPdfDraft;
  loadedPdfOriginalBytes: Uint8Array | null | undefined;
  importedTailIndexes: number[] | null | undefined;
  winMaybe: Window | null | undefined;
}): Promise<{ blob: Blob; fileName: string; projectName: string }> {
  const srcBytes = args.loadedPdfOriginalBytes || null;
  const importedTailIndexes = Array.isArray(args.importedTailIndexes) ? args.importedTailIndexes : [];
  const fileName = String(args.fileName || 'order.pdf');
  const projectName = String(args.projectName || args.draft.projectName || 'פרויקט');

  if (!srcBytes || !srcBytes.length || !importedTailIndexes.length) {
    return { blob: args.blob, fileName, projectName };
  }

  try {
    const builtBytes = new Uint8Array(await args.blob.arrayBuffer());
    const PDFDocument = await loadPdfDocumentCtor();

    const baseDoc = await PDFDocument.load(builtBytes);
    const importedSrcDoc = await PDFDocument.load(srcBytes);
    const builtSrcDoc = await PDFDocument.load(builtBytes);
    const builtTailIndexes = await collectTrailingNonFormPageIndexes(builtSrcDoc);

    const getPageCount =
      typeof baseDoc.getPageCount === 'function' ? baseDoc.getPageCount.bind(baseDoc) : null;
    const getPages = typeof baseDoc.getPages === 'function' ? baseDoc.getPages.bind(baseDoc) : null;
    const removePage = typeof baseDoc.removePage === 'function' ? baseDoc.removePage.bind(baseDoc) : null;
    const copyPages = typeof baseDoc.copyPages === 'function' ? baseDoc.copyPages.bind(baseDoc) : null;
    const addPage = typeof baseDoc.addPage === 'function' ? baseDoc.addPage.bind(baseDoc) : null;

    for (let i = 0; i < builtTailIndexes.length; i++) {
      try {
        const pageCount = getPageCount ? getPageCount() : getPages ? (getPages() || []).length : 0;
        if (pageCount > 0 && removePage) removePage(pageCount - 1);
      } catch {
        // best effort: if we fail removing one generated page, continue to preserve original blob path
      }
    }

    const appendCopiedPage = async (fromDoc: PdfLibLoadedDocumentLike, pageIndex: number) => {
      if (!copyPages || !addPage) return;
      const copied0 = await Promise.resolve(copyPages(fromDoc, [pageIndex]));
      const copied = Array.isArray(copied0) ? copied0 : [];
      if (copied && copied[0]) addPage(copied[0]);
    };

    const appendPlan = resolveOrderPdfSketchImageAppendPlan({
      draft: args.draft,
      builtTailPageIndexes: builtTailIndexes,
      importedTailPageIndexes: importedTailIndexes,
    });

    for (const entry of appendPlan) {
      await appendCopiedPage(entry.source === 'built' ? builtSrcDoc : importedSrcDoc, entry.pageIndex);
    }

    if (typeof baseDoc.save !== 'function') return { blob: args.blob, fileName, projectName };
    const outBytes: Uint8Array = await baseDoc.save({ updateFieldAppearances: false });
    const BlobCtor = getBlobCtor(args.winMaybe);
    if (!BlobCtor) return { blob: args.blob, fileName, projectName };

    const ab = new ArrayBuffer(outBytes.byteLength);
    const safeOutBytes = new Uint8Array(ab);
    safeOutBytes.set(outBytes);
    return { blob: new BlobCtor([safeOutBytes], { type: 'application/pdf' }), fileName, projectName };
  } catch {
    return { blob: args.blob, fileName, projectName };
  }
}

export async function buildInteractivePdfBlobForEditorDraft(args: {
  app: unknown;
  winMaybe: Window | null | undefined;
  draft: OrderPdfDraft;
  loadedPdfOriginalBytes: Uint8Array | null | undefined;
  importedTailIndexes: number[] | null | undefined;
}): Promise<InteractivePdfBuildResult> {
  const exp = asExportApiLike(await ensureExportApiReady(args.app));
  const buildFn = exp?.buildOrderPdfInteractiveBlobFromDraft;
  if (!buildFn) throw new Error('אין פונקציה שמחזירה PDF כ-Blob (עדכן את export_canvas.ts)');

  const builtMaybe = await buildFn(args.draft);
  const blob0 = getProp(builtMaybe, 'blob');
  const builtBlob = isBlobLike(blob0) ? blob0 : null;
  if (!builtBlob) throw new Error('יצירת ה-PDF נכשלה');

  return await maybePreserveImportedImagePagesInInteractivePdf({
    blob: builtBlob,
    fileName: String(getProp(builtMaybe, 'fileName') || 'order.pdf'),
    projectName: String(getProp(builtMaybe, 'projectName') || args.draft.projectName || 'פרויקט'),
    draft: args.draft,
    loadedPdfOriginalBytes: args.loadedPdfOriginalBytes,
    importedTailIndexes: args.importedTailIndexes,
    winMaybe: args.winMaybe,
  });
}
