// Shelf front-edge material helpers
//
// THREE.BoxGeometry face material order is: +X, -X, +Y, -Y, +Z, -Z.
// Wardrobe shelf depth is rendered on the Z axis, so the user-visible front edge is +Z.

export type ShelfFrontEdgeMaterials = [unknown, unknown, unknown, unknown, unknown, unknown];

export function createShelfFrontEdgeMaterials(args: {
  shelfMaterial: unknown;
  frontEdgeMaterial: unknown;
}): ShelfFrontEdgeMaterials {
  const shelfMaterial = args.shelfMaterial;
  const frontEdgeMaterial = args.frontEdgeMaterial || shelfMaterial;
  return [shelfMaterial, shelfMaterial, shelfMaterial, shelfMaterial, frontEdgeMaterial, shelfMaterial];
}
