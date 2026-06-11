import type { RenderSketchBoxFrontsArgs } from './render_interior_sketch_boxes_shared.js';

import {
  createSketchBoxPartMaterialResolver,
  resolveSketchDoorStyle,
  resolveSketchDoorStyleMap,
} from './render_interior_sketch_boxes_fronts_support.js';
import { renderSketchBoxDoorFronts } from './render_interior_sketch_boxes_fronts_doors.js';
import { renderSketchBoxExternalDrawers } from './render_interior_sketch_boxes_fronts_drawers.js';

export function renderSketchBoxFronts(args: RenderSketchBoxFrontsArgs): void {
  const { App, input, getPartMaterial, isFn } = args.args;

  const doorStyle = resolveSketchDoorStyle(App, input);
  const doorStyleMap = resolveSketchDoorStyleMap(App, input);
  const resolvePartMaterial = createSketchBoxPartMaterialResolver({
    getPartMaterial,
    isFn,
  });

  renderSketchBoxDoorFronts({
    frontsArgs: args,
    doorStyle,
    doorStyleMap,
    resolvePartMaterial,
  });
  renderSketchBoxExternalDrawers({
    frontsArgs: args,
    doorStyle,
    doorStyleMap,
    resolvePartMaterial,
  });
}
