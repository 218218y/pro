import type { HitObjectLike } from './canvas_picking_engine.js';
import type { SketchBoxDoorTarget } from './canvas_picking_toggle_flow_sketch_box_contracts.js';
import { parseSketchBoxPartTarget } from './canvas_picking_sketch_box_target_identity.js';
import { asRecord, readStringRecord } from './canvas_picking_toggle_flow_shared.js';

function isSketchBoxDoorUserData(userData: unknown): boolean {
  const rec = asRecord(userData);
  return rec?.__wpSketchBoxDoor === true;
}

function isResolvedDoorTarget(target: SketchBoxDoorTarget | null): target is SketchBoxDoorTarget {
  return !!(target && target.doorId);
}

export function parseSketchBoxPartId(partId: string): SketchBoxDoorTarget | null {
  return parseSketchBoxPartTarget(partId);
}

export function resolveSketchBoxToggleTarget(
  primaryHitObject: HitObjectLike | null,
  foundPartId: string | null,
  foundModuleIndex?: string | number | null
): SketchBoxDoorTarget | null {
  let cur = primaryHitObject;
  let sawSketchBoxNonDoorHit = false;
  while (cur) {
    const userData = asRecord(cur.userData);
    const isDoorObject = isSketchBoxDoorUserData(userData);
    const boxId = readStringRecord(userData, '__wpSketchBoxId');
    if (boxId) {
      if (isDoorObject) {
        const moduleKey =
          readStringRecord(userData, '__wpSketchModuleKey') ||
          (foundModuleIndex != null ? String(foundModuleIndex) : null);
        const doorId = readStringRecord(userData, '__wpSketchBoxDoorId');
        return { moduleKey, boxId, doorId };
      }
      sawSketchBoxNonDoorHit = true;
    }

    const pid = readStringRecord(userData, 'partId');
    if (pid) {
      const parsed = parseSketchBoxPartId(pid);
      if (parsed && (isDoorObject || isResolvedDoorTarget(parsed))) {
        return {
          moduleKey: parsed.moduleKey || (foundModuleIndex != null ? String(foundModuleIndex) : null),
          boxId: parsed.boxId,
          doorId: parsed.doorId || null,
        };
      }
    }
    cur = cur.parent || null;
  }

  if (sawSketchBoxNonDoorHit) return null;

  if (foundPartId) {
    const parsed = parseSketchBoxPartId(foundPartId);
    if (isResolvedDoorTarget(parsed)) {
      return {
        moduleKey: parsed.moduleKey || (foundModuleIndex != null ? String(foundModuleIndex) : null),
        boxId: parsed.boxId,
        doorId: parsed.doorId || null,
      };
    }
  }

  return null;
}
