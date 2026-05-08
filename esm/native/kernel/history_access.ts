// Kernel HistorySystem access helpers (TypeScript)
//
// Why this exists:
// - The HistorySystem implementation is owned by the kernel (installKernel).
// - Other layers should not depend on historical HistorySystem aliases.
// - The single canonical access point is via app.services.history.system.
//
// This module is intentionally dependency-free to avoid import cycles.

import type { AppContainer, HistoryServiceLike, HistorySystemLike } from '../../../types';

import { asRecord } from '../runtime/record.js';
import { getHistoryActionFn } from '../runtime/actions_access_domains.js';
import { ensureHistoryService, getHistoryServiceMaybe } from '../runtime/history_system_access.js';

function asHistorySystem(value: unknown): HistorySystemLike | null {
  return asRecord<HistorySystemLike>(value);
}

/**
 * Ensure the history service namespace exists and return it.
 */
function ensureHistoryServiceNs(App: unknown): HistoryServiceLike | null {
  const A = asRecord(App);
  if (!A) return null;
  return ensureHistoryService(A);
}

/**
 * Canonical getter for the HistorySystem object.
 * Final delete-pass policy:
 * - Prefer actions.history.getSystem when state_api is installed.
 * - Then services.history.system.
 */
export function getHistorySystem(App: AppContainer): HistorySystemLike | null {
  try {
    const A = asRecord<{ actions?: unknown; services?: unknown }>(App);
    if (!A) return null;

    const getSystem = getHistoryActionFn<() => unknown>(A, 'getSystem');
    if (typeof getSystem === 'function') {
      const resolved = asHistorySystem(getSystem());
      if (resolved) return resolved;
    }

    const history = getHistoryServiceMaybe(A);
    return asHistorySystem(history?.system);
  } catch (_e) {
    return null;
  }
}

/**
 * Attach a HistorySystem instance onto canonical surfaces.
 * - Primary: App.services.history.system
 *
 * Canonical setter: explicit calls replace the active HistorySystem on canonical services/actions surfaces.
 */
export function setHistorySystem(App: AppContainer, HistorySystem: HistorySystemLike): HistorySystemLike {
  if (!App || typeof App !== 'object') return HistorySystem;
  if (!HistorySystem || typeof HistorySystem !== 'object') return HistorySystem;

  const A = asRecord<{ actions?: unknown; services?: unknown }>(App);
  if (!A) return HistorySystem;

  // If state_api installed a canonical setter seam, invoke it first (keeps mirror logic centralized),
  // but still enforce local canonical surfaces below for safety.
  try {
    const setSystem = getHistoryActionFn<(system: HistorySystemLike) => unknown>(A, 'setSystem');
    if (typeof setSystem === 'function') {
      const resolved = asHistorySystem(setSystem(HistorySystem));
      if (resolved) HistorySystem = resolved;
    }
  } catch (_e) {
    // fall through to local canonical surfaces
  }

  // Explicit setter calls are authoritative: keep services mirror in sync with the requested system.
  const hs = ensureHistoryServiceNs(A);
  if (hs) hs.system = HistorySystem;

  return HistorySystem;
}
