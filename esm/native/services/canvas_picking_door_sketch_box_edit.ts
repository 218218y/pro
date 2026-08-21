import type { SketchBoxDoorTarget } from './canvas_picking_toggle_flow_sketch_box_contracts.js';
import {
  parseSketchBoxDoorPartTarget,
  readSketchBoxDoorSegmentSuffix as readCanonicalSketchBoxDoorSegmentSuffix,
  stripSketchBoxDoorVisualSuffix as stripCanonicalSketchBoxDoorVisualSuffix,
} from './canvas_picking_sketch_box_target_identity.js';

export type { SketchBoxDoorTarget } from './canvas_picking_toggle_flow_sketch_box_contracts.js';

export type SketchBoxDoorPatchOptions = {
  source?: string;
};

export type SketchBoxDoorRecord = Record<string, unknown>;

export type SketchBoxDoorModuleSnapshot = {
  lookupIndex: number;
  patchModuleKey: string;
  identities: readonly string[];
  hasTargetBox: boolean;
  targetDoor: SketchBoxDoorRecord | null;
};

export type SketchBoxDoorStateSnapshot = {
  top: readonly SketchBoxDoorModuleSnapshot[];
  bottom: readonly SketchBoxDoorModuleSnapshot[];
};

export type SketchBoxDoorPatchTarget = {
  stack: 'top' | 'bottom';
  moduleKey: string;
};

export type SketchBoxDoorPatchRequest = SketchBoxDoorPatchTarget & {
  boxId: string;
  doorId: string | null;
  mutate: (door: SketchBoxDoorRecord | null) => SketchBoxDoorRecord | null;
  source: string;
};

export type SketchBoxDoorPatchOutcome = {
  committed: boolean;
  changed: boolean;
};

export type SketchBoxDoorEditCapabilities = {
  readTargetSnapshot: (target: SketchBoxDoorTarget) => SketchBoxDoorStateSnapshot;
  commitDoorPatch: (request: SketchBoxDoorPatchRequest) => SketchBoxDoorPatchOutcome;
};

export function readSketchBoxDoorPatchSource(options?: SketchBoxDoorPatchOptions | null): string {
  return typeof options?.source === 'string' && options.source.trim() ? options.source : 'sketchBoxDoorEdit';
}

export function stripSketchBoxDoorVisualSuffix(partId: string | null | undefined): string {
  return stripCanonicalSketchBoxDoorVisualSuffix(partId);
}

export function readSketchBoxDoorSegmentSuffix(partId: string | null | undefined): string | null {
  return readCanonicalSketchBoxDoorSegmentSuffix(partId);
}

export function isSketchBoxDoorSegmentPartId(partId: string | null | undefined): boolean {
  return !!readSketchBoxDoorSegmentSuffix(partId) && parseSketchBoxDoorTarget(partId) !== null;
}

export function parseSketchBoxDoorTarget(partId: string | null | undefined): SketchBoxDoorTarget | null {
  return parseSketchBoxDoorPartTarget(partId);
}

function orderedStacks(preferredStack: 'top' | 'bottom'): readonly ('top' | 'bottom')[] {
  return preferredStack === 'bottom' ? ['bottom', 'top'] : ['top', 'bottom'];
}

function modulesForStack(
  snapshot: SketchBoxDoorStateSnapshot,
  stack: 'top' | 'bottom'
): readonly SketchBoxDoorModuleSnapshot[] {
  return stack === 'bottom' ? snapshot.bottom : snapshot.top;
}

function moduleMatchesIdentity(module: SketchBoxDoorModuleSnapshot, moduleKey: string): boolean {
  const numericIndex = /^\d+$/.test(moduleKey) ? Number(moduleKey) : Number.NaN;
  if (Number.isInteger(numericIndex) && module.lookupIndex === numericIndex) return true;
  return module.identities.includes(moduleKey);
}

export function readSketchBoxDoorRecordWithCapabilities(
  capabilities: SketchBoxDoorEditCapabilities,
  target: SketchBoxDoorTarget | null,
  preferredStack: 'top' | 'bottom'
): SketchBoxDoorRecord | null {
  if (!target?.boxId) return null;
  const snapshot = capabilities.readTargetSnapshot(target);

  for (const stack of orderedStacks(preferredStack)) {
    const modules = modulesForStack(snapshot, stack);
    if (target.moduleKey != null && target.moduleKey !== '') {
      const moduleKey = String(target.moduleKey);
      for (const module of modules) {
        if (!moduleMatchesIdentity(module, moduleKey)) continue;
        if (module.targetDoor) return module.targetDoor;
      }
    }

    for (const module of modules) {
      if (module.targetDoor) return module.targetDoor;
    }
  }

  return null;
}

export function resolveSketchBoxDoorPatchTargets(
  snapshot: SketchBoxDoorStateSnapshot | null,
  target: SketchBoxDoorTarget | null,
  preferredStack: 'top' | 'bottom'
): SketchBoxDoorPatchTarget[] {
  if (!target?.boxId) return [];
  const out: SketchBoxDoorPatchTarget[] = [];
  const seen = new Set<string>();
  const pushCandidate = (stack: 'top' | 'bottom', moduleKey: string) => {
    if (!moduleKey) return;
    const key = `${stack}::${moduleKey}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ stack, moduleKey });
  };

  if (target.moduleKey) {
    const moduleKey = String(target.moduleKey);
    for (const stack of orderedStacks(preferredStack)) pushCandidate(stack, moduleKey);
    return out;
  }
  if (!snapshot) return out;

  for (const stack of orderedStacks(preferredStack)) {
    const modules = modulesForStack(snapshot, stack);
    for (const module of modules) {
      if (!module.hasTargetBox) continue;
      pushCandidate(stack, module.patchModuleKey);
    }
  }

  return out;
}

export function patchSketchBoxDoorWithCapabilities(
  capabilities: SketchBoxDoorEditCapabilities,
  target: SketchBoxDoorTarget | null,
  preferredStack: 'top' | 'bottom',
  mutate: (door: SketchBoxDoorRecord | null) => SketchBoxDoorRecord | null,
  options?: SketchBoxDoorPatchOptions | null
): boolean {
  if (!target) return false;
  const snapshot = target.moduleKey ? null : capabilities.readTargetSnapshot(target);
  const patchTargets = resolveSketchBoxDoorPatchTargets(snapshot, target, preferredStack);
  const source = readSketchBoxDoorPatchSource(options);

  for (const patchTarget of patchTargets) {
    const outcome = capabilities.commitDoorPatch({
      ...patchTarget,
      boxId: target.boxId,
      doorId: target.doorId != null && String(target.doorId) ? String(target.doorId) : null,
      mutate,
      source,
    });
    if (!outcome.committed) return false;
    if (outcome.changed) return true;
  }
  return false;
}
