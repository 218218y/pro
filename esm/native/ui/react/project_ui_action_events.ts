import type { AppContainer } from '../../../../types';

import { getWindowMaybe } from '../../services/api.js';

export type ProjectUiActionName = 'load' | 'save' | 'reset-default' | 'restore-last-session';

export type ProjectUiActionEventDetail = {
  action: ProjectUiActionName;
  ok?: boolean;
  accepted?: true;
  reused?: boolean;
  pending: boolean;
  outcome?: string;
  reason?: string;
  message?: string;
  restoreGen?: number;
  operationId?: string;
  requestedAt?: number;
  acceptedAt?: number;
  phase: 'started' | 'settled';
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
  accepted?: unknown;
  reused?: unknown;
  ok?: unknown;
  pending?: unknown;
  outcome?: unknown;
  reason?: unknown;
  message?: unknown;
  restoreGen?: unknown;
  operationId?: unknown;
  requestedAt?: unknown;
  acceptedAt?: unknown;
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
  const accepted = rec?.accepted === true;
  const hasTerminalResult = result === true || result === false || rec?.ok === true || rec?.ok === false;
  const ok = result === true || rec?.ok === true;
  const pending = accepted || rec?.pending === true;
  const reused = accepted && rec?.reused === true;
  const outcome = readOptionalString(rec?.outcome);
  const reason = readOptionalString(rec?.reason);
  const message = readOptionalString(rec?.message);
  const restoreGen = readOptionalRestoreGen(rec?.restoreGen);
  const operationId = readOptionalString(rec?.operationId);
  const requestedAt = Number(rec?.requestedAt);
  const acceptedAt = Number(rec?.acceptedAt);
  return {
    action,
    ...(hasTerminalResult ? { ok } : {}),
    ...(accepted ? { accepted: true as const, reused } : {}),
    pending,
    phase: pending ? 'started' : 'settled',
    ...(outcome ? { outcome } : {}),
    ...(reason ? { reason } : {}),
    ...(message ? { message } : {}),
    ...(typeof restoreGen === 'number' ? { restoreGen } : {}),
    ...(operationId ? { operationId } : {}),
    ...(Number.isFinite(requestedAt) && requestedAt > 0 ? { requestedAt: Math.floor(requestedAt) } : {}),
    ...(Number.isFinite(acceptedAt) && acceptedAt > 0 ? { acceptedAt: Math.floor(acceptedAt) } : {}),
    at: normalizeEventTime(
      options?.at ??
        (pending
          ? Number.isFinite(requestedAt) && requestedAt > 0
            ? requestedAt
            : Number.isFinite(acceptedAt) && acceptedAt > 0
              ? acceptedAt
              : undefined
          : undefined)
    ),
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
