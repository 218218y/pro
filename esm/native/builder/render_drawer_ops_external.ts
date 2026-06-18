import { makeDrawerBoxPartId, resolveDrawerBoxPaintMaterial } from '../features/drawer_box_identity.js';
import { appendDoorTrimVisuals } from './door_trim_visuals.js';
import { resolveDoorVisualStyle } from './render_door_ops_shared.js';
import { DRAWER_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import type { BuilderRenderDrawerDeps } from './render_drawer_ops_shared.js';
import {
  isRecord,
  readCreateDoorVisual,
  readCreateInternalDrawerBox,
  readDrawerConfig,
  readAddFoldedClothes,
  readExternalDrawerOp,
  readFinite,
  readFinitePositive,
  readGetPartColorValue,
  readGetPartMaterial,
  readObject3D,
  readOutlineFn,
  readThreeLike,
  resolveDrawerVisualState,
} from './render_drawer_ops_shared.js';

export function createApplyExternalDrawersOps(deps: BuilderRenderDrawerDeps) {
  const { __app, __ops, __wardrobeGroup, __reg, __drawers, getMirrorMaterial } = deps;

  return function applyExternalDrawersOps(argsIn: unknown): boolean {
    const App = __app(argsIn);
    __ops(App);
    const args = isRecord(argsIn) ? argsIn : null;
    const THREE = readThreeLike(args?.THREE);
    const ops = args && isRecord(args.ops) ? args.ops : null;
    const drawers = Array.isArray(ops?.drawers) ? ops.drawers : null;

    if (!THREE || !drawers) return false;
    const wardrobeGroup = readObject3D(__wardrobeGroup(App));
    if (!wardrobeGroup) return false;

    const cfg = readDrawerConfig(args?.cfg);
    const isGroovesEnabled = args?.isGroovesEnabled === true;
    const bodyMat = args?.bodyMat;
    const drawerBoxBaseMat = args?.drawerBoxBaseMat || args?.whiteMat || bodyMat;
    const addOutlines = readOutlineFn(args?.addOutlines);
    const getPartMaterial = readGetPartMaterial(args?.getPartMaterial);
    const getPartColorValue = readGetPartColorValue(args?.getPartColorValue);
    const createDoorVisual = readCreateDoorVisual(args?.createDoorVisual);
    const createInternalDrawerBox = readCreateInternalDrawerBox(args?.createInternalDrawerBox);
    const showContentsEnabled = args?.showContentsEnabled === true;
    const addFoldedClothes = readAddFoldedClothes(args?.addFoldedClothes);
    const doorStyle = args?.doorStyle;
    const globalFrontMat = args?.globalFrontMat;
    const groovesMap = cfg.groovesMap || {};
    const drawerDividersMap = cfg.drawerDividersMap || {};
    const wpStackRaw = args ? args.__wpStack : undefined;
    const wpStackArg = typeof wpStackRaw === 'string' ? String(wpStackRaw) : undefined;

    for (let i = 0; i < drawers.length; i++) {
      const drawerOp = readExternalDrawerOp(drawers[i]);
      if (!drawerOp) continue;

      const partId = drawerOp.partId;
      const drawerBoxPartId = makeDrawerBoxPartId(partId);
      const grooveKey = drawerOp.grooveKey || `groove_${partId}`;
      const dividerKey = drawerOp.dividerKey || null;
      const hasGroove = isGroovesEnabled && groovesMap[grooveKey] != null;
      const hasDivider = !!(
        dividerKey &&
        (drawerDividersMap[dividerKey] != null || drawerDividersMap[partId] != null)
      );
      const specificMat = getPartMaterial ? getPartMaterial(partId) : null;
      const drawerVisualState = resolveDrawerVisualState(cfg, partId, getPartColorValue);
      const omitConnectorPanel = drawerVisualState.isGlass;
      const faceW = readFinitePositive(drawerOp.faceW) ?? drawerOp.visualW;
      const faceOffsetX = readFinite(drawerOp.faceOffsetX, 0);
      const baseFrontZ =
        typeof drawerOp.frontZ === 'number' && Number.isFinite(drawerOp.frontZ) ? drawerOp.frontZ : null;
      const drawerBoxMat = resolveDrawerBoxPaintMaterial({
        drawerBoxPartId,
        fallbackMaterial: drawerBoxBaseMat,
        getPartColorValue,
        getPartMaterial,
      });

      const group = new THREE.Group();
      group.userData = {
        partId,
        moduleIndex: drawerOp.moduleIndex,
        __wpStack: wpStackArg,
        __doorWidth: faceW,
        __doorHeight: drawerOp.visualH,
        __wpFaceOffsetX: faceOffsetX,
        __wpFrontZ: baseFrontZ,
        __wpType: 'extDrawer',
      };
      __reg(App, partId, group, 'extDrawer');

      let visual;
      if (createDoorVisual) {
        const drawerWoodMat = specificMat || bodyMat;
        let drawerMirrorMat = null;
        if (drawerVisualState.isMirror) {
          drawerMirrorMat = getMirrorMaterial({ App, THREE });
          if (!drawerMirrorMat) drawerMirrorMat = drawerWoodMat;
        }
        const effectiveDrawerFrameStyleRaw = resolveDoorVisualStyle(
          null,
          doorStyle,
          cfg.doorStyleMap,
          partId
        );
        const effectiveDrawerFrameStyle =
          effectiveDrawerFrameStyleRaw === 'glass' ? 'profile' : effectiveDrawerFrameStyleRaw;
        const effectiveDrawerStyle = drawerVisualState.isGlass ? 'glass' : effectiveDrawerFrameStyle;
        visual = createDoorVisual(
          faceW,
          drawerOp.visualH,
          drawerOp.visualT || DRAWER_DIMENSIONS.external.visualThicknessM,
          drawerVisualState.isMirror ? drawerMirrorMat : drawerWoodMat,
          effectiveDrawerStyle,
          hasGroove && !drawerVisualState.isGlass,
          drawerVisualState.isMirror,
          drawerVisualState.isGlass ? drawerVisualState.curtainType : null,
          drawerVisualState.isMirror ? drawerWoodMat : globalFrontMat,
          1,
          false,
          null,
          partId,
          drawerVisualState.isGlass ? { glassFrameStyle: effectiveDrawerFrameStyle } : null
        );
      } else {
        visual = new THREE.Mesh(
          new THREE.BoxGeometry(
            faceW,
            drawerOp.visualH,
            drawerOp.visualT || DRAWER_DIMENSIONS.external.visualThicknessM
          ),
          specificMat || bodyMat
        );
      }
      visual.position.set(faceOffsetX, 0, 0);

      const drawerBox = createInternalDrawerBox
        ? createInternalDrawerBox(
            drawerOp.boxW,
            drawerOp.boxH,
            drawerOp.boxD,
            drawerBoxMat,
            drawerBoxMat,
            addOutlines,
            hasDivider,
            false,
            drawerVisualState.isGlass ? { omitFrontPanel: true } : null
          )
        : new THREE.Mesh(new THREE.BoxGeometry(drawerOp.boxW, drawerOp.boxH, drawerOp.boxD), drawerBoxMat);
      drawerBox.position.set(0, 0, drawerOp.boxOffsetZ || 0);
      drawerBox.userData = {
        ...(drawerBox.userData || {}),
        partId: drawerBoxPartId,
        drawerId: partId,
        moduleIndex: drawerOp.moduleIndex,
        __wpStack: wpStackArg,
        __wpDrawerBox: true,
        __wpDrawerOwnerPartId: partId,
        __doorWidth: drawerOp.boxW,
        __doorHeight: drawerOp.boxH,
      };

      if (showContentsEnabled && addFoldedClothes) {
        addFoldedClothes(
          0,
          -(drawerOp.boxH || 0) / 2 + DRAWER_DIMENSIONS.external.contentsBottomInsetM,
          0,
          (drawerOp.boxW || 0) - DRAWER_DIMENSIONS.external.contentsWidthClearanceM,
          drawerBox,
          Math.max(0, (drawerOp.boxH || 0) - DRAWER_DIMENSIONS.external.contentsHeightClearanceM),
          drawerOp.boxD,
          { isLibraryMode: cfg.isLibraryMode === true }
        );
      }

      group.add(drawerBox);
      group.add(visual);
      const visualThickness = drawerOp.visualT || DRAWER_DIMENSIONS.external.visualThicknessM;
      appendDoorTrimVisuals({
        App,
        THREE,
        group,
        partId,
        trims: cfg.doorTrimMap ? cfg.doorTrimMap[partId] : undefined,
        doorWidth: faceW,
        doorHeight: drawerOp.visualH,
        doorMeshOffsetX: faceOffsetX,
        frontZ: visualThickness / 2 + 0.0015,
        faceSign: 1,
      });

      if (
        !omitConnectorPanel &&
        typeof drawerOp.connectW === 'number' &&
        typeof drawerOp.connectH === 'number' &&
        typeof drawerOp.connectD === 'number'
      ) {
        const connectGeo = new THREE.BoxGeometry(drawerOp.connectW, drawerOp.connectH, drawerOp.connectD);
        const connectMesh = new THREE.Mesh(connectGeo, drawerBoxMat);
        connectMesh.position.set(0, 0, drawerOp.connectZ || 0);
        connectMesh.userData = {
          partId: drawerBoxPartId,
          drawerId: partId,
          moduleIndex: drawerOp.moduleIndex,
          __wpStack: wpStackArg,
          __wpDrawerBox: true,
          __wpDrawerOwnerPartId: partId,
          __doorWidth: drawerOp.connectW,
          __doorHeight: drawerOp.connectH,
        };
        group.add(connectMesh);
      }

      const closedPos = new THREE.Vector3(
        drawerOp.closed?.x || 0,
        drawerOp.closed?.y || 0,
        drawerOp.closed?.z || 0
      );
      const openPos = new THREE.Vector3(drawerOp.open?.x || 0, drawerOp.open?.y || 0, drawerOp.open?.z || 0);
      group.position.copy(closedPos);

      wardrobeGroup.add(group);
      const drawersArray = __drawers(App);
      if (Array.isArray(drawersArray)) {
        drawersArray.push({
          group,
          closed: closedPos,
          open: openPos,
          id: partId,
          dividerKey: dividerKey || undefined,
          isInternal: false,
        });
      }
    }

    return true;
  };
}
