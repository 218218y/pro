import { triggerBlobDownloadResultViaBrowser } from '../services/api.js';
import { normalizeUnknownError, reportError } from '../services/api.js';

export type BrowserFileDownloadResult =
  | { ok: true }
  | { ok: false; reason: 'download-unavailable' | 'error'; message?: string };

type DownloadContextLike = {
  docMaybe?: Document | null;
  winMaybe?: Window | null;
};

export function normalizeDownloadFilename(
  fileName: unknown,
  defaultName: string,
  extension?: string
): string {
  const raw = typeof fileName === 'string' ? fileName.trim() : '';
  const safeBase = raw || String(defaultName || 'download');
  const ext = typeof extension === 'string' && extension.trim() ? extension.trim() : '';
  if (!ext) return safeBase;
  return safeBase.toLowerCase().endsWith(ext.toLowerCase()) ? safeBase : `${safeBase}${ext}`;
}

function reportBrowserFileDownloadError(appOrCtx: unknown, op: string, error: unknown): void {
  reportError(
    appOrCtx,
    error,
    { where: 'native/ui/browser_file_download', op, fatal: false },
    { consoleFallback: false }
  );
}

function normalizeBrowserFileDownloadResult(result: {
  ok: boolean;
  reason?: string;
  message?: string;
}): BrowserFileDownloadResult {
  if (result.ok) return { ok: true };
  const reason = result.reason === 'error' ? 'error' : 'download-unavailable';
  const message = typeof result.message === 'string' ? result.message.trim() : '';
  return message ? { ok: false, reason, message } : { ok: false, reason };
}

export function downloadTextResultViaBrowser(
  appOrCtx: unknown,
  fileName: string,
  text: string,
  mimeType = 'text/plain;charset=utf-8'
): BrowserFileDownloadResult {
  try {
    const blob = new Blob([String(text || '')], { type: mimeType || 'text/plain;charset=utf-8' });
    return normalizeBrowserFileDownloadResult(
      triggerBlobDownloadResultViaBrowser(appOrCtx, blob, String(fileName || 'download.txt'))
    );
  } catch (error) {
    reportBrowserFileDownloadError(appOrCtx, 'downloadText', error);
    const { message } = normalizeUnknownError(error, 'browser text download failed');
    return { ok: false, reason: 'error', message };
  }
}

export function downloadTextViaBrowser(
  appOrCtx: unknown,
  fileName: string,
  text: string,
  mimeType = 'text/plain;charset=utf-8'
): boolean {
  return downloadTextResultViaBrowser(appOrCtx, fileName, text, mimeType).ok;
}

export function downloadJsonTextResultViaBrowser(
  appOrCtx: unknown,
  fileName: string,
  jsonText: string
): BrowserFileDownloadResult {
  return downloadTextResultViaBrowser(appOrCtx, fileName, jsonText, 'application/json;charset=utf-8');
}

export function downloadJsonTextViaBrowser(appOrCtx: unknown, fileName: string, jsonText: string): boolean {
  return downloadJsonTextResultViaBrowser(appOrCtx, fileName, jsonText).ok;
}

export function downloadJsonObjectResultViaBrowser(
  appOrCtx: unknown,
  fileName: string,
  value: unknown,
  opts?: { spacing?: number; stringify?: ((value: unknown) => string) | null } | null
): BrowserFileDownloadResult {
  try {
    const stringify = opts && typeof opts.stringify === 'function' ? opts.stringify : null;
    const jsonText = stringify
      ? stringify(value)
      : JSON.stringify(value, null, opts && typeof opts.spacing === 'number' ? opts.spacing : 2);
    return downloadJsonTextResultViaBrowser(appOrCtx, fileName, jsonText);
  } catch (error) {
    reportBrowserFileDownloadError(appOrCtx, 'downloadJsonObject.stringify', error);
    const { message } = normalizeUnknownError(error, 'browser json download failed');
    return { ok: false, reason: 'error', message };
  }
}

export function downloadJsonObjectViaBrowser(
  appOrCtx: unknown,
  fileName: string,
  value: unknown,
  opts?: { spacing?: number; stringify?: ((value: unknown) => string) | null } | null
): boolean {
  return downloadJsonObjectResultViaBrowser(appOrCtx, fileName, value, opts).ok;
}

export type { DownloadContextLike };
