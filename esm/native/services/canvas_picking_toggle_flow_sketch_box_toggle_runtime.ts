import type { AppContainer, UnknownRecord } from '../../../types';

import type { SketchBoxDoorTarget } from './canvas_picking_toggle_flow_sketch_box_contracts.js';
import {
  hasSketchBoxDoorOpenTarget,
  mutateSketchBoxDoorOpenState,
  type SketchBoxDoorOpenMutationResult,
} from './canvas_picking_sketch_box_door_open_mutation.js';
import { resolveSketchBoxPatchTargets } from './canvas_picking_toggle_flow_sketch_box_target_runtime.js';
import {
  applySketchBoxDoorRuntimeStateForBox,
  seedSketchBoxDoorMotion,
  setPendingSketchBoxDoorState,
} from './canvas_picking_toggle_flow_sketch_box_runtime.js';
import {
  toggleSketchBoxDoorWithCapabilities,
  type SketchBoxDoorToggleCapabilities,
  type SketchBoxDoorToggleCommitOutcome,
} from './canvas_picking_toggle_flow_sketch_box_toggle.js';
import { markLocalDoorMotion } from './canvas_picking_toggle_flow_shared.js';
import { createCanvasPickingModulesMotionPatchMeta } from './canvas_picking_modules_patch_meta.js';
import {
  commitCanvasModuleStructuralPatch,
  readCanvasModuleConfigForStack,
} from './canvas_picking_structural_commit.js';

const capabilitiesByApp = new WeakMap<AppContainer, SketchBoxDoorToggleCapabilities>();

function emptyCommitOutcome(committed: boolean): SketchBoxDoorToggleCommitOutcome {
  return {
    committed,
    changed: false,
    nextOpen: null,
    doorIds: [],
    runtimeModuleKey: null,
  };
}

function commitSketchBoxDoorToggle(
  App: AppContainer,
  target: SketchBoxDoorTarget,
  preferredStack?: string | null
): SketchBoxDoorToggleCommitOutcome {
  const patchTargets = resolveSketchBoxPatchTargets(App, target, preferredStack);
  for (const patchTarget of patchTargets) {
    const cfg = readCanvasModuleConfigForStack({
      App,
      stack: patchTarget.stack,
      moduleKey: patchTarget.moduleKey,
      op: 'sketchBoxDoorToggle.target',
    });
    if (!hasSketchBoxDoorOpenTarget(cfg, { boxId: target.boxId })) continue;

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
        mutationResult = mutateSketchBoxDoorOpenState(cfgPatch, { boxId: target.boxId });
        return mutationResult.changed;
      },
      meta: createCanvasPickingModulesMotionPatchMeta('sketchBoxDoorToggle'),
      op: 'sketchBoxDoorToggle.patch',
    });

    if (!outcome.committed) return emptyCommitOutcome(false);
    if (!(outcome.changed && mutationResult.changed)) continue;
    return {
      committed: true,
      changed: true,
      nextOpen: mutationResult.nextOpen,
      doorIds: mutationResult.doorIds,
      runtimeModuleKey: patchTarget.moduleKey,
    };
  }

  return emptyCommitOutcome(true);
}

export function createSketchBoxDoorToggleCapabilities(App: AppContainer): SketchBoxDoorToggleCapabilities {
  const cached = capabilitiesByApp.get(App);
  if (cached) return cached;
  const capabilities: SketchBoxDoorToggleCapabilities = {
    commitToggle: (target, preferredStack) => commitSketchBoxDoorToggle(App, target, preferredStack),
    seedDoorMotion: (target, nextOpen) => seedSketchBoxDoorMotion(App, target, nextOpen),
    applyRuntimeStateForBox: (target, nextOpen) =>
      applySketchBoxDoorRuntimeStateForBox(App, target, nextOpen),
    setPendingState: (target, nextOpen) => setPendingSketchBoxDoorState(App, target, nextOpen),
    markLocalMotion: () => markLocalDoorMotion(App),
  };
  capabilitiesByApp.set(App, capabilities);
  return capabilities;
}

export function toggleSketchBoxDoor(
  App: AppContainer,
  target: SketchBoxDoorTarget | null,
  preferredStack?: string | null
): boolean {
  return toggleSketchBoxDoorWithCapabilities(
    createSketchBoxDoorToggleCapabilities(App),
    target,
    preferredStack
  );
}
