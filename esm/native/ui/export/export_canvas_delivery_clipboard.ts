// WardrobePro — Export canvas delivery clipboard flow helpers (Native ESM)

import type { AppContainer } from '../../../../types/app.js';
import { shouldFailFast, writeClipboardItemsResultViaBrowser } from '../../services/api.js';
import {
  _confirmOrProceed,
  _exportReportThrottled,
  _reportExportError,
  _toast,
  readBrowserNamespace,
  readClipboardItemCtor,
} from './export_canvas_core_feedback.js';
import { _downloadBlob, _downloadCanvasDataUrl } from './export_canvas_delivery_download.js';
import {
  type CanvasExportDeliveryResult,
  type CanvasExportOptions,
  isFailedClipboardResult,
  normalizeCanvasExportOptions,
} from './export_canvas_delivery_shared.js';

function isCanvasSecurityError(error: unknown): boolean {
  const value = error && (typeof error === 'object' || typeof error === 'function') ? Object(error) : null;
  const name = value && typeof value.name === 'string' ? value.name.trim().toLowerCase() : '';
  if (name === 'securityerror') return true;
  const message =
    value && typeof value.message === 'string'
      ? value.message.trim().toLowerCase()
      : typeof error === 'string'
        ? error.trim().toLowerCase()
        : '';
  return /taint|security|origin-clean|cross-origin/.test(message);
}

function encodeCanvasPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    try {
      canvas.toBlob((blob: Blob | null) => {
        if (blob) {
          resolve(blob);
          return;
        }
        reject(new Error('canvas PNG encoding returned null'));
      }, 'image/png');
    } catch (error) {
      reject(error);
    }
  });
}

export async function _handleCanvasExport(
  App: AppContainer,
  canvas: HTMLCanvasElement,
  filename: string,
  opts?: Partial<CanvasExportOptions> | null
): Promise<CanvasExportDeliveryResult> {
  const options = normalizeCanvasExportOptions(opts);
  const preferClipboard = options.mode === 'clipboard';

  if (!preferClipboard) {
    _downloadCanvasDataUrl(App, canvas, filename);
    _toast(App, options.toastDownload, 'success');
    return { ok: true, delivery: 'download' };
  }

  const browser = readBrowserNamespace(App);
  const ClipboardItemCtor = readClipboardItemCtor(browser);
  if (!ClipboardItemCtor || typeof ClipboardItemCtor !== 'function') {
    if (options.allowDownloadOnClipboardFailure) {
      _downloadCanvasDataUrl(App, canvas, filename);
      _toast(App, `${options.toastClipboardNotSupported} — ירד קובץ במקום`, 'info');
      return { ok: true, delivery: 'download' };
    }
    _toast(App, options.toastClipboardNotSupported, 'error');
    return { ok: false, stage: 'clipboard', reason: 'unavailable' };
  }

  let blob: Blob;
  try {
    blob = await encodeCanvasPngBlob(canvas);
  } catch (error) {
    _exportReportThrottled(App, 'handleCanvasExport.clipboardToBlob', error, { throttleMs: 2000 });
    if (shouldFailFast(App)) throw error;
    const reason = isCanvasSecurityError(error) ? 'security' : 'error';
    if (reason !== 'security' || !options.deferSecurityEncodingFailureToast) {
      _toast(App, options.toastClipboardBlocked, 'error');
    }
    return { ok: false, stage: 'encoding', reason, error };
  }

  let item: ClipboardItem;
  try {
    item = new ClipboardItemCtor({ 'image/png': blob });
  } catch (error) {
    _reportExportError(App, 'handleCanvasExport.clipboardItem', error, {
      mode: options.mode,
      clipboardFailureMode: options.clipboardFailureMode,
      filename,
    });
    if (shouldFailFast(App)) throw error;
    if (!options.allowDownloadOnClipboardFailure) {
      _toast(App, options.toastClipboardBlocked, 'error');
      return { ok: false, stage: 'clipboard', reason: 'error' };
    }
    _downloadBlob(App, blob, filename);
    _toast(App, options.toastDownload, 'success');
    return { ok: true, delivery: 'download' };
  }

  const result = await writeClipboardItemsResultViaBrowser(App, [item]);
  if (result.ok) {
    _toast(App, options.toastClipboardSuccess, 'success');
    return { ok: true, delivery: 'clipboard' };
  }

  if (!isFailedClipboardResult(result)) {
    return { ok: false, stage: 'clipboard', reason: 'error' };
  }

  if (result.reason === 'error') {
    const error = new Error(result.message || 'clipboard write failed');
    _reportExportError(App, 'handleCanvasExport.clipboardWrite', error, {
      mode: options.mode,
      clipboardFailureMode: options.clipboardFailureMode,
      filename,
    });
    if (shouldFailFast(App)) throw error;
  }

  if (result.reason === 'unavailable') {
    if (options.allowDownloadOnClipboardFailure) {
      _downloadBlob(App, blob, filename);
      _toast(App, `${options.toastClipboardNotSupported} — ירד קובץ במקום`, 'info');
      return { ok: true, delivery: 'download' };
    }
    _toast(App, options.toastClipboardNotSupported, 'error');
    return {
      ok: false,
      stage: 'clipboard',
      reason: 'unavailable',
      ...(result.message ? { message: result.message } : {}),
    };
  }

  if (!options.allowDownloadOnClipboardFailure) {
    const detail =
      typeof result.message === 'string' && result.message.trim() ? `: ${result.message.trim()}` : '';
    _toast(App, `${options.toastClipboardBlocked}${detail}`, 'error');
    return {
      ok: false,
      stage: 'clipboard',
      reason: 'error',
      ...(result.message ? { message: result.message } : {}),
    };
  }

  let downloaded = false;
  const confirmation = _confirmOrProceed(App, options.confirmTitle, options.confirmMsg, () => {
    _downloadBlob(App, blob, filename);
    _toast(App, options.toastDownload, 'success');
    downloaded = true;
  });
  await Promise.resolve(confirmation);
  return downloaded
    ? { ok: true, delivery: 'download' }
    : {
        ok: false,
        stage: 'clipboard',
        reason: 'error',
        ...(result.message ? { message: result.message } : {}),
      };
}
