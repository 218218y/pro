import { appendDoorTrimVisuals } from './door_trim_visuals.js';
import { resolveSketchBoxDoorVisualState } from './render_interior_sketch_visuals.js';
import { appendClassicDoorAccentAndGrooves } from './render_interior_sketch_boxes_fronts_door_accents.js';
import { resolveSketchBoxDoorVisualMaterials } from './render_interior_sketch_boxes_fronts_door_visual_materials.js';
import { resolveSketchBoxDoorVisualRoute } from './render_interior_sketch_boxes_fronts_door_visual_routes.js';
import { appendSketchBoxDoorCoreVisual } from './render_interior_sketch_boxes_fronts_door_visual_core.js';

import type { InteriorGroupLike } from './render_interior_ops_contracts.js';
import type {
  RenderSketchBoxDoorFrontsArgs,
  ResolvedSketchBoxDoorLayout,
} from './render_interior_sketch_boxes_fronts_door_contracts.js';

import { asValueRecord } from './render_interior_sketch_shared.js';

export function appendSketchBoxDoorVisuals(args: {
  renderArgs: RenderSketchBoxDoorFrontsArgs;
  doorGroup: InteriorGroupLike;
  layout: ResolvedSketchBoxDoorLayout;
}): void {
  const { renderArgs, doorGroup, layout } = args;
  const { frontsArgs } = renderArgs;
  const { App, input, moduleKeyStr, THREE } = frontsArgs.args;
  if (!THREE) return;

  const { shell } = frontsArgs;
  const { boxId: bid, isFreePlacement } = shell;
  const { placement, doorId, doorPid, slabLocalX, doorW, doorH, doorD } = layout;
  const boxDoor = placement.door;
  const doorVisualState = resolveSketchBoxDoorVisualState(input, doorPid);
  const materials = resolveSketchBoxDoorVisualMaterials({
    renderArgs,
    doorPid,
    doorVisualState,
  });
  const visualRoute = resolveSketchBoxDoorVisualRoute({
    renderArgs,
    layout,
    doorVisualState,
  });

  appendSketchBoxDoorCoreVisual({
    renderArgs,
    doorGroup,
    layout,
    materials,
    visualRoute,
    THREE,
    addOutlines: input.addOutlines,
    doorVisualState,
  });

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

  if (visualRoute.shouldUseClassicAccents) {
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
