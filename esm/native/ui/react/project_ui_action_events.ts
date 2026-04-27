import type { AppContainer } from '../../../../types';

import { getWindowMaybe } from '../../services/api.js';

export type ProjectUiActionName = 'load' | 'save' | 'reset-default' | 'restore-last-session';

export type ProjectUiActionEventDetail = {
  action: ProjectUiActionName;
  ok: boolean;
  pending: boolean;
  reason?: string;
  message?: string;
  restoreGen?: number;
  at: number;
};

export const PROJECT_UI_ACTION_EVENT = 'wardrobepro:project-action';

const ACTION_EVENT_NAME_MAP: Record<ProjectUiActionName, string> = {
  load: 'wardrobepro:project-load',
  save: 'wardrobepro:project-save',
  'reset-default': 'wardrobepro:project-reset-default',
  'restore-last-session': 'wardrobepro:project-restore-last-session',
};

type ProjectUiActionResultRecord = {
  ok?: unknown;
  pending?: unknown;
  reason?: unknown;
  message?: unknown;
  restoreGen?: unknown;
};

function asRecord(value: unknown): ProjectUiActionResultRecord | null {
  return value && typeof value === 'object' ? (value as ProjectUiActionResultRecord) : null;
}

function readOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function readOptionalRestoreGen(value: unknown): number | undefined {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : undefined;
}

function normalizeEventTime(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : Date.now();
}

export function readProjectUiActionEventName(action: ProjectUiActionName): string {
  return ACTION_EVENT_NAME_MAP[action];
}

export function buildProjectUiActionEventDetail(
  action: ProjectUiActionName,
  result: unknown,
  options?: { at?: unknown }
): ProjectUiActionEventDetail {
  const rec = asRecord(result);
  const ok = result === true || rec?.ok === true;
  const pending = rec?.pending === true;
  const reason = readOptionalString(rec?.reason);
  const message = readOptionalString(rec?.message);
  const restoreGen = readOptionalRestoreGen(rec?.restoreGen);
  return {
    action,
    ok,
    pending,
    ...(reason ? { reason } : {}),
    ...(message ? { message } : {}),
    ...(typeof restoreGen === 'number' ? { restoreGen } : {}),
    at: normalizeEventTime(options?.at),
  };
}

export function publishProjectUiActionEvent(
  app: AppContainer,
  action: ProjectUiActionName,
  result: unknown,
  options?: { at?: unknown }
): ProjectUiActionEventDetail | null {
  const win = getWindowMaybe(app);
  const EventCtor = typeof CustomEvent === 'function' ? CustomEvent : null;
  if (!win || !EventCtor) return null;

  const detail = buildProjectUiActionEventDetail(action, result, options);
  const eventNames = [PROJECT_UI_ACTION_EVENT, readProjectUiActionEventName(action)];
  for (const eventName of eventNames) {
    try {
      win.dispatchEvent(new EventCtor(eventName, { detail }));
    } catch {
      return null;
    }
  }
  return detail;
}
