import {
  asHitObject,
  type EstimateVisibleModuleFrontZArgs,
  isRenderableHitObject,
  readUserData,
} from './canvas_picking_hover_targets_shared.js';

export function estimateVisibleModuleFrontZ(args: EstimateVisibleModuleFrontZArgs): number {
  const {
    App,
    target,
    selectorBox,
    isViewportRoot,
    toModuleKey,
    projectWorldPointToLocal,
    measureObjectLocalBox,
  } = args;
  const selectorFrontZ = Number(selectorBox.centerZ) + Number(selectorBox.depth) / 2;
  let bestFrontZ = selectorFrontZ;
  try {
    const parent = target.hitSelectorObj?.parent || null;
    const wantKey = toModuleKey(target.hitModuleKey);
    const intersects = Array.isArray(target.intersects) ? target.intersects : [];
    for (let i = 0; i < intersects.length; i++) {
      const hit = intersects[i];
      const obj = asHitObject(hit?.object);
      if (!isRenderableHitObject(obj)) continue;

      let curr = obj;
      let matched = null;
      while (curr && !isViewportRoot(App, curr)) {
        const ud = readUserData(curr);
        const mk = ud ? toModuleKey(ud.moduleIndex) : null;
        if (mk != null && wantKey != null && String(mk) === String(wantKey)) {
          matched = curr;
          break;
        }
        curr = curr.parent || null;
      }
      if (!matched) continue;

      const hitPointLocal =
        parent && hit && hit.point ? projectWorldPointToLocal(App, hit.point, parent) : null;
      if (hitPointLocal && Number.isFinite(hitPointLocal.z)) {
        bestFrontZ = Math.max(bestFrontZ, Number(hitPointLocal.z));
      }

      const box = measureObjectLocalBox(App, matched, parent);
      if (box && Number.isFinite(box.centerZ) && Number.isFinite(box.depth) && box.depth > 0) {
        bestFrontZ = Math.max(bestFrontZ, Number(box.centerZ) + Number(box.depth) / 2);
      }
    }
  } catch {
    // ignore
  }
  return bestFrontZ;
}
