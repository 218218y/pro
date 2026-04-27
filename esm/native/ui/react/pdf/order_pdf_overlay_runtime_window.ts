import { getBrowserFetchMaybe, getWindowMaybe } from '../../../services/api.js';
import { asRecord, orderPdfOverlayReportNonFatal } from './order_pdf_overlay_runtime_shared.js';

export type UrlCtorLike = {
  createObjectURL?: (obj: Blob) => string;
  revokeObjectURL?: (url: string) => void;
};

export type BlobCtorLike = new (parts: BlobPart[], opts?: BlobPropertyBag) => Blob;

export type WindowPartialLike = {
  Blob?: BlobCtorLike;
  URL?: UrlCtorLike;
  document?: Document;
  performance?: Performance;
  Date?: DateConstructor;
  atob?: (data: string) => string;
};

function isWindowPartialLike(v: unknown): v is WindowPartialLike {
  return asRecord(v) !== null;
}

export function asWindowPartialLike(v: unknown): WindowPartialLike | null {
  return isWindowPartialLike(v) ? v : null;
}

export function getBlobCtor(winMaybe: Window | null | undefined): BlobCtorLike | null {
  const winx = asWindowPartialLike(winMaybe);
  if (winx?.Blob) return winx.Blob;
  return typeof Blob !== 'undefined' ? Blob : null;
}

export function createSilentPdfJsWorkerUrl(app: unknown, realWorkerUrl: string): string {
  const win = getWindowMaybe(app);
  if (!win) return realWorkerUrl;

  try {
    const abs = new URL(
      String(realWorkerUrl),
      win.location && win.location.href ? win.location.href : 'http://localhost'
    ).toString();

    const code = `\ntry {\n  console.log = () => {};\n  console.info = () => {};\n  console.debug = () => {};\n} catch {}\nimport ${JSON.stringify(abs)};\n`;
    const winx = asWindowPartialLike(win);
    const BlobCtor = winx?.Blob;
    const URLCtor = winx?.URL;
    if (!BlobCtor || !URLCtor || typeof URLCtor.createObjectURL !== 'function') return realWorkerUrl;

    const blob = new BlobCtor([code], { type: 'text/javascript' });
    return String(URLCtor.createObjectURL(blob));
  } catch {
    return realWorkerUrl;
  }
}

export async function canvasToPngBytes(
  canvas: HTMLCanvasElement,
  winMaybe: Window | null | undefined
): Promise<Uint8Array> {
  const toBlob = typeof canvas.toBlob === 'function' ? canvas.toBlob.bind(canvas) : null;
  if (toBlob) {
    const blob = await new Promise<Blob>((resolve, reject) => {
      try {
        toBlob(b => {
          if (b) resolve(b);
          else reject(new Error('canvas.toBlob returned null'));
        }, 'image/png');
      } catch (e) {
        reject(e);
      }
    });
    return new Uint8Array(await blob.arrayBuffer());
  }

  const atobFn = winMaybe && typeof winMaybe.atob === 'function' ? winMaybe.atob.bind(winMaybe) : null;
  if (!atobFn) {
    throw new Error('Missing canvas.toBlob + atob');
  }

  const dataUrl = canvas.toDataURL('image/png');
  const comma = dataUrl.indexOf(',');
  if (comma < 0) throw new Error('Invalid data URL');
  const b64 = dataUrl.slice(comma + 1);
  const bin = atobFn(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export async function fetchFirstOk(urls: string[]): Promise<Uint8Array | null> {
  const fetchFn = getBrowserFetchMaybe(null);
  if (typeof fetchFn !== 'function') return null;
  for (const u of urls) {
    try {
      const res = await fetchFn(u);
      if (!res.ok) continue;
      const ab = await res.arrayBuffer();
      return new Uint8Array(ab);
    } catch (__wpErr) {
      orderPdfOverlayReportNonFatal('L1663', __wpErr);
    }
  }
  return null;
}
