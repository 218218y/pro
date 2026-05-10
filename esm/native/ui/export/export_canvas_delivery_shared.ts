// WardrobePro — Export canvas delivery shared helpers (Native ESM)

export interface CanvasExportOptions {
  mode?: string;
  clipboardFailureMode?: string;
  toastDownload?: string;
  toastClipboardSuccess?: string;
  toastClipboardNotSupported?: string;
  toastClipboardBlocked?: string;
  confirmTitle?: string;
  confirmMsg?: string;
}

type FailedResult = { ok: false; message?: string };
type FailedClipboardResult = { ok: false; reason: 'unavailable' | 'error'; message?: string };

export function isFailedResult(value: { ok: boolean }): value is FailedResult {
  return value.ok === false;
}

export function isFailedClipboardResult(value: { ok: boolean }): value is FailedClipboardResult {
  return value.ok === false;
}

export type NormalizedCanvasExportOptions = {
  mode: string;
  clipboardFailureMode: string;
  allowDownloadOnClipboardFailure: boolean;
  toastDownload: string;
  toastClipboardSuccess: string;
  toastClipboardNotSupported: string;
  toastClipboardBlocked: string;
  confirmTitle: string;
  confirmMsg: string;
};

export function normalizeCanvasExportOptions(
  opts?: Partial<CanvasExportOptions> | null
): NormalizedCanvasExportOptions {
  const o = opts && typeof opts === 'object' ? opts : {};
  const mode = o.mode ? String(o.mode) : 'download';
  const clipboardFailureMode = o.clipboardFailureMode ? String(o.clipboardFailureMode) : 'download';
  return {
    mode,
    clipboardFailureMode,
    allowDownloadOnClipboardFailure: clipboardFailureMode !== 'none',
    toastDownload:
      typeof o.toastDownload === 'string' && o.toastDownload.trim() ? o.toastDownload : 'התמונה ירדה למחשב',
    toastClipboardSuccess:
      typeof o.toastClipboardSuccess === 'string' && o.toastClipboardSuccess.trim()
        ? o.toastClipboardSuccess
        : 'התמונה הועתקה ללוח בהצלחה!',
    toastClipboardNotSupported:
      typeof o.toastClipboardNotSupported === 'string' && o.toastClipboardNotSupported.trim()
        ? o.toastClipboardNotSupported
        : 'הדפדפן לא תומך בהעתקה ישירה ללוח',
    toastClipboardBlocked:
      typeof o.toastClipboardBlocked === 'string' && o.toastClipboardBlocked.trim()
        ? o.toastClipboardBlocked
        : 'הדפדפן חסם את ההעתקה ללוח',
    confirmTitle:
      typeof o.confirmTitle === 'string' && o.confirmTitle.trim() ? o.confirmTitle : 'שגיאת העתקה',
    confirmMsg:
      typeof o.confirmMsg === 'string' && o.confirmMsg.trim()
        ? o.confirmMsg
        : 'הדפדפן חסם את ההעתקה הישירה. האם להוריד את התמונה לקובץ?',
  };
}
