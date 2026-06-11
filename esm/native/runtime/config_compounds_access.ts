import type { ConfigCompoundsServiceLike } from '../../../types';

import { asRecord } from './record.js';
import { ensureServiceSlot, getServiceSlotMaybe } from './services_root_access.js';

function asConfigCompoundsService(value: unknown): ConfigCompoundsServiceLike | null {
  return asRecord<ConfigCompoundsServiceLike>(value);
}

export function getConfigCompoundsServiceMaybe(App: unknown): ConfigCompoundsServiceLike | null {
  try {
    return asConfigCompoundsService(getServiceSlotMaybe<ConfigCompoundsServiceLike>(App, 'configCompounds'));
  } catch {
    return null;
  }
}

export function ensureConfigCompoundsService(App: unknown): ConfigCompoundsServiceLike {
  const existing = getConfigCompoundsServiceMaybe(App);
  if (existing) return existing;
  return ensureServiceSlot<ConfigCompoundsServiceLike>(App, 'configCompounds');
}
