import type { CanvasPickingClickModeState } from './canvas_picking_click_contracts.js';
import type { CanvasPickingClickRouteArgs } from './canvas_picking_click_route_shared.js';
import type { HandleCanvasNonSplitHoverArgs } from './canvas_picking_hover_flow_nonsplit_contracts.js';

export type CanvasPickingInteriorExtension = Readonly<{
  tryHandleClickRoute: (args: CanvasPickingClickRouteArgs) => boolean;
  tryHandleInteriorPreview: (args: HandleCanvasNonSplitHoverArgs) => boolean;
  tryHandleSketchHover: (args: HandleCanvasNonSplitHoverArgs) => boolean;
}>;

let registeredInteriorExtension: CanvasPickingInteriorExtension | null = null;

export function registerCanvasPickingInteriorExtension(
  extension: CanvasPickingInteriorExtension
): CanvasPickingInteriorExtension {
  if (!extension || typeof extension !== 'object') {
    throw new Error('[WardrobePro][canvasPicking] Interior picking extension is invalid.');
  }
  if (registeredInteriorExtension && registeredInteriorExtension !== extension) {
    throw new Error('[WardrobePro][canvasPicking] Interior picking extension is already registered.');
  }
  registeredInteriorExtension = extension;
  return extension;
}

export function getCanvasPickingInteriorExtension(): CanvasPickingInteriorExtension | null {
  return registeredInteriorExtension;
}

export function requireCanvasPickingInteriorExtension(): CanvasPickingInteriorExtension {
  const extension = getCanvasPickingInteriorExtension();
  if (extension) return extension;
  throw new Error(
    '[WardrobePro][canvasPicking] Interior picking mode was activated before its deferred extension registered.'
  );
}

export function isCanvasPickingInteriorClickMode(mode: CanvasPickingClickModeState): boolean {
  return (
    mode.__isLayoutEditMode ||
    mode.__isManualLayoutMode ||
    mode.__isBraceShelvesMode ||
    mode.__isExtDrawerEditMode ||
    mode.__isIntDrawerEditMode ||
    mode.__isDividerEditMode
  );
}

export function isCanvasPickingInteriorHoverMode(args: HandleCanvasNonSplitHoverArgs): boolean {
  return (
    args.primaryMode === 'layout' ||
    args.primaryMode === 'manual_layout' ||
    args.primaryMode === 'brace_shelves' ||
    args.isExtDrawerEditMode ||
    args.isDividerEditMode
  );
}
