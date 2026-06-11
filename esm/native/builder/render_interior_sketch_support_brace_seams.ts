import type {
  InteriorGroupLike,
  InteriorMaterialLike,
  InteriorTHREESurface,
  InteriorValueRecord,
} from './render_interior_ops_contracts.js';
import type { SketchModuleInnerFaces } from './render_interior_sketch_module_geometry.js';
import type { SketchPlacementSupport } from './render_interior_sketch_support_contracts.js';

const BRACE_SIDE_GAP = 0.001;
const BRACE_SEAM_PAD = 0.0001;

export function createBraceDarkSeamAdder(args: {
  group: InteriorGroupLike;
  faces: SketchModuleInnerFaces | null;
  internalCenterX: number;
  innerW: number;
  woodThick: number;
  asObject: <T extends object = InteriorValueRecord>(value: unknown) => T | null;
}): SketchPlacementSupport['addBraceDarkSeams'] {
  const { group, faces, internalCenterX, innerW, woodThick, asObject } = args;
  const BRACE_SEAM_W = Math.max(0, BRACE_SIDE_GAP - 2 * BRACE_SEAM_PAD);
  let braceSeamMat: InteriorMaterialLike | null = null;
  const braceSeamGeoCache: Record<string, unknown> = Object.create(null);

  const ensureBraceSeamResources = (depth: number, threeSurface: InteriorTHREESurface | null) => {
    if (!threeSurface) return null;
    const T = asObject<InteriorTHREESurface>(threeSurface);
    if (!T) return null;
    if (!(BRACE_SEAM_W > 0) || !(depth > 0)) return null;
    if (!braceSeamMat) {
      const seamMat = new T.MeshBasicMaterial({ color: 0x111111 });
      seamMat.__keepMaterial = true;
      braceSeamMat = seamMat;
    }
    const key = String(Math.round(depth * 1000));
    if (!braceSeamGeoCache[key]) {
      braceSeamGeoCache[key] = new T.BoxGeometry(BRACE_SEAM_W, woodThick, Math.max(0.0001, depth - 0.0005));
    }
    return { geo: braceSeamGeoCache[key], mat: braceSeamMat };
  };

  return (shelfY, shelfZ, shelfDepth, isBrace, threeSurface, leftFaceXOverride, rightFaceXOverride) => {
    if (!isBrace) return;
    const res = ensureBraceSeamResources(shelfDepth, threeSurface);
    if (!res) return;
    const leftFaceOverride =
      leftFaceXOverride == null
        ? null
        : Number.isFinite(Number(leftFaceXOverride))
          ? Number(leftFaceXOverride)
          : null;
    const leftFaceX =
      leftFaceOverride != null ? leftFaceOverride : faces ? faces.leftX : internalCenterX - innerW / 2;
    const rightFaceOverride =
      rightFaceXOverride == null
        ? null
        : Number.isFinite(Number(rightFaceXOverride))
          ? Number(rightFaceXOverride)
          : null;
    const rightFaceX =
      rightFaceOverride != null ? rightFaceOverride : faces ? faces.rightX : internalCenterX + innerW / 2;
    if (!Number.isFinite(leftFaceX) || !Number.isFinite(rightFaceX) || !(rightFaceX > leftFaceX)) return;
    const T = asObject<InteriorTHREESurface>(threeSurface);
    if (!T) return;
    const mk = (x: number) => {
      const mesh = new T.Mesh(res.geo, res.mat);
      mesh.position?.set?.(x, shelfY, shelfZ);
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      mesh.userData = mesh.userData || {};
      mesh.userData.partId = 'all_shelves';
      mesh.userData.__kind = 'brace_seam';
      group.add?.(mesh);
    };
    mk(leftFaceX + BRACE_SEAM_PAD + BRACE_SEAM_W / 2);
    mk(rightFaceX - BRACE_SEAM_PAD - BRACE_SEAM_W / 2);
  };
}
