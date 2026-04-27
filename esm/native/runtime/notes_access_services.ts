import type {
  NotesDrawNamespaceLike,
  NotesNamespaceLike,
  NotesRuntimeNamespaceLike,
  UiNotesNamespaceLike,
} from '../../../types';

import { ensureServiceSlot, getServiceSlotMaybe } from './services_root_access.js';
import {
  createNotesRecord,
  ensureNotesDrawNamespace,
  ensureNotesRuntimeNamespace,
  readNotesApp,
  readNotesDrawNamespace,
  readNotesNamespace,
  readNotesRuntimeNamespace,
  readUiNotesNamespace,
} from './notes_access_shared.js';

const notesDrawModeListenerSets = new WeakMap<NotesRuntimeNamespaceLike, Set<NotesDrawModeListener>>();

type NotesDrawModeListener = (active: boolean) => void;

function readDrawModeListenerSet(rt: NotesRuntimeNamespaceLike): Set<NotesDrawModeListener> {
  const existing = notesDrawModeListenerSets.get(rt);
  if (existing instanceof Set) return existing;
  const next = new Set<NotesDrawModeListener>();
  notesDrawModeListenerSets.set(rt, next);
  return next;
}

function installDrawModeSubscriptionSurface(rt: NotesRuntimeNamespaceLike): void {
  if (typeof rt.subscribeDrawModeChange === 'function') return;
  rt.subscribeDrawModeChange = (listener: NotesDrawModeListener) => {
    if (typeof listener !== 'function') return () => {};
    const listeners = readDrawModeListenerSet(rt);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };
}

function notifyDrawModeListeners(rt: NotesRuntimeNamespaceLike, active: boolean): void {
  const listeners = readDrawModeListenerSet(rt);
  if (!listeners.size) return;
  for (const listener of Array.from(listeners)) {
    try {
      listener(active);
    } catch {
      // ignore
    }
  }
}

export function getUiNotesServiceMaybe(App: unknown): UiNotesNamespaceLike | null {
  try {
    return readUiNotesNamespace(getServiceSlotMaybe<UiNotesNamespaceLike>(App, 'uiNotes'));
  } catch {
    return null;
  }
}

export function getNotesServiceMaybe(App: unknown): NotesNamespaceLike | null {
  try {
    return readNotesNamespace(getServiceSlotMaybe<NotesNamespaceLike>(App, 'notes'));
  } catch {
    return null;
  }
}

export function ensureNotesService(App: unknown): NotesNamespaceLike {
  const app = readNotesApp(App);
  if (!app) return createNotesRecord<NotesNamespaceLike>();
  const existing = getServiceSlotMaybe<NotesNamespaceLike>(app, 'notes');
  if (existing) return existing;
  return ensureServiceSlot<NotesNamespaceLike>(app, 'notes');
}

export function ensureUiNotesService(App: unknown): UiNotesNamespaceLike {
  const app = readNotesApp(App);
  if (!app) return createNotesRecord<UiNotesNamespaceLike>();
  const existing = readUiNotesNamespace(getServiceSlotMaybe<UiNotesNamespaceLike>(app, 'uiNotes'));
  if (existing) return existing;
  return ensureServiceSlot<UiNotesNamespaceLike>(app, 'uiNotes');
}

export function getNotesRuntime(App: unknown): NotesRuntimeNamespaceLike | null {
  try {
    const svc = getNotesServiceMaybe(App);
    return svc ? readNotesRuntimeNamespace(svc.runtime) : null;
  } catch {
    return null;
  }
}

export function ensureNotesRuntime(App: unknown): NotesRuntimeNamespaceLike {
  const rt = ensureNotesRuntimeNamespace(ensureNotesService(App));
  installDrawModeSubscriptionSurface(rt);
  return rt;
}

export function getNotesDraw(App: unknown): NotesDrawNamespaceLike | null {
  try {
    const svc = getNotesServiceMaybe(App);
    return svc ? readNotesDrawNamespace(svc.draw) : null;
  } catch {
    return null;
  }
}

export function ensureNotesDraw(App: unknown): NotesDrawNamespaceLike {
  return ensureNotesDrawNamespace(ensureNotesService(App));
}

export function isNotesScreenDrawMode(App: unknown): boolean {
  try {
    const draw = getNotesDraw(App);
    return !!(draw && draw.isScreenDrawMode);
  } catch {
    return false;
  }
}

export function subscribeNotesDrawMode(App: unknown, listener: (active: boolean) => void): () => void {
  try {
    const rt = ensureNotesRuntime(App);
    if (typeof rt.subscribeDrawModeChange === 'function') return rt.subscribeDrawModeChange(listener);
  } catch {
    // ignore
  }
  return () => {};
}

export function setNotesScreenDrawMode(App: unknown, active: boolean): boolean {
  try {
    const draw = ensureNotesDraw(App);
    const next = !!active;
    if (draw.isScreenDrawMode === next) return true;
    draw.isScreenDrawMode = next;
    notifyDrawModeListeners(ensureNotesRuntime(App), next);
    return true;
  } catch {
    return false;
  }
}
