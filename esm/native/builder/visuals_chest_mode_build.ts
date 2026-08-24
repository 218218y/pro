import {
  getDrawersArray,
  installPlanarMirrorReflector,
  getWardrobeGroup,
  trackMirrorSurface,
} from '../runtime/render_access.js';
import { getBuilderRenderOps } from '../runtime/builder_service_access.js';
import {
  BASE_LEG_LAYOUT_POLICY,
  BASE_PLATFORM_RENDER_POLICY,
  BASE_PLINTH_POLICY,
  CHEST_CASTER_RENDER_POLICY,
  CHEST_CONNECTOR_POLICY,
  CHEST_DRAWER_GEOMETRY_POLICY,
  CHEST_MODE_COMMODE_CONSTRAINTS_POLICY,
  CHEST_MODE_COMMODE_RENDER_POLICY,
  CHEST_MODE_DIMENSION_GUIDE_RENDER_POLICY,
  CHEST_MOTION_POLICY,
  CHEST_SHELL_POLICY,
  HINGED_DOOR_MOUNT_POLICY,
  resolveDoorMountThicknessesFromConfig,
} from '../../shared/dimensions/chest_mode_build_dimension_policy.js';
import { isBaseLegWheelsStyle, resolveBaseLegGeometrySpec } from '../features/base_leg_support.js';
import { makeDrawerBoxPartId } from '../features/part_identity/api.js';

import type { AppContainer, BuilderBuildChestOnlyOptsLike } from '../../../types/index.js';

import {
  asChestModeObject3D,
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
import { appendDrawerRunnerVisuals } from './drawer_runner_visuals.js';
import { DEFAULT_DRAWER_RUNNER_TYPE } from './drawer_runner_policy.js';
import {
  buildDoorTrimSurfaceUserData,
  isCabinetBodyDoorTrimSurfacePartId,
  resolveCabinetBodyDoorTrimSurfaceInfo,
} from '../features/door_authoring/api.js';
import { applyFrontRevealFrames } from './post_build_front_reveal_frames.js';
import { requireContentsRenderPolicy } from './visuals_contents_shared.js';

import type { BuildContextLike } from '../../../types/index.js';

export function buildChestOnly(App: AppContainer, opts: BuilderBuildChestOnlyOptsLike) {
  App = ensureChestModeApp(App);
  const inputs = resolveChestModeBuildInputs(opts);
  const cfg = readChestModeCfgSnapshotFromOpts(opts);
  const renderPolicy = requireContentsRenderPolicy(opts.renderPolicy);
  const THREE = ensureChestModeTHREE(App);
  const wardrobeGroup = asChestModeObject3D(getWardrobeGroup(App));
  if (!wardrobeGroup) return;

  const bodyState = resolveChestModeBodyMaterialState({
    App,
    cfg,
    colorChoice: inputs.colorChoice,
    customColor: inputs.customColor,
  });
  const palette = resolveChestModeMaterialPalette({
    App,
    bodyState,
    legColor: inputs.baseLegColor,
    cfg,
    sketchMode: renderPolicy.sketchMode,
  });
  const getChestPartMat = createChestModePartMaterialResolver({
    App,
    THREE,
    cfg,
    sketchMode: renderPolicy.sketchMode,
    globalBodyMat: palette.globalBodyMat,
    drawerBoxMat: palette.drawerBoxMat,
  });
  const renderOps = getBuilderRenderOps(App);
  const addOutlines = renderPolicy.addOutlines;
  const addDimensionLine =
    renderOps && typeof renderOps.addDimensionLine === 'function' ? renderOps.addDimensionLine : null;

  const H = inputs.H;
  const totalW = inputs.totalW;
  const D = inputs.D;
  const effectiveBaseType = inputs.effectiveBaseType;
  const drawersCount = inputs.drawersCount;
  const doorMountThicknesses = resolveDoorMountThicknessesFromConfig(cfg);
  const isInsetDrawerMount = doorMountThicknesses.mode === 'inset';
  const thick = doorMountThicknesses.frameThicknessM;
  const insetReveal = isInsetDrawerMount
    ? Math.min(HINGED_DOOR_MOUNT_POLICY.insetRevealM, Math.max(0, thick / 3))
    : 0;
  const legH = inputs.baseLegHeightM;
  const isWheelsBase = isBaseLegWheelsStyle(inputs.baseLegStyle);
  const baseLegBottomPlatformH = inputs.baseLegBottomPlatformHeightM;
  const baseLegTopPlatformH = inputs.baseLegTopPlatformHeightM;
  const baseH = effectiveBaseType === 'plinth' ? inputs.basePlinthHeightM : legH + baseLegBottomPlatformH;
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
    mesh.userData = { partId: idName, ...surfaceUserData };
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

  const backPanelW = Math.max(0, totalW - 2 * thick - CHEST_SHELL_POLICY.backPanelWidthClearanceM);
  const backPanelH = Math.max(0, sideH - CHEST_SHELL_POLICY.backPanelHeightClearanceM);
  const backPanelY = baseH + thick + sideH / 2;
  createChestBoard(
    backPanelW,
    backPanelH,
    CHEST_SHELL_POLICY.backThicknessM,
    0,
    backPanelY,
    -D / 2 + CHEST_SHELL_POLICY.backInsetM,
    'chest_back'
  );

  if (effectiveBaseType === 'plinth') {
    createChestBoard(
      totalW - BASE_PLINTH_POLICY.widthClearanceM,
      baseH,
      D - BASE_PLINTH_POLICY.depthClearanceM,
      0,
      baseH / 2,
      0 - BASE_PLINTH_POLICY.frontInsetM,
      'chest_plinth'
    );
  } else {
    const createLegPlatform = (y: number, idName: string) => {
      if (!(BASE_PLATFORM_RENDER_POLICY.heightM > 0) || inputs.baseLegPlatformMode !== 'stage') return;
      const platformDepth = Math.max(
        BASE_PLATFORM_RENDER_POLICY.minDepthM,
        D + Math.max(0, inputs.baseLegPlatformFrontOverhangM)
      );
      const sideOverhang =
        inputs.baseLegPlatformSideMode === 'flush' ? 0 : Math.max(0, inputs.baseLegPlatformSideOverhangM);
      createChestBoard(
        Math.max(BASE_PLATFORM_RENDER_POLICY.minWidthM, totalW + sideOverhang * 2),
        BASE_PLATFORM_RENDER_POLICY.heightM,
        platformDepth,
        0,
        y,
        -D / 2 + platformDepth / 2,
        idName
      );
    };
    createLegPlatform(legH + baseLegBottomPlatformH / 2, 'chest_leg_platform_bottom');
    createLegPlatform(H + baseLegTopPlatformH / 2, 'chest_leg_platform_top');

    const positions = [
      {
        x: -totalW / 2 + BASE_LEG_LAYOUT_POLICY.cornerInsetM,
        z: D / 2 - BASE_LEG_LAYOUT_POLICY.cornerInsetM,
      },
      {
        x: totalW / 2 - BASE_LEG_LAYOUT_POLICY.cornerInsetM,
        z: D / 2 - BASE_LEG_LAYOUT_POLICY.cornerInsetM,
      },
      {
        x: -totalW / 2 + BASE_LEG_LAYOUT_POLICY.cornerInsetM,
        z: -D / 2 + BASE_LEG_LAYOUT_POLICY.cornerInsetM,
      },
      {
        x: totalW / 2 - BASE_LEG_LAYOUT_POLICY.cornerInsetM,
        z: -D / 2 + BASE_LEG_LAYOUT_POLICY.cornerInsetM,
      },
    ];

    if (isWheelsBase) {
      const wheelGeo = new THREE.CylinderGeometry(
        CHEST_CASTER_RENDER_POLICY.radiusM,
        CHEST_CASTER_RENDER_POLICY.radiusM,
        CHEST_CASTER_RENDER_POLICY.thicknessM,
        24
      );
      const plateGeo = new THREE.BoxGeometry(
        CHEST_CASTER_RENDER_POLICY.plateWidthM,
        CHEST_CASTER_RENDER_POLICY.plateHeightM,
        CHEST_CASTER_RENDER_POLICY.plateDepthM
      );
      const forkGeo = new THREE.BoxGeometry(
        CHEST_CASTER_RENDER_POLICY.forkWidthM,
        CHEST_CASTER_RENDER_POLICY.forkHeightM,
        CHEST_CASTER_RENDER_POLICY.forkDepthM
      );
      const wheelCenterY = Math.max(
        CHEST_CASTER_RENDER_POLICY.radiusM,
        legH - CHEST_CASTER_RENDER_POLICY.plateHeightM - CHEST_CASTER_RENDER_POLICY.forkHeightM
      );
      const plateY = legH - CHEST_CASTER_RENDER_POLICY.plateHeightM / 2;
      const forkY =
        legH - CHEST_CASTER_RENDER_POLICY.plateHeightM - CHEST_CASTER_RENDER_POLICY.forkHeightM / 2;
      positions.forEach((pos, index) => {
        const plate = new THREE.Mesh(plateGeo, palette.legMat);
        plate.position.set(pos.x, plateY, pos.z);
        plate.userData = { __kind: 'chest_caster_plate', casterIndex: index };
        if (addOutlines) addOutlines(plate);
        wardrobeGroup.add(plate);

        const wheel = new THREE.Mesh(wheelGeo, palette.legMat);
        wheel.position.set(pos.x, wheelCenterY, pos.z);
        wheel.rotation.z = Math.PI / 2;
        wheel.userData = { __kind: 'chest_caster_wheel', casterIndex: index };
        if (addOutlines) addOutlines(wheel);
        wardrobeGroup.add(wheel);

        [-1, 1].forEach(side => {
          const fork = new THREE.Mesh(forkGeo, palette.legMat);
          fork.position.set(
            pos.x +
              side * (CHEST_CASTER_RENDER_POLICY.thicknessM / 2 + CHEST_CASTER_RENDER_POLICY.forkWidthM / 2),
            forkY,
            pos.z
          );
          fork.userData = { __kind: 'chest_caster_fork', casterIndex: index };
          if (addOutlines) addOutlines(fork);
          wardrobeGroup.add(fork);
        });
      });
    } else {
      const legSpec = resolveBaseLegGeometrySpec(inputs.baseLegStyle, inputs.baseLegWidthCm);
      const legGeo =
        legSpec.shape === 'square'
          ? new THREE.BoxGeometry(legSpec.width, legH, legSpec.depth)
          : new THREE.CylinderGeometry(legSpec.topRadius, legSpec.bottomRadius, legH, legSpec.radialSegments);
      if (totalW > BASE_LEG_LAYOUT_POLICY.chestCenterSupportWidthThresholdM) {
        positions.push({ x: 0, z: D / 2 - BASE_LEG_LAYOUT_POLICY.cornerInsetM });
        positions.push({ x: 0, z: -D / 2 + BASE_LEG_LAYOUT_POLICY.cornerInsetM });
      }
      positions.forEach(pos => {
        const leg = new THREE.Mesh(legGeo, palette.legMat);
        leg.position.set(pos.x, legH / 2, pos.z);
        if (addOutlines) addOutlines(leg);
        wardrobeGroup.add(leg);
      });
    }
  }

  const innerH = sideH;
  const startY = baseH + thick;
  const singleDrawerTotalH = innerH / drawersCount;
  const gap = CHEST_DRAWER_GEOMETRY_POLICY.drawerGapM;
  const drawerFrontH = singleDrawerTotalH - gap;
  const drawerWidth = totalW - 2 * thick - CHEST_DRAWER_GEOMETRY_POLICY.drawerWidthClearanceM;
  const fixedRunnerHardware = new THREE.Group();
  fixedRunnerHardware.userData = {
    ...fixedRunnerHardware.userData,
    __ignoreRaycast: true,
    __wpDrawerRunnerHardwareContainer: true,
    __wpChestDrawerRunnerHardware: true,
  };

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

    const frontThickness = CHEST_DRAWER_GEOMETRY_POLICY.drawerFrontThicknessM;
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
      renderPolicy,
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

    const boxH = drawerFrontH - CHEST_DRAWER_GEOMETRY_POLICY.drawerBoxHeightClearanceM;
    const boxD = D - CHEST_DRAWER_GEOMETRY_POLICY.drawerBoxDepthClearanceM;
    const boxMesh = createInternalDrawerBox(
      App,
      drawerWidth - CHEST_DRAWER_GEOMETRY_POLICY.drawerBoxWidthClearanceM,
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
      ...boxMesh.userData,
      partId: drawerBoxId,
      drawerId,
      __wpDrawerBox: true,
      __wpDrawerOwnerPartId: drawerId,
      __doorWidth: drawerWidth - CHEST_DRAWER_GEOMETRY_POLICY.drawerBoxWidthClearanceM,
      __doorHeight: boxH,
    };
    drawerGroup.add(boxMesh);

    const connDepth = CHEST_CONNECTOR_POLICY.connectorDepthM;
    const connZ = isInsetDrawerMount
      ? frontBackZ - CHEST_CONNECTOR_POLICY.connectorBackInsetM - connDepth / 2
      : D / 2 - connDepth / 2 - CHEST_CONNECTOR_POLICY.connectorBackInsetM;
    const connMesh = new THREE.Mesh(
      new THREE.BoxGeometry(
        drawerWidth - CHEST_CONNECTOR_POLICY.connectorWidthClearanceM,
        boxH - CHEST_CONNECTOR_POLICY.connectorHeightClearanceM,
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
      __doorWidth: drawerWidth - CHEST_CONNECTOR_POLICY.connectorWidthClearanceM,
      __doorHeight: boxH - CHEST_CONNECTOR_POLICY.connectorHeightClearanceM,
    };
    drawerGroup.add(connMesh);

    appendDrawerRunnerVisuals({
      App,
      THREE,
      runnerType: DEFAULT_DRAWER_RUNNER_TYPE,
      fixedParent: fixedRunnerHardware,
      movingParent: boxMesh,
      drawerWidthM: drawerWidth - CHEST_DRAWER_GEOMETRY_POLICY.drawerBoxWidthClearanceM,
      mountingWidthM: totalW - 2 * thick,
      drawerHeightM: boxH,
      drawerDepthM: boxD,
      drawerBoxOffsetZM: 0,
      closedPosition: { x: 0, y: yCenter, z: 0 },
      ownerPartId: drawerId,
    });

    drawerGroup.position.set(0, yCenter, 0);
    wardrobeGroup.add(drawerGroup);

    getDrawersArray(App).push({
      group: drawerGroup,
      closed: new THREE.Vector3(0, yCenter, 0),
      open: new THREE.Vector3(0, yCenter, CHEST_MOTION_POLICY.openOffsetZM),
      id: drawerId,
      dividerKey: drawerId,
    });
  }

  if ((fixedRunnerHardware.children?.length || 0) > 0) wardrobeGroup.add(fixedRunnerHardware);

  if (inputs.chestCommodeEnabled) {
    const panelW = Math.max(
      CHEST_MODE_COMMODE_CONSTRAINTS_POLICY.minMirrorWidthCm / 100,
      inputs.chestCommodeMirrorWidthM
    );
    const panelH = Math.max(
      CHEST_MODE_COMMODE_CONSTRAINTS_POLICY.minMirrorHeightCm / 100,
      inputs.chestCommodeMirrorHeightM
    );
    commodeDimensionPanel = { widthM: panelW, heightM: panelH };
    const panelThickness = CHEST_MODE_COMMODE_RENDER_POLICY.backPanelThicknessM;
    const panelCenterY = H + panelH / 2;
    const panelCenterZ = -D / 2 + panelThickness / 2 + CHEST_MODE_COMMODE_RENDER_POLICY.backPanelYOffsetM;

    const commodeBack = new THREE.Mesh(
      new THREE.BoxGeometry(panelW, panelH, panelThickness),
      palette.globalBodyMat
    );
    commodeBack.position.set(0, panelCenterY, panelCenterZ);
    commodeBack.userData = { partId: 'chest_commode_back' };
    if (addOutlines) addOutlines(commodeBack);
    wardrobeGroup.add(commodeBack);

    const inset = Math.max(
      0,
      Math.min(CHEST_MODE_COMMODE_RENDER_POLICY.mirrorInsetM, panelW / 2 - 0.01, panelH / 2 - 0.01)
    );
    const mirrorW = Math.max(0.05, panelW - inset * 2);
    const mirrorH = Math.max(0.05, panelH - inset * 2);
    const mirrorThickness = CHEST_MODE_COMMODE_RENDER_POLICY.mirrorThicknessM;
    const mirror = new THREE.Mesh(
      new THREE.BoxGeometry(mirrorW, mirrorH, mirrorThickness),
      getMirrorMaterialFromServices(App, THREE, {
        cfgSnapshot: cfg,
        sketchMode: renderPolicy.sketchMode,
      })
    );
    mirror.position.set(
      0,
      panelCenterY,
      panelCenterZ +
        panelThickness / 2 +
        mirrorThickness / 2 +
        CHEST_MODE_COMMODE_RENDER_POLICY.mirrorSurfaceLiftM
    );
    mirror.userData = {
      partId: 'chest_commode_mirror',
      __wpMirrorSurface: true,
      __mirrorWidthM: mirrorW,
      __mirrorHeightM: mirrorH,
    };
    try {
      installPlanarMirrorReflector(App, THREE, mirror, {
        faceSign: 1,
        sketchMode: renderPolicy.sketchMode,
      });
    } catch {
      // Keep the existing envMap mirror material for cube mode.
    }
    mirror.renderOrder = 2;
    trackMirrorSurface(App, mirror);
    wardrobeGroup.add(mirror);
  }

  applyFrontRevealFrames({
    __kind: 'chestModeBuildContext',
    App,
    THREE,
    cfg,
    flags: { sketchMode: renderPolicy.sketchMode },
  } as BuildContextLike);

  if (cfg.showDimensions && addDimensionLine) {
    const dimensionTextScale = CHEST_MODE_DIMENSION_GUIDE_RENDER_POLICY.textScale;
    addDimensionLine(
      new THREE.Vector3(-totalW / 2, H + CHEST_MODE_DIMENSION_GUIDE_RENDER_POLICY.topOffsetM, 0),
      new THREE.Vector3(totalW / 2, H + CHEST_MODE_DIMENSION_GUIDE_RENDER_POLICY.topOffsetM, 0),
      new THREE.Vector3(0, 0, 0),
      (totalW * 100).toFixed(0),
      dimensionTextScale.total
    );
    if (commodeDimensionPanel) {
      const sideOffset = CHEST_MODE_DIMENSION_GUIDE_RENDER_POLICY.sideOffsetM;
      const topOffset = CHEST_MODE_DIMENSION_GUIDE_RENDER_POLICY.topOffsetM;
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
        new THREE.Vector3(totalW / 2 + CHEST_MODE_DIMENSION_GUIDE_RENDER_POLICY.sideOffsetM, 0, 0),
        new THREE.Vector3(totalW / 2 + CHEST_MODE_DIMENSION_GUIDE_RENDER_POLICY.sideOffsetM, H, 0),
        new THREE.Vector3(0, 0, 0),
        (H * 100).toFixed(0),
        dimensionTextScale.total
      );
    }
  }
}
