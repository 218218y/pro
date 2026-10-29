// WardrobePro — Export canvas delivery download/DOM helpers (Native ESM)

import type { AppContainer } from '../../../../types/app.js';
import type { CanvasExportDeliveryResult } from '../../../../types';
import {
  getDocumentMaybe,
  shouldFailFast,
  triggerBlobDownloadResultViaBrowser,
  triggerCanvasDownloadResultViaBrowser,
} from '../../services/api.js';
import { _reportExportError } from './export_canvas_core_feedback.js';
import { isCanvasEncodingSecurityError, isFailedResult } from './export_canvas_delivery_shared.js';
import { A4_PAGE_HEIGHT_PT, A4_PAGE_WIDTH_PT, fitPdfImageToPage } from './export_pdf_image_page_layout.js';

export function _downloadBlob(App: AppContainer, blob: Blob, filename: string): void {
  try {
    const result = triggerBlobDownloadResultViaBrowser(App, blob, filename);
    if (isFailedResult(result)) {
      throw new Error(result.message || 'browser blob download unavailable');
    }
  } catch (e) {
    _reportExportError(App, 'downloadBlob', e, { filename });
    if (shouldFailFast(App)) throw e;
  }
}

export function _downloadCanvasDataUrl(App: AppContainer, canvas: HTMLCanvasElement, filename: string): void {
  try {
    const result = triggerCanvasDownloadResultViaBrowser(App, canvas, filename);
    if (isFailedResult(result)) {
      throw new Error(result.message || 'browser canvas download unavailable');
    }
  } catch (e) {
    _reportExportError(App, 'downloadCanvasDataUrl', e, { filename });
    if (shouldFailFast(App)) throw e;
  }
}

export function _createDomCanvas(App: AppContainer, w: number, h: number): HTMLCanvasElement {
  const doc = getDocumentMaybe(App);
  if (!doc) throw new Error('[WardrobePro][ESM] Missing document for canvas export');
  const c = doc.createElement('canvas');
  if (Number.isFinite(w) && w > 0) c.width = w;
  if (Number.isFinite(h) && h > 0) c.height = h;
  return c;
}

export async function exportCanvasAsA4Pdf(
  app: AppContainer,
  canvas: HTMLCanvasElement,
  filename: string,
  toast: (app: AppContainer, msg: string, kind: string) => void
): Promise<CanvasExportDeliveryResult> {
  // Preserve native PNG resolution; physical page sizing belongs to the PDF.
  let pngBlob: Blob;
  try {
    pngBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        blob => (blob ? resolve(blob) : reject(new Error('Canvas PNG encoding returned null'))),
        'image/png'
      );
    });
  } catch (error) {
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
  // Unlike the older best-effort downloads, this operation must reject failure
  // before the action controller can report a successful export.
  const result = triggerBlobDownloadResultViaBrowser(app, blob, filename);
  if (!result.ok) throw new Error(result.message || 'PDF download unavailable');
  toast(app, 'דף ההדמיה בגודל A4 הורד בהצלחה', 'success');
  return { ok: true, delivery: 'download' };
}
