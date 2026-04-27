// Root store state shapes (minimal, high-value typing)
//
// Goal:
// - Provide a stable, typed shape for the *root store* state (ui/config/runtime/mode/meta)
// - Keep it permissive with index signatures so migration remains incremental.
//
// NOTE: We reuse the existing "*StateLike" interfaces from build.ts to avoid duplication.
export {};
