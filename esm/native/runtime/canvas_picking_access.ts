import type {
  CanvasPickingNdcHandler,
  CanvasPickingServiceLike,
  WardrobeProDebugCanvasHitInfo,
} from '../../../types';
import { getCanvasPickingServiceMaybe } from './canvas_picking_runtime_slot.js';

export {
  ensureCanvasPickingRuntime,
  ensureCanvasPickingService,
  getCanvasPickingRuntime,
  getCanvasPickingServiceMaybe,
} from './canvas_picking_runtime_slot.js';

function readNdcHandler(
  owner: CanvasPickingServiceLike | null,
  key: 'handleClickNDC' | 'handleHoverNDC'
): CanvasPickingNdcHandler | null {
  const fn = owner ? owner[key] : null;
  if (typeof fn !== 'function') return null;
  return (x: number, y: number) => Reflect.apply(fn, owner, [x, y]);
}

function readInspectHandler(
  owner: CanvasPickingServiceLike | null
): ((x: number, y: number) => WardrobeProDebugCanvasHitInfo | null) | null {
  const fn = owner ? owner.inspectClickNDC : null;
  if (typeof fn !== 'function') return null;
  return (x: number, y: number) => Reflect.apply(fn, owner, [x, y]);
}

export function getCanvasPickingClickHandler(App: unknown): CanvasPickingNdcHandler | null {
  try {
    return readNdcHandler(getCanvasPickingServiceMaybe(App), 'handleClickNDC');
  } catch {
    return null;
  }
}

export function getCanvasPickingHoverHandler(App: unknown): CanvasPickingNdcHandler | null {
  try {
    return readNdcHandler(getCanvasPickingServiceMaybe(App), 'handleHoverNDC');
  } catch {
    return null;
  }
}

export function inspectCanvasPickingClickNdc(
  App: unknown,
  x: number,
  y: number
): WardrobeProDebugCanvasHitInfo | null {
  try {
    return readInspectHandler(getCanvasPickingServiceMaybe(App))?.(x, y) ?? null;
  } catch {
    return null;
  }
}
