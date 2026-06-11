// Maps typing (high-value boundary)
//
// Goal:
// - Provide stable, explicit typing for the named App/maps/config "maps" surfaces.
// - Enable typed helpers (readMap/readMapOrEmpty) to return useful record shapes
//   without forcing a full rewrite of internal values.
//
// Notes:
// - Values are intentionally permissive (unknown unions) because legacy payloads can
//   still contain historical encodings. Canonical parsing/normalization lives in
//   runtime helpers (e.g. maps_access.ts + project_schema.ts).
export {};
