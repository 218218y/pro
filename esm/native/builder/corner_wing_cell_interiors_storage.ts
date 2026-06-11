import {
  CORNER_WING_DIMENSIONS,
  INTERIOR_FITTINGS_DIMENSIONS,
} from '../../shared/wardrobe_dimension_tokens_shared.js';
import { resolveEffectiveDoorStyle } from '../features/door_style_overrides.js';
import { readDoorTrimListForPart } from '../features/door_trim.js';
import { appendDoorTrimVisuals } from './door_trim_visuals.js';
import { makeDrawerBoxPartId } from '../features/drawer_box_identity.js';
import { CORNER_SHELF_GROUP_PART_ID, markShelfBoardUserData } from '../features/shelf_part_identity.js';
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
      CORNER_WING_DIMENSIONS.drawers.rodMinLengthM,
      cellRuntime.cellInnerW - CORNER_WING_DIMENSIONS.drawers.rodWidthClearanceM
    );
    const rod = new runtime.THREE.Mesh(
      new runtime.THREE.CylinderGeometry(
        INTERIOR_FITTINGS_DIMENSIONS.rods.radiusM,
        INTERIOR_FITTINGS_DIMENSIONS.rods.radiusM,
        rodLen,
        INTERIOR_FITTINGS_DIMENSIONS.rods.radialSegments
      ),
      runtime.getMaterial(null, 'metal')
    );
    rod.rotation.z = Math.PI / 2;
    rod.position.set(cellRuntime.cellInnerCenterX, yPos, cellRuntime.__fullDepthCenterZ);
    rod.userData = { partId: `corner_rod_c${cellRuntime.cell.idx}`, moduleIndex: cellRuntime.cellKey };
    runtime.addOutlines(rod);
    runtime.wingGroup.add(rod);
    if (runtime.showHangerEnabled) {
      runtime.addRealisticHanger(
        cellRuntime.cellInnerCenterX,
        yPos,
        cellRuntime.__fullDepthCenterZ,
        runtime.wingGroup
      );
    }

    const distToBottom = limitHeight !== null ? limitHeight : yPos - cellRuntime.effectiveBottomY;
    if (runtime.showContentsEnabled) {
      runtime.addHangingClothes(
        cellRuntime.cellInnerCenterX,
        yPos,
        cellRuntime.__fullDepthCenterZ,
        Math.max(
          CORNER_WING_DIMENSIONS.drawers.rodMinLengthM,
          cellRuntime.cellInnerW - CORNER_WING_DIMENSIONS.drawers.hangingClothesWidthClearanceM
        ),
        runtime.wingGroup,
        distToBottom
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

  const shoeDrawerHeight = CORNER_WING_DIMENSIONS.drawers.shoeHeightM;
  const regDrawerHeight = CORNER_WING_DIMENSIONS.drawers.externalRegularHeightM;
  const scopeExtDrawerKey = (id: string): string =>
    runtime.__stackKey === 'bottom' ? runtime.__stackScopePartKey(id) : id;

  const shelfOverDrawersPartId = scopeExtDrawerKey(`corner_shelf_over_drawers_c${cell.idx}`);
  const shelfOverDrawers = new runtime.THREE.Mesh(
    new runtime.THREE.BoxGeometry(
      cellW,
      runtime.woodThick,
      Math.max(
        CORNER_WING_DIMENSIONS.drawers.shelfOverDrawerMinDepthM,
        cellD - CORNER_WING_DIMENSIONS.drawers.shelfOverDrawerDepthClearanceM
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
    const dW = Math.max(
      CORNER_WING_DIMENSIONS.drawers.internalMinWidthM,
      cellW - CORNER_WING_DIMENSIONS.drawers.externalVisualWidthClearanceM
    );
    const boxW = Math.max(
      CORNER_WING_DIMENSIONS.drawers.internalMinWidthM,
      cellW - CORNER_WING_DIMENSIONS.drawers.externalBoxWidthClearanceM
    );
    const divMap = runtime.readMapOrEmpty(runtime.App, 'drawerDividersMap');
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
    const hasGroove =
      runtime.groovesEnabled && !isMirror && !isGlass && !!runtime.readScopedReaderAny(runtime.getGroove, id);
    const doorStyleMap = runtime.readMapOrEmpty(runtime.App, 'doorStyleMap');
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
    dGroup.userData.__doorHeight = height;
    dGroup.userData.__wpFaceOffsetX = 0;
    dGroup.userData.__wpFaceOffsetY = 0;
    dGroup.userData.__wpFrontZ = cellRuntime.__z(CORNER_WING_DIMENSIONS.drawers.externalFrontOffsetZM);
    dGroup.userData.__wpFrontThickness = runtime.woodThick;

    const dVis = runtime.createDoorVisual(
      dW,
      height,
      runtime.woodThick,
      isMirror ? runtime.__getMirrorMat() : woodMat,
      isGlass ? 'glass' : effectiveFrameStyle,
      hasGroove,
      isMirror,
      isGlass ? readCurtainType(curtain) : null,
      isMirror ? woodMat : runtime.materials.front,
      1,
      false,
      runtime.readMirrorLayout(id),
      id,
      isGlass ? { glassFrameStyle: effectiveFrameStyle } : null
    );
    dVis.position.set(0, 0, 0);

    const drawerBoxDepth = Math.max(
      CORNER_WING_DIMENSIONS.drawers.internalMinDepthM,
      cellD - CORNER_WING_DIMENSIONS.drawers.externalBoxDepthBackClearanceM
    );
    const dBox = runtime.createInternalDrawerBox(
      boxW,
      height - CORNER_WING_DIMENSIONS.drawers.externalBoxHeightClearanceM,
      drawerBoxDepth,
      drawerBoxMat,
      drawerBoxMat,
      runtime.addOutlines,
      hasDivider,
      false,
      isGlass ? { omitFrontPanel: true } : null
    );
    dBox.position.set(0, 0, -cellD / 2 + CORNER_WING_DIMENSIONS.drawers.externalBoxOffsetZM);
    dBox.userData = {
      ...(dBox.userData || {}),
      partId: drawerBoxPartId,
      drawerId: id,
      moduleIndex: cellKey,
      __wpStack: runtime.__stackKey,
      __wpDrawerBox: true,
      __wpDrawerOwnerPartId: id,
      __doorWidth: boxW,
      __doorHeight: height - CORNER_WING_DIMENSIONS.drawers.externalBoxHeightClearanceM,
    };

    dGroup.add(dBox);
    dGroup.add(dVis);
    appendDoorTrimVisuals({
      App: runtime.App,
      THREE: runtime.THREE,
      group: dGroup,
      partId: id,
      trims: readDoorTrimListForPart({
        map: runtime.readMapOrEmpty(runtime.App, 'doorTrimMap'),
        partId: idRaw,
        scopedPartId: id,
        preferScopedOnly: runtime.__stackSplitEnabled && runtime.__stackKey === 'bottom' && id !== idRaw,
      }),
      doorWidth: dW,
      doorHeight: height,
      frontZ: runtime.woodThick / 2 + 0.0015,
      faceSign: 1,
    });

    const closed = new runtime.THREE.Vector3(
      cellCenterX,
      yPos,
      cellRuntime.__z(CORNER_WING_DIMENSIONS.drawers.externalFrontOffsetZM)
    );
    const open = new runtime.THREE.Vector3(
      cellCenterX,
      yPos,
      cellRuntime.__z(CORNER_WING_DIMENSIONS.drawers.externalOpenOffsetZM)
    );
    dGroup.position.copy(closed);
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

  const shadowPlane = new runtime.THREE.Mesh(
    new runtime.THREE.BoxGeometry(
      Math.max(
        CORNER_WING_DIMENSIONS.drawers.rodMinLengthM,
        cellW - CORNER_WING_DIMENSIONS.drawers.drawerShadowWidthClearanceM
      ),
      CORNER_WING_DIMENSIONS.drawers.drawerShadowHeightM,
      CORNER_WING_DIMENSIONS.drawers.drawerShadowDepthM
    ),
    runtime.shadowMat
  );
  shadowPlane.position.set(
    cellCenterX,
    cellRuntime.effectiveBottomY,
    cellRuntime.__z(CORNER_WING_DIMENSIONS.drawers.drawerShadowFrontOffsetM)
  );
  shadowPlane.name = `wp_drawer_shadow_plane_corner_c${cell.idx}`;
  shadowPlane.userData = shadowPlane.userData || {};
  shadowPlane.userData.kind = 'drawerShadowPlane';
  shadowPlane.userData.hideWhenOpen = true;
  shadowPlane.userData.moduleIndex = cellKey;
  runtime.wingGroup.add(shadowPlane);
}
