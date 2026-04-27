import {
  runAppActionFamilySingleFlight,
  type AppActionFamilyFlight,
} from '../../action_family_singleflight.js';
import type { OrderPdfOverlayActionResult } from './order_pdf_overlay_contracts.js';

export type OrderPdfOverlayActionKind = OrderPdfOverlayActionResult['kind'];
export type OrderPdfOverlayActionFlightKey =
  | `load-pdf:${string}`
  | 'export-interactive'
  | 'export-image-pdf'
  | 'export-gmail'
  | 'export-download-gmail';

export type OrderPdfOverlayPendingFlight<T> = AppActionFamilyFlight<T, OrderPdfOverlayActionFlightKey>;

const orderPdfOverlayFlights = new WeakMap<
  object,
  OrderPdfOverlayPendingFlight<OrderPdfOverlayActionResult>
>();

function readOrderPdfOverlayFlightOwner(app: unknown): object | null {
  return app && (typeof app === 'object' || typeof app === 'function') ? app : null;
}

export function readOrderPdfOverlayFileFlightKey(
  file: Pick<File, 'name' | 'size' | 'lastModified' | 'type'> | null | undefined
): string | null {
  if (!file) return null;
  const name = String(file.name || '').trim();
  const size = Number.isFinite(Number(file.size)) ? String(Number(file.size)) : '';
  const lastModified = Number.isFinite(Number(file.lastModified)) ? String(Number(file.lastModified)) : '';
  const type = String(file.type || '').trim();
  const key = [name, size, lastModified, type].filter(Boolean).join('::');
  return key || null;
}

export function buildOrderPdfOverlayActionFlightKey(args: {
  kind: OrderPdfOverlayActionKind;
  file?: Pick<File, 'name' | 'size' | 'lastModified' | 'type'> | null;
}): OrderPdfOverlayActionFlightKey | null {
  const { kind, file } = args;
  if (kind === 'load-pdf') {
    const fileKey = readOrderPdfOverlayFileFlightKey(file || null);
    return fileKey ? `load-pdf:${fileKey}` : null;
  }
  return kind;
}

export function readOrderPdfOverlayActionKindFromFlightKey(
  key: OrderPdfOverlayActionFlightKey
): OrderPdfOverlayActionKind {
  if (key.startsWith('load-pdf:')) return 'load-pdf';
  switch (key) {
    case 'export-interactive':
    case 'export-image-pdf':
    case 'export-gmail':
    case 'export-download-gmail':
      return key;
  }
  return 'load-pdf';
}

export function readOrderPdfOverlayBusyResult(
  kind: OrderPdfOverlayActionKind
): Extract<OrderPdfOverlayActionResult, { ok: false }> {
  switch (kind) {
    case 'load-pdf':
    case 'export-interactive':
    case 'export-image-pdf':
    case 'export-gmail':
    case 'export-download-gmail':
      return { ok: false, kind, reason: 'busy' };
  }
}

export function runOrderPdfOverlayActionSingleFlight(args: {
  app: unknown;
  key: OrderPdfOverlayActionFlightKey;
  run: () => Promise<OrderPdfOverlayActionResult>;
}): Promise<OrderPdfOverlayActionResult> {
  const { app, key, run } = args;
  const owner = readOrderPdfOverlayFlightOwner(app);
  return runAppActionFamilySingleFlight({
    flights: orderPdfOverlayFlights,
    owner,
    key,
    run,
    onBusy: () => readOrderPdfOverlayBusyResult(readOrderPdfOverlayActionKindFromFlightKey(key)),
  });
}
