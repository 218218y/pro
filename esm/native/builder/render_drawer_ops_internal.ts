import { CHEST_MODE_DRAWER_BOX_RENDER_POLICY } from '../../shared/dimensions/chest_mode_policy.js';
import { INTERNAL_DRAWER_CONTENTS_POLICY } from '../../shared/dimensions/internal_drawer_policy.js';
import { makeDrawerBoxPartId, resolveDrawerBoxPaintMaterial } from '../features/part_identity/api.js';
import { appendDrawerRunnerVisuals } from './drawer_runner_visuals.js';
import { emitSketchInternalDrawerCassettePanels } from './render_interior_sketch_internal_drawer_cassette.js';
import type { BuilderCreateBoardFn } from '../../../types';
import type { BuilderRenderDrawerDeps } from './render_drawer_ops_shared.js';
import {
  isRecord,
  readAddFoldedClothes,
  readCreateInternalDrawerBox,
  readDrawerConfig,
  readGetPartColorValue,
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
    const getPartColorValue = readGetPartColorValue(args?.getPartColorValue);
    const cfg = readDrawerConfig(args?.cfg);
    const bodyMat = args?.bodyMat;
    const drawerBoxBaseMat = args?.drawerBoxBaseMat || args?.whiteMat || bodyMat;
    const addOutlines = readOutlineFn(args?.addOutlines);
    const createBoard =
      typeof args?.createBoard === 'function' ? (args.createBoard as BuilderCreateBoardFn) : null;
    const currentShelfMat = args?.currentShelfMat;
    const sketchMode = args?.sketchMode === true;
    const showContentsEnabled = args?.showContentsEnabled === true;
    const addFoldedClothes = readAddFoldedClothes(args?.addFoldedClothes);

    const emittedCassetteStacks = new Set<string>();
    const fixedRunnerHardware = new THREE.Group();
    fixedRunnerHardware.userData = {
      ...fixedRunnerHardware.userData,
      __ignoreRaycast: true,
      __wpDrawerRunnerHardwareContainer: true,
    };

    for (let i = 0; i < ops.length; i++) {
      const drawerOp = readInternalDrawerOp(ops[i]);
      if (!drawerOp) continue;

      const stackPartId = drawerOp.stackPartId || drawerOp.partId;
      if (
        createBoard &&
        drawerOp.stackPartId &&
        !emittedCassetteStacks.has(stackPartId) &&
        typeof drawerOp.cassetteBaseY === 'number' &&
        typeof drawerOp.cassetteOuterWidth === 'number' &&
        typeof drawerOp.cassetteDepth === 'number' &&
        typeof drawerOp.cassetteCenterX === 'number' &&
        typeof drawerOp.cassetteCenterZ === 'number' &&
        typeof drawerOp.cassetteStackH === 'number'
      ) {
        emitSketchInternalDrawerCassettePanels({
          createBoard,
          stackPartId,
          centerX: drawerOp.cassetteCenterX,
          baseY: drawerOp.cassetteBaseY,
          centerZ: drawerOp.cassetteCenterZ,
          outerWidth: drawerOp.cassetteOuterWidth,
          depth: drawerOp.cassetteDepth,
          stackH: drawerOp.cassetteStackH,
          woodThick: drawerOp.cassetteWoodThick,
          currentShelfMat,
          fallbackMaterial: bodyMat || drawerBoxBaseMat,
          getPartMaterial,
          getPartColorValue,
        });
        emittedCassetteStacks.add(stackPartId);
      }

      const partId = drawerOp.partId;
      const drawerBoxPartId = makeDrawerBoxPartId(partId);
      const drawerBoxMat = resolveDrawerBoxPaintMaterial({
        drawerBoxPartId,
        fallbackMaterial: drawerBoxBaseMat,
        getPartColorValue,
        getPartMaterial,
      });
      const intBox = createInternalDrawerBox(
        drawerOp.width,
        drawerOp.height,
        drawerOp.depth,
        drawerBoxMat,
        drawerBoxMat,
        addOutlines,
        drawerOp.hasDivider,
        false
      );
      const sketchModuleKey = drawerOp.sketchModuleKey ?? drawerOp.moduleIndex;
      intBox.userData = {
        ...intBox.userData,
        partId: drawerBoxPartId,
        drawerId: partId,
        moduleIndex: drawerOp.moduleIndex,
        __wpDrawerBox: true,
        __wpInternalDrawerBox: true,
        __wpDrawerId: partId,
        __wpDrawerOwnerPartId: partId,
        __doorWidth: drawerOp.width,
        __doorHeight: drawerOp.height,
        __frontMaxZ: resolveInternalDrawerFrontMaxZ(drawerOp.depth),
        __wpFaceOffsetX: 0,
      };
      if (drawerOp.sketchBoxId) {
        intBox.userData.__wpSketchBoxId = drawerOp.sketchBoxId;
        intBox.userData.__wpSketchModuleKey = sketchModuleKey;
        intBox.userData.__wpSketchFreePlacement = drawerOp.sketchFreePlacement === true;
        if (drawerOp.sketchStack) intBox.userData.__wpStack = drawerOp.sketchStack;
      }
      __reg(App, partId, intBox, 'intDrawer');

      const closedPos = new THREE.Vector3(drawerOp.x || 0, drawerOp.y || 0, drawerOp.z || 0);
      const openPos = new THREE.Vector3(
        drawerOp.x || 0,
        drawerOp.y || 0,
        typeof drawerOp.openZ === 'number' ? drawerOp.openZ : (drawerOp.z || 0) + 0.25
      );

      intBox.position.copy(closedPos);

      appendDrawerRunnerVisuals({
        THREE,
        runnerType: cfg.drawerRunnerType,
        fixedParent: fixedRunnerHardware,
        movingParent: intBox,
        drawerWidthM: drawerOp.width,
        drawerHeightM: drawerOp.height,
        drawerDepthM: drawerOp.depth,
        drawerBoxOffsetZM: 0,
        closedPosition: { x: closedPos.x, y: closedPos.y, z: closedPos.z },
        ownerPartId: partId,
      });

      drawerGroup.add(intBox);

      const drawersArray = __drawers(App);
      if (Array.isArray(drawersArray)) {
        drawersArray.push({
          group: intBox,
          closed: closedPos,
          open: openPos,
          id: partId,
          partId,
          dividerKey: drawerOp.dividerKey || partId,
          isInternal: true,
        });
      }

      if (showContentsEnabled && addFoldedClothes) {
        addFoldedClothes(
          0,
          -(drawerOp.height || 0) / 2 + INTERNAL_DRAWER_CONTENTS_POLICY.contentsBottomInsetM,
          0,
          (drawerOp.width || 0) - INTERNAL_DRAWER_CONTENTS_POLICY.contentsWidthClearanceM,
          intBox,
          Math.max(0, (drawerOp.height || 0) - INTERNAL_DRAWER_CONTENTS_POLICY.contentsHeightClearanceM),
          drawerOp.depth,
          {
            showContentsEnabled,
            sketchMode,
            addOutlines: addOutlines || null,
            cfgSnapshot: { isLibraryMode: cfg.isLibraryMode === true },
          }
        );
      }
    }

    if (fixedRunnerHardware.children.length > 0) drawerGroup.add(fixedRunnerHardware);
    return true;
  };
}

function resolveInternalDrawerFrontMaxZ(depth: number): number {
  if (!Number.isFinite(depth) || depth <= 0) return 0;

  const accentFrontLift =
    CHEST_MODE_DRAWER_BOX_RENDER_POLICY.accentZOffsetM +
    CHEST_MODE_DRAWER_BOX_RENDER_POLICY.accentStripDepthM / 2;

  return depth / 2 + Math.max(0, accentFrontLift);
}
