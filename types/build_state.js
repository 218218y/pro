// Builder/services shared types.
// Split from ./build.ts into domain-focused seams to keep the public type surface stable while reducing monolith churn.
export {};
// --- Builder render-op data shapes (ops) -----------------------------------
//
// These types describe the deterministic "ops" objects produced by the pure layer
// (core_pure) and consumed by the render ops layer (render_ops).
// Keep them permissive (UnknownRecord intersections) while still documenting the
// real, useful fields. This avoids "silencing" issues while enabling
// meaningful intellisense and checkJs validation.
