import type { DoorTrimVisualsServiceLike, MaterialLike, UnknownRecord } from '../../../types';

import { asRecord } from './record.js';
import { ensureServiceSlot, getServiceSlotMaybe } from './services_root_access.js';

type MaterialCache = Record<string, MaterialLike | null | undefined>;

type DoorTrimVisualsRuntimeService = DoorTrimVisualsServiceLike & {
  materialCache?: MaterialCache | null;
};

function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function asDoorTrimVisualsService(value: unknown): DoorTrimVisualsRuntimeService | null {
  return asRecord<DoorTrimVisualsRuntimeService>(value);
}

function isMaterialCache(value: unknown): value is MaterialCache {
  return isRecord(value);
}

function createMaterialCache(): MaterialCache {
  return Object.create(null);
}

export function getDoorTrimVisualsServiceMaybe(App: unknown): DoorTrimVisualsRuntimeService | null {
  try {
    return asDoorTrimVisualsService(getServiceSlotMaybe(App, 'doorTrimVisuals'));
  } catch {
    return null;
  }
}

export function ensureDoorTrimVisualsService(App: unknown): DoorTrimVisualsRuntimeService {
  const service = ensureServiceSlot<DoorTrimVisualsRuntimeService>(App, 'doorTrimVisuals');
  return asDoorTrimVisualsService(service) || service;
}

export function ensureDoorTrimMaterialCache(App: unknown): MaterialCache {
  const service = ensureDoorTrimVisualsService(App);
  const current = service.materialCache;
  if (isMaterialCache(current)) return current;
  const next = createMaterialCache();
  service.materialCache = next;
  return next;
}
