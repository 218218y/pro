// Construction-correction feedback (Pure ESM)
//
// Owns the canonical, de-duplicated toast path for non-blocking corrections and
// construction anomalies discovered from the final built front geometry.

import { getCacheBag } from '../runtime/cache_access.js';
import { getUiFeedback } from '../runtime/service_access.js';

type ConstructionCorrectionFeedbackCache = {
  __wpConstructionCorrectionPartIdsByScope?: Record<string, string[]>;
};

type NotifyConstructionCorrectionOptions = {
  scope: string;
  completePass?: boolean;
  title: string;
  buildMessage: (count: number) => string | null;
};

export type NotifyHandleFitSuppressionOptions = {
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

function readScopeMap(cache: ConstructionCorrectionFeedbackCache): Record<string, string[]> {
  const current = cache.__wpConstructionCorrectionPartIdsByScope;
  if (current && typeof current === 'object' && !Array.isArray(current)) return current;
  const next: Record<string, string[]> = {};
  cache.__wpConstructionCorrectionPartIdsByScope = next;
  return next;
}

function notifyConstructionCorrection(
  App: unknown,
  partIds: readonly string[],
  options: NotifyConstructionCorrectionOptions
): void {
  const scope = String(options.scope || '').trim();
  if (!scope) return;

  const cache = getCacheBag(App) as ConstructionCorrectionFeedbackCache;
  const byScope = readScopeMap(cache);
  const previous = new Set(uniqueSortedPartIds(byScope[scope] || []));
  const current = uniqueSortedPartIds(partIds);
  const newlyAffected = new Set(current).difference(previous);

  byScope[scope] = options.completePass
    ? current
    : uniqueSortedPartIds([...(byScope[scope] || []), ...current]);

  const message = options.buildMessage(newlyAffected.size);
  if (!message) return;

  try {
    getUiFeedback(App).acknowledge(options.title, message);
  } catch (_e) {
    // Feedback is best-effort only; the completed correction/build must remain authoritative.
  }
}

function buildSuppressedHandleMessage(count: number): string | null {
  if (count <= 0) return null;
  return count === 1
    ? 'ידית הוסרה כי אין לה מספיק מקום בחזית הזו.'
    : `הוסרו ${count} ידיות כי אין להן מספיק מקום בחזיתות הקיימות.`;
}

function buildUnusuallySmallDoorMessage(count: number): string | null {
  if (count <= 0) return null;
  return count === 1
    ? 'שים לב: נותרה דלת קטנה באופן חריג לאחר חיתוך דלתות או הוספת מגירות חיצוניות. הבנייה הושלמה, אך מומלץ לבדוק את התכנון.'
    : `שים לב: נותרו ${count} מקטעי דלת קטנים באופן חריג לאחר חיתוך דלתות או הוספת מגירות חיצוניות. הבנייה הושלמה, אך מומלץ לבדוק את התכנון.`;
}

export function notifyHandleFitSuppressions(
  App: unknown,
  partIds: readonly string[],
  options: NotifyHandleFitSuppressionOptions
): void {
  notifyConstructionCorrection(App, partIds, {
    ...options,
    title: 'שינוי אוטומטי בבנייה',
    buildMessage: buildSuppressedHandleMessage,
  });
}

export function notifyUnusuallySmallDoorSegments(App: unknown, partIds: readonly string[]): void {
  notifyConstructionCorrection(App, partIds, {
    scope: 'unusually-small-door-segments',
    completePass: true,
    title: 'בנייה חריגה שדורשת בדיקה',
    buildMessage: buildUnusuallySmallDoorMessage,
  });
}
