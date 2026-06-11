import type {
  ExportImagePdfActionResult,
  ExportInteractiveActionResult,
} from './order_pdf_overlay_contracts.js';
import {
  buildExportImagePdfError,
  buildExportInteractiveError,
} from './order_pdf_overlay_export_commands_errors.js';
import type {
  DownloadImagePdfArgs,
  DownloadInteractivePdfArgs,
} from './order_pdf_overlay_export_commands_types.js';

export async function exportOrderPdfInteractiveWithDeps(
  args: DownloadInteractivePdfArgs
): Promise<ExportInteractiveActionResult> {
  const { draft, buildInteractivePdfBlob, triggerBlobDownloadViaBrowser, docMaybe, winMaybe } = args;
  if (!draft) return { ok: false, kind: 'export-interactive', reason: 'not-ready' };

  try {
    const built = await buildInteractivePdfBlob(draft);
    const downloadStarted = triggerBlobDownloadViaBrowser({ docMaybe, winMaybe }, built.blob, built.fileName);
    return { ok: true, kind: 'export-interactive', downloadStarted };
  } catch (error) {
    return buildExportInteractiveError(error);
  }
}

export async function exportOrderPdfImageWithDeps(
  args: DownloadImagePdfArgs
): Promise<ExportImagePdfActionResult> {
  const {
    draft,
    imagePdfBusy,
    buildImagePdfAttachmentFromDraft,
    triggerBlobDownloadViaBrowser,
    docMaybe,
    winMaybe,
  } = args;
  if (!draft) return { ok: false, kind: 'export-image-pdf', reason: 'not-ready' };
  if (imagePdfBusy) return { ok: false, kind: 'export-image-pdf', reason: 'busy' };

  try {
    const built = await buildImagePdfAttachmentFromDraft(draft);
    const fileName = String(built.fileName || 'order_image.pdf');
    const downloadStarted = triggerBlobDownloadViaBrowser({ docMaybe, winMaybe }, built.blob, fileName);
    return { ok: true, kind: 'export-image-pdf', downloadStarted };
  } catch (error) {
    return buildExportImagePdfError(error);
  }
}
