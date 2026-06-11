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
    // ignore
  }
  return defaultMaterial;
}

export function resolveSketchBoxShelfMaterial(args: {
  getPartMaterial?: RenderSketchBoxContentsArgs['args']['getPartMaterial'];
  getPartColorValue?: RenderSketchBoxContentsArgs['args']['getPartColorValue'];
  isFn: RenderSketchBoxContentsArgs['args']['isFn'];
  partId: string;
  isGlass: boolean;
  glassMat: RenderSketchBoxContentsArgs['args']['glassMat'];
  currentShelfMat: unknown;
}): unknown {
  const { getPartMaterial, getPartColorValue, isFn, partId, isGlass, glassMat, currentShelfMat } = args;
  let shelfMat = isGlass && glassMat ? glassMat : currentShelfMat;
  try {
    const partColorValue = isFn(getPartColorValue) ? getPartColorValue(partId) : null;
    if (!isGlass && partColorValue && isFn(getPartMaterial)) {
      const resolved = getPartMaterial(partId);
      if (resolved) shelfMat = resolved;
    }
  } catch {
    // ignore
  }
  return shelfMat;
}
