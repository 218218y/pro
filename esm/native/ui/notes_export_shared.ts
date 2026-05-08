import type {
  AppContainer,
  NotesExportTransformLike,
  UiNotesExportServiceLike,
  UnknownRecord,
} from '../../../types';
import {
  assertApp,
  ensureUiNotesExportService,
  getNotesExportTransform,
  getDocumentMaybe,
  getQsa,
  readUiStateFromStore,
  getStoreSurfaceMaybe,
} from '../services/api.js';

export type ExportNotesTransform = NotesExportTransformLike & {
  kind?: 'affine' | 'plane';
  sx?: number;
  sy?: number;
  dx?: number;
  dy?: number;
  a?: number;
  b?: number;
  c?: number;
  d?: number;
  e?: number;
  f?: number;
  prePVInv?: number[];
  postPV?: number[];
  preCamPos?: { x: number; y: number; z: number };
  planePoint?: { x: number; y: number; z: number };
  planeNormal?: { x: number; y: number; z: number };
  sourceRect?: ExportNotesSourceRect;
};

export type ExportNotesSourceRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type Vec3Like = { x: number; y: number; z: number };
export type NotesExportApi = UiNotesExportServiceLike & UnknownRecord;

export function isRecord(x: unknown): x is UnknownRecord {
  return !!x && typeof x === 'object' && !Array.isArray(x);
}

export function requireNotesExportApp(app: unknown): AppContainer {
  return assertApp(app, 'notes_export');
}

function isExportNotesTransform(value: unknown): value is ExportNotesTransform {
  return isRecord(value);
}

export function readExportTransform(app: AppContainer): ExportNotesTransform | null {
  const value = getNotesExportTransform(app);
  return isExportNotesTransform(value) ? value : null;
}

function readFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function readExportSourceRect(value: unknown): ExportNotesSourceRect | null {
  if (!isRecord(value) || !isRecord(value.sourceRect)) return null;

  const left = readFiniteNumber(value.sourceRect.left);
  const top = readFiniteNumber(value.sourceRect.top);
  const width = readFiniteNumber(value.sourceRect.width);
  const height = readFiniteNumber(value.sourceRect.height);

  return left !== null && top !== null && width !== null && height !== null && width > 0 && height > 0
    ? { left, top, width, height }
    : null;
}

export function queryAll(app: AppContainer, selector: string): unknown[] {
  try {
    return getQsa(app)(selector);
  } catch {
    return [];
  }
}

export function readVec3(value: unknown): Vec3Like | null {
  if (!isRecord(value)) return null;
  const x = typeof value.x === 'number' && Number.isFinite(value.x) ? value.x : null;
  const y = typeof value.y === 'number' && Number.isFinite(value.y) ? value.y : null;
  const z = typeof value.z === 'number' && Number.isFinite(value.z) ? value.z : null;
  return x === null || y === null || z === null ? null : { x, y, z };
}

export function readMatrix16(value: unknown): number[] | null {
  return Array.isArray(value) &&
    value.length === 16 &&
    value.every(n => typeof n === 'number' && Number.isFinite(n))
    ? value.slice()
    : null;
}

type ComputedStyleCarrier = {
  computedStyle?: unknown;
};

function isCssStyleDeclarationLike(value: unknown): value is CSSStyleDeclaration {
  return (
    !!value &&
    typeof value === 'object' &&
    typeof (value as { getPropertyValue?: unknown }).getPropertyValue === 'function'
  );
}

export function getComputedStyleMaybe(el: Element): CSSStyleDeclaration | null {
  try {
    const win = el && el.ownerDocument && el.ownerDocument.defaultView;
    if (win && typeof win.getComputedStyle === 'function') return win.getComputedStyle(el);
  } catch {
    // Continue to detached element style carriers below.
  }

  try {
    const direct = (el as unknown as ComputedStyleCarrier).computedStyle;
    return isCssStyleDeclarationLike(direct) ? direct : null;
  } catch {
    return null;
  }
}

export function ensureNotesExportApi(app: AppContainer): NotesExportApi {
  return ensureUiNotesExportService(app);
}

export function readNotesEnabledHint(app: AppContainer): boolean | null {
  try {
    const store = getStoreSurfaceMaybe(app);
    const ui = store ? readUiStateFromStore(store) : null;
    const uiRec = isRecord(ui) ? ui : null;
    return uiRec && typeof uiRec.notesEnabled === 'boolean' ? !!uiRec.notesEnabled : null;
  } catch {
    return null;
  }
}

export function readViewerContainer(app: AppContainer): HTMLElement | null {
  const doc = getDocumentMaybe(app);
  const el = doc ? doc.getElementById('viewer-container') : null;
  return el instanceof HTMLElement ? el : null;
}
