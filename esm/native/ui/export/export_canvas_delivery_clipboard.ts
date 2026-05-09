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
import { _downloadCanvasDataUrl } from './export_canvas_delivery_download.js';
import {
  type CanvasExportOptions,
  isFailedClipboardResult,
  normalizeCanvasExportOptions,
} from './export_canvas_delivery_shared.js';

export function _handleCanvasExport(
  App: AppContainer,
  canvas: HTMLCanvasElement,
  filename: string,
  opts?: Partial<CanvasExportOptions> | null
): void {
  const options = normalizeCanvasExportOptions(opts);
  const preferClipboard = options.mode === 'clipboard';

  if (!preferClipboard) {
    _downloadCanvasDataUrl(App, canvas, filename);
    _toast(App, options.toastDownload, 'success');
    return;
  }

  try {
    const browser = readBrowserNamespace(App);
    const ClipboardItemCtor = readClipboardItemCtor(browser);

    if (!ClipboardItemCtor || typeof ClipboardItemCtor !== 'function') {
      if (options.allowDownloadOnClipboardFailure) {
        _downloadCanvasDataUrl(App, canvas, filename);
        _toast(App, `${options.toastClipboardNotSupported} — ירד קובץ במקום`, 'info');
      } else {
        _toast(App, options.toastClipboardNotSupported, 'error');
      }
      return;
    }

    const blobPromise: Promise<Blob> = new Promise<Blob>((resolve, reject) => {
      try {
        canvas.toBlob((b: Blob | null) => {
          if (b) resolve(b);
          else reject(new Error('toBlob returned null'));
        }, 'image/png');
      } catch (e) {
        _exportReportThrottled(App, 'handleCanvasExport.clipboardToBlob', e, { throttleMs: 2000 });
        reject(e);
      }
    });

    const item = new ClipboardItemCtor({ 'image/png': blobPromise });
    void writeClipboardItemsResultViaBrowser(App, [item]).then(result => {
      if (result.ok) {
        _toast(App, options.toastClipboardSuccess, 'success');
        return;
      }

      if (!isFailedClipboardResult(result)) return;

      if (result.reason === 'error') {
        _reportExportError(
          App,
          'handleCanvasExport.clipboardWrite',
          new Error(result.message || 'clipboard write failed'),
          { mode: options.mode, clipboardFailureMode: options.clipboardFailureMode, filename }
        );
        if (shouldFailFast(App)) throw new Error(result.message || 'clipboard write failed');
      }

      if (result.reason === 'unavailable') {
        if (options.allowDownloadOnClipboardFailure) {
          _downloadCanvasDataUrl(App, canvas, filename);
          _toast(App, `${options.toastClipboardNotSupported} — ירד קובץ במקום`, 'info');
        } else {
          _toast(App, options.toastClipboardNotSupported, 'error');
        }
        return;
      }

      if (!options.allowDownloadOnClipboardFailure) {
        const detail =
          typeof result.message === 'string' && result.message.trim() ? `: ${result.message.trim()}` : '';
        _toast(App, `${options.toastClipboardBlocked}${detail}`, 'error');
        return;
      }

      _confirmOrProceed(App, options.confirmTitle, options.confirmMsg, () => {
        _downloadCanvasDataUrl(App, canvas, filename);
        _toast(App, options.toastDownload, 'success');
      });
    });
  } catch (e) {
    _reportExportError(App, 'handleCanvasExport', e, {
      mode: options.mode,
      clipboardFailureMode: options.clipboardFailureMode,
      filename,
    });
    if (shouldFailFast(App)) throw e;
    if (!options.allowDownloadOnClipboardFailure) {
      _toast(App, options.toastClipboardBlocked, 'error');
      return;
    }
    _downloadCanvasDataUrl(App, canvas, filename);
    _toast(App, options.toastDownload, 'success');
  }
}
