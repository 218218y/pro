// Canvas picking engine (pure)
//
// This module contains the low-level raycast/picking primitives:
// - NDC -> ray setup
// - intersectObjects call
//
// It intentionally has **no App** dependency, so it can be reused
// in tests, workers, or other adapters.

export type MouseVectorLike = { x: number; y: number };

export type HitObjectLike = Record<string, unknown> & {
  type?: string;
  userData?: Record<string, unknown>;
  material?: Record<string, unknown>;
  parent?: HitObjectLike | null;
};

export type RaycastHitLike = {
  object: HitObjectLike;
  point?: { x?: number; y?: number; z?: number } | null;
};

export type RaycasterLike = {
  setFromCamera: (mouse: MouseVectorLike, camera: unknown) => void;
  intersectObjects: (
    objects: unknown,
    recursive?: boolean,
    optionalTarget?: RaycastHitLike[]
  ) => RaycastHitLike[];
};

export function raycastAtNdc(args: {
  raycaster: RaycasterLike;
  mouse: MouseVectorLike;
  camera: unknown;
  ndcX: number;
  ndcY: number;
  objects: unknown;
  recursive?: boolean;
  scratch?: RaycastHitLike[] | null;
}): RaycastHitLike[] {
  const { raycaster, mouse, camera, ndcX, ndcY, objects, recursive = true, scratch = null } = args;

  // Defensive: keep engine side-effect surface minimal.
  // We only mutate the provided `mouse` object (expected by THREE.Raycaster).
  mouse.x = ndcX;
  mouse.y = ndcY;

  // THREE-specific operations.
  raycaster.setFromCamera(mouse, camera);

  try {
    const out = raycaster.intersectObjects(objects, recursive, scratch || undefined);
    return Array.isArray(out) ? out : scratch || [];
  } catch {
    return scratch || [];
  }
}
