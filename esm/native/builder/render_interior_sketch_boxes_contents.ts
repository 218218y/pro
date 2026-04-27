import type { RenderSketchBoxContentsArgs } from './render_interior_sketch_boxes_shared.js';

import { renderSketchBoxDrawerContents } from './render_interior_sketch_boxes_contents_drawers.js';
import { renderSketchBoxStaticContents } from './render_interior_sketch_boxes_contents_parts.js';

export function renderSketchBoxContents(args: RenderSketchBoxContentsArgs): void {
  renderSketchBoxStaticContents(args);
  renderSketchBoxDrawerContents(args);
}
