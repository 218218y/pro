// Canvas picking door/global toggle click handling.

import type { AppContainer } from '../../../types';

import type { HitObjectLike } from './canvas_picking_engine.js';
import { getSuppressGlobalToggleUntil } from '../runtime/doors_access.js';
import { getModeId } from '../runtime/api.js';
import { readRuntimeScalarOrDefaultFromApp } from '../runtime/runtime_selectors.js';
import {
  toggleDoorsState,
  tryCloseOpenSlidingTrackDoors,
  tryHandleDirectDoorOrDrawerToggle,
  tryHandleSlidingCabinetDefaultToggle,
  tryHandleGlobalCornerPentToggle,
  tryHandleSlidingTrackDoorToggle,
} from './canvas_picking_toggle_flow_shared.js';
import {
  resolveSketchBoxToggleTarget,
  toggleSketchBoxDoor,
} from './canvas_picking_toggle_flow_sketch_box.js';
import {
  resolveSketchFreeBoxToggleScope,
  toggleSketchFreeBoxOpen,
} from './canvas_picking_toggle_flow_sketch_free_box.js';

export interface CanvasDoorToggleClickArgs {
  App: AppContainer;
  primaryMode: string | null;
  primaryHitObject: HitObjectLike | null;
  effectiveDoorId: string | null;
  foundPartId: string | null;
  foundModuleIndex?: string | number | null;
  foundModuleStack?: string | null;
}

export function handleCanvasDoorToggleClick(args: CanvasDoorToggleClickArgs): void {
  const {
    App,
    primaryMode: __pm,
    primaryHitObject,
    effectiveDoorId,
    foundPartId,
    foundModuleIndex,
    foundModuleStack,
  } = args;

  const __NONE = getModeId('NONE') || 'none';
  const __notesMode = getModeId('SCREEN_NOTE') || 'screen_note';
  if (__pm !== __NONE && __pm !== __notesMode) return;

  const sup = getSuppressGlobalToggleUntil(App);
  if (typeof sup === 'number' && Date.now() < sup) return;

  const sketchFreeBoxScope = resolveSketchFreeBoxToggleScope(primaryHitObject, foundPartId);
  if (toggleSketchFreeBoxOpen(App, sketchFreeBoxScope, foundModuleStack)) return;

  const sketchBoxTarget = resolveSketchBoxToggleTarget(primaryHitObject, foundPartId, foundModuleIndex);
  if (toggleSketchBoxDoor(App, sketchBoxTarget, foundModuleStack)) return;

  if (readRuntimeScalarOrDefaultFromApp(App, 'globalClickMode', true)) {
    if (
      tryHandleSlidingTrackDoorToggle({
        App,
        primaryHitObject,
        effectiveDoorId: effectiveDoorId || foundPartId || null,
      })
    )
      return;
    if (tryCloseOpenSlidingTrackDoors(App)) return;
    if (tryHandleGlobalCornerPentToggle(App, primaryHitObject, effectiveDoorId, foundPartId)) return;
    if (tryHandleSlidingCabinetDefaultToggle(App)) return;
    toggleDoorsState(App);
    return;
  }

  tryHandleDirectDoorOrDrawerToggle({ App, primaryHitObject, effectiveDoorId });
}
