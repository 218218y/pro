// Typed store spine utilities (Root store slices)
//
// Goal:
// - Provide a *single source of truth* mapping between root slices and their
//   state/patch types.
// - Enable typed helpers in kernel/platform/runtime without repeating unions.
//
// Notes:
// - This file is type-only and safe to import broadly.
// - Keep it small and stable; expand only when a new root slice is added.
export {};
