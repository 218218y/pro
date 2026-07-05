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

function openGmailDraftWindow(args: {
  winMaybe: Window | null;
  draftId: string;
  draftUrl?: string | null;
}): boolean {
  const { winMaybe, draftId, draftUrl } = args;
  const url = draftUrl || `https://mail.google.com/mail/#drafts/${encodeURIComponent(draftId)}`;
  try {
    return !!(winMaybe && typeof winMaybe.open === 'function' && winMaybe.open(url, '_blank'));
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
  } = args;

  const clientId = getGoogleClientIdFromEnvOrDefault();
  const token = await getGmailComposeAccessToken({ doc: docMaybe, win: winMaybe, clientId });
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
    opened: openGmailDraftWindow({
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
    });
  }

  async function exportInteractiveDownloadAndGmail(
    draft: OrderPdfDraft
  ): Promise<{ opened: boolean; downloaded: boolean }> {
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
    });

    return { opened: result.opened, downloaded };
  }

  return {
    exportInteractiveToGmail,
    exportInteractiveDownloadAndGmail,
  };
}
