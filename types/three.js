// three.js integration surface (runtime-provided)
//
// WardrobePro runs with a platform-provided THREE namespace (via app.deps.THREE).
// During the JS->TS migration we keep this type permissive, but we still expose
// real structural surfaces so CheckJS can validate common usage across builder /
// platform / services without falling back to loose signatures everywhere.
//
// If later you add `three` as an npm dependency and want full typings, this file
// is the single place to swap to: `export type ThreeLike = typeof import('three');`
export {};
