import type { ResolveSketchBoxMaterialArgs } from './render_interior_sketch_boxes_shell_types.js';

export function resolveSketchBoxShellMaterial(args: ResolveSketchBoxMaterialArgs): unknown {
  const { getPartMaterial, isFn, boxPid, fallback } = args;
  let boxMat = fallback;
  try {
    if (isFn(getPartMaterial)) {
      const resolved = getPartMaterial(boxPid);
      if (resolved) boxMat = resolved;
    }
  } catch {
    // ignore material resolver failures and keep the body material default
  }
  return boxMat;
}
