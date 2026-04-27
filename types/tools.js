// Tools surface types (cross-layer helper bag)
//
// Rationale:
// - Many services and UI modules access "tools" via getTools(App).
// - Historically this was an untyped helper bag, which led to widespread unchecked casts.
// - This interface captures the *real* methods used across the ESM layer, while remaining
//   permissive for gradual migration.
export {};
