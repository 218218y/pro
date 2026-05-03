import type {
  InteriorGroupLike,
  InteriorTHREESurface,
  InteriorValueRecord,
} from './render_interior_ops_contracts.js';
import type {
  RenderSketchBoxDoorFrontsArgs,
  ResolvedSketchBoxDoorLayout,
} from './render_interior_sketch_boxes_fronts_door_contracts.js';
import type { ResolvedSketchBoxDoorVisualMaterials } from './render_interior_sketch_boxes_fronts_door_visual_materials.js';
import type { ResolvedSketchBoxDoorVisualRoute } from './render_interior_sketch_boxes_fronts_door_visual_routes.js';

import { asMesh, readObject } from './render_interior_sketch_shared.js';
import { applySketchBoxPickMeta, applySketchBoxPickMetaDeep } from './render_interior_sketch_pick_meta.js';

export function appendSketchBoxDoorCoreVisual(args: {
  renderArgs: RenderSketchBoxDoorFrontsArgs;
  doorGroup: InteriorGroupLike;
  layout: ResolvedSketchBoxDoorLayout;
  materials: ResolvedSketchBoxDoorVisualMaterials;
  visualRoute: ResolvedSketchBoxDoorVisualRoute;
  THREE: InteriorTHREESurface;
  addOutlines: unknown;
  doorVisualState: {
    isMirror: boolean;
    isGlass: boolean;
    curtainType: string | null;
    mirrorLayout: unknown;
  };
}): void {
  const { renderArgs, doorGroup, layout, materials, visualRoute, THREE, addOutlines, doorVisualState } = args;
  const { frontsArgs } = renderArgs;
  const { moduleKeyStr, bodyMat, currentShelfMat, isFn } = frontsArgs.args;
  const { shell } = frontsArgs;
  const { boxId: bid } = shell;
  const { placement, doorPid, slabLocalX, doorW, doorH, doorD, sharedDoorUserData } = layout;
  const boxDoor = placement.door;

  if (visualRoute.route === 'special' && visualRoute.createDoorVisual) {
    const specialVisual = visualRoute.createDoorVisual(
      doorW,
      doorH,
      doorD,
      materials.doorFaceMat,
      doorVisualState.isGlass ? 'glass' : 'flat',
      false,
      doorVisualState.isMirror,
      doorVisualState.curtainType,
      materials.doorBaseMat,
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
    return;
  }

  if (visualRoute.route === 'styled' && visualRoute.createDoorVisual) {
    const styledVisual = visualRoute.createDoorVisual(
      doorW,
      doorH,
      doorD,
      materials.doorMat,
      visualRoute.effectiveDoorStyle,
      boxDoor.groove === true,
      false,
      null,
      bodyMat || currentShelfMat || materials.doorMat,
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
    return;
  }

  const doorSlab = new THREE.Mesh(new THREE.BoxGeometry(doorW, doorH, doorD), materials.doorMat);
  doorSlab.position?.set?.(slabLocalX, 0, 0);
  applySketchBoxPickMeta(doorSlab, doorPid, moduleKeyStr, bid, { door: true });
  doorSlab.userData = {
    ...(readObject<InteriorValueRecord>(doorSlab.userData) || {}),
    ...sharedDoorUserData,
  };
  if (isFn(addOutlines)) addOutlines(doorSlab);
  doorGroup.add?.(doorSlab);
}
