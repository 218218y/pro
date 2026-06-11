import {
  asHitObject,
  asRaycastHitLike,
  isSpecificCornerCellKey,
  readHitY,
  readStackKey,
  readUserData,
  type FindModuleSelectorHitArgs,
  type FindPreferredSelectorHitArgs,
  type ModuleKey,
  type ModuleSelectorHit,
  type ToModuleKeyFn,
} from './canvas_picking_module_selector_hits_shared.js';

export function readModuleSelectorHit(hit: unknown, toModuleKey: ToModuleKeyFn): ModuleSelectorHit | null {
  const raycastHit = asRaycastHitLike(hit);
  if (!raycastHit) return null;
  const obj = asHitObject(raycastHit.object);
  const ud = readUserData(obj);
  if (!obj || !ud || ud.__ignoreRaycast || !ud.isModuleSelector) return null;
  const moduleKey = toModuleKey(ud.moduleIndex);
  if (moduleKey == null) return null;
  return {
    moduleKey,
    object: obj,
    stack: readStackKey(ud.__wpStack) === 'bottom' ? 'bottom' : 'top',
    hitY: readHitY(raycastHit),
    hit: raycastHit,
  };
}

export function preferModuleSelectorCandidate<T extends { moduleKey: ModuleKey }>(
  current: T | null,
  next: T
): T {
  if (!current) return next;
  const currentSpecificCorner = isSpecificCornerCellKey(current.moduleKey);
  const nextSpecificCorner = isSpecificCornerCellKey(next.moduleKey);
  if (nextSpecificCorner && !currentSpecificCorner) return next;
  if (current.moduleKey === 'corner' && next.moduleKey !== 'corner') return next;
  return current;
}

export function findPreferredModuleSelectorHit(args: FindPreferredSelectorHitArgs): ModuleSelectorHit | null {
  const { intersects, toModuleKey } = args;
  let preferred: ModuleSelectorHit | null = null;
  for (let i = 0; i < intersects.length; i++) {
    const candidate = readModuleSelectorHit(intersects[i], toModuleKey);
    if (!candidate) continue;
    preferred = preferModuleSelectorCandidate(preferred, candidate);
    if (isSpecificCornerCellKey(candidate.moduleKey) || typeof candidate.moduleKey === 'number') break;
  }
  return preferred;
}

export function findModuleSelectorHit(args: FindModuleSelectorHitArgs): ModuleSelectorHit | null {
  const { intersects, moduleKey, stackKey, toModuleKey } = args;
  const wantKey = String(moduleKey);
  const wantStack = stackKey === 'bottom' ? 'bottom' : 'top';
  for (let i = 0; i < intersects.length; i++) {
    const candidate = readModuleSelectorHit(intersects[i], toModuleKey);
    if (!candidate) continue;
    if (String(candidate.moduleKey) === wantKey && candidate.stack === wantStack) return candidate;
  }
  return null;
}
