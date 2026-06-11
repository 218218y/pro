import type { AppContainer, ProjectJsonLike, ProjectPdfStateLike } from '../../../types';

import { readUiStateFromApp } from '../runtime/root_state_access.js';

import { type PdfDraftSnapshotLike, isObject } from './models_registry_contracts.js';
import { _modelsReportNonFatal } from './models_registry_nonfatal.js';
import { _cloneJSON } from './models_registry_normalization.js';

type OrderPdfMeaningfulFields = {
  detailsTouched?: unknown;
  manualEnabled?: unknown;
  manualDetails?: unknown;
  notes?: unknown;
  orderNumber?: unknown;
  deliveryAddress?: unknown;
  phone?: unknown;
  mobile?: unknown;
};

function isProjectJsonLikeValue(value: unknown): value is ProjectJsonLike {
  if (value === null) return true;
  const kind = typeof value;
  if (kind === 'string' || kind === 'number' || kind === 'boolean') return true;
  if (Array.isArray(value)) return value.every(isProjectJsonLikeValue);
  if (!isObject(value)) return false;
  const keys = Object.keys(value);
  for (let i = 0; i < keys.length; i += 1) {
    if (!isProjectJsonLikeValue(value[keys[i]])) return false;
  }
  return true;
}

function asUiPdfState(v: unknown): ProjectPdfStateLike | null {
  if (!isObject(v)) return null;
  const draft = isProjectJsonLikeValue(v.orderPdfEditorDraft) ? v.orderPdfEditorDraft : null;
  const zoomNumber = Number(v.orderPdfEditorZoom);
  return {
    orderPdfEditorDraft: draft,
    orderPdfEditorZoom: Number.isFinite(zoomNumber) ? zoomNumber : undefined,
  };
}

function asOrderPdfDraft(v: unknown): OrderPdfMeaningfulFields | null {
  if (!isObject(v)) return null;
  return {
    detailsTouched: v.detailsTouched,
    manualEnabled: v.manualEnabled,
    manualDetails: v.manualDetails,
    notes: v.notes,
    orderNumber: v.orderNumber,
    deliveryAddress: v.deliveryAddress,
    phone: v.phone,
    mobile: v.mobile,
  };
}

export function hasMeaningfulOrderPdfDraft(draft: unknown): boolean {
  const d = asOrderPdfDraft(draft);
  if (!d) return false;
  return (
    Boolean(d.detailsTouched) ||
    Boolean(d.manualEnabled) ||
    Boolean(String(d.manualDetails || '').trim()) ||
    Boolean(String(d.notes || '').trim()) ||
    Boolean(String(d.orderNumber || '').trim()) ||
    Boolean(String(d.deliveryAddress || '').trim()) ||
    Boolean(String(d.phone || '').trim()) ||
    Boolean(String(d.mobile || '').trim())
  );
}

export function readUiPdfState(App: AppContainer): ProjectPdfStateLike | null {
  try {
    return asUiPdfState(readUiStateFromApp(App));
  } catch {
    return null;
  }
}

export function _attachPdfEditorDraft(App: AppContainer, snap: PdfDraftSnapshotLike): void {
  try {
    const ui = readUiPdfState(App);
    if (!ui) return;

    const d = ui.orderPdfEditorDraft;
    const z = ui.orderPdfEditorZoom;

    if (!hasMeaningfulOrderPdfDraft(d)) return;

    snap.orderPdfEditorDraft = _cloneJSON(d);
    const zz = Number(z);
    snap.orderPdfEditorZoom = Number.isFinite(zz) && zz > 0 ? zz : 1;
  } catch (e) {
    _modelsReportNonFatal(App, 'attachPdfEditorDraft', e, 1500);
  }
}
