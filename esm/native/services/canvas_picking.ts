// Canvas picking service (ESM installer)
//
// - Core logic lives in `canvas_picking_core.js` and is exported as real ESM functions.
// - This file is the explicit installer that binds a canonical service onto:
//     App.services.canvasPicking.handleClickNDC / handleHoverNDC
//
// Stage 2 (DI rule): Do NOT keep module-scope App state (supports multiple Apps in parallel).
// We bind handlers to the passed App instance via closures.

import type {
  AppContainer,
  CanvasPickingNdcHandler,
  CanvasPickingServiceLike,
  WardrobeProDebugCanvasHitInfo,
} from '../../../types';

import { handleCanvasClickNDC, handleCanvasHoverNDC } from './canvas_picking_core.js';
import { resolveCanvasPickingClickHitState } from './canvas_picking_click_hit_flow.js';
import { resolveCanvasPickingClickModeState } from './canvas_picking_click_mode_state.js';
import { __wp_ensurePickingRefs } from './canvas_picking_core_helpers.js';
import { ensureCanvasPickingService } from '../runtime/canvas_picking_access.js';

export { handleCanvasClickNDC, handleCanvasHoverNDC } from './canvas_picking_core.js';

export type CanvasPickingInstallerResult = {
  handleCanvasClickNDC: CanvasPickingNdcHandler;
  handleCanvasHoverNDC: CanvasPickingNdcHandler;
  service: CanvasPickingServiceLike;
};

type CanvasPickingInspector = (x: number, y: number) => WardrobeProDebugCanvasHitInfo | null;

type CanvasPickingServiceWithCanonicalRefs = CanvasPickingServiceLike & {
  __wpHandleClickNDC?: CanvasPickingNdcHandler;
  __wpHandleHoverNDC?: CanvasPickingNdcHandler;
  __wpInspectClickNDC?: CanvasPickingInspector;
};

function isAppContainer(app: unknown): app is AppContainer {
  return !!app && typeof app === 'object';
}

function isCanvasPickingService(value: unknown): value is CanvasPickingServiceLike {
  return !!value && typeof value === 'object';
}

function readCanvasPickingService(value: unknown): CanvasPickingServiceWithCanonicalRefs {
  return isCanvasPickingService(value) ? (value as CanvasPickingServiceWithCanonicalRefs) : {};
}

function ensureCanonicalClickHandler(
  App: AppContainer,
  service: CanvasPickingServiceWithCanonicalRefs
): CanvasPickingNdcHandler {
  const existing = typeof service.handleClickNDC === 'function' ? service.handleClickNDC : null;
  if (typeof service.__wpHandleClickNDC !== 'function') {
    service.__wpHandleClickNDC =
      existing ?? ((ndcX: number, ndcY: number) => handleCanvasClickNDC(ndcX, ndcY, App));
  }
  service.handleClickNDC = service.__wpHandleClickNDC;
  return service.__wpHandleClickNDC;
}

function ensureCanonicalHoverHandler(
  App: AppContainer,
  service: CanvasPickingServiceWithCanonicalRefs
): CanvasPickingNdcHandler {
  const existing = typeof service.handleHoverNDC === 'function' ? service.handleHoverNDC : null;
  if (typeof service.__wpHandleHoverNDC !== 'function') {
    service.__wpHandleHoverNDC =
      existing ?? ((ndcX: number, ndcY: number) => handleCanvasHoverNDC(ndcX, ndcY, App));
  }
  service.handleHoverNDC = service.__wpHandleHoverNDC;
  return service.__wpHandleHoverNDC;
}

function inspectCanvasPickingClickNdcInternal(
  App: AppContainer,
  x: number,
  y: number
): WardrobeProDebugCanvasHitInfo | null {
  try {
    const { raycaster, mouse } = __wp_ensurePickingRefs(App);
    if (!raycaster || !mouse) return null;

    const modeState = resolveCanvasPickingClickModeState(App);
    const hitState = resolveCanvasPickingClickHitState({
      App,
      ndcX: x,
      ndcY: y,
      isRemoveDoorMode: modeState.__isRemoveDoorMode,
      raycaster,
      mouse,
    });
    if (!hitState) return null;

    return {
      x,
      y,
      moduleIndex: hitState.foundModuleIndex,
      moduleStack: hitState.foundModuleStack,
      partId: hitState.foundPartId,
      moduleHitY: typeof hitState.moduleHitY === 'number' ? hitState.moduleHitY : null,
      isCellDimsMode: modeState.__isCellDimsMode,
    };
  } catch {
    return null;
  }
}

function ensureCanonicalClickInspector(
  App: AppContainer,
  service: CanvasPickingServiceWithCanonicalRefs
): CanvasPickingInspector {
  const existing = typeof service.inspectClickNDC === 'function' ? service.inspectClickNDC : null;
  if (typeof service.__wpInspectClickNDC !== 'function') {
    service.__wpInspectClickNDC =
      existing ?? ((ndcX: number, ndcY: number) => inspectCanvasPickingClickNdcInternal(App, ndcX, ndcY));
  }
  service.inspectClickNDC = service.__wpInspectClickNDC;
  return service.__wpInspectClickNDC;
}

/**
 * Installs the canvas picking service on the given App instance.
 */
export function installCanvasPickingService(app: unknown): CanvasPickingInstallerResult | null {
  if (!isAppContainer(app)) return null;

  const App = app;
  const service = readCanvasPickingService(ensureCanvasPickingService(App));

  const click = ensureCanonicalClickHandler(App, service);
  const hover = ensureCanonicalHoverHandler(App, service);
  ensureCanonicalClickInspector(App, service);

  return {
    handleCanvasClickNDC: click,
    handleCanvasHoverNDC: hover,
    service,
  };
}
