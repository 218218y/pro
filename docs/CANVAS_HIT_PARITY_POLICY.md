# Canvas hit identity parity policy

Canvas picking must keep hover and commit identity on the same canonical axis. A hover path may discover richer face metadata than an old click path used to carry, but commit must not throw that metadata away.

## Rules

- Hover and click hit records use `CanvasPickingHitIdentity`.
- Click finalization must forward the strongest available object metadata into `createCanvasPickingClickHitIdentity`.
- Surface-child metadata, such as `surfaceId`, `faceSide`, and `faceSign`, is merged with the resolved parent `partId` metadata.
- Click code must not re-infer door side from only the door id when the hit object already exposes face metadata.
- `hitIdentity.source` may differ between hover and click; identity equivalence intentionally ignores the source field.

## Guard

`npm run check:canvas-hit-parity` verifies that click hit finalization preserves hit object metadata and that runtime tests cover both direct door-face metadata and child-surface plus parent-door metadata.
