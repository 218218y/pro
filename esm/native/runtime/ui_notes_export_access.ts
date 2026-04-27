import type {
  NotesExportTransformLike,
  UiNotesExportRuntimeServiceLike,
  UiNotesExportServiceLike,
} from '../../../types';

import { asRecord } from './record.js';
import { ensureServiceSlot, getServiceSlotMaybe } from './services_root_access.js';

function asUiNotesExportService(value: unknown): UiNotesExportServiceLike | null {
  return asRecord<UiNotesExportServiceLike>(value);
}

function asUiNotesExportRuntimeService(value: unknown): UiNotesExportRuntimeServiceLike | null {
  return asRecord<UiNotesExportRuntimeServiceLike>(value);
}

export function getUiNotesExportServiceMaybe(App: unknown): UiNotesExportServiceLike | null {
  try {
    return asUiNotesExportService(getServiceSlotMaybe(App, 'uiNotesExport'));
  } catch {
    return null;
  }
}

export function ensureUiNotesExportService(App: unknown): UiNotesExportServiceLike {
  const service = ensureServiceSlot<UiNotesExportServiceLike>(App, 'uiNotesExport');
  return asUiNotesExportService(service) || service;
}

export function getUiNotesExportRuntimeServiceMaybe(App: unknown): UiNotesExportRuntimeServiceLike | null {
  try {
    return asUiNotesExportRuntimeService(getServiceSlotMaybe(App, 'uiNotesExportRuntime'));
  } catch {
    return null;
  }
}

export function ensureUiNotesExportRuntimeService(App: unknown): UiNotesExportRuntimeServiceLike {
  const service = ensureServiceSlot<UiNotesExportRuntimeServiceLike>(App, 'uiNotesExportRuntime');
  return asUiNotesExportRuntimeService(service) || service;
}

export function isUiNotesExportInstalled(App: unknown): boolean {
  return getUiNotesExportRuntimeServiceMaybe(App)?.installed === true;
}

export function markUiNotesExportInstalled(App: unknown): void {
  ensureUiNotesExportRuntimeService(App).installed = true;
}

export function getNotesExportTransform(App: unknown): NotesExportTransformLike | null {
  const service = getUiNotesExportRuntimeServiceMaybe(App);
  return service?.exportTransform && asRecord<NotesExportTransformLike>(service.exportTransform)
    ? service.exportTransform
    : null;
}

export function setNotesExportTransform(
  App: unknown,
  value: NotesExportTransformLike | null | undefined
): NotesExportTransformLike | null {
  const service = ensureUiNotesExportRuntimeService(App);
  const next = value && asRecord<NotesExportTransformLike>(value) ? value : null;
  service.exportTransform = next;
  return next;
}

export function clearNotesExportTransform(App: unknown): void {
  const service = ensureUiNotesExportRuntimeService(App);
  service.exportTransform = null;
}
