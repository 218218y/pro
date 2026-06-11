import type { OrderPdfTextApi } from './order_pdf_overlay_text_api.js';

export type RuntimeApi = {
  asRecord: (value: unknown) => Record<string, unknown> | null;
  ensureExportApiReady: (app: unknown) => Promise<unknown>;
  getOrderPdfDraftFn: (value: unknown) => (() => Promise<unknown> | unknown) | null;
  orderPdfOverlayReportNonFatal: (op: string, err: unknown, dedupeMs?: number) => void;
  errorNameMessage: (err: unknown) => { name: string; message: string };
  clamp: (n: number, min: number, max: number) => number;
  fetchFirstOk: (urls: string[]) => Promise<Uint8Array | null>;
  getFn: <T>(obj: unknown, key: string) => T | null;
  getProp: (obj: unknown, key: string) => unknown;
  isPromiseLike: (value: unknown) => value is Promise<unknown>;
  isRecord: (value: unknown) => value is Record<string, unknown>;
  canvasToPngBytes: (canvas: HTMLCanvasElement, winMaybe: Window | null | undefined) => Promise<Uint8Array>;
};

export type TextApi = OrderPdfTextApi;
