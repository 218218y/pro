import {
  indexSketchBoxDoorPlacementsBySegment,
  readSketchBoxDoorPlacements,
} from './render_interior_sketch_boxes_fronts_support.js';

import type { RenderSketchBoxDoorFrontsArgs } from './render_interior_sketch_boxes_fronts_door_contracts.js';

import { consumeSketchBoxDoorMotionSeed } from './render_interior_sketch_pick_meta.js';
import { resolveSketchBoxDoorLayout } from './render_interior_sketch_boxes_fronts_door_layout.js';
import { appendSketchBoxDoorVisuals } from './render_interior_sketch_boxes_fronts_door_visuals.js';

export function renderSketchBoxDoorFronts(args: RenderSketchBoxDoorFrontsArgs): void {
  const { frontsArgs } = args;
  const { shell, boxDividers } = frontsArgs;
  const { App, group, woodThick, moduleKeyStr, THREE, doorsArray, markSplitHoverPickablesDirty } =
    frontsArgs.args;
  const { box, boxId: bid, centerY: cy, geometry: boxGeo } = shell;

  const boxDoorPlacements = readSketchBoxDoorPlacements({
    box,
    dividers: boxDividers,
    boxCenterX: boxGeo.centerX,
    innerW: boxGeo.innerW,
    woodThick,
  });
  if (!(boxDoorPlacements.length && THREE)) return;

  const boxDoorPlacementsBySegment = indexSketchBoxDoorPlacementsBySegment(boxDoorPlacements);

  for (let doorIndex = 0; doorIndex < boxDoorPlacements.length; doorIndex++) {
    const placement = boxDoorPlacements[doorIndex] || null;
    if (!placement) continue;

    const layout = resolveSketchBoxDoorLayout({
      renderArgs: args,
      placement,
      placementsBySegment: boxDoorPlacementsBySegment,
    });
    if (!layout) continue;

    const doorGroup = new THREE.Group();
    doorGroup.position?.set?.(layout.pivotX, cy, layout.doorZ);
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
        // ignore
      }
    }
  }
}
