// WardrobePro — Export canvas delivery download/DOM helpers (Native ESM)

import type { AppContainer } from '../../../../types/app.js';
import {
  getDocumentMaybe,
  shouldFailFast,
  triggerBlobDownloadResultViaBrowser,
  triggerCanvasDownloadResultViaBrowser,
} from '../../services/api.js';
import { _reportExportError } from './export_canvas_core_feedback.js';
import { isFailedResult } from './export_canvas_delivery_shared.js';

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
