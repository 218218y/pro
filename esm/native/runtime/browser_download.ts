import type { UnknownRecord } from '../../../types/index.js';

export type BrowserDownloadResult =
  | { ok: true }
  | { ok: false; reason: 'unavailable' | 'error'; message?: string };

import { getDocumentMaybe, getWindowMaybe } from './browser_env.js';
import { buildErrorResult as buildNormalizedErrorResult } from './error_normalization.js';
import { reportError } from './errors.js';

type WindowDownloadLike = Window & {
  URL?: {
    createObjectURL?: (obj: Blob) => string;
    revokeObjectURL?: (url: string) => void;
  };
};

function asRecord(v: unknown): UnknownRecord | null {
  return v && (typeof v === 'object' || typeof v === 'function') ? Object(v) : null;
}

function isDocumentLike(value: unknown): value is Document {
  const rec = asRecord(value);
  return !!rec && typeof rec.createElement === 'function';
}

function isWindowDownloadLike(value: unknown): value is WindowDownloadLike {
  return !!value && typeof value === 'object';
}

function buildUnavailableResult(message?: string): BrowserDownloadResult {
  const msg = typeof message === 'string' ? message.trim() : '';
  return msg ? { ok: false, reason: 'unavailable', message: msg } : { ok: false, reason: 'unavailable' };
}

function buildErrorResult(error: unknown, defaultMessage: string): BrowserDownloadResult {
  return buildNormalizedErrorResult('error', error, defaultMessage);
}

function reportBrowserDownloadError(appOrCtx: unknown, op: string, error: unknown): void {
  reportError(
    appOrCtx,
    error,
    { where: 'native/runtime/browser_download', op, fatal: false },
    { consoleFallback: false }
  );
}

function readContextDocument(rec: UnknownRecord | null): Document | null {
  return rec && isDocumentLike(rec.docMaybe) ? rec.docMaybe : null;
}

function readContextWindow(rec: UnknownRecord | null): WindowDownloadLike | null {
  return rec && isWindowDownloadLike(rec.winMaybe) ? rec.winMaybe : null;
}

function resolveDownloadContext(appOrCtx: unknown): { doc: Document | null; win: WindowDownloadLike | null } {
  const rec = asRecord(appOrCtx);
  const ctxDoc = readContextDocument(rec);
  const ctxWin = readContextWindow(rec);

  const doc =
    ctxDoc ||
    (ctxWin && isDocumentLike(ctxWin.document) ? ctxWin.document : null) ||
    getDocumentMaybe(appOrCtx);
  const win =
    ctxWin ||
    (doc && isWindowDownloadLike(doc.defaultView) ? doc.defaultView : null) ||
    (isWindowDownloadLike(getWindowMaybe(appOrCtx)) ? getWindowMaybe(appOrCtx) : null);

  return { doc: doc || null, win: win || null };
}

export function triggerHrefDownloadResultViaBrowser(
  appOrCtx: unknown,
  href: string,
  fileName: string,
  opts?: { rel?: string; hidden?: boolean } | null
): BrowserDownloadResult {
  const { doc } = resolveDownloadContext(appOrCtx);
  if (!doc || !doc.body || typeof doc.createElement !== 'function')
    return buildUnavailableResult('browser href download unavailable');

  try {
    const a = doc.createElement('a');
    a.href = String(href || '');
    a.download = String(fileName || '');
    if (opts && typeof opts.rel === 'string' && opts.rel.trim()) a.rel = opts.rel;
    if (!opts || opts.hidden !== false) a.style.display = 'none';
    doc.body.appendChild(a);
    a.click();
    a.remove();
    return { ok: true };
  } catch (error) {
    reportBrowserDownloadError(appOrCtx, 'triggerHrefDownload', error);
    return buildErrorResult(error, 'browser href download failed');
  }
}

export function triggerHrefDownloadViaBrowser(
  appOrCtx: unknown,
  href: string,
  fileName: string,
  opts?: { rel?: string; hidden?: boolean } | null
): boolean {
  return triggerHrefDownloadResultViaBrowser(appOrCtx, href, fileName, opts).ok;
}

export function triggerBlobDownloadResultViaBrowser(
  appOrCtx: unknown,
  blob: Blob,
  fileName: string,
  opts?: { rel?: string; revokeDelayMs?: number } | null
): BrowserDownloadResult {
  const { win } = resolveDownloadContext(appOrCtx);
  const URL_ = win && win.URL ? win.URL : null;
  if (!URL_ || typeof URL_.createObjectURL !== 'function')
    return buildUnavailableResult('browser blob download unavailable');

  try {
    const href = URL_.createObjectURL(blob);
    const result = triggerHrefDownloadResultViaBrowser(appOrCtx, href, fileName, {
      rel: opts && typeof opts.rel === 'string' ? opts.rel : 'noopener',
      hidden: true,
    });

    const revoke = typeof URL_.revokeObjectURL === 'function' ? URL_.revokeObjectURL.bind(URL_) : null;
    if (revoke) {
      const delay =
        opts && typeof opts.revokeDelayMs === 'number' && Number.isFinite(opts.revokeDelayMs)
          ? Math.max(0, opts.revokeDelayMs)
          : 250;
      if (win && typeof win.setTimeout === 'function') {
        win.setTimeout(() => {
          try {
            revoke(href);
          } catch {
            // ignore revoke failure
          }
        }, delay);
      } else {
        try {
          revoke(href);
        } catch {
          // ignore revoke failure
        }
      }
    }

    return result;
  } catch (error) {
    reportBrowserDownloadError(appOrCtx, 'triggerBlobDownload', error);
    return buildErrorResult(error, 'browser blob download failed');
  }
}

export function triggerBlobDownloadViaBrowser(
  appOrCtx: unknown,
  blob: Blob,
  fileName: string,
  opts?: { rel?: string; revokeDelayMs?: number } | null
): boolean {
  return triggerBlobDownloadResultViaBrowser(appOrCtx, blob, fileName, opts).ok;
}

export function triggerCanvasDownloadResultViaBrowser(
  appOrCtx: unknown,
  canvas: HTMLCanvasElement,
  fileName: string,
  opts?: { mimeType?: string } | null
): BrowserDownloadResult {
  try {
    const mimeType =
      opts && typeof opts.mimeType === 'string' && opts.mimeType.trim() ? opts.mimeType : 'image/png';
    const href = canvas.toDataURL(mimeType);
    return triggerHrefDownloadResultViaBrowser(appOrCtx, href, fileName, { hidden: true });
  } catch (error) {
    reportBrowserDownloadError(appOrCtx, 'triggerCanvasDownload', error);
    return buildErrorResult(error, 'browser canvas download failed');
  }
}

export function triggerCanvasDownloadViaBrowser(
  appOrCtx: unknown,
  canvas: HTMLCanvasElement,
  fileName: string,
  opts?: { mimeType?: string } | null
): boolean {
  return triggerCanvasDownloadResultViaBrowser(appOrCtx, canvas, fileName, opts).ok;
}
