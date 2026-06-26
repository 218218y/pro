import { DRAWER_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import { makeDrawerBoxPartId, resolveDrawerBoxPaintMaterial } from '../features/drawer_box_identity.js';
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

function setPartUserData(obj: unknown, data: Record<string, unknown>): void {
  if (!obj || typeof obj !== 'object') return;
  const rec = obj as { userData?: Record<string, unknown> };
  rec.userData = { ...(rec.userData || {}), ...data };
}

function setPosition(obj: unknown, x: number, y: number, z: number): void {
  if (!obj || typeof obj !== 'object') return;
  const rec = obj as { position?: { set?: (x: number, y: number, z: number) => void } };
  if (typeof rec.position?.set === 'function') rec.position.set(x, y, z);
}

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
    const sketchMode = args?.sketchMode === true;
    const showContentsEnabled = args?.showContentsEnabled === true;
    const addFoldedClothes = readAddFoldedClothes(args?.addFoldedClothes);

    const renderedCassettes = new Set<string>();

    for (let i = 0; i < ops.length; i++) {
      const drawerOp = readInternalDrawerOp(ops[i]);
      if (!drawerOp) continue;

      const partId = drawerOp.partId;
      const drawerBoxPartId = makeDrawerBoxPartId(partId);
      const drawerBoxMat = resolveDrawerBoxPaintMaterial({
        drawerBoxPartId,
        fallbackMaterial: drawerBoxBaseMat,
        getPartColorValue,
        getPartMaterial,
      });
      const sketchModuleKey = drawerOp.sketchModuleKey ?? drawerOp.moduleIndex;
      const cassette = drawerOp.cassette;
      if (cassette && !renderedCassettes.has(cassette.partId)) {
        renderedCassettes.add(cassette.partId);
        const panelT = Math.max(0.001, cassette.panelThicknessM);
        const frameParts = [
          {
            suffix: 'bottom',
            w: cassette.width,
            h: panelT,
            d: cassette.depth,
            x: cassette.x,
            y: cassette.drawerMinY - panelT / 2,
            z: cassette.z,
          },
          {
            suffix: 'top',
            w: cassette.width,
            h: panelT,
            d: cassette.depth,
            x: cassette.x,
            y: cassette.drawerMaxY + panelT / 2,
            z: cassette.z,
          },
          {
            suffix: 'left',
            w: panelT,
            h: cassette.height,
            d: cassette.depth,
            x: cassette.x - cassette.width / 2 + panelT / 2,
            y: cassette.y,
            z: cassette.z,
          },
          {
            suffix: 'right',
            w: panelT,
            h: cassette.height,
            d: cassette.depth,
            x: cassette.x + cassette.width / 2 - panelT / 2,
            y: cassette.y,
            z: cassette.z,
          },
        ];
        for (const part of frameParts) {
          if (!(part.w > 0) || !(part.h > 0) || !(part.d > 0)) continue;
          const framePartId = `${cassette.partId}_${part.suffix}`;
          const mesh = new THREE.Mesh(new THREE.BoxGeometry(part.w, part.h, part.d), drawerBoxMat);
          setPosition(mesh, part.x, part.y, part.z);
          setPartUserData(mesh, {
            partId: framePartId,
            cassettePartId: cassette.partId,
            drawerId: partId,
            moduleIndex: drawerOp.moduleIndex,
            __wpInternalDrawerCassette: true,
            __wpInternalDrawerCassettePart: part.suffix,
            __wpDrawerOwnerPartId: partId,
            __doorWidth: cassette.width,
            __doorHeight: cassette.height,
          });
          if (drawerOp.sketchBoxId) {
            setPartUserData(mesh, {
              __wpSketchBoxId: drawerOp.sketchBoxId,
              __wpSketchModuleKey: sketchModuleKey,
              __wpSketchFreePlacement: drawerOp.sketchFreePlacement === true,
              ...(drawerOp.sketchStack ? { __wpStack: drawerOp.sketchStack } : {}),
            });
          }
          if (addOutlines) addOutlines(mesh);
          __reg(App, framePartId, mesh, 'intDrawerCassette');
          drawerGroup.add(mesh);
        }
      }

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
      intBox.userData = {
        ...(intBox.userData || {}),
        partId: drawerBoxPartId,
        drawerId: partId,
        moduleIndex: drawerOp.moduleIndex,
        __wpDrawerBox: true,
        __wpInternalDrawerBox: true,
        __wpDrawerId: partId,
        __wpDrawerOwnerPartId: partId,
        __doorWidth: drawerOp.width,
        __doorHeight: drawerOp.height,
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
          -(drawerOp.height || 0) / 2 + DRAWER_DIMENSIONS.internal.contentsBottomInsetM,
          0,
          (drawerOp.width || 0) - DRAWER_DIMENSIONS.internal.contentsWidthClearanceM,
          intBox,
          Math.max(0, (drawerOp.height || 0) - DRAWER_DIMENSIONS.internal.contentsHeightClearanceM),
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

    return true;
  };
}
