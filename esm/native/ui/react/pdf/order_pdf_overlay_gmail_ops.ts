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

function reserveGmailDraftWindow(winMaybe: Window | null): Window | null {
  try {
    if (!winMaybe || typeof winMaybe.open !== 'function') return null;
    const popup = winMaybe.open('', '_blank');
    if (!popup) return null;

    try {
      popup.document.title = 'Gmail';
      popup.document.body.dir = 'rtl';
      popup.document.body.innerHTML =
        '<main style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;padding:24px;line-height:1.5;color:#0f172a">' +
        '<h1 style="font-size:18px;margin:0 0 8px">מכין טיוטת Gmail…</h1>' +
        '<p style="margin:0;color:#475569">אפשר להשאיר את החלון פתוח. הוא יעבור לטיוטה כשה-PDF יהיה מוכן.</p>' +
        '</main>';
    } catch {
      // Some browsers prevent writing to the reserved popup. Navigation later may still work.
    }

    return popup;
  } catch {
    return null;
  }
}

function closeReservedGmailDraftWindow(reservedWindow: Window | null | undefined): void {
  try {
    if (reservedWindow && !reservedWindow.closed) reservedWindow.close();
  } catch {
    // ignore
  }
}

function openGmailDraftWindow(args: {
  winMaybe: Window | null;
  draftId: string;
  draftUrl?: string | null;
  reservedWindow?: Window | null;
}): boolean {
  const { winMaybe, draftId, draftUrl, reservedWindow } = args;
  const url = draftUrl || `https://mail.google.com/mail/#drafts/${encodeURIComponent(draftId)}`;

  try {
    if (reservedWindow && !reservedWindow.closed) {
      try {
        reservedWindow.opener = null;
      } catch {
        // ignore
      }
      reservedWindow.location.replace(url);
      return true;
    }
  } catch {
    // Fall through to a normal popup attempt.
  }

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
  accessToken?: string;
  reservedWindow?: Window | null;
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
    reservedWindow,
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
    opened: openGmailDraftWindow({
      winMaybe,
      draftId,
      draftUrl,
      reservedWindow,
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
    const reservedWindow = reserveGmailDraftWindow(winMaybe);
    try {
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
        reservedWindow,
      });
    } catch (e) {
      closeReservedGmailDraftWindow(reservedWindow);
      throw e;
    }
  }

  async function exportInteractiveDownloadAndGmail(
    draft: OrderPdfDraft
  ): Promise<{ opened: boolean; downloaded: boolean }> {
    const reservedWindow = reserveGmailDraftWindow(winMaybe);
    try {
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
        reservedWindow,
      });

      return { opened: result.opened, downloaded };
    } catch (e) {
      closeReservedGmailDraftWindow(reservedWindow);
      throw e;
    }
  }

  return {
    exportInteractiveToGmail,
    exportInteractiveDownloadAndGmail,
  };
}
