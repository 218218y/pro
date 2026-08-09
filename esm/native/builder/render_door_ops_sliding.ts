import {
  SLIDING_DOOR_CONSTRUCTION_POLICY,
  SLIDING_DOOR_HANDLE_RENDER_POLICY,
  SLIDING_DOOR_MOTION_POLICY,
} from '../../shared/dimensions/door_system_policy.js';
import { toCanonicalGroovesMapKey } from '../../shared/door_groove_key_contracts_shared.js';
import { resolveConfiguredHandleColor } from './handle_finish_runtime.js';
import { resolveHandleFinishPalette } from '../features/finish_palette/api.js';
import { appendDoorTrimVisuals } from './door_trim_visuals.js';
import { resolveEffectiveDoorStyle, hasMirrorSurfaceOnFace } from '../features/door_authoring/api.js';
import type { BuilderRenderDoorDeps } from './render_door_ops_shared.js';
import {
  buildRailGroup,
  createRailMaterial,
  createSlidingTrackPalette,
  isFunction,
  isRecord,
  readDoorConfig,
  readDoorVisualFactory,
  readGetHandleType,
  readGetMaterial,
  readGetPartColorValue,
  readGetPartMaterial,
  readObject3D,
  readSlidingDoorOp,
  readSlidingRail,
  readSlidingUiState,
  readThreeLike,
  resolveHandleType,
  resolveMirrorLayout,
  resolveGrooveLayout,
  resolveSlidingDoorVisualState,
} from './render_door_ops_shared.js';

export function createApplySlidingDoorsOps(deps: BuilderRenderDoorDeps) {
  const { __app, __ops, __wardrobeGroup, __reg, __doors, __markSplitHoverPickablesDirty, getMirrorMaterial } =
    deps;

  return function applySlidingDoorsOps(argsIn: unknown): boolean {
    const App = __app(argsIn);
    __ops(App);
    const args = isRecord(argsIn) ? argsIn : null;
    const THREE = readThreeLike(args?.THREE);
    const ops = args && isRecord(args.ops) ? args.ops : null;
    const rail = readSlidingRail(ops?.rail);
    const doors = Array.isArray(ops?.doors) ? ops.doors : null;

    if (!THREE || !rail || !doors) return false;
    const wardrobeGroup = readObject3D(__wardrobeGroup(App));
    if (!wardrobeGroup) return false;

    const cfg = readDoorConfig(args?.cfg);
    const handlesMap = isRecord(cfg?.handlesMap) ? cfg.handlesMap : null;
    const uiState = readSlidingUiState(args?.uiState ?? args?.ui);
    const getMaterial = readGetMaterial(args?.getMaterial);
    const getPartMaterial = readGetPartMaterial(args?.getPartMaterial);
    const getPartColorValue = readGetPartColorValue(args?.getPartColorValue);
    const createDoorVisual = readDoorVisualFactory(args?.createDoorVisual);
    const getHandleType = readGetHandleType(args?.getHandleType);
    const addOutlines = isFunction(args?.addOutlines) ? args.addOutlines : null;
    const doorStyle = args?.doorStyle;
    const globalFrontMat = args?.globalFrontMat;
    const removeDoorsEnabled = args?.removeDoorsEnabled === true;
    const isRemoveDoorMode = args?.isRemoveDoorMode === true;
    const isDoorRemoved = isFunction(args?.isDoorRemoved) ? args.isDoorRemoved : null;
    const wpStackArg = typeof args?.__wpStack === 'string' ? String(args.__wpStack) : undefined;

    const isGroovesEnabled = uiState.groovesEnabled === true;
    const groovesMap = cfg.groovesMap || Object.create(null);
    const palette = createSlidingTrackPalette(uiState);
    const railMat = createRailMaterial(THREE, palette, getMaterial, uiState);

    const topRailGroup = buildRailGroup(THREE, rail, railMat, palette);
    topRailGroup.position.set(0, rail.topY, rail.z);
    wardrobeGroup.add(topRailGroup);

    const bottomRailGroup = buildRailGroup(THREE, rail, railMat, palette);
    bottomRailGroup.position.set(0, rail.bottomY, rail.z);
    wardrobeGroup.add(bottomRailGroup);

    for (let i = 0; i < doors.length; i++) {
      const doorOp = readSlidingDoorOp(doors[i], i);
      if (!doorOp) continue;

      const slideID = doorOp.partId;
      const outerZ = rail.z - rail.depth / 2 - SLIDING_DOOR_CONSTRUCTION_POLICY.trackOuterOffsetM;
      const innerZ = outerZ - SLIDING_DOOR_CONSTRUCTION_POLICY.trackInnerLaneGapM;
      const zPos = i % 2 === 0 ? innerZ : outerZ;
      const slideMat = getPartMaterial ? getPartMaterial(slideID) : null;

      const group = new THREE.Group();
      group.position.set(doorOp.x, doorOp.y, zPos);

      group.userData = group.userData || {};
      group.userData.partId = slideID;
      group.userData.__doorWidth = doorOp.width;
      group.userData.__doorHeight = doorOp.height;
      group.userData.__doorType = 'sliding';
      group.userData.__doorPivotCentered = true;
      group.userData.__hingeLeft = false;
      group.userData.__doorMeshOffsetX = 0;
      group.userData.__wpStack = wpStackArg;
      const removed = !!(removeDoorsEnabled && isDoorRemoved && isDoorRemoved(slideID));
      group.userData.__wpDoorRemoved = removed;
      __reg(App, slideID, group, 'slidingDoor');

      if (removed) {
        if (isRemoveDoorMode) {
          const hitbox = new THREE.Mesh(
            new THREE.BoxGeometry(
              doorOp.width,
              doorOp.height,
              SLIDING_DOOR_CONSTRUCTION_POLICY.visualThicknessM
            ),
            new THREE.MeshBasicMaterial({
              color: 0xff0000,
              transparent: true,
              opacity: 0,
              side: THREE.DoubleSide,
            })
          );
          group.add(hitbox);
        }
        wardrobeGroup.add(group);

        const removedDoorsArray = __doors(App);
        if (Array.isArray(removedDoorsArray)) {
          removedDoorsArray.push({
            type: 'sliding',
            group,
            hingeSide: null,
            width: doorOp.width,
            index: doorOp.index,
            total: doorOp.total,
            isOuter: doorOp.isOuter,
            originalX: doorOp.x,
            originalZ: doorOp.z,
            outerZ,
            innerZ,
            stackZStep: SLIDING_DOOR_MOTION_POLICY.runtimeStackZStepMinM,
            minX: doorOp.minX,
            maxX: doorOp.maxX,
          });
          __markSplitHoverPickablesDirty(App);
        }
        continue;
      }

      const visualState = resolveSlidingDoorVisualState(cfg, slideID, getPartColorValue);
      const mirrorLayout = resolveMirrorLayout(cfg, slideID);
      const hasAdhesiveGlass = !!visualState.adhesiveGlassKind;
      const hasOutsideOverlaySurface =
        (visualState.isMirror || hasAdhesiveGlass) && hasMirrorSurfaceOnFace(mirrorLayout, 1, 1);
      const hasSlideGrooves =
        isGroovesEnabled &&
        !hasOutsideOverlaySurface &&
        !visualState.isGlass &&
        groovesMap[toCanonicalGroovesMapKey(slideID)] === true;
      const effectiveDoorStyleBase = resolveEffectiveDoorStyle(doorStyle, cfg.doorStyleMap, slideID);
      const effectiveDoorStyle = visualState.isGlass ? 'glass' : effectiveDoorStyleBase;

      let visual;
      if (createDoorVisual) {
        const slideWoodMat = slideMat || globalFrontMat;
        let slideMirrorMat = null;
        if (visualState.isMirror) {
          slideMirrorMat = getMirrorMaterial({
            App,
            THREE,
            materialSnapshot: { cfgSnapshot: cfg, sketchMode: args?.sketchMode === true },
          });
          if (!slideMirrorMat) slideMirrorMat = slideWoodMat;
        }
        const mirrorReflectorProfile = visualState.isMirror
          ? ({
              slidingLane: zPos === innerZ ? 'inner' : 'outer',
              slidingDoorIndex: doorOp.index,
              slidingDoorTotal: doorOp.total,
              slidingDoorWidthM: doorOp.width,
            } as const)
          : null;
        const doorVisualOptions = {
          grooveLayout: resolveGrooveLayout(cfg, slideID),
          ...(visualState.isGlass ? { glassFrameStyle: effectiveDoorStyleBase } : null),
          ...(visualState.adhesiveGlassKind ? { adhesiveGlassKind: visualState.adhesiveGlassKind } : null),
          ...(mirrorReflectorProfile ? { mirrorReflectorProfile } : null),
        };
        visual = createDoorVisual(
          doorOp.width,
          doorOp.height,
          SLIDING_DOOR_CONSTRUCTION_POLICY.visualThicknessM,
          visualState.isMirror ? slideMirrorMat : slideWoodMat,
          effectiveDoorStyle,
          hasSlideGrooves,
          visualState.isMirror,
          visualState.isGlass ? visualState.curtain : null,
          visualState.isMirror || visualState.adhesiveGlassKind ? slideWoodMat : globalFrontMat,
          1,
          false,
          mirrorLayout,
          slideID,
          Object.keys(doorVisualOptions).length ? doorVisualOptions : null
        );
      } else {
        visual = new THREE.Mesh(
          new THREE.BoxGeometry(
            doorOp.width,
            doorOp.height,
            SLIDING_DOOR_CONSTRUCTION_POLICY.visualThicknessM
          ),
          slideMat
        );
      }

      group.add(visual);
      appendDoorTrimVisuals({
        App,
        THREE,
        group,
        partId: slideID,
        trims: cfg.doorTrimMap ? cfg.doorTrimMap[slideID] : undefined,
        doorWidth: doorOp.width,
        doorHeight: doorOp.height,
        doorMeshOffsetX: 0,
        frontZ: SLIDING_DOOR_CONSTRUCTION_POLICY.trimFrontZM,
        faceSign: 1,
      });

      if (cfg.slidingDoorHandlesEnabled) {
        const handleType = resolveHandleType(getHandleType, slideID);
        const handlePalette = resolveHandleFinishPalette(resolveConfiguredHandleColor(handlesMap, slideID));
        const profileMat = new THREE.MeshStandardMaterial({
          color: handlePalette.hex,
          emissive: handlePalette.emissiveHex,
          emissiveIntensity: 0.08,
          roughness: handlePalette.roughness,
          metalness: handlePalette.metalness,
        });
        const profileZ = SLIDING_DOOR_HANDLE_RENDER_POLICY.handleProfileZOffsetM;
        if (handleType === 'standard') {
          const profileGeo = new THREE.BoxGeometry(
            SLIDING_DOOR_HANDLE_RENDER_POLICY.standardHandleProfileWidthM,
            doorOp.height,
            SLIDING_DOOR_HANDLE_RENDER_POLICY.standardHandleProfileDepthM
          );
          const leftProfile = new THREE.Mesh(profileGeo, profileMat);
          leftProfile.position.set(
            -doorOp.width / 2 + SLIDING_DOOR_HANDLE_RENDER_POLICY.standardHandleProfileInsetM,
            0,
            SLIDING_DOOR_HANDLE_RENDER_POLICY.standardHandleProfileFrontZM
          );
          if (addOutlines) addOutlines(leftProfile);
          group.add(leftProfile);

          const rightProfile = new THREE.Mesh(profileGeo, profileMat);
          rightProfile.position.set(
            doorOp.width / 2 - SLIDING_DOOR_HANDLE_RENDER_POLICY.standardHandleProfileInsetM,
            0,
            SLIDING_DOOR_HANDLE_RENDER_POLICY.standardHandleProfileFrontZM
          );
          if (addOutlines) addOutlines(rightProfile);
          group.add(rightProfile);
        } else if (handleType === 'edge') {
          const edgeGeo = new THREE.BoxGeometry(
            SLIDING_DOOR_HANDLE_RENDER_POLICY.edgeHandleWidthM,
            doorOp.height,
            SLIDING_DOOR_HANDLE_RENDER_POLICY.edgeHandleDepthM
          );
          const edgeMat = new THREE.MeshStandardMaterial({
            color: handlePalette.hex,
            emissive: handlePalette.emissiveHex,
            emissiveIntensity: 0.08,
            roughness: handlePalette.roughness,
            metalness: handlePalette.metalness,
          });
          const leftEdge = new THREE.Mesh(edgeGeo, edgeMat);
          leftEdge.position.set(
            -doorOp.width / 2 + SLIDING_DOOR_HANDLE_RENDER_POLICY.edgeHandleInsetM,
            0,
            profileZ
          );
          group.add(leftEdge);

          const rightEdge = new THREE.Mesh(edgeGeo, edgeMat);
          rightEdge.position.set(
            doorOp.width / 2 - SLIDING_DOOR_HANDLE_RENDER_POLICY.edgeHandleInsetM,
            0,
            profileZ
          );
          group.add(rightEdge);
        }
      }

      wardrobeGroup.add(group);

      let doorDepthSpan =
        SLIDING_DOOR_CONSTRUCTION_POLICY.visualThicknessM +
        SLIDING_DOOR_HANDLE_RENDER_POLICY.standardHandleProfileDepthM;
      const bounds = new THREE.Box3().setFromObject(group);
      const size = new THREE.Vector3();
      bounds.getSize(size);
      if (typeof size.z === 'number' && Number.isFinite(size.z) && size.z > 0) {
        doorDepthSpan = size.z;
      }
      const stackZStep = Math.max(
        SLIDING_DOOR_MOTION_POLICY.runtimeStackZStepMinM,
        doorDepthSpan + SLIDING_DOOR_MOTION_POLICY.runtimeStackZStepGapM
      );

      const doorsArray = __doors(App);
      if (Array.isArray(doorsArray)) {
        doorsArray.push({
          type: 'sliding',
          group,
          hingeSide: null,
          width: doorOp.width,
          index: doorOp.index,
          total: doorOp.total,
          isOuter: doorOp.isOuter,
          originalX: doorOp.x,
          originalZ: doorOp.z,
          outerZ,
          innerZ,
          stackZStep,
          minX: doorOp.minX,
          maxX: doorOp.maxX,
        });
        __markSplitHoverPickablesDirty(App);
      }
    }

    return true;
  };
}
