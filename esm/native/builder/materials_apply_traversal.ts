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
  if (material.transparent === true && Number(material.opacity) === 0) return true;

  return false;
}

export function applyMaterialsToWardrobeTree(args: {
  wardrobeGroup: WardrobeMeshLike;
  getPartMat: (partId: string, stackKey: PartStackKey) => unknown;
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
    skip: boolean;
  }> = [{ obj: wardrobeGroup, partId: null, stackKey: null, skip: false }];

  while (stack.length) {
    const current = stack.pop();
    const obj = current?.obj;
    if (!obj) continue;

    const parentPartId = current.partId;
    const parentStackKey = current.stackKey;
    const skipParent = current.skip;

    const userData = asObject<ValueRecord>(obj.userData) || {};
    const ownPartId = readPartId(userData.partId) || parentPartId;
    const ownStackKey = readStackKey(userData.__wpStack) || parentStackKey;
    const skipSubtree = !!skipParent || !!userData.__keepMaterialSubtree;

    if (obj.isMesh) {
      const keepOwnMaterial = shouldKeepMaterialsApplyMeshMaterial(obj);
      if (
        !skipSubtree &&
        !keepOwnMaterial &&
        ownPartId &&
        !userData.__keepMaterial &&
        !Array.isArray(obj.material)
      ) {
        const cacheKey = `${ownPartId}::${ownStackKey || ''}`;
        if (!materialCache.has(cacheKey)) {
          const material = getPartMat(ownPartId, ownStackKey);
          materialCache.set(cacheKey, material);
          if (material && obj.material !== material) {
            obj.material = material;
            changed = true;
          }
        } else {
          const material = materialCache.get(cacheKey);
          if (material && obj.material !== material) {
            obj.material = material;
            changed = true;
          }
        }
      }
    }

    const children = Array.isArray(obj.children) ? obj.children : [];
    for (let i = children.length - 1; i >= 0; i -= 1) {
      const child = asObject<WardrobeMeshLike>(children[i]);
      if (child) {
        stack.push({ obj: child, partId: ownPartId, stackKey: ownStackKey, skip: skipSubtree });
      }
    }
  }

  return changed;
}
