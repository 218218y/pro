// Create a real A4 PDF page, rather than relying on Acrobat's PNG-to-page DPI policy.
import type { AppContainer, CanvasExportDeliveryResult } from '../../../../types';
import { triggerBlobDownloadResultViaBrowser } from '../../services/api.js';
import { A4_PAGE_HEIGHT_PT, A4_PAGE_WIDTH_PT, fitPdfImageToPage } from './export_pdf_image_page_layout.js';
import { isCanvasEncodingSecurityError } from './export_canvas_delivery_shared.js';

export async function exportCanvasAsA4Pdf(
  app: AppContainer,
  canvas: HTMLCanvasElement,
  filename: string,
  toast: (app: AppContainer, msg: string, kind: string) => void
): Promise<CanvasExportDeliveryResult> {
  // The PNG is encoded at its original full resolution; no downsampling to
  // a guessed Acrobat clipboard DPI is needed.
  let pngBlob: Blob;
  try {
    pngBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        blob => (blob ? resolve(blob) : reject(new Error('Canvas PNG encoding returned null'))),
        'image/png'
      );
    });
  } catch (error) {
    // The workflow uses the same logo security-recovery logic as clipboard exports.
    return {
      ok: false,
      stage: 'encoding',
      reason: isCanvasEncodingSecurityError(error) ? 'security' : 'error',
      error,
    };
  }

  const { PDFDocument } = await import('pdf-lib');
  const pdf = await PDFDocument.create();
  const image = await pdf.embedPng(new Uint8Array(await pngBlob.arrayBuffer()));
  const page = pdf.addPage([A4_PAGE_WIDTH_PT, A4_PAGE_HEIGHT_PT]);
  page.drawImage(
    image,
    fitPdfImageToPage({
      pageWidth: A4_PAGE_WIDTH_PT,
      pageHeight: A4_PAGE_HEIGHT_PT,
      imageWidth: image.width,
      imageHeight: image.height,
      margin: 18,
    })
  );
  const pdfBytes = await pdf.save();
  const blob = new Blob([Uint8Array.from(pdfBytes).buffer], { type: 'application/pdf' });
  const result = triggerBlobDownloadResultViaBrowser(app, blob, filename);
  if (!result.ok) throw new Error(result.message || 'PDF download unavailable');
  toast(app, 'דף ההדמיה בגודל A4 הורד בהצלחה', 'success');
  return { ok: true, delivery: 'download' };
}
