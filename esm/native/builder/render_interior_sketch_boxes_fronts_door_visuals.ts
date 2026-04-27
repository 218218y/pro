import { appendDoorTrimVisuals } from './door_trim_visuals.js';
import { resolveEffectiveDoorStyle } from '../features/door_style_overrides.js';
import { resolveSketchBoxDoorVisualState } from './render_interior_sketch_visuals.js';
import { appendClassicDoorAccentAndGrooves } from './render_interior_sketch_boxes_fronts_door_accents.js';

import type { InteriorGroupLike, InteriorValueRecord } from './render_interior_ops_contracts.js';
import type {
  RenderSketchBoxDoorFrontsArgs,
  ResolvedSketchBoxDoorLayout,
} from './render_interior_sketch_boxes_fronts_door_contracts.js';

import { asMesh, asValueRecord, isCallable, readObject } from './render_interior_sketch_shared.js';
import { applySketchBoxPickMeta, applySketchBoxPickMetaDeep } from './render_interior_sketch_pick_meta.js';

export function appendSketchBoxDoorVisuals(args: {
  renderArgs: RenderSketchBoxDoorFrontsArgs;
  doorGroup: InteriorGroupLike;
  layout: ResolvedSketchBoxDoorLayout;
}): void {
  const { renderArgs, doorGroup, layout } = args;
  const { frontsArgs, doorStyle, doorStyleMap, resolvePartMaterial } = renderArgs;
  const { App, input, moduleKeyStr, currentShelfMat, bodyMat, createDoorVisual, THREE, isFn, ops } =
    frontsArgs.args;
  if (!THREE) return;

  const { shell } = frontsArgs;
  const { boxId: bid, isFreePlacement } = shell;
  const { placement, doorId, doorPid, slabLocalX, doorW, doorH, doorD, sharedDoorUserData } = layout;
  const boxDoor = placement.door;
  const doorMat = resolvePartMaterial(doorPid, bodyMat);
  const doorVisualState = resolveSketchBoxDoorVisualState(input, doorPid);
  const addOutlines = input.addOutlines;
  const shouldUseSpecialDoorVisual = !!(
    createDoorVisual &&
    (doorVisualState.isMirror || doorVisualState.isGlass)
  );

  let doorFaceMat = doorMat;
  let doorBaseMat = doorMat;
  if (doorVisualState.isMirror) {
    const renderOps = ops || {};
    const rawGetMirrorMaterial = renderOps.getMirrorMaterial;
    const getMirrorMaterial =
      isCallable(renderOps.getMirrorMaterial) && isCallable(rawGetMirrorMaterial)
        ? (opts: unknown) => rawGetMirrorMaterial(opts)
        : null;
    try {
      const resolvedMirrorMat = getMirrorMaterial ? getMirrorMaterial({ App, THREE }) : null;
      if (resolvedMirrorMat) {
        doorFaceMat = resolvedMirrorMat;
        if (doorBaseMat === doorFaceMat) {
          doorBaseMat = bodyMat || currentShelfMat || doorMat;
        }
      }
    } catch {
      doorFaceMat = doorMat;
      doorBaseMat = bodyMat || currentShelfMat || doorMat;
    }
  }

  const effectiveDoorStyle = resolveEffectiveDoorStyle(doorStyle, doorStyleMap, doorPid);
  const canUseStyledDoorVisual = !!(
    createDoorVisual &&
    isFreePlacement === true &&
    (effectiveDoorStyle === 'profile' || effectiveDoorStyle === 'tom') &&
    !doorVisualState.isMirror &&
    !doorVisualState.isGlass
  );

  if (shouldUseSpecialDoorVisual && createDoorVisual) {
    const specialVisual = createDoorVisual(
      doorW,
      doorH,
      doorD,
      doorFaceMat,
      doorVisualState.isGlass ? 'glass' : 'flat',
      false,
      doorVisualState.isMirror,
      doorVisualState.curtainType,
      doorBaseMat,
      1,
      false,
      doorVisualState.mirrorLayout
    );
    const specialVisualObj = readObject<InteriorGroupLike>(specialVisual) || asMesh(specialVisual);
    if (specialVisualObj) {
      specialVisualObj.position?.set?.(slabLocalX, 0, 0);
      applySketchBoxPickMetaDeep(specialVisualObj, doorPid, moduleKeyStr, bid, sharedDoorUserData, {
        door: true,
      });
      doorGroup.add?.(specialVisualObj);
    }
  } else if (canUseStyledDoorVisual && createDoorVisual) {
    const styledVisual = createDoorVisual(
      doorW,
      doorH,
      doorD,
      doorMat,
      effectiveDoorStyle,
      boxDoor.groove === true,
      false,
      null,
      bodyMat || currentShelfMat || doorMat,
      1,
      false,
      null,
      doorPid
    );
    const styledVisualObj = readObject<InteriorGroupLike>(styledVisual) || asMesh(styledVisual);
    if (styledVisualObj) {
      styledVisualObj.position?.set?.(slabLocalX, 0, 0);
      applySketchBoxPickMetaDeep(styledVisualObj, doorPid, moduleKeyStr, bid, sharedDoorUserData, {
        door: true,
      });
      doorGroup.add?.(styledVisualObj);
    }
  } else {
    const doorSlab = new THREE.Mesh(new THREE.BoxGeometry(doorW, doorH, doorD), doorMat);
    doorSlab.position?.set?.(slabLocalX, 0, 0);
    applySketchBoxPickMeta(doorSlab, doorPid, moduleKeyStr, bid, { door: true });
    doorSlab.userData = {
      ...(readObject<InteriorValueRecord>(doorSlab.userData) || {}),
      ...sharedDoorUserData,
    };
    if (isFn(addOutlines)) addOutlines(doorSlab);
    doorGroup.add?.(doorSlab);
  }

  const doorTrimMap = asValueRecord(asValueRecord(input.cfg)?.doorTrimMap);
  appendDoorTrimVisuals({
    App,
    THREE,
    group: doorGroup,
    partId: doorPid,
    trims: doorTrimMap?.[doorPid],
    doorWidth: doorW,
    doorHeight: doorH,
    doorMeshOffsetX: slabLocalX,
    frontZ: doorD / 2 + 0.0015,
    faceSign: 1,
  });

  if (!doorVisualState.isMirror && !doorVisualState.isGlass && !canUseStyledDoorVisual) {
    appendClassicDoorAccentAndGrooves({
      App,
      THREE,
      doorGroup,
      doorPid,
      doorId,
      moduleKeyStr,
      bid,
      isFreePlacement,
      slabLocalX,
      doorW,
      doorH,
      doorD,
      boxDoor,
    });
  }
}
