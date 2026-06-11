import type { OrderPdfDraft } from './order_pdf_overlay_contracts.js';
import { getBlobCtor } from './order_pdf_overlay_runtime.js';
import { createOrderPdfOverlayImagePdfOps } from './order_pdf_overlay_export_ops_image_pdf.js';
import type { OrderPdfOverlayExportOpsDeps } from './order_pdf_overlay_export_ops_shared.js';

export function createOrderPdfOverlayExportOps(deps: OrderPdfOverlayExportOpsDeps) {
  const { winMaybe, _buildInteractivePdfBlobForEditorDraft } = deps;
  const { rasterizeInteractivePdfBytesToImagePdfBytes } = createOrderPdfOverlayImagePdfOps(deps);

  async function buildImagePdfAttachmentFromDraft(draft: OrderPdfDraft): Promise<{
    blob: Blob;
    pdfBytes: Uint8Array;
    fileName: string;
    projectName: string;
    orderNumber: string;
  }> {
    const built = await _buildInteractivePdfBlobForEditorDraft(draft);
    if (!built || !built.blob) throw new Error('יצירת ה-PDF נכשלה');

    const inBlob = built.blob;
    const baseFileName: string = String(built.fileName || 'order.pdf');
    const projectName: string = String(built.projectName || draft.projectName || 'פרויקט');
    const orderNumber: string = String(draft.orderNumber || '');
    const inBytes = new Uint8Array(await inBlob.arrayBuffer());

    const { outBytes, outName } = await rasterizeInteractivePdfBytesToImagePdfBytes({
      inBytes,
      baseFileName,
      draft,
    });

    const BlobCtor = getBlobCtor(winMaybe ?? null);
    if (!BlobCtor) throw new Error('הדפסה לא זמינה (אין Blob)');

    const outBlobBytes = new Uint8Array(outBytes.byteLength);
    outBlobBytes.set(outBytes);
    const outBlob = new BlobCtor([outBlobBytes], { type: 'application/pdf' });
    return { blob: outBlob, pdfBytes: outBytes, fileName: outName, projectName, orderNumber };
  }

  return {
    rasterizeInteractivePdfBytesToImagePdfBytes,
    buildImagePdfAttachmentFromDraft,
  };
}
