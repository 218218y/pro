import { getDrawersArray, getViewportSurface, getWardrobeGroup } from '../runtime/render_access.js';
import { getBuilderRenderOps } from '../runtime/builder_service_access.js';
import { resolveBaseLegGeometrySpec } from '../features/base_leg_support.js';
import { getCfg } from './store_access.js';

import type { AppContainer, UnknownRecord } from '../../../types/index.js';

import {
  asChestModeControls,
  asChestModeObject3D,
  asChestModeRenderer,
  ensureChestModeApp,
  ensureChestModeTHREE,
} from './visuals_chest_mode_runtime.js';
import { resolveChestModeBuildInputs } from './visuals_chest_mode_inputs.js';
import {
  createChestModePartMaterialResolver,
  resolveChestModeBodyMaterialState,
  resolveChestModeMaterialPalette,
} from './visuals_chest_mode_materials.js';
import { createInternalDrawerBox } from './visuals_chest_mode_drawer_box.js';

export function buildChestOnly(App: AppContainer, opts?: UnknownRecord | null) {
  App = ensureChestModeApp(App);
  const THREE = ensureChestModeTHREE(App);
  const wardrobeGroup = asChestModeObject3D(getWardrobeGroup(App));
  if (!wardrobeGroup) return;

  const inputs = resolveChestModeBuildInputs(App, opts || null);
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
  const thick = 0.018;
  const baseH = effectiveBaseType === 'plinth' ? 0.08 : inputs.baseLegHeightM;

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
  const back = new THREE.Mesh(new THREE.BoxGeometry(totalW, chestBodyHeight, 0.005), palette.globalBodyMat);
  back.position.set(0, baseH + chestBodyHeight / 2, -D / 2 + 0.005);
  wardrobeGroup.add(back);

  if (effectiveBaseType === 'plinth') {
    createChestBoard(totalW - 0.04, baseH, D - 0.05, 0, baseH / 2, -0.02, 'chest_plinth');
  } else {
    const legSpec = resolveBaseLegGeometrySpec(inputs.baseLegStyle, inputs.baseLegWidthCm);
    const legGeo =
      legSpec.shape === 'square'
        ? new THREE.BoxGeometry(legSpec.width, baseH, legSpec.depth)
        : new THREE.CylinderGeometry(legSpec.topRadius, legSpec.bottomRadius, baseH, legSpec.radialSegments);
    const positions = [
      { x: -totalW / 2 + 0.05, z: D / 2 - 0.05 },
      { x: totalW / 2 - 0.05, z: D / 2 - 0.05 },
      { x: -totalW / 2 + 0.05, z: -D / 2 + 0.05 },
      { x: totalW / 2 - 0.05, z: -D / 2 + 0.05 },
    ];
    if (totalW > 1.2) {
      positions.push({ x: 0, z: D / 2 - 0.05 });
      positions.push({ x: 0, z: -D / 2 + 0.05 });
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
  const gap = 0.004;
  const drawerFrontH = singleDrawerTotalH - gap;
  const drawerWidth = totalW - 2 * thick - 0.004;

  for (let i = 0; i < drawersCount; i++) {
    const yCenter = startY + i * singleDrawerTotalH + singleDrawerTotalH / 2;
    const drawerId = `chest_drawer_${i}`;
    const frontMat = getChestPartMat(drawerId);
    const drawerGroup = new THREE.Group();
    drawerGroup.userData = { partId: drawerId, __doorWidth: drawerWidth, __doorHeight: drawerFrontH };

    const frontThickness = 0.018;
    const frontMesh = new THREE.Mesh(
      new THREE.BoxGeometry(drawerWidth, drawerFrontH, frontThickness),
      frontMat
    );
    frontMesh.position.set(0, 0, D / 2 + frontThickness / 2);
    drawerGroup.userData.__frontMaxZ = D / 2 + frontThickness;
    if (addOutlines) addOutlines(frontMesh);
    drawerGroup.add(frontMesh);

    if (i > 0) {
      const shadowLine = new THREE.Mesh(
        new THREE.BoxGeometry(drawerWidth, gap, 0.001),
        new THREE.MeshBasicMaterial({ color: 0x000000 })
      );
      shadowLine.position.set(0, -drawerFrontH / 2 - gap / 2, D / 2 + frontThickness / 2 + 0.001);
      drawerGroup.add(shadowLine);
    }

    const boxH = drawerFrontH - 0.05;
    const boxD = D - 0.05;
    const boxMesh = createInternalDrawerBox(
      App,
      drawerWidth - 0.03,
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

    const connDepth = 0.02;
    const connZ = D / 2 - connDepth / 2 - 0.003;
    const connMesh = new THREE.Mesh(
      new THREE.BoxGeometry(drawerWidth - 0.08, boxH - 0.02, connDepth),
      palette.drawerBoxMat
    );
    connMesh.position.set(0, 0, connZ);
    drawerGroup.add(connMesh);

    drawerGroup.position.set(0, yCenter, 0);
    wardrobeGroup.add(drawerGroup);

    getDrawersArray(App).push({
      group: drawerGroup,
      closed: new THREE.Vector3(0, yCenter, 0),
      open: new THREE.Vector3(0, yCenter, 0.35),
      id: drawerId,
      dividerKey: drawerId,
    });
  }

  if (getCfg(App).showDimensions && addDimensionLine) {
    addDimensionLine(
      new THREE.Vector3(-totalW / 2, H + 0.1, 0),
      new THREE.Vector3(totalW / 2, H + 0.1, 0),
      new THREE.Vector3(0, 0, 0),
      (totalW * 100).toFixed(0),
      0.6
    );
    addDimensionLine(
      new THREE.Vector3(totalW / 2 + 0.15, 0, 0),
      new THREE.Vector3(totalW / 2 + 0.15, H, 0),
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
