import {
  getDrawersArray,
  getViewportSurface,
  getWardrobeGroup,
  trackMirrorSurface,
} from '../runtime/render_access.js';
import { getBuilderRenderOps } from '../runtime/builder_service_access.js';
import {
  CARCASS_BASE_DIMENSIONS,
  CHEST_MODE_DIMENSIONS,
  MATERIAL_DIMENSIONS,
} from '../../shared/wardrobe_dimension_tokens_shared.js';
import { resolveBaseLegGeometrySpec } from '../features/base_leg_support.js';
import { getCfg } from './store_access.js';

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
  createChestModePartMaterialResolver,
  resolveChestModeBodyMaterialState,
  resolveChestModeMaterialPalette,
} from './visuals_chest_mode_materials.js';
import { createInternalDrawerBox } from './visuals_chest_mode_drawer_box.js';
import { createChestDrawerFrontVisual } from './visuals_chest_mode_drawer_front.js';
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
  const cfg = getCfg(App);
  const bodyState = resolveChestModeBodyMaterialState({
    App,
    colorChoice: inputs.colorChoice,
    customColor: inputs.customColor,
  });
  const palette = resolveChestModeMaterialPalette({ App, bodyState, legColor: inputs.baseLegColor });
  const getChestPartMat = createChestModePartMaterialResolver({
    App,
    THREE,
    globalBodyMat: palette.globalBodyMat,
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
  const thick = MATERIAL_DIMENSIONS.wood.thicknessM;
  const baseH = effectiveBaseType === 'plinth' ? inputs.basePlinthHeightM : inputs.baseLegHeightM;
  const getPartColorValue = (partId: string): unknown => {
    const colors = cfg && typeof cfg.individualColors === 'object' ? cfg.individualColors : null;
    if (!colors || !Object.prototype.hasOwnProperty.call(colors, partId)) return null;
    return colors[partId];
  };

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
    mesh.userData = { partId: idName };
    if (addOutlines) addOutlines(mesh);
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
    const frontMat = getChestPartMat(drawerId);
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
      bodyMaterial: palette.drawerBoxMat,
      globalFrontMaterial: palette.globalBodyMat,
      doorStyle: inputs.doorStyle,
      isGroovesEnabled: inputs.isGroovesEnabled,
      getPartColorValue,
      addOutlines,
    });
    frontMesh.position.set(0, 0, D / 2 + frontThickness / 2);
    drawerGroup.userData.__frontMaxZ = D / 2 + frontThickness;
    drawerGroup.add(frontMesh);

    const boxH = drawerFrontH - CHEST_DIMENSIONS.drawerBoxHeightClearanceM;
    const boxD = D - CHEST_DIMENSIONS.drawerBoxDepthClearanceM;
    const boxMesh = createInternalDrawerBox(
      App,
      drawerWidth - CHEST_DIMENSIONS.drawerBoxWidthClearanceM,
      boxH,
      boxD,
      palette.drawerBoxMat,
      palette.drawerBoxMat,
      addOutlines || undefined,
      false,
      false
    );
    boxMesh.position.set(0, 0, 0);
    drawerGroup.add(boxMesh);

    const connDepth = CHEST_DIMENSIONS.connectorDepthM;
    const connZ = D / 2 - connDepth / 2 - CHEST_DIMENSIONS.connectorBackInsetM;
    const connMesh = new THREE.Mesh(
      new THREE.BoxGeometry(
        drawerWidth - CHEST_DIMENSIONS.connectorWidthClearanceM,
        boxH - CHEST_DIMENSIONS.connectorHeightClearanceM,
        connDepth
      ),
      palette.drawerBoxMat
    );
    connMesh.position.set(0, 0, connZ);
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
  } as BuildContextLike);

  if (cfg.showDimensions && addDimensionLine) {
    addDimensionLine(
      new THREE.Vector3(-totalW / 2, H + CHEST_MODE_DIMENSIONS.dimensionGuideTopOffsetM, 0),
      new THREE.Vector3(totalW / 2, H + CHEST_MODE_DIMENSIONS.dimensionGuideTopOffsetM, 0),
      new THREE.Vector3(0, 0, 0),
      (totalW * 100).toFixed(0),
      0.6
    );
    addDimensionLine(
      new THREE.Vector3(totalW / 2 + CHEST_MODE_DIMENSIONS.dimensionGuideSideOffsetM, 0, 0),
      new THREE.Vector3(totalW / 2 + CHEST_MODE_DIMENSIONS.dimensionGuideSideOffsetM, H, 0),
      new THREE.Vector3(0, 0, 0),
      (H * 100).toFixed(0),
      0.6
    );
  }

  const { renderer, scene, camera, controls } = getViewportSurface(App);
  const rendererLike = asChestModeRenderer(renderer);
  const controlsLike = asChestModeControls(controls);
  if (rendererLike && scene && camera && typeof rendererLike.render === 'function')
    rendererLike.render(scene, camera);
  if (controlsLike && typeof controlsLike.update === 'function') controlsLike.update();
}
