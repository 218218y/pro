// Construction-correction feedback (Pure ESM)
//
// Owns the canonical, de-duplicated toast path for non-blocking corrections and
// construction anomalies discovered from the final built front geometry.

import { getCacheBag } from '../runtime/cache_access.js';
import { getUiFeedback } from '../runtime/service_access.js';

type ConstructionCorrectionFeedbackCache = {
  __wpConstructionCorrectionPartIdsByScope?: Record<string, string[]>;
  __wpConstructionCorrectionFeedbackBatch?: ConstructionCorrectionFeedbackBatch;
};

type ConstructionCorrectionKind = 'handle-fit-suppression' | 'unusually-small-door-segment';

type ConstructionCorrectionFeedbackBatch = {
  depth: number;
  discard: boolean;
  partIdsByScopeBeforeBatch: Record<string, string[]>;
  partIdsByKind: Partial<Record<ConstructionCorrectionKind, string[]>>;
};

type NotifyConstructionCorrectionOptions = {
  scope: string;
  completePass?: boolean;
  kind: ConstructionCorrectionKind;
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

function cloneScopeMap(source: Record<string, string[]>): Record<string, string[]> {
  const clone: Record<string, string[]> = {};
  for (const [scope, partIds] of Object.entries(source)) {
    clone[scope] = uniqueSortedPartIds(partIds);
  }
  return clone;
}

function readConstructionCorrectionDefinition(kind: ConstructionCorrectionKind): {
  title: string;
  buildMessage: (count: number) => string | null;
} {
  if (kind === 'handle-fit-suppression') {
    return {
      title: 'שינוי אוטומטי בבנייה',
      buildMessage: buildSuppressedHandleMessage,
    };
  }
  return {
    title: 'בנייה חריגה שדורשת בדיקה',
    buildMessage: buildUnusuallySmallDoorMessage,
  };
}

function publishConstructionCorrections(
  App: unknown,
  partIdsByKind: Partial<Record<ConstructionCorrectionKind, string[]>>
): void {
  const kinds: readonly ConstructionCorrectionKind[] = [
    'handle-fit-suppression',
    'unusually-small-door-segment',
  ];
  const notices: Array<{ title: string; message: string }> = [];

  for (let i = 0; i < kinds.length; i += 1) {
    const kind = kinds[i];
    const definition = readConstructionCorrectionDefinition(kind);
    const message = definition.buildMessage(uniqueSortedPartIds(partIdsByKind[kind] || []).length);
    if (message) notices.push({ title: definition.title, message });
  }
  if (!notices.length) return;

  const title = notices.length === 1 ? notices[0].title : 'סיכום שינויים חשובים בבנייה';
  const message =
    notices.length === 1
      ? notices[0].message
      : notices.map((notice, index) => `${index + 1}. ${notice.message}`).join('\n\n');

  try {
    getUiFeedback(App).acknowledge(title, message);
  } catch (_e) {
    // Feedback is best-effort only; the completed correction/build must remain authoritative.
  }
}

function collectOrPublishConstructionCorrection(
  App: unknown,
  cache: ConstructionCorrectionFeedbackCache,
  kind: ConstructionCorrectionKind,
  partIds: readonly string[]
): void {
  const batch = cache.__wpConstructionCorrectionFeedbackBatch;
  if (!batch) {
    publishConstructionCorrections(App, { [kind]: uniqueSortedPartIds(partIds) });
    return;
  }

  batch.partIdsByKind[kind] = uniqueSortedPartIds([...(batch.partIdsByKind[kind] || []), ...partIds]);
}

export function beginConstructionCorrectionFeedback(App: unknown): void {
  try {
    const cache = getCacheBag(App) as ConstructionCorrectionFeedbackCache;
    const current = cache.__wpConstructionCorrectionFeedbackBatch;
    if (current) {
      current.depth += 1;
      return;
    }
    cache.__wpConstructionCorrectionFeedbackBatch = {
      depth: 1,
      discard: false,
      partIdsByScopeBeforeBatch: cloneScopeMap(readScopeMap(cache)),
      partIdsByKind: {},
    };
  } catch (_e) {
    // Feedback collection is observational and must never prevent the build from starting.
    return;
  }
}

export function completeConstructionCorrectionFeedback(App: unknown, publish: boolean): void {
  try {
    const cache = getCacheBag(App) as ConstructionCorrectionFeedbackCache;
    const batch = cache.__wpConstructionCorrectionFeedbackBatch;
    if (!batch) return;
    if (!publish) batch.discard = true;
    batch.depth -= 1;
    if (batch.depth > 0) return;

    delete cache.__wpConstructionCorrectionFeedbackBatch;
    if (batch.discard) {
      cache.__wpConstructionCorrectionPartIdsByScope = batch.partIdsByScopeBeforeBatch;
      return;
    }
    publishConstructionCorrections(App, batch.partIdsByKind);
  } catch (_e) {
    // Feedback publication is observational and must never replace the authoritative build result.
    return;
  }
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

  if (!newlyAffected.size) return;
  collectOrPublishConstructionCorrection(App, cache, options.kind, Array.from(newlyAffected));
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
    kind: 'handle-fit-suppression',
  });
}

export function notifyUnusuallySmallDoorSegments(App: unknown, partIds: readonly string[]): void {
  notifyConstructionCorrection(App, partIds, {
    scope: 'unusually-small-door-segments',
    completePass: true,
    kind: 'unusually-small-door-segment',
  });
}
