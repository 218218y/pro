import type {
  ActionMetaLike,
  HistoryPushRequestLike,
  HistoryStatusLike,
  HistoryStatusListener,
  HistorySystemLike,
} from '../../../types';
import { asRecord } from './record.js';

export type { HistoryStatusLike, HistoryStatusListener };

export type CallableLike = (...args: never[]) => unknown;
export type HistoryOptionsInvoker = (opts?: HistoryPushRequestLike) => unknown;
export type HistoryMetaInvoker = (meta?: ActionMetaLike) => unknown;
export type HistoryVoidInvoker = () => unknown;
export type HistoryStatusSubscribeInvoker = (listener: HistoryStatusListener) => unknown;

export function isCallable<T extends CallableLike>(value: unknown): value is T {
  return typeof value === 'function';
}

export function emptyHistoryStatus(): HistoryStatusLike {
  return { canUndo: false, canRedo: false, undoCount: 0, redoCount: 0, isPaused: false };
}

export function asHistoryStatus(value: unknown): HistoryStatusLike {
  const rec = asRecord(value) || {};
  const undoCount =
    typeof rec.undoCount === 'number'
      ? rec.undoCount
      : Array.isArray(rec.undoStack)
        ? rec.undoStack.length
        : 0;
  const redoCount =
    typeof rec.redoCount === 'number'
      ? rec.redoCount
      : Array.isArray(rec.redoStack)
        ? rec.redoStack.length
        : 0;
  return {
    canUndo: !!rec.canUndo || undoCount > 0,
    canRedo: !!rec.canRedo || redoCount > 0,
    undoCount,
    redoCount,
    isPaused: rec.isPaused === true,
  };
}

export function readHistorySystemMethod<T extends CallableLike>(
  hs: HistorySystemLike | null,
  key: keyof HistorySystemLike & string
): T | null {
  return hs && isCallable<T>(hs[key]) ? hs[key] : null;
}

export function isHistorySystemPaused(hs: HistorySystemLike | null): boolean {
  return hs?.isPaused === true;
}

export function callHistorySystemMethod(hs: HistorySystemLike | null, methodName: 'undo' | 'redo'): boolean {
  try {
    if (!hs) return false;
    const fn = readHistorySystemMethod<HistoryVoidInvoker>(hs, methodName);
    if (!fn) return false;
    Reflect.apply(fn, hs, []);
    return true;
  } catch {
    return false;
  }
}
