import { appendGrooveStrips } from './visuals_and_contents_door_visual_grooves.js';

import type { StyledDoorVisualArgs } from './visuals_and_contents_door_visual_style_contracts.js';

export function createFlatDoorVisual(args: StyledDoorVisualArgs) {
  const {
    App,
    THREE,
    visualGroup,
    addOutlines,
    tagDoorVisualPart,
    w,
    h,
    thickness,
    mat,
    hasGrooves,
    groovePartId,
    isSketch,
    zSign,
  } = args;

  const doorMesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, thickness), mat);
  tagDoorVisualPart(doorMesh, 'door_flat_center_panel');
  addOutlines(doorMesh);
  visualGroup.add(doorMesh);
  appendGrooveStrips({
    App,
    THREE,
    visualGroup,
    tagDoorVisualPart,
    hasGrooves,
    isSketch,
    groovePartId,
    zSign,
    targetW: w,
    targetH: h,
    zOffset: (thickness / 2) * zSign,
  });
  return visualGroup;
}
