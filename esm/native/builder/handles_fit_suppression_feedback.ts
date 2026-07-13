// Door-handle fit correction feedback (Pure ESM)
//
// Owns the single canonical toast path for handles that are removed/suppressed because
// their real footprint does not fit the current front/segment geometry.

import { getCacheBag } from '../runtime/cache_access.js';
import { getUiFeedback } from '../runtime/service_access.js';

type HandleFitSuppressionFeedbackCache = {
  __wpHandleFitSuppressedPartIdsByScope?: Record<string, string[]>;
};

type NotifyHandleFitSuppressionOptions = {
  /** Distinguishes independent handle-build owners that can run in different passes. */
  scope: string;
  /**
   * When true, partIds represent the complete active suppression set for this scope.
   * Old ids are removed from the cache so a later re-suppression can be reported again.
   */
  completePass?: boolean;
};

function uniqueSortedPartIds(partIds: readonly string[]): string[] {
  const seen = new Set<string>();
  for (let i = 0; i < partIds.length; i += 1) {
    const id = String(partIds[i] || '').trim();
    if (id) seen.add(id);
  }
  return Array.from(seen).sort();
}

function readScopeMap(cache: HandleFitSuppressionFeedbackCache): Record<string, string[]> {
  const current = cache.__wpHandleFitSuppressedPartIdsByScope;
  if (current && typeof current === 'object' && !Array.isArray(current)) return current;
  const next: Record<string, string[]> = {};
  cache.__wpHandleFitSuppressedPartIdsByScope = next;
  return next;
}

function buildSuppressedHandleMessage(count: number): string | null {
  if (count <= 0) return null;
  return count === 1
    ? 'ידית הוסרה כי אין לה מספיק מקום בחזית הזו.'
    : `הוסרו ${count} ידיות כי אין להן מספיק מקום בחזיתות הקיימות.`;
}

export function notifyHandleFitSuppressions(
  App: unknown,
  partIds: readonly string[],
  options: NotifyHandleFitSuppressionOptions
): void {
  const scope = String(options.scope || '').trim();
  if (!scope) return;

  const cache = getCacheBag(App) as HandleFitSuppressionFeedbackCache;
  const byScope = readScopeMap(cache);
  const previous = new Set(uniqueSortedPartIds(byScope[scope] || []));
  const current = uniqueSortedPartIds(partIds);
  const newlySuppressed = new Set(current).difference(previous);

  byScope[scope] = options.completePass
    ? current
    : uniqueSortedPartIds([...(byScope[scope] || []), ...current]);

  const message = buildSuppressedHandleMessage(newlySuppressed.size);
  if (!message) return;

  try {
    getUiFeedback(App).toast(message, 'info');
  } catch (_e) {
    // Feedback is best-effort only; the visual correction already happened.
  }
}
