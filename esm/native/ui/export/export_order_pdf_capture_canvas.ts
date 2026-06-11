import type { AppContainer } from '../../../../types/app.js';
import type { ExportOrderPdfDeps } from './export_order_pdf_types.js';
import { getBrowserFetchMaybe } from '../../services/api.js';
import { readBoundMethod } from './export_order_pdf_shared.js';

export function createOrderPdfCaptureCanvasOps(deps: ExportOrderPdfDeps) {
  const { _exportReportNonFatalNoApp, _exportReportThrottled, getWindowMaybe } = deps;

  async function canvasToPngBytes(canvas: HTMLCanvasElement): Promise<Uint8Array> {
    const blob: Blob = await new Promise((resolve, reject) => {
      try {
        canvas.toBlob(b => {
          if (b) resolve(b);
          else reject(new Error('[WardrobePro][ESM] canvas.toBlob returned null'));
        }, 'image/png');
      } catch (e) {
        _exportReportNonFatalNoApp('canvasToPngBytes.toBlob', e, 3000);
        reject(e);
      }
    });
    const ab = await blob.arrayBuffer();
    return new Uint8Array(ab);
  }

  async function fetchBytesFirstOk(App: AppContainer, urls: string[]): Promise<Uint8Array | null> {
    const win = getWindowMaybe(App);
    const winFetch = readBoundMethod<[input: RequestInfo | URL, init?: RequestInit], Promise<Response>>(
      win,
      'fetch'
    );
    const fetchFn: typeof fetch | null = winFetch || getBrowserFetchMaybe(App);
    if (typeof fetchFn !== 'function') return null;

    for (const url of urls) {
      try {
        const res = await fetchFn(url);
        if (!res || !res.ok) continue;
        const ab = await res.arrayBuffer();
        return new Uint8Array(ab);
      } catch (e) {
        _exportReportThrottled(App, 'fetchBytesFirstOk.fetch', e, { throttleMs: 1000 });
      }
    }
    return null;
  }

  return {
    canvasToPngBytes,
    fetchBytesFirstOk,
  };
}
