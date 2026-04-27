# Layering completion audit

This file is intentionally compact. It keeps only current decomposition guard facts that tests assert and future refactors need. Historical stage-by-stage logs were removed.

## Current canonical decomposition facts

- `services/canvas_picking_interior_hover_layout_family.ts` is now a thin canonical seam over focused `canvas_picking_interior_hover_layout_mode.ts`, `canvas_picking_interior_hover_manual_mode.ts`, `canvas_picking_interior_hover_brace_mode.ts`, and `canvas_picking_interior_hover_layout_family_shared.ts` owners
- `canvas_picking_paint_flow.ts` is now a thin canonical seam over focused paint-target, paint-shared, paint-mirror, and paint-apply owners
- `services/canvas_picking_split_hover_helpers.ts` is now a thin canonical seam over focused split-hover bounds/base-key, preview-line policy, and raycast-root owners
- `canvas_picking_click_flow.ts` layout preset/manual-layout/brace-shelves flows now live in `services/canvas_picking_layout_edit_flow.ts`
- `services/canvas_picking_layout_edit_flow.ts` now stays a thin routing seam while manual-layout grid/toggle/sketch-tool policy lives in `services/canvas_picking_layout_edit_flow_manual.ts`, brace-shelf hit/validation/toggle policy lives in `services/canvas_picking_layout_edit_flow_brace.ts`, and shared grid/config record helpers live in `services/canvas_picking_layout_edit_flow_shared.ts`
- `canvas_picking_click_flow.ts` internal/external drawer + divider flows now live in `services/canvas_picking_drawer_mode_flow.ts`
- `canvas_picking_click_flow.ts` split/remove/hinge/groove door edit routing now lives in `services/canvas_picking_door_edit_flow.ts`, while focused trim/split/remove/hinge/groove policy lives in `services/canvas_picking_door_trim_click.ts`, `services/canvas_picking_door_split_click.ts`, `services/canvas_picking_door_remove_click.ts`, and `services/canvas_picking_door_hinge_groove_click.ts`
- `canvas_picking_click_flow.ts` paint flows now live in `services/canvas_picking_paint_flow.ts`
- `canvas_picking_click_flow.ts` handle-assign flows now live in `services/canvas_picking_handle_assign_flow.ts`
- `canvas_picking_click_flow.ts` none/screen-note door toggle flows now live in `services/canvas_picking_toggle_flow.ts`
- `canvas_picking_click_flow.ts` cell-dims click flows now live in `services/canvas_picking_cell_dims_flow.ts`
- `services/canvas_picking_click_flow.ts` is now a thin canonical seam over focused click-mode, module-ref, hit-resolution, and route owners
- `services/canvas_picking_cell_dims_corner.ts` now stays a thin seam while the canonical corner contracts/context/effects surface lives behind `services/canvas_picking_cell_dims_corner_shared.ts`, per-cell corner width/height/depth policy lives in `services/canvas_picking_cell_dims_corner_cell.ts`, and global wing/connector width policy lives in the focused `services/canvas_picking_cell_dims_corner_global_state.ts` + `services/canvas_picking_cell_dims_corner_global_apply.ts` owners behind `services/canvas_picking_cell_dims_corner_global.ts`
- `canvas_picking_hover_flow.ts` is now a thin canonical seam over focused hover-flow core/non-split/split owners
- `canvas_picking_hover_flow.ts` generic part paint hover now routes through `services/canvas_picking_generic_paint_hover.ts`
- `canvas_picking_hover_flow.ts` int-drawer + layout/manual/brace interior hover flows now live in `services/canvas_picking_interior_hover_flow.ts`
- `canvas_picking_manual_layout_sketch_tools.ts` now routes through dedicated click helpers for hover-backed actions, direct-hit toggles, and placement mode writes
- `canvas_picking_manual_layout_sketch_hover_tools.ts` now routes through a dedicated free-placement helper plus a thin canonical module-hover owner backed by focused context/divider/preview services.
- `canvas_picking_core.ts` sketch free-box entrypoints still route through `services/canvas_picking_sketch_free_boxes.ts`, while the workflow seam now fans out to `services/canvas_picking_sketch_free_box_shared.ts`, a thin `services/canvas_picking_sketch_free_box_geometry.ts` seam over focused box-size, vertical-bounds, overlap, and remove-zone owners, a thin `services/canvas_picking_sketch_free_box_placement.ts` seam over focused attach/overlap helpers, and `services/canvas_picking_sketch_free_box_hover.ts` so host selection stays separate from geometry, placement, attach scoring, and hover resolution policy.
- `canvas_picking_sketch_box_dividers.ts` is now a thin canonical seam over focused divider-state, segment, door, and shared tool helpers
- `render_ops.ts` sketch extras + carcass flows extracted into helper modules
- `render_ops.ts` dimensions + interior preset/custom/rod flows now live in helper modules
- `render_ops.ts` preview/hover helpers extracted into `builder/render_preview_ops.ts`

## Maintenance rule

When a guard string becomes stale, update the owning architecture guard and this compact audit together. Do not add a new closeout file.
