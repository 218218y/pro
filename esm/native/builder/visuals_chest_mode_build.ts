import {
  getDrawersArray,
  refreshTrackedMirrorSurfacesNow,
  getViewportSurface,
  getWardrobeGroup,
  trackMirrorSurface,
} from '../runtime/render_access.js';
import { getBuilderRenderOps } from '../runtime/builder_service_access.js';
import {
  CARCASS_BASE_DIMENSIONS,
  CHEST_MODE_DIMENSIONS,
  DOOR_SYSTEM_DIMENSIONS,
  MATERIAL_DIMENSIONS,
} from '../../shared/wardrobe_dimension_tokens_shared.js';
import { resolveBaseLegGeometrySpec } from '../features/base_leg_support.js';
import { makeDrawerBoxPartId } from '../features/drawer_box_identity.js';

import type { AppContainer, UnknownRecord } from '../../../types/index.js';

import {
  asChestModeControls,
  asChestModeObject3D,
  asChestModeRenderer,
  ensureChestModeApp,
  ensureChestModeTHREE,
  getMirrorMaterialFromServices,
} from './visuals_chest_mode_runtime.js';
import { resolveChestModeBuildInputs } from './visuals_chest_mode_inputs.js';
import {
  createChestModePartColorValueResolver,
  createChestModePartMaterialResolver,
  resolveChestModeBodyMaterialState,
  resolveChestModeDrawerBoxMaterial,
  resolveChestModeMaterialPalette,
} from './visuals_chest_mode_materials.js';
import { readChestModeCfgSnapshotFromOpts } from './visuals_chest_mode_config.js';
import { createInternalDrawerBox } from './visuals_chest_mode_drawer_box.js';
import { createChestDrawerFrontVisual } from './visuals_chest_mode_drawer_front.js';
import { appendDoorTrimVisuals } from './door_trim_visuals.js';
import {
  buildDoorTrimSurfaceUserData,
  isCabinetBodyDoorTrimSurfacePartId,
  resolveCabinetBodyDoorTrimSurfaceInfo,
} from '../features/door_trim.js';
import { applyFrontRevealFrames } from './post_build_front_reveal_frames.js';

import type { BuildContextLike } from '../../../types/index.js';

const PLINTH_DIMENSIONS = CARCASS_BASE_DIMENSIONS.plinth;
const BASE_LEG_LAYOUT_DIMENSIONS = CARCASS_BASE_DIMENSIONS.legs;
const CHEST_DIMENSIONS = CARCASS_BASE_DIMENSIONS.chest;

export function buildChestOnly(App: AppContainer, opts?: UnknownRecord | null) {
  App = ensureChestModeApp(App);
  const THREE = ensureChestModeTHREE(App);
  const wardrobeGroup = asChestModeObject3D(getWardrobeGroup(App));
  if (!wardrobeGroup) return;

  const inputs = resolveChestModeBuildInputs(App, opts || null);
  const cfg = readChestModeCfgSnapshotFromOpts(opts || null);
  const bodyState = resolveChestModeBodyMaterialState({
    App,
    cfg,
    colorChoice: inputs.colorChoice,
    customColor: inputs.customColor,
  });
  const palette = resolveChestModeMaterialPalette({ App, bodyState, legColor: inputs.baseLegColor });
  const getChestPartMat = createChestModePartMaterialResolver({
    App,
    THREE,
    cfg,
    globalBodyMat: palette.globalBodyMat,
    drawerBoxMat: palette.drawerBoxMat,
  });
  const renderOps = getBuilderRenderOps(App);
  const addOutlines = renderOps && typeof renderOps.addOutlines === 'function' ? renderOps.addOutlines : null;
  const addDimensionLine =
    renderOps && typeof renderOps.addDimensionLine === 'function' ? renderOps.addDimensionLine : null;

  const H = inputs.H;
  const totalW = inputs.totalW;
  const D = inputs.D;
  const effectiveBaseType = inputs.effectiveBaseType;
  const drawersCount = inputs.drawersCount;
  const isInsetDrawerMount = String(cfg?.doorMountMode || '') === 'inset';
  const thick = isInsetDrawerMount
    ? DOOR_SYSTEM_DIMENSIONS.hinged.insetFrameThicknessM
    : MATERIAL_DIMENSIONS.wood.thicknessM;
  const insetReveal = isInsetDrawerMount
    ? Math.min(DOOR_SYSTEM_DIMENSIONS.hinged.insetRevealM, Math.max(0, thick / 3))
    : 0;
  const baseH = effectiveBaseType === 'plinth' ? inputs.basePlinthHeightM : inputs.baseLegHeightM;
  const getPartColorValue = createChestModePartColorValueResolver({
    App,
    cfg,
  });
  let commodeDimensionPanel: { widthM: number; heightM: number } | null = null;

  const createChestBoard = (
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    idName: string
  ) => {
    const mat = getChestPartMat(idName);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z);
    const surfaceUserData = buildDoorTrimSurfaceUserData(idName, { width: w, height: h, depth: d });
    mesh.userData = { partId: idName, ...(surfaceUserData || {}) };
    if (addOutlines) addOutlines(mesh);
    if (isCabinetBodyDoorTrimSurfacePartId(idName)) {
      const surfaceInfo = resolveCabinetBodyDoorTrimSurfaceInfo(idName, { width: w, height: h, depth: d });
      if (surfaceInfo) {
        appendDoorTrimVisuals({
          App,
          THREE,
          group: mesh,
          partId: idName,
          trims: cfg?.doorTrimMap ? cfg.doorTrimMap[idName] : undefined,
          doorWidth: surfaceInfo.doorWidth,
          doorHeight: surfaceInfo.doorHeight,
          frontZ: surfaceInfo.faceCoord,
          faceSign: surfaceInfo.faceSign,
          surfacePlane: surfaceInfo.plane,
          surfaceFaceCoord: surfaceInfo.faceCoord,
        });
      }
    }
    wardrobeGroup.add(mesh);
    return mesh;
  };

  createChestBoard(totalW, thick, D, 0, baseH + thick / 2, 0, 'chest_floor');
  createChestBoard(totalW, thick, D, 0, H - thick / 2, 0, 'chest_ceil');

  const sideH = H - baseH - 2 * thick;
  createChestBoard(thick, sideH, D, -totalW / 2 + thick / 2, baseH + thick + sideH / 2, 0, 'chest_left');
  createChestBoard(thick, sideH, D, totalW / 2 - thick / 2, baseH + thick + sideH / 2, 0, 'chest_right');

  const chestBodyHeight = H - baseH;
  const back = new THREE.Mesh(
    new THREE.BoxGeometry(totalW, chestBodyHeight, CHEST_DIMENSIONS.backThicknessM),
    palette.globalBodyMat
  );
  back.position.set(0, baseH + chestBodyHeight / 2, -D / 2 + CHEST_DIMENSIONS.backInsetM);
  wardrobeGroup.add(back);

  if (effectiveBaseType === 'plinth') {
    createChestBoard(
      totalW - PLINTH_DIMENSIONS.widthClearanceM,
      baseH,
      D - PLINTH_DIMENSIONS.depthClearanceM,
      0,
      baseH / 2,
      -PLINTH_DIMENSIONS.frontInsetM,
      'chest_plinth'
    );
  } else {
    const legSpec = resolveBaseLegGeometrySpec(inputs.baseLegStyle, inputs.baseLegWidthCm);
    const legGeo =
      legSpec.shape === 'square'
        ? new THREE.BoxGeometry(legSpec.width, baseH, legSpec.depth)
        : new THREE.CylinderGeometry(legSpec.topRadius, legSpec.bottomRadius, baseH, legSpec.radialSegments);
    const positions = [
      {
        x: -totalW / 2 + BASE_LEG_LAYOUT_DIMENSIONS.cornerInsetM,
        z: D / 2 - BASE_LEG_LAYOUT_DIMENSIONS.cornerInsetM,
      },
      {
        x: totalW / 2 - BASE_LEG_LAYOUT_DIMENSIONS.cornerInsetM,
        z: D / 2 - BASE_LEG_LAYOUT_DIMENSIONS.cornerInsetM,
      },
      {
        x: -totalW / 2 + BASE_LEG_LAYOUT_DIMENSIONS.cornerInsetM,
        z: -D / 2 + BASE_LEG_LAYOUT_DIMENSIONS.cornerInsetM,
      },
      {
        x: totalW / 2 - BASE_LEG_LAYOUT_DIMENSIONS.cornerInsetM,
        z: -D / 2 + BASE_LEG_LAYOUT_DIMENSIONS.cornerInsetM,
      },
    ];
    if (totalW > BASE_LEG_LAYOUT_DIMENSIONS.chestCenterSupportWidthThresholdM) {
      positions.push({ x: 0, z: D / 2 - BASE_LEG_LAYOUT_DIMENSIONS.cornerInsetM });
      positions.push({ x: 0, z: -D / 2 + BASE_LEG_LAYOUT_DIMENSIONS.cornerInsetM });
    }
    positions.forEach(pos => {
      const leg = new THREE.Mesh(legGeo, palette.legMat);
      leg.position.set(pos.x, baseH / 2, pos.z);
      if (addOutlines) addOutlines(leg);
      wardrobeGroup.add(leg);
    });
  }

  const innerH = sideH;
  const startY = baseH + thick;
  const singleDrawerTotalH = innerH / drawersCount;
  const gap = CHEST_DIMENSIONS.drawerGapM;
  const drawerFrontH = singleDrawerTotalH - gap;
  const drawerWidth = totalW - 2 * thick - CHEST_DIMENSIONS.drawerWidthClearanceM;

  for (let i = 0; i < drawersCount; i++) {
    const yCenter = startY + i * singleDrawerTotalH + singleDrawerTotalH / 2;
    const drawerId = `chest_drawer_${i}`;
    const drawerBoxId = makeDrawerBoxPartId(drawerId);
    const frontMat = getChestPartMat(drawerId);
    const drawerBoxMat = resolveChestModeDrawerBoxMaterial({
      globalDrawerBoxMat: palette.drawerBoxMat,
      drawerBoxMaterial: getChestPartMat(drawerBoxId),
      drawerBoxColorValue: getPartColorValue(drawerBoxId),
    });
    const drawerGroup = new THREE.Group();
    drawerGroup.userData = { partId: drawerId, __doorWidth: drawerWidth, __doorHeight: drawerFrontH };

    const frontThickness = CHEST_DIMENSIONS.drawerFrontThicknessM;
    const frontMesh = createChestDrawerFrontVisual({
      App,
      THREE,
      cfg,
      drawerId,
      drawerWidth,
      drawerHeight: drawerFrontH,
      drawerThickness: frontThickness,
      frontMaterial: frontMat,
      bodyMaterial: drawerBoxMat,
      globalFrontMaterial: palette.globalBodyMat,
      doorStyle: inputs.doorStyle,
      isGroovesEnabled: inputs.isGroovesEnabled,
      getPartColorValue,
      addOutlines,
    });
    const frontCenterZ = isInsetDrawerMount
      ? D / 2 - frontThickness / 2 - insetReveal
      : D / 2 + frontThickness / 2;
    const frontSurfaceZ = isInsetDrawerMount ? D / 2 - insetReveal : D / 2 + frontThickness;
    const frontBackZ = frontCenterZ - frontThickness / 2;
    frontMesh.position.set(0, 0, frontCenterZ);
    drawerGroup.userData.__frontMaxZ = frontSurfaceZ;
    drawerGroup.add(frontMesh);
    appendDoorTrimVisuals({
      App,
      THREE,
      group: drawerGroup,
      partId: drawerId,
      trims: cfg?.doorTrimMap ? cfg.doorTrimMap[drawerId] : undefined,
      doorWidth: drawerWidth,
      doorHeight: drawerFrontH,
      frontZ: frontSurfaceZ,
      faceSign: 1,
    });

    const boxH = drawerFrontH - CHEST_DIMENSIONS.drawerBoxHeightClearanceM;
    const boxD = D - CHEST_DIMENSIONS.drawerBoxDepthClearanceM;
    const boxMesh = createInternalDrawerBox(
      App,
      drawerWidth - CHEST_DIMENSIONS.drawerBoxWidthClearanceM,
      boxH,
      boxD,
      drawerBoxMat,
      drawerBoxMat,
      addOutlines || undefined,
      false,
      false
    );
    boxMesh.position.set(0, 0, 0);
    boxMesh.userData = {
      ...(boxMesh.userData || {}),
      partId: drawerBoxId,
      drawerId,
      __wpDrawerBox: true,
      __wpDrawerOwnerPartId: drawerId,
      __doorWidth: drawerWidth - CHEST_DIMENSIONS.drawerBoxWidthClearanceM,
      __doorHeight: boxH,
    };
    drawerGroup.add(boxMesh);

    const connDepth = CHEST_DIMENSIONS.connectorDepthM;
    const connZ = isInsetDrawerMount
      ? frontBackZ - CHEST_DIMENSIONS.connectorBackInsetM - connDepth / 2
      : D / 2 - connDepth / 2 - CHEST_DIMENSIONS.connectorBackInsetM;
    const connMesh = new THREE.Mesh(
      new THREE.BoxGeometry(
        drawerWidth - CHEST_DIMENSIONS.connectorWidthClearanceM,
        boxH - CHEST_DIMENSIONS.connectorHeightClearanceM,
        connDepth
      ),
      drawerBoxMat
    );
    connMesh.position.set(0, 0, connZ);
    connMesh.userData = {
      partId: drawerBoxId,
      drawerId,
      __wpDrawerBox: true,
      __wpDrawerOwnerPartId: drawerId,
      __doorWidth: drawerWidth - CHEST_DIMENSIONS.connectorWidthClearanceM,
      __doorHeight: boxH - CHEST_DIMENSIONS.connectorHeightClearanceM,
    };
    drawerGroup.add(connMesh);

    drawerGroup.position.set(0, yCenter, 0);
    wardrobeGroup.add(drawerGroup);

    getDrawersArray(App).push({
      group: drawerGroup,
      closed: new THREE.Vector3(0, yCenter, 0),
      open: new THREE.Vector3(0, yCenter, CHEST_DIMENSIONS.openOffsetZM),
      id: drawerId,
      dividerKey: drawerId,
    });
  }

  if (inputs.chestCommodeEnabled) {
    const commode = CHEST_MODE_DIMENSIONS.commode;
    const panelW = Math.max(commode.minMirrorWidthCm / 100, inputs.chestCommodeMirrorWidthM);
    const panelH = Math.max(commode.minMirrorHeightCm / 100, inputs.chestCommodeMirrorHeightM);
    commodeDimensionPanel = { widthM: panelW, heightM: panelH };
    const panelThickness = commode.backPanelThicknessM;
    const panelCenterY = H + panelH / 2;
    const panelCenterZ = -D / 2 + panelThickness / 2 + commode.backPanelYOffsetM;

    const commodeBack = new THREE.Mesh(
      new THREE.BoxGeometry(panelW, panelH, panelThickness),
      palette.globalBodyMat
    );
    commodeBack.position.set(0, panelCenterY, panelCenterZ);
    commodeBack.userData = { partId: 'chest_commode_back' };
    if (addOutlines) addOutlines(commodeBack);
    wardrobeGroup.add(commodeBack);

    const inset = Math.max(0, Math.min(commode.mirrorInsetM, panelW / 2 - 0.01, panelH / 2 - 0.01));
    const mirrorW = Math.max(0.05, panelW - inset * 2);
    const mirrorH = Math.max(0.05, panelH - inset * 2);
    const mirrorThickness = commode.mirrorThicknessM;
    const mirror = new THREE.Mesh(
      new THREE.BoxGeometry(mirrorW, mirrorH, mirrorThickness),
      getMirrorMaterialFromServices(App, THREE)
    );
    mirror.position.set(
      0,
      panelCenterY,
      panelCenterZ + panelThickness / 2 + mirrorThickness / 2 + commode.mirrorSurfaceLiftM
    );
    mirror.userData = {
      partId: 'chest_commode_mirror',
      __wpMirrorSurface: true,
      __mirrorWidthM: mirrorW,
      __mirrorHeightM: mirrorH,
    };
    mirror.renderOrder = 2;
    trackMirrorSurface(App, mirror);
    wardrobeGroup.add(mirror);
  }

  applyFrontRevealFrames({
    __kind: 'chestModeBuildContext',
    App,
    THREE,
    cfg,
  } as BuildContextLike);

  if (cfg.showDimensions && addDimensionLine) {
    const dimensionTextScale = CHEST_MODE_DIMENSIONS.dimensionGuideTextScale;
    addDimensionLine(
      new THREE.Vector3(-totalW / 2, H + CHEST_MODE_DIMENSIONS.dimensionGuideTopOffsetM, 0),
      new THREE.Vector3(totalW / 2, H + CHEST_MODE_DIMENSIONS.dimensionGuideTopOffsetM, 0),
      new THREE.Vector3(0, 0, 0),
      (totalW * 100).toFixed(0),
      dimensionTextScale.total
    );
    if (commodeDimensionPanel) {
      const sideOffset = CHEST_MODE_DIMENSIONS.dimensionGuideSideOffsetM;
      const topOffset = CHEST_MODE_DIMENSIONS.dimensionGuideTopOffsetM;
      const maxPanelW = Math.max(totalW, commodeDimensionPanel.widthM);
      const segmentHeightX = maxPanelW / 2 + sideOffset;
      const totalHeightX = maxPanelW / 2 + sideOffset * 2;
      const mirrorTopY = H + commodeDimensionPanel.heightM;
      const sideTextOffset = new THREE.Vector3(sideOffset * 0.35, 0, 0);

      if (Math.abs(commodeDimensionPanel.widthM - totalW) > 0.005) {
        addDimensionLine(
          new THREE.Vector3(-commodeDimensionPanel.widthM / 2, mirrorTopY + topOffset, 0),
          new THREE.Vector3(commodeDimensionPanel.widthM / 2, mirrorTopY + topOffset, 0),
          new THREE.Vector3(0, 0, 0),
          (commodeDimensionPanel.widthM * 100).toFixed(0),
          dimensionTextScale.segment
        );
      }

      addDimensionLine(
        new THREE.Vector3(segmentHeightX, 0, 0),
        new THREE.Vector3(segmentHeightX, H, 0),
        sideTextOffset,
        (H * 100).toFixed(0),
        dimensionTextScale.segment
      );
      addDimensionLine(
        new THREE.Vector3(segmentHeightX, H, 0),
        new THREE.Vector3(segmentHeightX, mirrorTopY, 0),
        sideTextOffset,
        (commodeDimensionPanel.heightM * 100).toFixed(0),
        dimensionTextScale.segment
      );
      addDimensionLine(
        new THREE.Vector3(totalHeightX, 0, 0),
        new THREE.Vector3(totalHeightX, mirrorTopY, 0),
        new THREE.Vector3(sideOffset * 0.45, 0, 0),
        (mirrorTopY * 100).toFixed(0),
        dimensionTextScale.total
      );
    } else {
      addDimensionLine(
        new THREE.Vector3(totalW / 2 + CHEST_MODE_DIMENSIONS.dimensionGuideSideOffsetM, 0, 0),
        new THREE.Vector3(totalW / 2 + CHEST_MODE_DIMENSIONS.dimensionGuideSideOffsetM, H, 0),
        new THREE.Vector3(0, 0, 0),
        (H * 100).toFixed(0),
        dimensionTextScale.total
      );
    }
  }

  const { renderer, scene, camera, controls } = getViewportSurface(App);
  const rendererLike = asChestModeRenderer(renderer);
  const controlsLike = asChestModeControls(controls);
  if (rendererLike && scene && camera && typeof rendererLike.render === 'function') {
    refreshTrackedMirrorSurfacesNow(App);
    rendererLike.render(scene, camera);
  }
  if (controlsLike && typeof controlsLike.update === 'function') controlsLike.update();
}
