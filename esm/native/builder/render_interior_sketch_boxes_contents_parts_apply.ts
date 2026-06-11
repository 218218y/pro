import type { RenderSketchBoxStaticContentsArgs } from './render_interior_sketch_boxes_contents_parts_types.js';

import { renderSketchBoxContentDividers } from './render_interior_sketch_boxes_contents_parts_dividers.js';
import { renderSketchBoxContentShelves } from './render_interior_sketch_boxes_contents_parts_shelves.js';
import { renderSketchBoxContentStorageBarriers } from './render_interior_sketch_boxes_contents_parts_barriers.js';
import { renderSketchBoxContentRods } from './render_interior_sketch_boxes_contents_parts_rods.js';

export function renderSketchBoxStaticContents(args: RenderSketchBoxStaticContentsArgs): void {
  renderSketchBoxContentDividers(args);
  renderSketchBoxContentShelves(args);
  renderSketchBoxContentStorageBarriers(args);
  renderSketchBoxContentRods(args);
}
