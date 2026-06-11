import {
  asHitObject,
  asRecord,
  inferModuleStackFromHint,
  isRaycastDecorativeObject,
  isSpecificCornerCellKey,
  readHitY,
  readStackKey,
  readUserData,
  type FindModuleCandidateForStackArgs,
  type FindPreferredCornerCellCandidateArgs,
  type ModuleHitCandidate,
  type ModuleKey,
  type ReadModuleHitCandidateArgs,
} from './canvas_picking_module_selector_hits_shared.js';

function readModuleValue(args: {
  userData: Record<string, unknown>;
  includeSketchModuleKey: boolean;
}): unknown {
  const { userData, includeSketchModuleKey } = args;
  return includeSketchModuleKey
    ? (userData.moduleIndex ?? userData.__wpSketchModuleKey)
    : userData.moduleIndex;
}

export function readModuleHitCandidateFromIntersection(
  args: ReadModuleHitCandidateArgs
): ModuleHitCandidate | null {
  const { hit, toModuleKey, stopAt = null, includeSketchModuleKey = false } = args;
  const hitRec = asRecord(hit);
  const object = asHitObject(hitRec?.object);
  if (!object || isRaycastDecorativeObject(object)) return null;

  let curr: unknown = object;
  let stackHint: 'top' | 'bottom' | null = null;
  while (curr && !(stopAt?.(curr) ?? false)) {
    const currRec = asRecord(curr);
    const ud = readUserData(currRec);
    if (ud) {
      if (!stackHint) stackHint = readStackKey(ud.__wpStack);
      const moduleKey = toModuleKey(
        readModuleValue({
          userData: ud,
          includeSketchModuleKey,
        })
      );
      if (moduleKey != null) {
        return {
          moduleKey,
          hitY: readHitY(hit),
          stackHint,
          object,
        };
      }
    }
    curr = currRec?.parent ?? null;
  }

  return null;
}

function toModuleCandidateValue(candidate: ModuleHitCandidate): {
  moduleKey: ModuleKey;
  hitY: number | null;
} {
  return { moduleKey: candidate.moduleKey, hitY: candidate.hitY };
}

export function findModuleCandidateForStack(args: FindModuleCandidateForStackArgs): {
  moduleKey: ModuleKey;
  hitY: number | null;
} | null {
  const {
    intersects,
    desiredStack,
    boundaryY,
    toModuleKey,
    stopAt = null,
    includeSketchModuleKey = false,
  } = args;
  let fallback: { moduleKey: ModuleKey; hitY: number | null } | null = null;

  for (let i = 0; i < intersects.length; i++) {
    const candidate = readModuleHitCandidateFromIntersection({
      hit: intersects[i],
      toModuleKey,
      stopAt,
      includeSketchModuleKey,
    });
    if (!candidate) continue;

    const effectiveStack = inferModuleStackFromHint(candidate.stackHint, boundaryY, candidate.hitY);
    if (effectiveStack === desiredStack) return toModuleCandidateValue(candidate);
    if (!fallback && effectiveStack == null) {
      fallback = toModuleCandidateValue(candidate);
    }
  }

  return fallback;
}

export function findPreferredCornerCellCandidate(args: FindPreferredCornerCellCandidateArgs): {
  moduleKey: ModuleKey;
  hitY: number | null;
} | null {
  const {
    intersects,
    desiredStack,
    boundaryY,
    toModuleKey,
    stopAt = null,
    includeSketchModuleKey = false,
  } = args;
  let genericCornerFallback: { moduleKey: ModuleKey; hitY: number | null } | null = null;
  let unknownStackCornerFallback: { moduleKey: ModuleKey; hitY: number | null } | null = null;

  for (let i = 0; i < intersects.length; i++) {
    const candidate = readModuleHitCandidateFromIntersection({
      hit: intersects[i],
      toModuleKey,
      stopAt,
      includeSketchModuleKey,
    });
    if (!candidate) continue;

    const effectiveStack = inferModuleStackFromHint(candidate.stackHint, boundaryY, candidate.hitY);
    const value = toModuleCandidateValue(candidate);
    if (effectiveStack === desiredStack && isSpecificCornerCellKey(candidate.moduleKey)) return value;
    if (effectiveStack === desiredStack && candidate.moduleKey === 'corner' && !genericCornerFallback) {
      genericCornerFallback = value;
    }
    if (
      effectiveStack == null &&
      isSpecificCornerCellKey(candidate.moduleKey) &&
      !unknownStackCornerFallback
    ) {
      unknownStackCornerFallback = value;
    }
  }

  return genericCornerFallback || unknownStackCornerFallback;
}
