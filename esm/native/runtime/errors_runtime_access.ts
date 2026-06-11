import type { ErrorsRuntimeServiceLike } from '../../../types';

import { ensureServiceSlot, getServiceSlotMaybe } from './services_root_access.js';

export function getErrorsRuntimeServiceMaybe(App: unknown): ErrorsRuntimeServiceLike | null {
  try {
    return getServiceSlotMaybe<ErrorsRuntimeServiceLike>(App, 'errorsRuntime');
  } catch {
    return null;
  }
}

export function ensureErrorsRuntimeService(App: unknown): ErrorsRuntimeServiceLike {
  return ensureServiceSlot<ErrorsRuntimeServiceLike>(App, 'errorsRuntime');
}

export function isErrorsFatalShown(App: unknown): boolean {
  return getErrorsRuntimeServiceMaybe(App)?.fatalShown === true;
}

export function setErrorsFatalShown(App: unknown, next: boolean): boolean {
  const runtime = ensureErrorsRuntimeService(App);
  runtime.fatalShown = next === true;
  return runtime.fatalShown === true;
}

export function getErrorsWindowEventsCleanup(App: unknown): (() => void) | null {
  const cleanup = getErrorsRuntimeServiceMaybe(App)?.windowEventsCleanup;
  return typeof cleanup === 'function' ? cleanup : null;
}

export function setErrorsWindowEventsCleanup(
  App: unknown,
  cleanup: (() => void) | null
): (() => void) | null {
  const runtime = ensureErrorsRuntimeService(App);
  runtime.windowEventsCleanup = typeof cleanup === 'function' ? cleanup : null;
  return runtime.windowEventsCleanup ?? null;
}

export function clearErrorsWindowEventsCleanup(App: unknown): void {
  const cleanup = getErrorsWindowEventsCleanup(App);
  try {
    cleanup?.();
  } catch {
    // best-effort cleanup only
  }
  const runtime = getErrorsRuntimeServiceMaybe(App);
  if (runtime) runtime.windowEventsCleanup = null;
}
