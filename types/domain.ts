// Domain value enums/types shared across UI/services/kernel.
//
// Goal: tighten the *meaningful* hot-path values without forcing a full rewrite.
// These types are intentionally small and should only include values that are
// relied on across layers.

/** Wardrobe door system type (hinged vs sliding). */
export type WardrobeType = 'hinged' | 'sliding';

/** Door hinge direction used by hinged-door flows. */
export type HingeDir = 'left' | 'right';

/** Known global handle types used by the React UI (can be extended later). */
export type HandleType = 'standard' | 'edge' | 'none';

/** Board material selection used by React Structure tab. */
export type BoardMaterial = 'sandwich' | 'melamine';
