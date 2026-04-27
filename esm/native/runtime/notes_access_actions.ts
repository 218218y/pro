import type { ActionMetaLike } from '../../../types';

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
  } catch {
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
  } catch {
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
  } catch {
    // ignore
  }

  try {
    const rt = getNotesRuntime(App);
    const onExitDrawMode = rt ? readNotesVoidCallback(rt.onExitDrawMode) : null;
    if (onExitDrawMode) {
      onExitDrawMode();
      return true;
    }
  } catch {
    // ignore
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
  } catch {
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
  } catch {
    return typeof html === 'string' ? html : html == null ? '' : String(html);
  }
}
