import type { AppContainer, UiFeedbackNamespaceLike, UnknownRecord } from '../../../../../types';

import {
  getDocumentMaybe,
  getUiFeedback,
  normalizeUnknownError,
  reportError,
} from '../../../services/api.js';
import { enterPrimaryMode, exitPrimaryMode } from '../actions/modes_actions.js';
import { setRoomOpen } from '../actions/room_actions.js';
import type { EditStateToastFn } from './structure_tab_core_contracts.js';

function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function readRecord(value: unknown): UnknownRecord | null {
  return isRecord(value) ? value : null;
}

function readModeMap(app: unknown): UnknownRecord | null {
  return readRecord(readRecord(app)?.modes);
}

function readEditStateToastFn(app: unknown): EditStateToastFn | null {
  const feedback = getUiFeedback(app);
  const fn = feedback?.updateEditStateToast;
  if (typeof fn !== 'function') return null;
  return (message, sticky) => Reflect.apply(fn, feedback, [message, sticky]);
}

function showToast(fb: UiFeedbackNamespaceLike | null | undefined, msg: string, kind: string): void {
  if (!fb) return;
  if (typeof fb.toast === 'function') {
    fb.toast(msg, kind);
    return;
  }
  if (typeof fb.showToast === 'function') fb.showToast(msg, kind);
}

export function setBodyCursor(app: unknown, cursor: string): void {
  try {
    const doc = getDocumentMaybe(app);
    if (doc && doc.body) doc.body.style.cursor = String(cursor || 'default');
  } catch {
    // ignore
  }
}

const __structureTabReportNonFatalSeen = new Map<string, number>();

function readStructureTabReportArgs(args: ArrayLike<unknown>): {
  app: AppContainer | null;
  op: string;
  err: unknown;
  dedupeMs: number;
} {
  if (args.length >= 3 && typeof args[0] !== 'string' && typeof args[1] === 'string') {
    return {
      app: args[0] && typeof args[0] === 'object' ? (args[0] as AppContainer) : null,
      op: String(args[1] || 'unknown'),
      err: args[2],
      dedupeMs: typeof args[3] === 'number' && Number.isFinite(args[3]) ? Math.max(0, args[3]) : 4000,
    };
  }

  return {
    app: null,
    op: String(args[0] || 'unknown'),
    err: args[1],
    dedupeMs: typeof args[2] === 'number' && Number.isFinite(args[2]) ? Math.max(0, args[2]) : 4000,
  };
}

type StructureTabReportNonFatalArgs =
  | [op: string, err: unknown, dedupeMs?: number]
  | [app: AppContainer | null | undefined, op: string, err: unknown, dedupeMs?: number];

export function structureTabReportNonFatal(...args: StructureTabReportNonFatalArgs): void {
  const { app, op, err, dedupeMs } = readStructureTabReportArgs(args);
  const now = Date.now();
  const normalized = normalizeUnknownError(err, '[WardrobePro][StructureTab] non-fatal error');
  const name =
    typeof normalized.name === 'string' && normalized.name.trim() ? normalized.name.trim() : 'Error';
  const message =
    typeof normalized.message === 'string' && normalized.message.trim()
      ? normalized.message.trim()
      : '[WardrobePro][StructureTab] non-fatal error';
  const key = `${op}|${name}|${message}`;
  const last = __structureTabReportNonFatalSeen.get(key) ?? 0;
  if (dedupeMs > 0 && now - last < dedupeMs) return;
  __structureTabReportNonFatalSeen.set(key, now);
  if (app) {
    reportError(
      app,
      err,
      { where: 'native/ui/react/structure_tab', op, fatal: false },
      { consoleFallback: false }
    );
    return;
  }
  try {
    console.error(`[WardrobePro][StructureTab] ${op}`, err);
  } catch {
    // ignore no-app console failures
  }
}

export function getModeConst(app: unknown, key: string, defaultValue: string): string {
  const value = readModeMap(app)?.[key];
  return typeof value === 'string' && value.trim() ? value : defaultValue;
}

export function updateEditStateToast(app: unknown, msg: string | null, sticky: boolean): boolean {
  try {
    const updateToast = readEditStateToastFn(app);
    if (!updateToast) return false;
    updateToast(msg, sticky);
    return true;
  } catch {
    return false;
  }
}

export function enterStructureEditMode(args: {
  app: AppContainer;
  fb: UiFeedbackNamespaceLike | null | undefined;
  modeId: string;
  source: string;
  message: string;
}): void {
  const { app, fb, modeId, source, message } = args;

  try {
    enterPrimaryMode(app, modeId, {
      source,
      closeDoors: true,
      cursor: 'alias',
    });
  } catch (err) {
    structureTabReportNonFatal(app, 'enterStructureEditMode.enterPrimaryMode', err);
  }

  try {
    setRoomOpen(app, false, { forceUpdate: true });
  } catch (err) {
    structureTabReportNonFatal(app, 'enterStructureEditMode.setRoomOpen', err);
  }

  try {
    setBodyCursor(app, 'alias');
  } catch (err) {
    structureTabReportNonFatal(app, 'enterStructureEditMode.setBodyCursor', err);
  }

  try {
    if (!updateEditStateToast(app, message, true)) showToast(fb, message, 'info');
  } catch (err) {
    structureTabReportNonFatal(app, 'enterStructureEditMode.toast', err);
  }
}

export function exitStructureEditMode(args: { app: AppContainer; modeId: string; source: string }): void {
  const { app, modeId, source } = args;

  try {
    exitPrimaryMode(app, modeId, { closeDoors: true, source });
  } catch (err) {
    structureTabReportNonFatal(app, 'exitStructureEditMode.exitPrimaryMode', err);
  }

  try {
    setBodyCursor(app, 'default');
  } catch (err) {
    structureTabReportNonFatal(app, 'exitStructureEditMode.setBodyCursor', err);
  }

  try {
    updateEditStateToast(app, null, false);
  } catch (err) {
    structureTabReportNonFatal(app, 'exitStructureEditMode.toast', err);
  }
}
