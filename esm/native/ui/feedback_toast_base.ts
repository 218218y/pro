import type { AppContainer } from '../../../types';

import { get$, getDocumentMaybe } from '../services/api.js';
import { type ToastType, __uiFeedbackReportNonFatal, asHTMLElement } from './feedback_shared.js';

function resolveToastContainerHost(App: AppContainer, doc: Document): HTMLElement | null {
  try {
    const $ = get$(App);
    const viewer =
      asHTMLElement($('viewer-container')) || asHTMLElement(doc.getElementById('viewer-container'));
    if (viewer) return viewer;
  } catch (err) {
    __uiFeedbackReportNonFatal('toast.container.resolveHost', err);
  }

  return asHTMLElement(doc.body) || asHTMLElement(doc.documentElement) || null;
}

function syncToastContainerHostClass(container: HTMLElement, host: HTMLElement): void {
  const isViewerHost = host.id === 'viewer-container';
  const hostClass = isViewerHost ? 'toast-container--viewer' : 'toast-container--body';
  const staleClass = isViewerHost ? 'toast-container--body' : 'toast-container--viewer';

  try {
    container.classList.add('toast-container', hostClass);
    container.classList.remove(staleClass);
  } catch (err) {
    __uiFeedbackReportNonFatal('toast.container.class', err);
    container.className = `toast-container ${hostClass}`;
  }
}

export function ensureToastContainer(App: AppContainer, doc: Document): HTMLElement | null {
  const $ = get$(App);
  let container = asHTMLElement($('toastContainer'));

  try {
    const host = resolveToastContainerHost(App, doc);
    if (!host) return container || null;

    if (!container) {
      const el = doc.createElement('div');
      el.id = 'toastContainer';
      container = el;
    }

    syncToastContainerHostClass(container, host);
    if (container.parentElement !== host) host.appendChild(container);
  } catch (err) {
    __uiFeedbackReportNonFatal('toast.container', err);
  }

  return container || null;
}

export function normalizeToastKind(type: ToastType | string): ToastType {
  return type === 'error' || type === 'info' || type === 'success' ? type : 'success';
}

export function resolveToastIcon(kind: ToastType): string {
  if (kind === 'error') return 'fa-times-circle';
  if (kind === 'info') return 'fa-info-circle';
  return 'fa-check-circle';
}

export function resolveToastDocument(App: AppContainer | null | undefined): Document | null {
  if (!App || typeof App !== 'object') return null;
  return getDocumentMaybe(App);
}
