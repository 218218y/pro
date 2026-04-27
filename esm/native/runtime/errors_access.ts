import type { ErrorsServiceLike, UnknownRecord } from '../../../types';

import { asRecord, createNullRecord } from './record.js';
import { ensureServiceSlot, getServiceSlotMaybe } from './services_root_access.js';

function createRecord<T extends object>(): T {
  return createNullRecord<T>();
}

function asErrorsService(value: unknown): ErrorsServiceLike | null {
  return asRecord<ErrorsServiceLike>(value);
}

export function getErrorsServiceMaybe(App: unknown): ErrorsServiceLike | null {
  try {
    return asErrorsService(getServiceSlotMaybe<ErrorsServiceLike>(App, 'errors'));
  } catch {
    return null;
  }
}

export function ensureErrorsService(App: unknown): ErrorsServiceLike {
  const app = asRecord<UnknownRecord>(App) || createRecord<UnknownRecord>();
  const existing = getErrorsServiceMaybe(app);
  if (existing) return existing;
  return ensureServiceSlot<ErrorsServiceLike>(app, 'errors');
}
