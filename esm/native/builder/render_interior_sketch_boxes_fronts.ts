import type { RenderSketchBoxFrontsArgs } from './render_interior_sketch_boxes_shared.js';

import { createSketchBoxPartMaterialResolver } from './render_interior_sketch_boxes_fronts_support.js';
import {
  resolveSketchDoorStyle,
  resolveSketchDoorStyleMap,
} from './render_interior_sketch_input_contract.js';
import { renderSketchBoxDoorFronts } from './render_interior_sketch_boxes_fronts_doors.js';
import { renderSketchBoxExternalDrawers } from './render_interior_sketch_boxes_fronts_drawers.js';

export function renderSketchBoxFronts(args: RenderSketchBoxFrontsArgs): void {
  const { input, getPartMaterial, isFn } = args.args;

  const doorStyle = resolveSketchDoorStyle(input);
  const doorStyleMap = resolveSketchDoorStyleMap(input);
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
