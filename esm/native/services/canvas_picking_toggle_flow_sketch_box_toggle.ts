import type { SketchBoxDoorTarget } from './canvas_picking_toggle_flow_sketch_box_contracts.js';

export type SketchBoxDoorToggleCommitOutcome = {
  committed: boolean;
  changed: boolean;
  nextOpen: boolean | null;
  doorIds: readonly string[];
  runtimeModuleKey: string | null;
};

export type SketchBoxDoorToggleCapabilities = {
  commitToggle: (
    target: SketchBoxDoorTarget,
    preferredStack?: string | null
  ) => SketchBoxDoorToggleCommitOutcome;
  seedDoorMotion: (target: SketchBoxDoorTarget, nextOpen: boolean) => void;
  applyRuntimeStateForBox: (target: SketchBoxDoorTarget, nextOpen: boolean) => number;
  setPendingState: (target: SketchBoxDoorTarget, nextOpen: boolean) => void;
  markLocalMotion: () => void;
};

export function toggleSketchBoxDoorWithCapabilities(
  capabilities: SketchBoxDoorToggleCapabilities,
  target: SketchBoxDoorTarget | null,
  preferredStack?: string | null
): boolean {
  if (!target) return false;

  const outcome = capabilities.commitToggle(target, preferredStack);
  if (!outcome.committed || !outcome.changed || outcome.nextOpen == null) return false;

  const runtimeModuleKey = outcome.runtimeModuleKey ?? target.moduleKey;
  for (const doorId of outcome.doorIds) {
    capabilities.seedDoorMotion(
      { moduleKey: runtimeModuleKey, boxId: target.boxId, doorId },
      outcome.nextOpen
    );
  }

  const runtimeTarget: SketchBoxDoorTarget = {
    moduleKey: runtimeModuleKey,
    boxId: target.boxId,
    doorId: null,
  };
  const appliedCount = capabilities.applyRuntimeStateForBox(runtimeTarget, outcome.nextOpen);
  if (appliedCount < outcome.doorIds.length) {
    capabilities.setPendingState(runtimeTarget, outcome.nextOpen);
  }
  capabilities.markLocalMotion();
  return true;
}
