// Canvas picking paint click flow.
//
// Keep this file as the canonical paint-click entrypoint for click + hover
// callers while grouped targets, mirror placement, and apply/history policy
// live in focused paint-flow owners.
export type { CanvasPaintClickArgs } from './canvas_picking_paint_flow_contracts.js';
export { tryHandleCanvasPaintClick } from './canvas_picking_paint_flow_apply.js';
export { resolvePaintTargetKeys } from './canvas_picking_paint_targets.js';
