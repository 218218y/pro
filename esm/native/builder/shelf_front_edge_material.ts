// THREE.BoxGeometry face material order is: +X, -X, +Y, -Y, +Z, -Z.
// Wardrobe shelf depth is rendered on the Z axis, so the user-visible front edge is +Z.

export type ShelfExposedSide = 'left' | 'right' | 'both';
export type ShelfFrontEdgeMaterials = [unknown, unknown, unknown, unknown, unknown, unknown];

const POSITIVE_X_MATERIAL_INDEX = 0;
const NEGATIVE_X_MATERIAL_INDEX = 1;
const POSITIVE_Z_MATERIAL_INDEX = 4;

export function readShelfExposedSide(value: unknown): ShelfExposedSide | null {
  return value === 'left' || value === 'right' || value === 'both' ? value : null;
}

export function applyShelfExposedEdgeMaterials(material: unknown, exposedSideInput: unknown): unknown {
  const exposedSide = readShelfExposedSide(exposedSideInput);
  if (!exposedSide || !Array.isArray(material) || material.length < 6) return material;

  const frontEdgeMaterial = material[POSITIVE_Z_MATERIAL_INDEX];
  const next = material.slice();
  if (exposedSide === 'right' || exposedSide === 'both') {
    next[POSITIVE_X_MATERIAL_INDEX] = frontEdgeMaterial;
  }
  if (exposedSide === 'left' || exposedSide === 'both') {
    next[NEGATIVE_X_MATERIAL_INDEX] = frontEdgeMaterial;
  }
  return next;
}

export function createShelfFrontEdgeMaterials(args: {
  shelfMaterial: unknown;
  frontEdgeMaterial: unknown;
  exposedSide?: ShelfExposedSide | null;
}): ShelfFrontEdgeMaterials {
  const shelfMaterial = args.shelfMaterial;
  const frontEdgeMaterial = args.frontEdgeMaterial || shelfMaterial;
  const materials: ShelfFrontEdgeMaterials = [
    shelfMaterial,
    shelfMaterial,
    shelfMaterial,
    shelfMaterial,
    frontEdgeMaterial,
    shelfMaterial,
  ];
  return applyShelfExposedEdgeMaterials(materials, args.exposedSide) as ShelfFrontEdgeMaterials;
}
