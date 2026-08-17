import {
  CORNER_WING_DRAWER_POLICY,
  resolveCornerWingExternalDrawerGeometry,
} from '../../shared/dimensions/corner_system_policy.js';
import { INTERIOR_ROD_RENDER_POLICY } from '../../shared/dimensions/interior_fittings_policy.js';
import {
  appendInteriorRodEndSupports,
  resolveInteriorRodMountedAxisSpan,
} from './interior_rod_support_visuals.js';
import {
  resolveEffectiveDoorStyle,
  readDoorTrimListForPart,
  hasMirrorSurfaceOnFace,
  resolveAdhesiveGlassKind,
} from '../features/door_authoring/api.js';
import { readGrooveLayoutListForPart } from './door_visual_lookup_state.js';
import { appendDoorTrimVisuals } from './door_trim_visuals.js';
import { appendDrawerRunnerVisuals } from './drawer_runner_visuals.js';
import { readDrawerRunnerTypeFromConfig } from './drawer_runner_policy.js';
import {
  CORNER_SHELF_GROUP_PART_ID,
  makeDrawerBoxPartId,
  markShelfBoardUserData,
} from '../features/part_identity/api.js';
import { readCurtainType } from './render_door_ops_shared.js';
import type {
  CornerWingInteriorCellRuntime,
  CornerWingInteriorLayoutOps,
  CornerWingInteriorRuntime,
} from './corner_wing_cell_interiors_contracts.js';
import {
  addCornerWingGridShelf,
  type CornerWingInteriorShelfRuntime,
} from './corner_wing_cell_interiors_shelves.js';

export function createCornerWingInteriorLayoutOps(
  runtime: CornerWingInteriorRuntime,
  cellRuntime: CornerWingInteriorCellRuntime,
  shelfRuntime: CornerWingInteriorShelfRuntime
): CornerWingInteriorLayoutOps {
  const createRod = (yPos: number, limitHeight: number | null = null) => {
    const rodLen = Math.max(
      CORNER_WING_DRAWER_POLICY.rodMinLengthM,
      cellRuntime.cellInnerW - CORNER_WING_DRAWER_POLICY.rodWidthClearanceM
    );
    const mountedRodSpan = resolveInteriorRodMountedAxisSpan({
      centerCoord: cellRuntime.cellInnerCenterX,
      rodLength: rodLen,
      negativeMountCoord: cellRuntime.cellInnerCenterX - cellRuntime.cellInnerW / 2,
      positiveMountCoord: cellRuntime.cellInnerCenterX + cellRuntime.cellInnerW / 2,
    });
    if (!mountedRodSpan) return;

    const rod = new runtime.THREE.Mesh(
      new runtime.THREE.CylinderGeometry(
        INTERIOR_ROD_RENDER_POLICY.radiusM,
        INTERIOR_ROD_RENDER_POLICY.radiusM,
        mountedRodSpan.rodLength,
        INTERIOR_ROD_RENDER_POLICY.radialSegments
      ),
      runtime.getMaterial(null, 'metal')
    );
    rod.rotation.z = Math.PI / 2;
    rod.position.set(mountedRodSpan.centerCoord, yPos, cellRuntime.__fullDepthCenterZ);
    rod.userData = { partId: `corner_rod_c${cellRuntime.cell.idx}`, moduleIndex: cellRuntime.cellKey };
    runtime.addOutlines(rod);
    runtime.wingGroup.add(rod);
    appendInteriorRodEndSupports({
      THREE: runtime.THREE,
      parent: runtime.wingGroup,
      material: rod.material,
      centerX: mountedRodSpan.centerCoord,
      centerY: yPos,
      centerZ: cellRuntime.__fullDepthCenterZ,
      rodLength: mountedRodSpan.rodLength,
      rodRadius: INTERIOR_ROD_RENDER_POLICY.radiusM,
      axis: 'x',
      negativeMountCoord: mountedRodSpan.negativeMountCoord,
      positiveMountCoord: mountedRodSpan.positiveMountCoord,
      ownerPartId: `corner_rod_c${cellRuntime.cell.idx}`,
      addOutlines: runtime.addOutlines,
    });
    if (runtime.showHangerEnabled) {
      runtime.addRealisticHanger(
        cellRuntime.cellInnerCenterX,
        yPos,
        cellRuntime.__fullDepthCenterZ,
        runtime.wingGroup,
        cellRuntime.cellInnerW,
        {
          showHangerEnabled: runtime.showHangerEnabled,
          sketchMode: runtime.__sketchMode === true,
          addOutlines: runtime.addOutlines,
        }
      );
    }

    const distToBottom = limitHeight !== null ? limitHeight : yPos - cellRuntime.effectiveBottomY;
    if (runtime.showContentsEnabled) {
      runtime.addHangingClothes(
        cellRuntime.cellInnerCenterX,
        yPos,
        cellRuntime.__fullDepthCenterZ,
        Math.max(
          CORNER_WING_DRAWER_POLICY.rodMinLengthM,
          cellRuntime.cellInnerW - CORNER_WING_DRAWER_POLICY.hangingClothesWidthClearanceM
        ),
        runtime.wingGroup,
        distToBottom,
        undefined,
        {
          showContentsEnabled: runtime.showContentsEnabled,
          doorStyle: runtime.doorStyle,
          sketchMode: runtime.__sketchMode === true,
          addOutlines: runtime.addOutlines,
        }
      );
    }
  };

  const addGridShelf = (gridIndex: number) => addCornerWingGridShelf(cellRuntime, shelfRuntime, gridIndex);

  return {
    createRod,
    addGridShelf,
  };
}

export function emitCornerWingExternalDrawers(
  runtime: CornerWingInteriorRuntime,
  cellRuntime: CornerWingInteriorCellRuntime
): void {
  const { cfgCell, cell, cellKey, cellW, cellCenterX, cellD } = cellRuntime;
  const drawerHeightTotal = cell.drawerHeightTotal;
  if (!(drawerHeightTotal > 0)) return;

  const shoeDrawerHeight = CORNER_WING_DRAWER_POLICY.shoeHeightM;
  const regDrawerHeight = CORNER_WING_DRAWER_POLICY.externalRegularHeightM;
  const scopeExtDrawerKey = (id: string): string =>
    runtime.__stackKey === 'bottom' ? runtime.__stackScopePartKey(id) : id;
  const fixedRunnerHardware = new runtime.THREE.Group();
  fixedRunnerHardware.userData = {
    ...fixedRunnerHardware.userData,
    __ignoreRaycast: true,
    __wpDrawerRunnerHardwareContainer: true,
    __wpCornerExternalDrawerRunnerHardware: true,
  };

  const shelfOverDrawersPartId = scopeExtDrawerKey(`corner_shelf_over_drawers_c${cell.idx}`);
  const shelfOverDrawers = new runtime.THREE.Mesh(
    new runtime.THREE.BoxGeometry(
      cellW,
      runtime.woodThick,
      Math.max(
        CORNER_WING_DRAWER_POLICY.shelfOverDrawerMinDepthM,
        cellD - CORNER_WING_DRAWER_POLICY.shelfOverDrawerDepthClearanceM
      )
    ),
    runtime.getCornerShelfMat(shelfOverDrawersPartId, false)
  );
  shelfOverDrawers.position.set(
    cellCenterX,
    runtime.startY + runtime.woodThick + drawerHeightTotal + runtime.woodThick / 2,
    cellRuntime.__z(-cellD / 2)
  );
  shelfOverDrawers.userData = { partId: shelfOverDrawersPartId, moduleIndex: cellKey };
  markShelfBoardUserData(shelfOverDrawers.userData, {
    groupPartId: CORNER_SHELF_GROUP_PART_ID,
    shelfIndex: `over_drawers_${cell.idx}`,
    variant: 'regular',
    isBrace: false,
  });
  runtime.addOutlines(shelfOverDrawers);
  runtime.wingGroup.add(shelfOverDrawers);

  const addExtDrawer = (yPos: number, height: number, idRaw: string, divIdRaw: string) => {
    const id = scopeExtDrawerKey(idRaw);
    const divId = scopeExtDrawerKey(divIdRaw);
    const geometry = resolveCornerWingExternalDrawerGeometry({
      externalWidthM: cellW,
      depthM: cellD,
      woodThicknessM: runtime.woodThick,
      frontZM: 0,
      drawerHeightM: height,
      doorMountMode: runtime.__cfg.doorMountMode === 'inset' ? 'inset' : 'overlay',
    });
    const dW = Math.max(CORNER_WING_DRAWER_POLICY.internalMinWidthM, geometry.visualW);
    const boxW = Math.max(CORNER_WING_DRAWER_POLICY.internalMinWidthM, geometry.boxW);
    const divMap = runtime.readMap('drawerDividersMap');
    const hasDivider = !!(divMap && (divMap[divId] || divMap[id]));
    const woodMat = runtime.getCornerMat(id, runtime.frontMat);
    const drawerBoxPartId = makeDrawerBoxPartId(id);
    const drawerBoxMat = runtime.getCornerMat(drawerBoxPartId, runtime.whiteMat);
    const curtain =
      runtime.__cfg.isMultiColorMode && runtime.ctx.getCurtain
        ? runtime.readScopedReaderAny(runtime.ctx.getCurtain, id)
        : null;
    const special = runtime.__resolveSpecial(id, curtain);
    const isMirror = special === 'mirror';
    const isGlass = special === 'glass';
    const adhesiveGlassKind = resolveAdhesiveGlassKind(special);
    const hasAdhesiveGlass = !!adhesiveGlassKind;
    const mirrorLayout = runtime.readMirrorLayout(id);
    const hasOutsideMirrorSurface =
      (isMirror || hasAdhesiveGlass) && hasMirrorSurfaceOnFace(mirrorLayout, 1, 1);
    const grooveLayout =
      readGrooveLayoutListForPart({ map: runtime.readMap('grooveLayoutMap'), partId: id })?.layouts || null;
    const hasPlacedGrooveLayout = !!grooveLayout?.length;
    const overlayBlocksGrooves = hasOutsideMirrorSurface && (!isMirror || !hasPlacedGrooveLayout);
    const hasGroove =
      runtime.groovesEnabled &&
      !overlayBlocksGrooves &&
      !isGlass &&
      !!runtime.readScopedReaderAny(runtime.getGroove, id);
    const doorStyleMap = runtime.readMap('doorStyleMap');
    const effectiveFrameStyle = resolveEffectiveDoorStyle(runtime.doorStyle, doorStyleMap, id);

    const dGroup = new runtime.THREE.Group();
    dGroup.userData = dGroup.userData || {};
    dGroup.userData.id = id;
    dGroup.userData.wpIsRotatingDrawer = true;
    dGroup.userData.wpOpenAngle = 0;
    dGroup.userData.wpOpenDir = runtime.__mirrorX ? -1 : 1;
    dGroup.userData.partId = id;
    dGroup.userData.moduleIndex = cellKey;
    dGroup.userData.__wpStack = runtime.__stackKey;
    dGroup.userData.__wpType = 'extDrawer';
    dGroup.userData.__doorWidth = dW;
    dGroup.userData.__doorHeight = geometry.visualH;
    dGroup.userData.__wpFaceOffsetX = 0;
    dGroup.userData.__wpFaceOffsetY = 0;
    dGroup.userData.__wpFrontZ = cellRuntime.__z(geometry.zClosed);
    dGroup.userData.__wpFrontThickness = geometry.visualT;

    const dVis = runtime.createDoorVisual(
      dW,
      geometry.visualH,
      geometry.visualT,
      isMirror ? runtime.__getMirrorMat() : woodMat,
      isGlass ? 'glass' : effectiveFrameStyle,
      hasGroove,
      isMirror,
      isGlass ? readCurtainType(curtain) : null,
      isMirror || hasAdhesiveGlass ? woodMat : runtime.materials.front,
      1,
      false,
      mirrorLayout,
      id,
      {
        grooveLayout,
        ...(isGlass ? { glassFrameStyle: effectiveFrameStyle } : null),
        ...(adhesiveGlassKind ? { adhesiveGlassKind } : null),
      }
    );
    dVis.position.set(0, 0, 0);

    const drawerBoxDepth = Math.max(CORNER_WING_DRAWER_POLICY.internalMinDepthM, geometry.boxD);
    const drawerBoxHeight = Math.max(CORNER_WING_DRAWER_POLICY.internalMinHeightM, geometry.boxH);
    const dBox = runtime.createInternalDrawerBox(
      boxW,
      drawerBoxHeight,
      drawerBoxDepth,
      drawerBoxMat,
      drawerBoxMat,
      runtime.addOutlines,
      hasDivider,
      false,
      isGlass ? { omitFrontPanel: true } : null
    );
    dBox.position.set(0, 0, geometry.boxOffsetZ);
    dBox.userData = {
      ...dBox.userData,
      partId: drawerBoxPartId,
      drawerId: id,
      moduleIndex: cellKey,
      __wpStack: runtime.__stackKey,
      __wpDrawerBox: true,
      __wpDrawerOwnerPartId: id,
      __doorWidth: boxW,
      __doorHeight: drawerBoxHeight,
    };

    dGroup.add(dBox);

    if (!isGlass) {
      const connector = new runtime.THREE.Mesh(
        new runtime.THREE.BoxGeometry(geometry.connectW, geometry.connectH, geometry.connectD),
        drawerBoxMat
      );
      connector.position.set(0, 0, geometry.connectZ);
      connector.userData = {
        partId: drawerBoxPartId,
        drawerId: id,
        moduleIndex: cellKey,
        __wpStack: runtime.__stackKey,
        __wpDrawerBox: true,
        __wpDrawerOwnerPartId: id,
        __wpDrawerConnector: true,
        __doorWidth: geometry.connectW,
        __doorHeight: geometry.connectH,
      };
      dGroup.add(connector);
    }

    dGroup.add(dVis);
    appendDoorTrimVisuals({
      App: runtime.App,
      THREE: runtime.THREE,
      group: dGroup,
      partId: id,
      trims: readDoorTrimListForPart({
        map: runtime.readMap('doorTrimMap'),
        partId: idRaw,
        scopedPartId: id,
        preferScopedOnly: runtime.__stackSplitEnabled && runtime.__stackKey === 'bottom' && id !== idRaw,
      }),
      doorWidth: dW,
      doorHeight: geometry.visualH,
      frontZ: geometry.visualT / 2 + 0.0015,
      faceSign: 1,
    });

    const closed = new runtime.THREE.Vector3(cellCenterX, yPos, cellRuntime.__z(geometry.zClosed));
    const open = new runtime.THREE.Vector3(cellCenterX, yPos, cellRuntime.__z(geometry.zOpen));
    dGroup.position.copy(closed);

    appendDrawerRunnerVisuals({
      THREE: runtime.THREE,
      runnerType: readDrawerRunnerTypeFromConfig(runtime.__cfg),
      fixedParent: fixedRunnerHardware,
      movingParent: dBox,
      drawerWidthM: boxW,
      mountingWidthM: cellW,
      drawerHeightM: drawerBoxHeight,
      drawerDepthM: drawerBoxDepth,
      drawerBoxOffsetZM: geometry.boxOffsetZ,
      closedPosition: { x: cellCenterX, y: yPos, z: cellRuntime.__z(geometry.zClosed) },
      ownerPartId: id,
    });

    runtime.wingGroup.add(dGroup);
    if (runtime.render) {
      runtime.ensureRenderArray(runtime.render, 'drawersArray').push({
        group: dGroup,
        closed,
        open,
        id,
        dividerKey: divId,
        __wpStack: runtime.__stackKey,
      });
    }
  };

  const hasShoe = !!cfgCell.hasShoeDrawer;
  const regCount = cfgCell.extDrawersCount || 0;
  if (hasShoe) {
    addExtDrawer(
      runtime.startY + runtime.woodThick + shoeDrawerHeight / 2,
      shoeDrawerHeight,
      `corner_c${cell.idx}_draw_shoe`,
      `div_ext_corner_c${cell.idx}_shoe`
    );
  }
  if (regCount > 0) {
    const baseOffset = hasShoe ? shoeDrawerHeight : 0;
    for (let k = 0; k < regCount; k++) {
      const dY = runtime.startY + runtime.woodThick + baseOffset + k * regDrawerHeight + regDrawerHeight / 2;
      addExtDrawer(
        dY,
        regDrawerHeight,
        `corner_c${cell.idx}_draw_${k + 1}`,
        `div_ext_corner_c${cell.idx}_${k + 1}`
      );
    }
  }

  const fixedRunnerChildren = (fixedRunnerHardware as unknown as { children?: unknown[] }).children;
  if ((fixedRunnerChildren?.length || 0) > 0) runtime.wingGroup.add(fixedRunnerHardware);

  const shadowPlane = new runtime.THREE.Mesh(
    new runtime.THREE.BoxGeometry(
      Math.max(
        CORNER_WING_DRAWER_POLICY.rodMinLengthM,
        cellW - CORNER_WING_DRAWER_POLICY.drawerShadowWidthClearanceM
      ),
      CORNER_WING_DRAWER_POLICY.drawerShadowHeightM,
      CORNER_WING_DRAWER_POLICY.drawerShadowDepthM
    ),
    runtime.shadowMat
  );
  shadowPlane.position.set(
    cellCenterX,
    cellRuntime.effectiveBottomY,
    cellRuntime.__z(CORNER_WING_DRAWER_POLICY.drawerShadowFrontOffsetM)
  );
  shadowPlane.name = `wp_drawer_shadow_plane_corner_c${cell.idx}`;
  shadowPlane.userData = shadowPlane.userData || {};
  shadowPlane.userData.kind = 'drawerShadowPlane';
  shadowPlane.userData.hideWhenOpen = true;
  shadowPlane.userData.moduleIndex = cellKey;
  runtime.wingGroup.add(shadowPlane);
}
