import type { BuilderRenderDrawerDeps } from './render_drawer_ops_shared.js';
import {
  isRecord,
  readAddFoldedClothes,
  readCreateInternalDrawerBox,
  readGetPartMaterial,
  readInternalDrawerOp,
  readObject3D,
  readOutlineFn,
  readThreeLike,
} from './render_drawer_ops_shared.js';

export function createApplyInternalDrawersOps(deps: BuilderRenderDrawerDeps) {
  const { __app, __ops, __wardrobeGroup, __reg, __drawers } = deps;

  return function applyInternalDrawersOps(argsIn: unknown): boolean {
    const App = __app(argsIn);
    __ops(App);
    const args = isRecord(argsIn) ? argsIn : null;
    const THREE = readThreeLike(args?.THREE);
    const ops = args && Array.isArray(args.ops) ? args.ops : null;
    if (!THREE || !ops || ops.length === 0) return false;

    const drawerGroup = readObject3D(args?.wardrobeGroup) || readObject3D(__wardrobeGroup(App));
    if (!drawerGroup) return false;

    const createInternalDrawerBox = readCreateInternalDrawerBox(args?.createInternalDrawerBox);
    if (!createInternalDrawerBox) return false;

    const getPartMaterial = readGetPartMaterial(args?.getPartMaterial);
    const bodyMat = args?.bodyMat;
    const addOutlines = readOutlineFn(args?.addOutlines);
    const showContentsEnabled = args?.showContentsEnabled === true;
    const addFoldedClothes = readAddFoldedClothes(args?.addFoldedClothes);

    for (let i = 0; i < ops.length; i++) {
      const drawerOp = readInternalDrawerOp(ops[i]);
      if (!drawerOp) continue;

      const partId = drawerOp.partId;
      const mat = getPartMaterial ? getPartMaterial(partId) : bodyMat;
      const intBox = createInternalDrawerBox(
        drawerOp.width,
        drawerOp.height,
        drawerOp.depth,
        mat,
        bodyMat,
        addOutlines,
        drawerOp.hasDivider,
        false
      );
      intBox.userData = { partId, moduleIndex: drawerOp.moduleIndex };
      __reg(App, partId, intBox, 'intDrawer');

      const closedPos = new THREE.Vector3(drawerOp.x || 0, drawerOp.y || 0, drawerOp.z || 0);
      const openPos = new THREE.Vector3(
        drawerOp.x || 0,
        drawerOp.y || 0,
        typeof drawerOp.openZ === 'number' ? drawerOp.openZ : (drawerOp.z || 0) + 0.25
      );

      intBox.position.copy(closedPos);
      drawerGroup.add(intBox);

      const drawersArray = __drawers(App);
      if (Array.isArray(drawersArray)) {
        drawersArray.push({
          group: intBox,
          closed: closedPos,
          open: openPos,
          id: partId,
          dividerKey: drawerOp.dividerKey || partId,
        });
      }

      if (showContentsEnabled && addFoldedClothes) {
        addFoldedClothes(
          0,
          -(drawerOp.height || 0) / 2 + 0.015,
          0,
          (drawerOp.width || 0) - 0.05,
          intBox,
          Math.max(0, (drawerOp.height || 0) - 0.03),
          drawerOp.depth
        );
      }
    }

    return true;
  };
}
