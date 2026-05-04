import { resolveEffectiveDoorStyle } from '../features/door_style_overrides.js';
import { readCurtainType } from './render_door_ops_shared.js';
import type { SlotMetaLike } from './corner_wing_cell_shared.js';
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
    const rodLen = Math.max(0.05, cellRuntime.cellInnerW - 0.02);
    const rod = new runtime.THREE.Mesh(
      new runtime.THREE.CylinderGeometry(0.015, 0.015, rodLen, 12),
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
        Math.max(0.05, cellRuntime.cellInnerW - 0.06),
        runtime.wingGroup,
        distToBottom
      );
    }
  };

  const checkAndCreateInternalDrawer = (slotIndex: number, slotMeta?: SlotMetaLike) => {
    if (!runtime.internalDrawersEnabled) return false;
    const activeSlots = cellRuntime.cfgCell.intDrawersList || [];
    if (!activeSlots.includes(slotIndex)) return false;

    const baseGridY = cellRuntime.effectiveBottomY + (slotIndex - 1) * cellRuntime.localGridStep;
    const fullInternalHeight = cellRuntime.effectiveTopY - cellRuntime.internalStartY;
    const drawerSizingGridStep =
      Number.isFinite(fullInternalHeight) && fullInternalHeight > 0
        ? fullInternalHeight / 6
        : cellRuntime.localGridStep;
    const slotAvailableHeight =
      typeof slotMeta?.slotAvailableHeight === 'number' &&
      Number.isFinite(slotMeta.slotAvailableHeight) &&
      slotMeta.slotAvailableHeight > 0
        ? slotMeta.slotAvailableHeight
        : cellRuntime.localGridStep;
    const targetSingleDrawerH = (Math.min(0.35, drawerSizingGridStep - 0.02) - 0.02) / 2;
    const maxSlotSingleDrawerH = (Math.min(0.35, slotAvailableHeight - 0.02) - 0.02) / 2;
    const singleDrawerH = Math.max(0.01, Math.min(targetSingleDrawerH, maxSlotSingleDrawerH));
    const divKey = `div_int_corner_c${cellRuntime.cell.idx}_slot_${slotIndex}`;
    const legacyKey = `div_int_corner_slot_${slotIndex}`;
    const dividerMap = (() => {
      const mapFromApp = runtime.readMap(runtime.App, 'drawerDividersMap');
      if (runtime.isRecord(mapFromApp)) return mapFromApp;
      const mapFromCfg = runtime.isRecord(runtime.__cfg.drawerDividersMap)
        ? runtime.__cfg.drawerDividersMap
        : null;
      return mapFromCfg || {};
    })();
    const hasDivider = !!(dividerMap && (dividerMap[divKey] || dividerMap[legacyKey]));
    const intDrawW = Math.max(0.1, cellRuntime.cellW - 0.1);
    const intDrawDepth = Math.max(0.08, cellRuntime.cellD - 0.12);

    for (let j = 0; j < 2; j++) {
      const finalY =
        j === 0 ? baseGridY + singleDrawerH / 2 + 0.01 : baseGridY + singleDrawerH + 0.03 + singleDrawerH / 2;
      const intBox = runtime.createInternalDrawerBox(
        intDrawW,
        singleDrawerH,
        intDrawDepth,
        runtime.materials.front,
        runtime.bodyMat,
        runtime.addOutlines,
        hasDivider,
        false
      );
      intBox.userData = { partId: divKey, moduleIndex: cellRuntime.cellKey };
      const closedPos = new runtime.THREE.Vector3(
        cellRuntime.cellCenterX,
        finalY,
        cellRuntime.__z(-cellRuntime.cellD / 2 - 0.02)
      );
      const openPos = new runtime.THREE.Vector3(
        cellRuntime.cellCenterX,
        finalY,
        cellRuntime.__z(-cellRuntime.cellD / 2 + 0.3)
      );
      intBox.position.set(cellRuntime.cellCenterX, finalY, cellRuntime.__z(-cellRuntime.cellD / 2 - 0.02));
      runtime.wingGroup.add(intBox);
      if (runtime.render) {
        runtime.ensureRenderArray(runtime.render, 'drawersArray').push({
          group: intBox,
          closed: closedPos,
          open: openPos,
          id: divKey,
          dividerKey: divKey,
        });
      }
    }
    return true;
  };

  const addGridShelf = (gridIndex: number) => addCornerWingGridShelf(cellRuntime, shelfRuntime, gridIndex);

  return {
    createRod,
    checkAndCreateInternalDrawer,
    addGridShelf,
  };
}

export function emitCornerWingExternalDrawers(
  runtime: CornerWingInteriorRuntime,
  cellRuntime: CornerWingInteriorCellRuntime,
  shelfRuntime: CornerWingInteriorShelfRuntime
): void {
  const { cfgCell, cell, cellKey, cellW, cellCenterX, cellD } = cellRuntime;
  const drawerHeightTotal = cell.drawerHeightTotal;
  if (!(drawerHeightTotal > 0)) return;

  const shoeDrawerHeight = 0.2;
  const regDrawerHeight = 0.22;
  const scopeExtDrawerKey = (id: string): string =>
    runtime.__stackKey === 'bottom' ? runtime.__stackScopePartKey(id) : id;

  const shelfOverDrawersPartId = scopeExtDrawerKey(`corner_shelf_over_drawers_c${cell.idx}`);
  const shelfOverDrawers = new runtime.THREE.Mesh(
    new runtime.THREE.BoxGeometry(cellW, runtime.woodThick, Math.max(0.05, cellD - 0.002)),
    shelfRuntime.shelfMat
  );
  shelfOverDrawers.position.set(
    cellCenterX,
    runtime.startY + runtime.woodThick + drawerHeightTotal + runtime.woodThick / 2,
    cellRuntime.__z(-cellD / 2)
  );
  shelfOverDrawers.userData = { partId: shelfOverDrawersPartId, moduleIndex: cellKey };
  runtime.addOutlines(shelfOverDrawers);
  runtime.wingGroup.add(shelfOverDrawers);

  const addExtDrawer = (yPos: number, height: number, idRaw: string, divIdRaw: string) => {
    const id = scopeExtDrawerKey(idRaw);
    const divId = scopeExtDrawerKey(divIdRaw);
    const dW = Math.max(0.1, cellW - 0.004);
    const boxW = Math.max(0.1, cellW - 0.044);
    const divMap = runtime.readMapOrEmpty(runtime.App, 'drawerDividersMap');
    const hasDivider = !!(divMap && (divMap[divId] || divMap[id]));
    const woodMat = runtime.getCornerMat(id, runtime.frontMat);
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

    const drawerBoxDepth = Math.max(0.08, cellD - 0.12);
    const dBox = runtime.createInternalDrawerBox(
      boxW,
      height - 0.04,
      drawerBoxDepth,
      runtime.bodyMat,
      runtime.bodyMat,
      runtime.addOutlines,
      hasDivider,
      false,
      isGlass ? { omitFrontPanel: true } : null
    );
    dBox.position.set(0, 0, -cellD / 2 + 0.005);

    dGroup.add(dBox);
    dGroup.add(dVis);

    const closed = new runtime.THREE.Vector3(cellCenterX, yPos, cellRuntime.__z(0.01));
    const open = new runtime.THREE.Vector3(cellCenterX, yPos, cellRuntime.__z(0.35));
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
    new runtime.THREE.BoxGeometry(Math.max(0.05, cellW - 0.01), 0.008, 0.01),
    runtime.shadowMat
  );
  shadowPlane.position.set(cellCenterX, cellRuntime.effectiveBottomY, cellRuntime.__z(0.005));
  shadowPlane.name = `wp_drawer_shadow_plane_corner_c${cell.idx}`;
  shadowPlane.userData = shadowPlane.userData || {};
  shadowPlane.userData.kind = 'drawerShadowPlane';
  shadowPlane.userData.hideWhenOpen = true;
  shadowPlane.userData.moduleIndex = cellKey;
  runtime.wingGroup.add(shadowPlane);
}
