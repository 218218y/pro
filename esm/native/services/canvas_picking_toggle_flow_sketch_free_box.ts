import type { AppContainer, UnknownRecord } from '../../../types';
import { formatIdentityValue, readIdentityValue } from '../../shared/identity_value_shared.js';

import type { HitObjectLike } from './canvas_picking_engine.js';
import { readRuntimeConfigNumberFromApp } from '../runtime/runtime_config_selectors.js';
import { getDoorsArray, getDrawersArray } from '../runtime/render_access.js';
import {
  type SketchFreeBoxMotionScope,
  isSketchFreeBoxInternalDrawerEntry,
  isSketchFreeBoxMotionScopeMatch,
  readSketchFreeBoxMotionScopeFromPartId,
  readSketchFreeBoxMotionScopeFromUserData,
} from '../runtime/sketch_free_box_motion_identity.js';
import { recordSketchFreeBoxMotionToggle } from '../runtime/sketch_free_box_motion_state.js';
import {
  hasSketchBoxDoorOpenTarget,
  mutateSketchBoxDoorOpenState,
  type SketchBoxDoorOpenMutationResult,
} from './canvas_picking_sketch_box_door_open_mutation.js';
import { resolveSketchBoxPatchTargets } from './canvas_picking_toggle_flow_sketch_box_target_runtime.js';
import { asRecord, markLocalDoorMotion } from './canvas_picking_toggle_flow_shared.js';
import { createCanvasPickingModulesMotionPatchMeta } from './canvas_picking_modules_patch_meta.js';
import {
  commitCanvasModuleStructuralPatch,
  readCanvasModuleConfigForStack,
} from './canvas_picking_structural_commit.js';

export type { SketchFreeBoxMotionScope } from '../runtime/sketch_free_box_motion_identity.js';

export function resolveSketchFreeBoxToggleScope(
  primaryHitObject: HitObjectLike | null,
  foundPartId?: string | null
): SketchFreeBoxMotionScope | null {
  let cur = primaryHitObject;
  while (cur) {
    const userData = asRecord(cur.userData);
    const byUserData = readSketchFreeBoxMotionScopeFromUserData(userData);
    if (byUserData) return byUserData;

    const partId = formatIdentityValue(readIdentityValue(userData?.partId)) || null;
    const byPartId = readSketchFreeBoxMotionScopeFromPartId(partId);
    if (byPartId) return byPartId;
    cur = cur.parent || null;
  }

  return readSketchFreeBoxMotionScopeFromPartId(foundPartId || null);
}

type SketchFreeBoxDoorPatchOutcome = {
  committed: boolean;
  changed: boolean;
};

function patchSketchFreeBoxDoorOpenState(
  App: AppContainer,
  scope: SketchFreeBoxMotionScope,
  nextOpen: boolean,
  preferredStack?: string | null
): SketchFreeBoxDoorPatchOutcome {
  if (!scope.boxId) return { committed: true, changed: false };
  const patchTargets = resolveSketchBoxPatchTargets(
    App,
    { moduleKey: scope.moduleKey, boxId: scope.boxId, doorId: null },
    preferredStack
  );

  for (const patchTarget of patchTargets) {
    const cfg = readCanvasModuleConfigForStack({
      App,
      stack: patchTarget.stack,
      moduleKey: patchTarget.moduleKey,
      op: 'sketchFreeBoxToggle.target',
    });
    if (
      !hasSketchBoxDoorOpenTarget(cfg, {
        boxId: scope.boxId,
        requireFreePlacement: true,
      })
    ) {
      continue;
    }

    let mutationResult: SketchBoxDoorOpenMutationResult = {
      matchedBox: false,
      changed: false,
      nextOpen: null,
      doorIds: [],
    };
    const outcome = commitCanvasModuleStructuralPatch({
      App,
      stack: patchTarget.stack,
      moduleKey: patchTarget.moduleKey,
      mutate: (cfgPatch: UnknownRecord) => {
        mutationResult = mutateSketchBoxDoorOpenState(cfgPatch, {
          boxId: scope.boxId,
          nextOpen,
          requireFreePlacement: true,
        });
        return mutationResult.changed;
      },
      meta: createCanvasPickingModulesMotionPatchMeta('sketchFreeBoxGlobalToggle'),
      op: 'sketchFreeBoxToggle.patch',
    });
    if (!outcome.committed) return { committed: false, changed: false };
    if (outcome.changed && mutationResult.changed) return { committed: true, changed: true };
  }

  return { committed: true, changed: false };
}

function setDoorLocalOpenState(door: UnknownRecord, nextOpen: boolean): void {
  door.isOpen = !!nextOpen;
  door.noGlobalOpen = true;
  const group = asRecord(door.group);
  const userData = asRecord(group?.userData);
  if (userData) userData.noGlobalOpen = true;
}

function setDrawerLocalOpenState(drawer: UnknownRecord, nextOpen: boolean): void {
  drawer.isOpen = !!nextOpen;
  drawer.noGlobalOpen = true;
  const group = asRecord(drawer.group);
  const userData = asRecord(group?.userData);
  if (userData) userData.noGlobalOpen = true;
}

export function toggleSketchFreeBoxOpen(
  App: AppContainer,
  scope: SketchFreeBoxMotionScope | null,
  preferredStack?: string | null
): boolean {
  if (!scope?.prefix || !scope.boxId) return false;

  const matchedDoors = getDoorsArray(App).filter(door => isSketchFreeBoxMotionScopeMatch(door, scope));
  const matchedDrawers = getDrawersArray(App).filter(drawer =>
    isSketchFreeBoxMotionScopeMatch(drawer, scope)
  );

  // Clicking a free box surface must never fall through to the main wardrobe global toggle,
  // even if the box currently has no fronts to animate.
  if (!matchedDoors.length && !matchedDrawers.length) return true;

  const currentlyOpen =
    matchedDoors.some(door => !!asRecord(door)?.isOpen) ||
    matchedDrawers.some(drawer => !!asRecord(drawer)?.isOpen);
  const nextOpen = !currentlyOpen;

  const hasInternalDrawers = matchedDrawers.some(drawer => isSketchFreeBoxInternalDrawerEntry(drawer));

  if (matchedDoors.length) {
    const patchOutcome = patchSketchFreeBoxDoorOpenState(App, scope, nextOpen, preferredStack);
    // The click remains consumed, but runtime motion must not diverge from a rejected structural write.
    if (!patchOutcome.committed) return true;
  }

  recordSketchFreeBoxMotionToggle(App, scope, nextOpen, {
    hasInternalDrawers,
    delayMs: readRuntimeConfigNumberFromApp(App, 'DOOR_DELAY_MS', 600),
  });

  for (const door of matchedDoors) {
    const rec = asRecord(door);
    if (rec) setDoorLocalOpenState(rec, nextOpen);
  }
  for (const drawer of matchedDrawers) {
    const rec = asRecord(drawer);
    if (rec) setDrawerLocalOpenState(rec, nextOpen);
  }

  markLocalDoorMotion(App);
  return true;
}
