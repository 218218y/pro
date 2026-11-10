import type { RenderSketchBoxContentsArgs } from './render_interior_sketch_boxes_shared.js';

export function resolveSketchBoxContentPartMaterial(args: {
  getPartMaterial?: RenderSketchBoxContentsArgs['args']['getPartMaterial'];
  isFn: RenderSketchBoxContentsArgs['args']['isFn'];
  partId: string;
  defaultMaterial: unknown;
}): unknown {
  const { getPartMaterial, isFn, partId, defaultMaterial } = args;
  try {
    if (isFn(getPartMaterial)) {
      const resolved = getPartMaterial(partId);
      if (resolved) return resolved;
    }
  } catch {
    // builder-material-fallback: unresolved optional part material falls back to the canonical default material
  }
  return defaultMaterial;
}
