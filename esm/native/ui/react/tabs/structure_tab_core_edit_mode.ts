import type { AppContainer, UiFeedbackNamespaceLike, UnknownRecord } from '../../../../../types';

import { getDocumentMaybe, getUiFeedback, normalizeUnknownError } from '../../../services/api.js';
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
export function structureTabReportNonFatal(op: string, err: unknown, dedupeMs = 4000): void {
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
  console.error(`[WardrobePro][StructureTab] ${op}`, err);
}

export function getModeConst(app: unknown, key: string, fallback: string): string {
  const value = readModeMap(app)?.[key];
  return typeof value === 'string' && value.trim() ? value : fallback;
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
    structureTabReportNonFatal('enterStructureEditMode.enterPrimaryMode', err);
  }

  try {
    setRoomOpen(app, false, { forceUpdate: true });
  } catch (err) {
    structureTabReportNonFatal('enterStructureEditMode.setRoomOpen', err);
  }

  try {
    setBodyCursor(app, 'alias');
  } catch (err) {
    structureTabReportNonFatal('enterStructureEditMode.setBodyCursor', err);
  }

  try {
    if (!updateEditStateToast(app, message, true)) showToast(fb, message, 'info');
  } catch (err) {
    structureTabReportNonFatal('enterStructureEditMode.toast', err);
  }
}

export function exitStructureEditMode(args: { app: AppContainer; modeId: string; source: string }): void {
  const { app, modeId, source } = args;

  try {
    exitPrimaryMode(app, modeId, { closeDoors: true, source });
  } catch (err) {
    structureTabReportNonFatal('exitStructureEditMode.exitPrimaryMode', err);
  }

  try {
    setBodyCursor(app, 'default');
  } catch (err) {
    structureTabReportNonFatal('exitStructureEditMode.setBodyCursor', err);
  }

  try {
    updateEditStateToast(app, null, false);
  } catch (err) {
    structureTabReportNonFatal('exitStructureEditMode.toast', err);
  }
}
