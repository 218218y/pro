import type { ModelsServiceLike, UnknownRecord } from '../../../types';

import { ensureServiceSlot, getServiceSlotMaybe } from './services_root_access.js';
import {
  MODELS_ACCESS_NORMALIZED,
  createEmptyModelsService,
  isRecord,
  readModelsService,
} from './models_access_shared.js';

export function getModelsServiceSourceMaybe(App: unknown): (ModelsServiceLike & UnknownRecord) | null {
  try {
    return getServiceSlotMaybe<ModelsServiceLike & UnknownRecord>(App, 'models');
  } catch {
    return null;
  }
}

export function getModelsServiceMaybe(App: unknown): ModelsServiceLike | null {
  try {
    const service = getServiceSlotMaybe<ModelsServiceLike & UnknownRecord>(App, 'models');
    const normalized = readModelsService(service);
    if (normalized && service !== normalized) {
      const slot = ensureServiceSlot<ModelsServiceLike & UnknownRecord>(App, 'models');
      Object.assign(slot, normalized);
      slot[MODELS_ACCESS_NORMALIZED] = true;
      return slot;
    }
    return normalized;
  } catch {
    return null;
  }
}

export function ensureModelsService(App: unknown): ModelsServiceLike {
  if (!isRecord(App)) return createEmptyModelsService();

  const existing = getModelsServiceMaybe(App);
  if (existing) return existing;

  const slot = ensureServiceSlot<ModelsServiceLike & UnknownRecord>(App, 'models');
  const next = createEmptyModelsService();
  Object.assign(slot, next);
  slot[MODELS_ACCESS_NORMALIZED] = true;
  return slot;
}
