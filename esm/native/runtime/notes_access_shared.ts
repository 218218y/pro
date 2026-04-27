import type {
  ActionMetaLike,
  NotesDrawNamespaceLike,
  NotesNamespaceLike,
  NotesRuntimeNamespaceLike,
  NotesServiceAppLike,
  UiNotesNamespaceLike,
} from '../../../types';

import { asRecord, createNullRecord } from './record.js';

export function createNotesRecord<T extends object>(): T {
  return createNullRecord<T>();
}

export function readNotesApp(value: unknown): NotesServiceAppLike | null {
  return asRecord<NotesServiceAppLike>(value);
}

export function readNotesNamespace(value: unknown): NotesNamespaceLike | null {
  return asRecord<NotesNamespaceLike>(value);
}

export function readNotesRuntimeNamespace(value: unknown): NotesRuntimeNamespaceLike | null {
  return asRecord<NotesRuntimeNamespaceLike>(value);
}

export function ensureNotesRuntimeNamespace(svc: NotesNamespaceLike): NotesRuntimeNamespaceLike {
  const existing = readNotesRuntimeNamespace(svc.runtime);
  if (existing) return existing;
  const next = createNotesRecord<NotesRuntimeNamespaceLike>();
  svc.runtime = next;
  return next;
}

export function readNotesDrawNamespace(value: unknown): NotesDrawNamespaceLike | null {
  return asRecord<NotesDrawNamespaceLike>(value);
}

export function ensureNotesDrawNamespace(svc: NotesNamespaceLike): NotesDrawNamespaceLike {
  const existing = readNotesDrawNamespace(svc.draw);
  if (existing) return existing;
  const next = createNotesRecord<NotesDrawNamespaceLike>();
  next.isScreenDrawMode = false;
  svc.draw = next;
  return next;
}

export function readUiNotesNamespace(value: unknown): UiNotesNamespaceLike | null {
  return asRecord<UiNotesNamespaceLike>(value);
}

export function readNotesGetForSave(value: unknown): (() => unknown[]) | null {
  if (typeof value !== 'function') return null;
  return () => {
    const out = Reflect.apply(value, undefined, []);
    return Array.isArray(out) ? out.slice() : [];
  };
}

export function readNotesRestoreFromSave(value: unknown): ((savedNotes: unknown) => void) | null {
  if (typeof value !== 'function') return null;
  return (savedNotes: unknown) => {
    Reflect.apply(value, undefined, [savedNotes]);
  };
}

export function readNotesPersist(value: unknown): ((meta?: ActionMetaLike) => unknown) | null {
  if (typeof value !== 'function') return null;
  return (meta?: ActionMetaLike) => Reflect.apply(value, undefined, [meta]);
}

export function readNotesSanitize(value: unknown): ((html: string) => string) | null {
  if (typeof value !== 'function') return null;
  return (html: string) => {
    const out = Reflect.apply(value, undefined, [html]);
    return typeof out === 'string' ? out : html;
  };
}

export function readNotesVoidCallback(value: unknown): (() => void) | null {
  if (typeof value !== 'function') return null;
  return () => {
    Reflect.apply(value, undefined, []);
  };
}
