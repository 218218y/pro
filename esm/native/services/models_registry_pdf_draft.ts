import type { AppContainer, ProjectJsonLike, ProjectPdfStateLike } from '../../../types';

import { readUiStateFromApp } from '../runtime/root_state_access.js';
import { formatDisplayScalar, readDisplayScalar } from '../../shared/display_text_shared.js';

import { type PdfDraftSnapshotLike, isObject } from './models_registry_contracts.js';
import { _modelsReportNonFatal } from './models_registry_nonfatal.js';
import { _cloneJSON } from './models_registry_normalization.js';

type OrderPdfMeaningfulFields = {
  detailsTouched?: unknown;
  detailsText?: unknown;
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
    detailsText: v.detailsText,
    notes: v.notes,
    orderNumber: v.orderNumber,
    deliveryAddress: v.deliveryAddress,
    phone: v.phone,
    mobile: v.mobile,
  };
}

function hasMeaningfulPdfField(value: unknown): boolean {
  return formatDisplayScalar(readDisplayScalar(value)).trim().length > 0;
}

export function hasMeaningfulOrderPdfDraft(draft: unknown): boolean {
  const d = asOrderPdfDraft(draft);
  if (!d) return false;
  return (
    Boolean(d.detailsTouched) ||
    hasMeaningfulPdfField(d.detailsText) ||
    hasMeaningfulPdfField(d.notes) ||
    hasMeaningfulPdfField(d.orderNumber) ||
    hasMeaningfulPdfField(d.deliveryAddress) ||
    hasMeaningfulPdfField(d.phone) ||
    hasMeaningfulPdfField(d.mobile)
  );
}

export function readUiPdfState(App: AppContainer): ProjectPdfStateLike | null {
  try {
    return asUiPdfState(readUiStateFromApp(App));
  } catch (error) {
    _modelsReportNonFatal(App, 'readUiPdfState', error, 1500);
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

    const clonedDraft = _cloneJSON(d, { App, op: 'attachPdfEditorDraft' });
    if (clonedDraft === null) return;
    snap.orderPdfEditorDraft = clonedDraft;
    const zz = Number(z);
    snap.orderPdfEditorZoom = Number.isFinite(zz) && zz > 0 ? zz : 1;
  } catch (e) {
    _modelsReportNonFatal(App, 'attachPdfEditorDraft', e, 1500);
  }
}
