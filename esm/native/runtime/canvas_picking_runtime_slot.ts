import type { CanvasPickingRuntimeLike, CanvasPickingServiceLike } from '../../../types';

import { asRecord, createNullRecord } from './record.js';
import { ensureServiceSlot, getServiceSlotMaybe } from './services_root_access.js';

function asCanvasPickingService(value: unknown): CanvasPickingServiceLike | null {
  return asRecord<CanvasPickingServiceLike>(value);
}

function asCanvasPickingRuntime(value: unknown): CanvasPickingRuntimeLike | null {
  return asRecord<CanvasPickingRuntimeLike>(value);
}

function ensureRuntimeSlot(service: CanvasPickingServiceLike): CanvasPickingRuntimeLike {
  const current = asCanvasPickingRuntime(service.runtime);
  if (current) return current;
  const next = createNullRecord<CanvasPickingRuntimeLike>();
  service.runtime = next;
  return next;
}

export function getCanvasPickingServiceMaybe(App: unknown): CanvasPickingServiceLike | null {
  try {
    return asCanvasPickingService(getServiceSlotMaybe<CanvasPickingServiceLike>(App, 'canvasPicking'));
  } catch {
    return null;
  }
}

export function ensureCanvasPickingService(App: unknown): CanvasPickingServiceLike {
  return (
    asCanvasPickingService(getServiceSlotMaybe<CanvasPickingServiceLike>(App, 'canvasPicking')) ||
    ensureServiceSlot<CanvasPickingServiceLike>(App, 'canvasPicking')
  );
}

export function getCanvasPickingRuntime(App: unknown): CanvasPickingRuntimeLike | null {
  try {
    const svc = getCanvasPickingServiceMaybe(App);
    return svc ? asCanvasPickingRuntime(svc.runtime) : null;
  } catch {
    return null;
  }
}

export function ensureCanvasPickingRuntime(App: unknown): CanvasPickingRuntimeLike {
  return ensureRuntimeSlot(ensureCanvasPickingService(App));
}
