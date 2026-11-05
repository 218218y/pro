import {
  asObject,
  type PartStackKey,
  type ValueRecord,
  type WardrobeMeshLike,
} from './materials_apply_shared.js';

export function shouldKeepMaterialsApplyMeshMaterial(obj: WardrobeMeshLike | null | undefined): boolean {
  const mesh = asObject<WardrobeMeshLike>(obj);
  if (!mesh) return false;

  const userData = asObject<ValueRecord>(mesh.userData) || {};
  if (userData.__keepMaterial === true) return true;
  if (userData.isModuleSelector === true) return true;

  const material = asObject<ValueRecord>(mesh.material);
  if (!material) return false;
  if (material.__keepMaterial === true) return true;
  const materialUserData = asObject<ValueRecord>(material.userData) || {};
  if (materialUserData.__keepMaterial === true) return true;
  if (material.visible === false) return true;
  if (material.colorWrite === false) return true;
  if (material.transparent === true && material.opacity === 0) return true;

  return false;
}

function applyResolvedMaterial(obj: WardrobeMeshLike, material: unknown, userData: ValueRecord): boolean {
  if (!material) return false;
  if (userData.__wpMasoniteBackPanel === true && Array.isArray(obj.material) && obj.material.length === 6) {
    if (obj.material[4] === material) return false;
    // The interior-facing +Z face alone is paintable; preserve masonite brown on all other faces.
    obj.material = [...obj.material.slice(0, 4), material, obj.material[5]];
    return true;
  }
  if (obj.material === material) return false;
  obj.material = material;
  return true;
}

export function applyMaterialsToWardrobeTree(args: {
  wardrobeGroup: WardrobeMeshLike;
  getPartMat: (partId: string, stackKey: PartStackKey, userData?: ValueRecord | null) => unknown;
  readPartId: (value: unknown) => string | null;
  readStackKey: (value: unknown) => PartStackKey;
}): boolean {
  const { wardrobeGroup, getPartMat, readPartId, readStackKey } = args;
  const materialCache = new Map<string, unknown>();
  let changed = false;
  const stack: Array<{
    obj: WardrobeMeshLike;
    partId: string | null;
    stackKey: PartStackKey;
    stackSplitUnifiedFrame: boolean;
    skip: boolean;
  }> = [{ obj: wardrobeGroup, partId: null, stackKey: null, stackSplitUnifiedFrame: false, skip: false }];

  while (stack.length) {
    const current = stack.pop();
    const obj = current?.obj;
    if (!obj) continue;

    const parentPartId = current.partId;
    const parentStackKey = current.stackKey;
    const parentStackSplitUnifiedFrame = current.stackSplitUnifiedFrame;
    const skipParent = current.skip;

    const userData = asObject<ValueRecord>(obj.userData) || {};
    const ownPartId = readPartId(userData.partId) || parentPartId;
    const ownStackKey = readStackKey(userData.__wpStack) || parentStackKey;
    const ownStackSplitUnifiedFrame =
      userData.__wpStackSplitUnifiedFrame === true
        ? true
        : userData.__wpStackSplitUnifiedFrame === false
          ? false
          : parentStackSplitUnifiedFrame;
    const effectiveUserData =
      userData.__wpStackSplitUnifiedFrame === ownStackSplitUnifiedFrame
        ? userData
        : { ...userData, __wpStackSplitUnifiedFrame: ownStackSplitUnifiedFrame };
    const skipSubtree = !!skipParent || !!userData.__keepMaterialSubtree;

    if (obj.isMesh) {
      const keepOwnMaterial = shouldKeepMaterialsApplyMeshMaterial(obj);
      if (!skipSubtree && !keepOwnMaterial && ownPartId && !userData.__keepMaterial) {
        const shelfDefaultKey = userData.__wpShelfGroupPartId
          ? userData.__wpShelfIsBrace === true || userData.__wpShelfVariant === 'brace'
            ? 'brace'
            : 'regular'
          : '';
        const shelfExposedSide =
          userData.__wpShelfExposedSide === 'left' ||
          userData.__wpShelfExposedSide === 'right' ||
          userData.__wpShelfExposedSide === 'both'
            ? userData.__wpShelfExposedSide
            : '';
        const cacheKey = `${ownPartId}::${ownStackKey || ''}::${ownStackSplitUnifiedFrame ? 'unified' : 'split'}::${shelfDefaultKey}::${shelfExposedSide}`;
        if (!materialCache.has(cacheKey)) {
          const material = getPartMat(ownPartId, ownStackKey, effectiveUserData);
          materialCache.set(cacheKey, material);
          if (applyResolvedMaterial(obj, material, userData)) changed = true;
        } else {
          const material = materialCache.get(cacheKey);
          if (applyResolvedMaterial(obj, material, userData)) changed = true;
        }
      }
    }

    const children = Array.isArray(obj.children) ? obj.children : [];
    for (let i = children.length - 1; i >= 0; i -= 1) {
      const child = asObject<WardrobeMeshLike>(children[i]);
      if (child) {
        stack.push({
          obj: child,
          partId: ownPartId,
          stackKey: ownStackKey,
          stackSplitUnifiedFrame: ownStackSplitUnifiedFrame,
          skip: skipSubtree,
        });
      }
    }
  }

  return changed;
}
