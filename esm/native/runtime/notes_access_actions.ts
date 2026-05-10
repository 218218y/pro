import type { ActionMetaLike } from '../../../types';

import { reportError } from './errors.js';
import {
  readNotesGetForSave,
  readNotesPersist,
  readNotesRestoreFromSave,
  readNotesSanitize,
  readNotesVoidCallback,
} from './notes_access_shared.js';
import {
  getNotesRuntime,
  getNotesServiceMaybe,
  getUiNotesServiceMaybe,
  setNotesScreenDrawMode,
} from './notes_access_services.js';

function reportNotesOwnerRejection(App: unknown, op: string, error: unknown): void {
  reportError(App, error, {
    where: 'native/runtime/notes_access',
    op,
    fatal: false,
  });
}

export function getNotesForSaveFn(App: unknown): (() => unknown[]) | null {
  try {
    const svc = getNotesServiceMaybe(App);
    return svc ? readNotesGetForSave(svc.getForSave) : null;
  } catch {
    return null;
  }
}

export function captureSavedNotesViaService(App: unknown): unknown[] {
  try {
    const getForSave = getNotesForSaveFn(App);
    return getForSave ? getForSave() : [];
  } catch (error) {
    reportNotesOwnerRejection(App, 'notes.getForSave.ownerRejected', error);
    return [];
  }
}

export function getRestoreNotesFromSaveFn(App: unknown): ((savedNotes: unknown) => void) | null {
  try {
    const svc = getNotesServiceMaybe(App);
    return svc ? readNotesRestoreFromSave(svc.restoreFromSave) : null;
  } catch {
    return null;
  }
}

export function restoreNotesFromSaveViaService(App: unknown, savedNotes: unknown): boolean {
  try {
    const restore = getRestoreNotesFromSaveFn(App);
    if (!restore) return false;
    restore(savedNotes);
    return true;
  } catch (error) {
    reportNotesOwnerRejection(App, 'notes.restoreFromSave.ownerRejected', error);
    return false;
  }
}

export function exitNotesDrawModeViaService(App: unknown): boolean {
  try {
    const uiNotes = getUiNotesServiceMaybe(App);
    const exitScreenDrawMode = uiNotes ? readNotesVoidCallback(uiNotes.exitScreenDrawMode) : null;
    if (exitScreenDrawMode) {
      exitScreenDrawMode();
      return true;
    }
  } catch (error) {
    reportNotesOwnerRejection(App, 'notes.ui.exitScreenDrawMode.ownerRejected', error);
  }

  try {
    const rt = getNotesRuntime(App);
    const onExitDrawMode = rt ? readNotesVoidCallback(rt.onExitDrawMode) : null;
    if (onExitDrawMode) {
      onExitDrawMode();
      return true;
    }
  } catch (error) {
    reportNotesOwnerRejection(App, 'notes.runtime.onExitDrawMode.ownerRejected', error);
  }

  return setNotesScreenDrawMode(App, false);
}

export function getNotesPersistFn(App: unknown): ((meta?: ActionMetaLike) => unknown) | null {
  try {
    const svc = getNotesServiceMaybe(App);
    return svc ? readNotesPersist(svc.persist) : null;
  } catch {
    return null;
  }
}

export function persistNotesViaService(App: unknown, meta?: ActionMetaLike): boolean {
  try {
    const persist = getNotesPersistFn(App);
    if (!persist) return false;
    persist(meta);
    return true;
  } catch (error) {
    reportNotesOwnerRejection(App, 'notes.persist.ownerRejected', error);
    return false;
  }
}

export function getNotesSanitizeFn(App: unknown): ((html: string) => string) | null {
  try {
    const svc = getNotesServiceMaybe(App);
    return svc ? readNotesSanitize(svc.sanitize) : null;
  } catch {
    return null;
  }
}

export function sanitizeNotesHtmlViaService(App: unknown, html: unknown): string {
  try {
    const text = typeof html === 'string' ? html : html == null ? '' : String(html);
    const sanitize = getNotesSanitizeFn(App);
    return sanitize ? sanitize(text) : text;
  } catch (error) {
    reportNotesOwnerRejection(App, 'notes.sanitize.ownerRejected', error);
    return typeof html === 'string' ? html : html == null ? '' : String(html);
  }
}
