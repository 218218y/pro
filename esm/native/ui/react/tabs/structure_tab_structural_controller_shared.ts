import type { UnknownRecord } from '../../../../../types';

import { getUiSnapshot } from '../actions/store_actions.js';

function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function asRecord(value: unknown): UnknownRecord | null {
  return isRecord(value) ? value : null;
}

export function readUiRawNumberFromApp(app: Parameters<typeof getUiSnapshot>[0], key: string): number {
  const uiSnapshot = asRecord(getUiSnapshot(app));
  const raw = asRecord(uiSnapshot?.raw);
  return Number(raw?.[key]) || 0;
}
