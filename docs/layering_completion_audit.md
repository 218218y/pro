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
- `services/canvas_picking_modules_patch_meta.ts` owns the direct Canvas picking `modules.patchForStack` meta profiles: structural module edits are immediate build-visible writes, while motion/open-state toggles persist with no-build/no-history meta
- `kernel/state_api_stack_router.ts` exclusively owns stack-aware module/corner ensure and patch materialization; obsolete domain module/corner aliases and state-kernel stack/config routers are retired, with no reverse callback lookup or delegate markers
- `services/canvas_picking_config_patch_meta.ts` owns Canvas picking `__patchConfigForKey` structural patch meta so layout/manual/sketch/drawer config writes remain immediate build-visible writes without no-build/no-history flags
- `services/canvas_picking_door_authoring_meta.ts` owns Canvas picking door-authoring structural and refresh-gated meta so hinge/groove/split/trim/remove/removable-part writes stay source-normalized while explicit authoring refreshes avoid duplicate reactive builds
- `services/canvas_picking_handle_assign_meta.ts` owns Canvas picking handle-assignment structural meta so handle type, edge variant, color, manual-position, and clear-manual-position map writes stay immediate build-visible writes from one source-normalized contract
- `services/canvas_picking_drawer_mode_divider_meta.ts` owns Canvas picking drawer-divider structural meta so action and direct-map divider toggles stay immediate build-visible writes from one source-normalized contract
- `services/canvas_picking_paint_meta.ts` owns Canvas picking paint meta so structural paint writes stay immediate build-visible and color-only material refresh writes opt into no-build through one source-normalized contract
- `services/canvas_picking_cell_dims_meta.ts` owns Canvas picking cell-dims structural and refresh-gated meta so linear and corner dimension writes stay source-normalized while explicit commit refreshes avoid duplicate reactive builds
- `canvas_picking_click_flow.ts` paint flows now live in `services/canvas_picking_paint_flow.ts`
- `canvas_picking_click_flow.ts` handle-assign flows now live in `services/canvas_picking_handle_assign_flow.ts`
- `canvas_picking_click_flow.ts` none/screen-note door toggle flows now live in `services/canvas_picking_toggle_flow.ts`
- `builder/build_visible_config_gates.ts` owns build-visible UI gates for persisted door-authoring config maps so resolver snapshots and scheduler fingerprints agree when groove/split/remove/hinge toggles are off
- `builder/corner_config_readers.ts` owns corner-wing snapshot-backed config/map readers so wing, connector, carcass, door, drawer, and cornice corner flows require the build `cfgSnapshot` and never fall back to live builder/store config
- `builder/corner_materials.ts` requires the corner build `cfgSnapshot` for material/color policy and no longer reads live builder config as a missing-snapshot fallback
- `builder/visuals_chest_mode_config.ts` owns Chest Mode `cfgSnapshot` enforcement so `visuals_chest_mode_build.ts` and `visuals_chest_mode_materials.ts` consume the build snapshot instead of live `App.store`/map reads
- `builder/handles_config_snapshot.ts` owns required handle map snapshots so `handles_apply_shared.ts` and `handles_purge.ts` accept one explicit `cfgSnapshot` per handle pass, with no `cfg` alias, build-state lookup, or live-store fallback
- `builder/visuals_contents_shared.ts` resolves content visibility, hanger visibility, library mode, door style, sketch mode, and outline dispatch only from explicit build policies; preset, custom, sketch, drawer, module-loop, rod, no-main, and corner callers propagate the build snapshot and nullable outline callback without live `App` config/runtime/UI reads, compatibility overrides, silent catches, or fallback shape guessing
- `builder/post_build_visual_overlays.ts` validates one required post-build `cfgSnapshot` before any overlay work, and `builder/post_build_removed_parts.ts` reasserts it before render-tree lookup while reading `removedDoorsMap` only from that snapshot, so visual cleanup cannot fall back to live App config or silently skip validation
- `builder/material_color_lookup.ts` owns shared per-part color lookup for full builds and no-build material refreshes so split-door, corner-stack, shelf-group, and cornice paint policy stays aligned
- `builder/material_selection.ts` owns global and per-part front material selection for full builds, no-build material refreshes, Chest Mode, and corner materials so saved/custom texture data comes from canonical config snapshots and is passed explicitly into material creation
- `builder/material_selection.ts` and Design Tab saved-swatch selection resolve saved colors by canonical `savedColors` membership rather than the legacy `saved_` id prefix, so imported saved texture/color IDs stay build-visible and UI-actionable
- `builder/materials_factory_texture_policy.ts` owns front texture source resolution so front textures come only from explicit/config data URLs and never from a stale live texture cache
- The old `texturesCache.customUploadedTexture` service surface is retired; uploaded front textures move through canonical config/data URLs and the builder material runtime no longer installs or reads a live texture slot
- `builder/materials_apply_color_policy.ts` consumes canonical `Store.config.individualColors` for no-build material refreshes and no longer lets legacy `App.maps.individualColors` override live material/color state
- `builder/render_interior_sketch_input_contract.ts` owns the canonical `applyInteriorSketchExtras` input contract: render paths require `cfgSnapshot`, explicit door-style/feature flags, and top-level `sketchExtras`, with no live App config/UI reads or `cfg`/`config` aliases
- `canvas_picking_click_flow.ts` cell-dims click flows now live in `services/canvas_picking_cell_dims_flow.ts`
- `services/canvas_picking_click_flow.ts` is now a thin canonical seam over focused click-mode, module-ref, hit-resolution, and route owners
- `services/canvas_picking_cell_dims_corner.ts` now stays a thin seam while the canonical corner contracts/context/effects surface lives behind `services/canvas_picking_cell_dims_corner_shared.ts`, per-cell corner width/height/depth policy lives in `services/canvas_picking_cell_dims_corner_cell.ts`, and global wing/connector width policy lives in the focused `services/canvas_picking_cell_dims_corner_global_state.ts` + `services/canvas_picking_cell_dims_corner_global_apply.ts` owners behind `services/canvas_picking_cell_dims_corner_global.ts`
- `services/canvas_picking_structural_refresh.ts` owns the Canvas picking structural refresh profiles used by cell-dims commits and door-authoring burst/immediate rebuild requests
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
- `services/models.ts` is now a small public service facade while stable surface installation, live App context refresh, and method-slot healing live in `services/models_surface_install.ts`
- `ui/react/tabs/structure_tab_meta.ts` owns Structure Tab structural write, no-build/no-history, and ui-only meta profiles used by recompute-backed structure, stack-split, corner/chest, workflow, and sketch no-main commits
- `ui/react/actions/structural_build_refresh_actions.ts` owns React UI immediate structural patch meta and canonical patch/direct-fallback routing for build-visible Structure controls/base/sliding/hinge-direction gate/hinge-map restore, Design, Sketch runtime, Interior drawer, and Handles writes

## Maintenance rule

When a guard string becomes stale, update the owning architecture guard and this compact audit together. Do not add a new closeout file.
