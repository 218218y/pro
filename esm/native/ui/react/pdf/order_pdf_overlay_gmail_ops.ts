import {
  createGmailDraftWithPdfAttachment,
  getGmailComposeAccessToken,
  getGoogleClientIdFromEnvOrDefault,
} from './gmail_draft.js';
import type { InteractivePdfBuildResult, OrderPdfDraft } from './order_pdf_overlay_contracts.js';

type ImagePdfBuildResult = {
  fileName?: string;
  projectName?: string;
  orderNumber?: string;
  pdfBytes: Uint8Array;
};

type RasterizedImagePdfResult = {
  outBytes: Uint8Array;
  outName: string;
};

type GmailTemplateVars = {
  projectName: string;
  orderNumber: string;
  fileName: string;
};

type OrderPdfOverlayGmailOpsDeps = {
  docMaybe: Document | null;
  winMaybe: Window | null;
  applyTemplate: (template: string, vars: GmailTemplateVars) => string;
  subjectTemplate: string;
  bodyTemplate: string;
  buildImagePdfAttachmentFromDraft: (draft: OrderPdfDraft) => Promise<ImagePdfBuildResult>;
  buildInteractivePdfBlobForEditorDraft: (draft: OrderPdfDraft) => Promise<InteractivePdfBuildResult>;
  rasterizeInteractivePdfBytesToImagePdfBytes: (args: {
    inBytes: Uint8Array;
    baseFileName: string;
    draft: OrderPdfDraft;
  }) => Promise<RasterizedImagePdfResult>;
  triggerBlobDownloadViaBrowser: (
    ctx: { docMaybe: Document | null; winMaybe: Window | null },
    blob: Blob,
    fileName: string
  ) => boolean;
};

function openGmailDraftBrowserTab(args: {
  winMaybe: Window | null;
  draftId: string;
  draftUrl?: string | null;
}): boolean {
  const { winMaybe, draftId, draftUrl } = args;
  const url = draftUrl || `https://mail.google.com/mail/#drafts/${encodeURIComponent(draftId)}`;

  try {
    if (!winMaybe || typeof winMaybe.open !== 'function') return false;

    // Deliberately do not pass a third windowFeatures argument. In Chromium,
    // sizing/legacy feature strings request a minimal popup-style window.
    // A plain _blank open lets the browser use its normal tab UI.
    const opened = winMaybe.open(url, '_blank');
    if (!opened) return false;

    try {
      opened.opener = null;
    } catch {
      // Cross-origin WindowProxy implementations may reject opener writes.
    }
    try {
      if (typeof opened.focus === 'function') opened.focus();
    } catch {
      // ignore
    }
    return true;
  } catch {
    return false;
  }
}

async function createAndOpenGmailDraft(args: {
  docMaybe: Document | null;
  winMaybe: Window | null;
  applyTemplate: (template: string, vars: GmailTemplateVars) => string;
  subjectTemplate: string;
  bodyTemplate: string;
  projectName: string;
  orderNumber: string;
  fileName: string;
  pdfBytes: Uint8Array;
  accessToken?: string;
}): Promise<{ opened: boolean }> {
  const {
    docMaybe,
    winMaybe,
    applyTemplate,
    subjectTemplate,
    bodyTemplate,
    projectName,
    orderNumber,
    fileName,
    pdfBytes,
    accessToken,
  } = args;

  const clientId = getGoogleClientIdFromEnvOrDefault();
  const token = accessToken || (await getGmailComposeAccessToken({ doc: docMaybe, win: winMaybe, clientId }));
  const fetchFn: typeof fetch =
    winMaybe && typeof winMaybe.fetch === 'function' ? winMaybe.fetch.bind(winMaybe) : fetch;
  const subject = applyTemplate(subjectTemplate, { projectName, orderNumber, fileName });
  const bodyText = applyTemplate(bodyTemplate, { projectName, orderNumber, fileName });

  const { draftId, draftUrl } = await createGmailDraftWithPdfAttachment({
    win: winMaybe,
    fetchFn,
    accessToken: token,
    subject,
    bodyText,
    fileName,
    pdfBytes,
  });

  return {
    opened: openGmailDraftBrowserTab({
      winMaybe,
      draftId,
      draftUrl,
    }),
  };
}

export function createOrderPdfOverlayGmailOps(deps: OrderPdfOverlayGmailOpsDeps) {
  const {
    docMaybe,
    winMaybe,
    applyTemplate,
    subjectTemplate,
    bodyTemplate,
    buildImagePdfAttachmentFromDraft,
    buildInteractivePdfBlobForEditorDraft,
    rasterizeInteractivePdfBytesToImagePdfBytes,
    triggerBlobDownloadViaBrowser,
  } = deps;

  async function exportInteractiveToGmail(draft: OrderPdfDraft): Promise<{ opened: boolean }> {
    // Keep the PDF editor tab active while the heavy PDF/raster work runs.
    // Gmail is opened only after the draft exists, so no placeholder tab steals focus.
    const clientId = getGoogleClientIdFromEnvOrDefault();
    const accessToken = await getGmailComposeAccessToken({ doc: docMaybe, win: winMaybe, clientId });
    const built = await buildImagePdfAttachmentFromDraft(draft);
    const fileName = String(built.fileName || 'order_image.pdf');
    const projectName = String(built.projectName || draft.projectName || 'פרויקט');
    const orderNumber = String(built.orderNumber || draft.orderNumber || '');

    return await createAndOpenGmailDraft({
      docMaybe,
      winMaybe,
      applyTemplate,
      subjectTemplate,
      bodyTemplate,
      projectName,
      orderNumber,
      fileName,
      pdfBytes: built.pdfBytes,
      accessToken,
    });
  }

  async function exportInteractiveDownloadAndGmail(
    draft: OrderPdfDraft
  ): Promise<{ opened: boolean; downloaded: boolean }> {
    // Keep all PDF work in the current focused tab; Gmail is opened only after the draft exists.
    const clientId = getGoogleClientIdFromEnvOrDefault();
    const accessToken = await getGmailComposeAccessToken({ doc: docMaybe, win: winMaybe, clientId });
    const built = await buildInteractivePdfBlobForEditorDraft(draft);
    const blob = built.blob;
    const fileName = String(built.fileName || 'order.pdf');
    const projectName = String(built.projectName || draft.projectName || 'פרויקט');
    const orderNumber = String(draft.orderNumber || '');
    const interactiveBytes = new Uint8Array(await blob.arrayBuffer());

    const downloaded = triggerBlobDownloadViaBrowser({ docMaybe, winMaybe }, blob, fileName);
    const { outBytes, outName } = await rasterizeInteractivePdfBytesToImagePdfBytes({
      inBytes: interactiveBytes,
      baseFileName: fileName,
      draft,
    });

    const result = await createAndOpenGmailDraft({
      docMaybe,
      winMaybe,
      applyTemplate,
      subjectTemplate,
      bodyTemplate,
      projectName,
      orderNumber,
      fileName: outName,
      pdfBytes: outBytes,
      accessToken,
    });

    return { opened: result.opened, downloaded };
  }

  return {
    exportInteractiveToGmail,
    exportInteractiveDownloadAndGmail,
  };
}
