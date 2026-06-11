// Shared order-PDF helpers/types used by the export owner/capture/text/build seams.

import type { OrderPdfDraftLike, OrderPdfSketchAnnotationsLike } from '../../../../types/build.js';
import type { NotesExportTransformLike } from './export_canvas_engine.js';
import type { CallableLike, UnknownRecord } from './export_order_pdf_contracts_shared.js';
export type {
  CallableLike,
  NotesExportTransformArgsLike,
  UnknownRecord,
} from './export_order_pdf_contracts_shared.js';

export function readBoundMethod<TArgs extends unknown[], TResult>(
  owner: unknown,
  key: string
): ((...args: TArgs) => TResult) | null {
  if (!owner || (typeof owner !== 'object' && typeof owner !== 'function')) return null;
  const value = Reflect.get(owner, key);
  if (typeof value !== 'function') return null;
  return (...args: TArgs) => Reflect.apply(value, owner, args);
}

type GetCtor = {
  <T extends object>(obj: UnknownRecord, key: string): T | null;
  <T extends CallableLike>(obj: UnknownRecord, key: string): T | null;
};

export const getCtor: GetCtor = (obj: UnknownRecord, key: string) => {
  const value = obj[key];
  return typeof value === 'function' || (value && typeof value === 'object') ? value : null;
};

type ObjectMethodBag = { get?: (key: unknown) => unknown; set?: (key: unknown, value: unknown) => void };
type TextCodecLike = { decodeText?: () => string; asString?: () => string };

export function isCallableRecord(value: unknown): value is UnknownRecord | CallableLike {
  return !!value && (typeof value === 'object' || typeof value === 'function');
}

export function getObjectMethods(v: unknown): ObjectMethodBag | null {
  if (!isCallableRecord(v)) return null;
  const get = readBoundMethod<[unknown], unknown>(v, 'get');
  const set = readBoundMethod<[unknown, unknown], void>(v, 'set');
  return get || set ? { get: get ?? undefined, set: set ?? undefined } : null;
}

export function getSetter(v: unknown): ((key: unknown, value: unknown) => void) | null {
  const methods = getObjectMethods(v);
  return methods?.set ?? null;
}

export function getTextCodec(v: unknown): TextCodecLike | null {
  if (!isCallableRecord(v)) return null;
  return {
    decodeText: readBoundMethod<[], string>(v, 'decodeText') ?? undefined,
    asString: readBoundMethod<[], string>(v, 'asString') ?? undefined,
  };
}

type RendererDomSourceLike = { domElement: unknown };

function isOrderPdfSketchAnnotationsLike(value: unknown): value is OrderPdfSketchAnnotationsLike {
  return !!value && typeof value === 'object';
}

export function readRendererDomSource(value: unknown): RendererDomSourceLike | null {
  if (!isCallableRecord(value)) return null;
  if (!Reflect.has(value, 'domElement')) return null;
  return { domElement: Reflect.get(value, 'domElement') };
}

export function readNotesTransform(value: unknown): NotesExportTransformLike | null {
  if (!value || typeof value !== 'object') return null;
  const out: NotesExportTransformLike = {};
  return Object.assign(out, value);
}

export function readDraftString(rec: UnknownRecord, key: keyof OrderPdfDraftLike): string | undefined {
  const value = rec[key];
  if (typeof value === 'undefined' || value === null) return undefined;
  return String(value);
}

export function readDraftBoolean(rec: UnknownRecord, key: keyof OrderPdfDraftLike): boolean | undefined {
  const value = rec[key];
  return typeof value === 'boolean' ? value : undefined;
}

export function readDraftSketchAnnotations(rec: UnknownRecord): OrderPdfSketchAnnotationsLike | undefined {
  const value = rec.sketchAnnotations;
  return isOrderPdfSketchAnnotationsLike(value) ? value : undefined;
}
