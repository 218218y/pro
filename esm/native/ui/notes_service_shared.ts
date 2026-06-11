import type {
  ActionMetaLike,
  UnknownRecord,
  MetaActionsNamespaceLike,
  NotesConfigStateLike,
  NotesDrawNamespaceLike,
  NotesNamespaceLike,
  NotesRuntimeNamespaceLike,
  NotesServiceAppLike,
} from '../../../types';
import {
  ensureNotesService,
  ensureUiNotesService,
  getDocumentMaybe,
  readConfigStateFromApp,
  setSavedNotesViaActions,
  getMetaActions as getMetaActionsDomain,
  setNotesScreenDrawMode,
} from '../services/api.js';

export type NotesNamespace = NotesNamespaceLike;
export type NotesServiceApp = NotesServiceAppLike;
export type NotesMetaActionsLike = Partial<MetaActionsNamespaceLike> & UnknownRecord;

export function isRecord(v: unknown): v is UnknownRecord {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

export function asRecord(v: unknown): UnknownRecord | null {
  return isRecord(v) ? v : null;
}

export function emptyRecord<T extends object>(): T {
  return Object.create(null);
}

export function readDrawNamespace(value: unknown): NotesDrawNamespaceLike | null {
  return isRecord(value) ? value : null;
}

export function readRuntimeNamespace(value: unknown): NotesRuntimeNamespaceLike | null {
  return isRecord(value) ? value : null;
}

export function readConfigState(value: unknown): NotesConfigStateLike | null {
  return isRecord(value) ? value : null;
}

export function readActionMeta(value: unknown): ActionMetaLike | undefined {
  return isRecord(value) ? value : undefined;
}

export function cloneMeta(metaIn?: ActionMetaLike): ActionMetaLike {
  return isRecord(metaIn) ? { ...metaIn } : {};
}

export function getMetaActions(App: NotesServiceApp): NotesMetaActionsLike | null {
  return getMetaActionsDomain(App);
}

export function getNotesDocument(App: NotesServiceApp): Document | null {
  try {
    return getDocumentMaybe(App);
  } catch {
    return null;
  }
}

export function getNotesConfigState(App: NotesServiceApp): NotesConfigStateLike {
  try {
    const cfg = readConfigState(readConfigStateFromApp(App));
    return cfg || emptyRecord<NotesConfigStateLike>();
  } catch {
    return emptyRecord<NotesConfigStateLike>();
  }
}

export function patchSavedNotes(
  App: NotesServiceApp,
  notes: import('../../../types').SavedNote[],
  meta: ActionMetaLike
): void {
  try {
    if (!setSavedNotesViaActions(App, notes, meta)) {
      throw new Error('Missing actions.config.setSavedNotes');
    }
  } catch {
    // ignore
  }
}

export function ensureNotesDrawState(ns: NotesNamespace): NotesDrawNamespaceLike {
  const current = readDrawNamespace(ns.draw);
  const draw = current ?? emptyRecord<NotesDrawNamespaceLike>();
  ns.draw = draw;
  if (typeof draw.isScreenDrawMode !== 'boolean') draw.isScreenDrawMode = false;
  return draw;
}

export function ensureNotesRuntime(ns: NotesNamespace): NotesRuntimeNamespaceLike {
  const current = readRuntimeNamespace(ns.runtime);
  const runtime = current ?? emptyRecord<NotesRuntimeNamespaceLike>();
  ns.runtime = runtime;
  return runtime;
}

export function wireUiNotesService(App: NotesServiceApp, notesNs: NotesNamespace): void {
  const uiNotes = ensureUiNotesService(App);

  if (typeof uiNotes.enterScreenDrawMode === 'function' && typeof uiNotes.exitScreenDrawMode === 'function') {
    return;
  }

  if (typeof uiNotes.enterScreenDrawMode !== 'function') {
    uiNotes.enterScreenDrawMode = () => {
      setNotesScreenDrawMode(App, true);
      try {
        ensureNotesRuntime(notesNs).onEnterDrawMode?.();
      } catch {
        // ignore
      }
    };
  }

  if (typeof uiNotes.exitScreenDrawMode !== 'function') {
    uiNotes.exitScreenDrawMode = () => {
      setNotesScreenDrawMode(App, false);
      try {
        ensureNotesRuntime(notesNs).onExitDrawMode?.();
      } catch {
        // ignore
      }
    };
  }
}

export function createNotesMetaBuilder(App: NotesServiceApp) {
  const buildFallback = (source: string, metaIn?: ActionMetaLike): ActionMetaLike => {
    const meta = cloneMeta(metaIn);
    if (!meta.source) meta.source = source;
    if (typeof meta.immediate === 'undefined') meta.immediate = true;
    if (typeof meta.noHistory === 'undefined') meta.noHistory = true;
    if (typeof meta.noBuild === 'undefined') meta.noBuild = true;
    return meta;
  };

  const build = (source: string, metaIn?: ActionMetaLike): ActionMetaLike => {
    const metaNs = getMetaActions(App);
    if (metaNs && typeof metaNs.noBuild === 'function' && typeof metaNs.noHistory === 'function') {
      const seed = buildFallback(source, metaIn);
      return metaNs.noBuild(metaNs.noHistory(seed, source), source);
    }
    return buildFallback(source, metaIn);
  };

  return { build, buildFallback };
}

export function ensureInstalledNotesService(App: NotesServiceApp): NotesNamespace {
  return ensureNotesService(App);
}
