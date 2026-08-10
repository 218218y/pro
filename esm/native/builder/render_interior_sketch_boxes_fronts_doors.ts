import {
  indexSketchBoxDoorPlacementsBySegment,
  readSketchBoxDoorPlacements,
} from './render_interior_sketch_boxes_fronts_support.js';

import type { RenderSketchBoxDoorFrontsArgs } from './render_interior_sketch_boxes_fronts_door_contracts.js';

import { consumeSketchBoxDoorMotionSeed } from './render_interior_sketch_pick_meta.js';
import { resolveSketchBoxDoorLayout } from './render_interior_sketch_boxes_fronts_door_layout.js';
import { appendSketchBoxDoorVisuals } from './render_interior_sketch_boxes_fronts_door_visuals.js';
import { resolveSketchFreeBoxSharedHandleAbsY } from './render_interior_sketch_boxes_fronts_door_handle_policy.js';
import { HINGED_DOOR_HARDWARE_RENDER_POLICY } from '../../shared/dimensions/door_system_policy.js';
import type { Object3DLike, ThreeLike } from '../../../types';
import {
  attachHingedDoorHardware,
  createHingedDoorHardwareRenderState,
  type HingedDoorHardwareRenderState,
} from './render_hinged_door_hardware.js';

export function renderSketchBoxDoorFronts(args: RenderSketchBoxDoorFrontsArgs): void {
  const { frontsArgs } = args;
  const { shell, boxDividers, boxHorizontalDividers } = frontsArgs;
  const { App, group, woodThick, moduleKeyStr, THREE, doorsArray, markSplitHoverPickablesDirty } =
    frontsArgs.args;
  const { box, boxId: bid, geometry: boxGeo } = shell;

  const boxDoorPlacements = readSketchBoxDoorPlacements({
    box,
    dividers: boxDividers,
    boxCenterX: boxGeo.centerX,
    innerW: boxGeo.innerW,
    horizontalDividers: boxHorizontalDividers,
    boxCenterY: shell.centerY,
    innerH: shell.sideH,
    woodThick,
  });
  if (!(boxDoorPlacements.length && THREE)) return;

  const boxDoorPlacementsBySegment = indexSketchBoxDoorPlacementsBySegment(boxDoorPlacements);
  const sharedHandleAbsY = resolveSketchFreeBoxSharedHandleAbsY(args);
  const hingeHardwareByThickness = new Map<number, HingedDoorHardwareRenderState | null>();
  const readHingeHardwareState = (doorThicknessM: number): HingedDoorHardwareRenderState | null => {
    const cached = hingeHardwareByThickness.get(doorThicknessM);
    if (cached !== undefined) return cached;
    const state = createHingedDoorHardwareRenderState(
      THREE as unknown as ThreeLike,
      HINGED_DOOR_HARDWARE_RENDER_POLICY,
      doorThicknessM
    );
    hingeHardwareByThickness.set(doorThicknessM, state);
    return state;
  };

  for (let doorIndex = 0; doorIndex < boxDoorPlacements.length; doorIndex++) {
    const placement = boxDoorPlacements[doorIndex] || null;
    if (!placement) continue;

    const layout = resolveSketchBoxDoorLayout({
      renderArgs: args,
      placement,
      placementsBySegment: boxDoorPlacementsBySegment,
      sharedHandleAbsY,
    });
    if (!layout) continue;

    const doorGroup = new THREE.Group();
    doorGroup.position?.set?.(layout.pivotX, layout.doorCenterY, layout.doorZ);
    const motionSeed = consumeSketchBoxDoorMotionSeed(App, moduleKeyStr, bid, layout.doorId);
    if (motionSeed && doorGroup.rotation && Number.isFinite(motionSeed.rotationY)) {
      doorGroup.rotation.y = motionSeed.rotationY;
    }
    doorGroup.userData = layout.groupUserData;
    group.add?.(doorGroup);

    appendSketchBoxDoorVisuals({
      renderArgs: args,
      doorGroup,
      layout,
    });

    attachHingedDoorHardware({
      THREE: THREE as unknown as ThreeLike,
      wardrobeGroup: group as unknown as Object3DLike,
      doorGroup: doorGroup as unknown as Object3DLike,
      doorOp: {
        x: 0,
        y: layout.doorCenterY,
        z: layout.doorZ,
        width: layout.doorW,
        height: layout.doorH,
        partId: layout.doorPid,
        isLeftHinge: layout.hingeLeft,
        isRemoved: false,
        isMirror: false,
        hasGroove: false,
        pivotX: layout.pivotX,
        carcassMountFaceX: layout.carcassMountFaceX,
      },
      state: readHingeHardwareState(layout.doorD),
    });

    if (Array.isArray(doorsArray)) {
      doorsArray.push({
        group: doorGroup,
        hingeSide: layout.hingeSide,
        type: 'hinged',
        isOpen: layout.doorOpen,
        noGlobalOpen: true,
      });
      try {
        markSplitHoverPickablesDirty?.(App);
      } catch {
        // builder-pickable-cache-fallback: optional hover-pickable invalidation must not block door geometry output
      }
    }
  }
}
