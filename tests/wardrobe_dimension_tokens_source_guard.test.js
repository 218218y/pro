import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = rel => fs.readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

const productDimensionTokenSources = [
  'esm/shared/wardrobe_dimension_tokens_shared.ts',
  'esm/shared/dimensions/door_system_policy.ts',
  'esm/shared/dimensions/door_mount_thickness_policy.ts',
  'esm/shared/dimensions/door_visual_policy.ts',
  'esm/shared/dimensions/door_trim_policy.ts',
  'esm/shared/dimensions/external_drawer_policy.ts',
  'esm/shared/dimensions/internal_drawer_policy.ts',
  'esm/shared/dimensions/interior_fittings_policy.ts',
  'esm/shared/dimensions/interior_storage_policy.ts',
  'esm/shared/dimensions/drawer_sketch_policy.ts',
  'esm/shared/dimensions/front_reveal_frame_policy.ts',
  'esm/shared/dimensions/handle_policy.ts',
  'esm/shared/dimensions/content_visual_policy.ts',
  'esm/shared/dimensions/sketch_box_classic_door_visual_policy.ts',
];

function readProductDimensionTokens() {
  return productDimensionTokenSources.map(read).join('\n');
}

function assertUsesToken(rel, tokenName) {
  const src = read(rel);
  assert.match(src, new RegExp(`\\b${tokenName}\\b`), `${rel} should read ${tokenName}`);
}

function assertLinearDimensionsUseOwnersOrMeters(rel) {
  assert.doesNotMatch(
    read(rel),
    /^\s*[A-Za-z_$][\w$]*(?:M|YM|ZM):\s*-?(?:\d|\.\d)/mu,
    `${rel} must construct linear dimensions with meters(...) or reference a canonical owner`
  );
}

test('[dimension tokens] visual content product dimensions are centralized', () => {
  const tokens = readProductDimensionTokens();
  assert.match(tokens, /export const CONTENT_VISUAL_DIMENSIONS[^=]*= Object\.freeze\(\{/);
  assert.match(tokens, /export const BOOK_CONTENT_VISUAL_POLICY = Object\.freeze\(\{/);
  assert.match(tokens, /export const FOLDED_CLOTHES_VISUAL_POLICY = Object\.freeze\(\{/);
  assert.match(tokens, /export const HANGER_VISUAL_POLICY = Object\.freeze\(\{/);
  assert.match(tokens, /export const HANGING_CLOTHES_VISUAL_POLICY = Object\.freeze\(\{/);
  assert.match(tokens, /export const SKETCH_BOX_CLASSIC_DOOR_VISUAL_POLICY = Object\.freeze\(\{/);

  for (const rel of [
    'esm/shared/dimensions/content_visual_policy.ts',
    'esm/shared/dimensions/sketch_box_classic_door_visual_policy.ts',
  ]) {
    assertLinearDimensionsUseOwnersOrMeters(rel);
  }

  assertUsesToken('esm/native/builder/visuals_contents_folded.ts', 'BOOK_CONTENT_VISUAL_POLICY');
  assertUsesToken('esm/native/builder/visuals_contents_folded.ts', 'FOLDED_CLOTHES_VISUAL_POLICY');
  assertUsesToken('esm/native/builder/visuals_contents_hanger.ts', 'HANGER_VISUAL_POLICY');
  assertUsesToken('esm/native/builder/visuals_contents_hanging.ts', 'HANGING_CLOTHES_VISUAL_POLICY');
  assertUsesToken(
    'esm/native/builder/render_interior_sketch_boxes_fronts_door_accents.ts',
    'SKETCH_BOX_CLASSIC_DOOR_VISUAL_POLICY'
  );

  for (const rel of [
    'esm/native/builder/visuals_contents_folded.ts',
    'esm/native/builder/visuals_contents_hanger.ts',
    'esm/native/builder/visuals_contents_hanging.ts',
    'esm/native/builder/render_interior_sketch_boxes_fronts_door_accents.ts',
  ]) {
    assert.doesNotMatch(read(rel), /CONTENT_VISUAL_DIMENSIONS/);
  }
});

test('[dimension tokens] sketch box geometry and preview dimensions are centralized', () => {
  const tokens = readProductDimensionTokens();
  assert.match(tokens, /export const SKETCH_BOX_DIMENSIONS = Object\.freeze\(\{/);

  for (const rel of [
    'esm/native/services/canvas_picking_sketch_free_box_geometry_box.ts',
    'esm/native/services/canvas_picking_sketch_free_box_geometry_vertical.ts',
    'esm/native/services/canvas_picking_sketch_free_box_geometry_zone.ts',
    'esm/native/services/canvas_picking_sketch_free_box_placement_attach_candidates.ts',
    'esm/native/services/canvas_picking_sketch_box_runtime_geometry.ts',
    'esm/native/services/canvas_picking_sketch_box_door_preview.ts',
    'esm/native/services/canvas_picking_sketch_box_vertical_content_preview_shelf.ts',
    'esm/native/services/canvas_picking_sketch_box_vertical_content_preview_rod.ts',
    'esm/native/services/canvas_picking_sketch_module_surface_preview_box.ts',
    'esm/native/services/canvas_picking_sketch_free_surface_preview_adornment_preview.ts',
    'esm/native/builder/render_interior_sketch_boxes_contents_parts_shelves.ts',
    'esm/native/builder/render_interior_sketch_boxes_contents_parts_rods.ts',
  ]) {
    assertUsesToken(rel, 'SKETCH_BOX_DIMENSIONS');
  }
});

test('[dimension tokens] library presets and saved preset defaults read canonical dimensions', () => {
  const tokens = readProductDimensionTokens();
  assert.match(tokens, /export const LIBRARY_PRESET_DIMENSIONS = Object\.freeze\(\{/);

  for (const rel of [
    'esm/native/features/library_preset/module_defaults.ts',
    'esm/native/features/library_preset/library_preset_flow_shared.ts',
    'esm/native/data/preset_models_data.ts',
  ]) {
    assertUsesToken(rel, 'LIBRARY_PRESET_DIMENSIONS');
  }

  const presetData = read('esm/native/data/preset_models_data.ts');
  assert.doesNotMatch(presetData, /doors: '4'/);
  assert.doesNotMatch(presetData, /width: '160'/);
  assert.doesNotMatch(presetData, /height: '240'/);
  assert.doesNotMatch(presetData, /depth: '55'/);
  assert.doesNotMatch(presetData, /cornerWidth: '120'/);
  assert.doesNotMatch(presetData, /cornerDoors: '3'/);
  assert.doesNotMatch(presetData, /drawersCount: '4'/);
});

test('[dimension tokens] interior presets and sketch drawer sizing read canonical dimensions', () => {
  const tokens = readProductDimensionTokens();
  assert.match(tokens, /export const INTERIOR_PRESET_POLICY = Object\.freeze\(\{/);
  assert.match(tokens, /heightTokenEpsilonCm:/);

  for (const rel of [
    'esm/native/features/interior_layout_presets/ops.ts',
    'esm/native/features/sketch_drawer_sizing.ts',
    'esm/native/features/modules_configuration/module_defaults.ts',
    'esm/native/features/stack_split/module_config.ts',
  ]) {
    assertUsesToken(
      rel,
      rel.includes('sketch_drawer_sizing') ? 'DRAWER_DIMENSIONS' : 'INTERIOR_FITTINGS_DIMENSIONS'
    );
  }

  const presetOps = read('esm/native/features/interior_layout_presets/ops.ts');
  assert.doesNotMatch(presetOps, /pushRod\((3\.5|3\.8|4\.6|2\.3|1\.3)/);
  assert.doesNotMatch(presetOps, /barrierH = 0\.5/);
  assert.doesNotMatch(presetOps, /zFrontOffset: -0\.06/);

  const drawerSizing = read('esm/native/features/sketch_drawer_sizing.ts');
  assert.doesNotMatch(drawerSizing, /\/ 100/);
  assert.doesNotMatch(drawerSizing, /HEIGHT_TOKEN_EPSILON = 0\.0001/);
});

test('[dimension tokens] sketch divider, attachment, and free-box measurement overlays are centralized', () => {
  const tokens = readProductDimensionTokens();
  assert.match(tokens, /dividers: Object\.freeze\(\{/);
  assert.match(tokens, /dimensionOverlay: Object\.freeze\(\{/);
  assert.match(tokens, /attachIntentMinOverlapMinM:/);
  assert.match(tokens, /placementGapDefaultM:/);

  for (const rel of [
    'esm/native/builder/render_interior_sketch_layout_dividers.ts',
    'esm/native/builder/render_interior_sketch_layout_dimensions_grouping.ts',
    'esm/native/builder/render_interior_sketch_layout_dimensions_render.ts',
    'esm/native/services/canvas_picking_sketch_box_divider_state_placement.ts',
    'esm/native/services/canvas_picking_sketch_box_divider_state_match.ts',
    'esm/native/services/canvas_picking_sketch_box_segments.ts',
    'esm/native/services/canvas_picking_sketch_free_box_placement_intent.ts',
    'esm/native/services/canvas_picking_sketch_free_box_gap.ts',
  ]) {
    assertUsesToken(rel, 'SKETCH_BOX_DIMENSIONS');
  }

  const freeBoxGap = read('esm/native/services/canvas_picking_sketch_free_box_gap.ts');
  assert.doesNotMatch(freeBoxGap, /return 0\.002/);
  assert.doesNotMatch(freeBoxGap, /Math\.max\(0\.0015, Math\.min\(0\.004/);

  const projectionFallback = read(
    'esm/native/services/canvas_picking_projection_runtime_box_no_main_workspace.ts'
  );
  assert.match(projectionFallback, /WARDROBE_DEFAULTS/);
  assert.match(projectionFallback, /NO_MAIN_SKETCH_DIMENSIONS/);
  assert.doesNotMatch(projectionFallback, /, 160\)/);
  assert.doesNotMatch(projectionFallback, /, 240\)/);
  assert.doesNotMatch(projectionFallback, /, 55\)/);
});

test('[dimension tokens] wardrobe dimension guide offsets are centralized', () => {
  const tokens = readProductDimensionTokens();
  assert.match(tokens, /export const WARDROBE_DIMENSION_GUIDE_DIMENSIONS = Object\.freeze\(\{/);
  assert.match(tokens, /verticalPlacement: Object\.freeze\(\{/);
  assert.match(tokens, /expandedWidthYOffsetM:/);
  assert.match(tokens, /smallDepthStartYOffsetM:/);

  for (const rel of [
    'esm/native/builder/render_dimension_ops_shared.ts',
    'esm/native/builder/render_dimension_ops_main.ts',
    'esm/native/builder/render_dimension_ops_corner.ts',
  ]) {
    assertUsesToken(rel, 'WARDROBE_DIMENSION_GUIDE_DIMENSIONS');
  }

  const main = read('esm/native/builder/render_dimension_ops_main.ts');
  assert.doesNotMatch(main, /stackSplitActive \? 0\.54 : 0\.3/);
  assert.doesNotMatch(main, /displayH - 0\.35/);
  assert.doesNotMatch(main, /displayH - 0\.57/);

  const corner = read('esm/native/builder/render_dimension_ops_corner.ts');
  assert.doesNotMatch(corner, /cornerWallLenM > 0\.05/);
  assert.doesNotMatch(corner, /cornerWallLenM \* 0\.55/);
  assert.doesNotMatch(corner, /Math\.max\(0\.2, cornerWallLenM - 0\.08\)/);
});

test('[dimension tokens] mirror layout measurements read door visual dimension tokens', () => {
  const tokens = readProductDimensionTokens();
  assert.match(tokens, /layoutFullInsetM:/);
  assert.match(tokens, /layoutRemoveToleranceSizeRatio:/);

  for (const rel of [
    'esm/shared/mirror_layout_contracts_shared.ts',
    'esm/native/features/door_authoring/internal/mirror_geometry.ts',
    'esm/native/builder/visuals_and_contents_door_visual_mirror_styled.ts',
  ]) {
    assertUsesToken(
      rel,
      rel.endsWith('mirror_layout_contracts_shared.ts')
        ? 'DOOR_MIRROR_LAYOUT_POLICY'
        : rel.endsWith('mirror_geometry.ts')
          ? 'MIRROR_REMOVE_TOLERANCE_SIZE_RATIO'
          : 'FULL_MIRROR_INSET_M'
    );
  }

  const contracts = read('esm/shared/mirror_layout_contracts_shared.ts');
  assert.match(contracts, /DOOR_MIRROR_LAYOUT_POLICY/);
  assert.doesNotMatch(contracts, /DOOR_VISUAL_DIMENSIONS/);
  assert.doesNotMatch(contracts, /FULL_MIRROR_INSET_M\s*=\s*0\.002/);
  assert.doesNotMatch(contracts, /MIN_MIRROR_SIZE_M\s*=\s*0\.02/);
  assert.doesNotMatch(contracts, /DEFAULT_REMOVE_TOLERANCE_M\s*=\s*0\.03/);

  const geometry = read('esm/native/features/door_authoring/internal/mirror_geometry.ts');
  assert.doesNotMatch(geometry, /\* 0\.18/);
});

test('[dimension tokens] door visual miter/profile/trim preview geometry is centralized', () => {
  const tokens = readProductDimensionTokens();
  assert.match(tokens, /export const DOOR_MITER_RENDER_POLICY = Object\.freeze\(\{/);
  assert.match(tokens, /roundedBeadThicknessRatio:/);
  assert.match(tokens, /outerAccentLineThicknessM:/);
  assert.match(tokens, /frontSurfaceNudgeM:/);

  assertUsesToken(
    'esm/native/builder/visuals_and_contents_door_visual_miter_frame.ts',
    'DOOR_MITER_RENDER_POLICY'
  );
  assertUsesToken(
    'esm/native/builder/visuals_and_contents_door_visual_profile.ts',
    'DOOR_PROFILE_RENDER_POLICY'
  );
  assertUsesToken('esm/native/builder/door_trim_visuals.ts', 'DOOR_TRIM_RENDER_POLICY');

  const miter = read('esm/native/builder/visuals_and_contents_door_visual_miter_frame.ts');
  assert.doesNotMatch(miter, /Math\.max\(0\.001, Math\.min\(bandW/);
  assert.doesNotMatch(miter, /faceZ \+ 0\.0008 \* zSign/);
  assert.doesNotMatch(miter, /bevelOffset: -Math\.min\(0\.0006, bw \* 0\.03\)/);

  const profile = read('esm/native/builder/visuals_and_contents_door_visual_profile.ts');
  assert.doesNotMatch(profile, /lineT: 0\.0018/);
  assert.doesNotMatch(profile, /densityOverride: 12/);

  const trim = read('esm/native/builder/door_trim_visuals.ts');
  assert.doesNotMatch(trim, /frontZ = 0\.011/);
  assert.doesNotMatch(trim, /DEFAULT_DOOR_TRIM_DEPTH_M \* 0\.5 \+ 0\.0005/);
});

test('[dimension tokens] door split and cell dimension hover preview measurements are centralized', () => {
  const tokens = readProductDimensionTokens();
  assert.match(tokens, /hoverStandardLineHeightRatio:/);
  assert.match(tokens, /cellDimsPreview: Object\.freeze\(\{/);

  assertUsesToken(
    'esm/native/services/canvas_picking_door_split_hover_flow.ts',
    'HINGED_DOOR_SPLIT_AUTHORING_POLICY'
  );
  assertUsesToken(
    'esm/native/services/canvas_picking_hover_preview_modes_cell_dims.ts',
    'WARDROBE_LAYOUT_DIMENSIONS'
  );

  const splitHover = read('esm/native/services/canvas_picking_door_split_hover_flow.ts');
  assert.doesNotMatch(splitHover, /maxY - minY < 0\.05/);
  assert.doesNotMatch(splitHover, /standardLineH = Math\.max\(0\.014, Math\.min\(0\.026/);
  assert.doesNotMatch(splitHover, /const zOff = 0\.02 \* \(zSign === -1 \? -1 : 1\)/);

  const cellDims = read('esm/native/services/canvas_picking_hover_preview_modes_cell_dims.ts');
  assert.doesNotMatch(cellDims, /w: Math\.max\(0\.03, Number\(previewTargetBox\.width\) - 0\.006\)/);
  assert.doesNotMatch(cellDims, /woodThick: Math\.max\(0\.004, Math\.min\(0\.01/);
});

test('[dimension tokens] door trim placement and front reveal frame geometry are centralized', () => {
  const tokens = readProductDimensionTokens();
  assert.match(tokens, /export const DOOR_TRIM_REMOVE_TOLERANCE_POLICY = Object\.freeze\(\{/);
  assert.match(tokens, /export const DOOR_TRIM_NORMALIZATION_POLICY = Object\.freeze\(\{/);
  assert.match(tokens, /export const DOOR_TRIM_RENDER_POLICY = Object\.freeze\(\{/);
  assert.match(tokens, /export const DOOR_TRIM_DIMENSIONS = Object\.freeze\(\{/);
  assert.match(tokens, /export const FRONT_REVEAL_GEOMETRY_POLICY = Object\.freeze\(\{/);
  assert.match(tokens, /export const FRONT_REVEAL_PRESENCE_POLICY = Object\.freeze\(\{/);
  assert.match(tokens, /export const FRONT_REVEAL_THICKNESS_POLICY = Object\.freeze\(\{/);
  assert.match(tokens, /export const FRONT_REVEAL_FRAME_POLICY = Object\.freeze\(\{/);
  assert.match(tokens, /legacyDimensionNumberView\(FRONT_REVEAL_FRAME_POLICY\)/);

  assertUsesToken('esm/native/features/door_authoring/internal/trim_shared.ts', 'DOOR_TRIM_RENDER_POLICY');
  assertUsesToken(
    'esm/native/features/door_authoring/internal/trim_placement_geometry.ts',
    'DOOR_TRIM_SNAP_POLICY'
  );
  assertUsesToken(
    'esm/native/features/door_authoring/internal/trim_placement_match.ts',
    'DOOR_TRIM_REMOVE_TOLERANCE_POLICY'
  );
  assertUsesToken(
    'esm/native/features/door_authoring/internal/trim_placement_mirror.ts',
    'DOOR_TRIM_NORMALIZATION_POLICY'
  );

  assertUsesToken(
    'esm/native/builder/post_build_front_reveal_frames_runtime.ts',
    'FRONT_REVEAL_GEOMETRY_POLICY'
  );
  assertUsesToken(
    'esm/native/builder/post_build_front_reveal_frames_geometry.ts',
    'FRONT_REVEAL_GEOMETRY_POLICY'
  );
  assertUsesToken(
    'esm/native/builder/post_build_front_reveal_frames_doors.ts',
    'FRONT_REVEAL_THICKNESS_POLICY'
  );
  assertUsesToken(
    'esm/native/builder/post_build_front_reveal_frames_drawers.ts',
    'FRONT_REVEAL_PRESENCE_POLICY'
  );
  assertUsesToken(
    'esm/native/builder/post_build_front_reveal_frames_drawers.ts',
    'FRONT_REVEAL_THICKNESS_POLICY'
  );
  for (const rel of [
    'esm/native/builder/post_build_front_reveal_frames_runtime.ts',
    'esm/native/builder/post_build_front_reveal_frames_geometry.ts',
    'esm/native/builder/post_build_front_reveal_frames_doors.ts',
    'esm/native/builder/post_build_front_reveal_frames_drawers.ts',
  ]) {
    assert.doesNotMatch(read(rel), /FRONT_REVEAL_FRAME_DIMENSIONS/);
  }

  const trimShared = read('esm/native/features/door_authoring/internal/trim_shared.ts');
  assert.doesNotMatch(trimShared, /CENTER_EPSILON = 1e-4/);

  const trimMatch = read('esm/native/features/door_authoring/internal/trim_placement_match.ts');
  assert.doesNotMatch(trimMatch, /DEFAULT_DOOR_TRIM_THICKNESS_M \* 1\.15/);
  assert.doesNotMatch(trimMatch, /Math\.min\(0\.09, crossSpan \* 0\.12\)/);

  const revealGeometry = read('esm/native/builder/post_build_front_reveal_frames_geometry.ts');
  assert.doesNotMatch(revealGeometry, /const xyInset = 0\.0015/);
  assert.doesNotMatch(revealGeometry, /sign \* 0\.00008/);
  assert.doesNotMatch(revealGeometry, /makeRectGeom\(0\.0011, sign \* 0\.00016\)/);

  const revealDoors = read('esm/native/builder/post_build_front_reveal_frames_doors.ts');
  assert.doesNotMatch(revealDoors, /type === 'sliding' \? 0\.022 : 0\.018/);

  const revealDrawers = read('esm/native/builder/post_build_front_reveal_frames_drawers.ts');
  assert.doesNotMatch(revealDrawers, /Math\.abs\(explicitFrontMax\) > 1e-6/);
  assert.doesNotMatch(revealDrawers, /const thickness = Number\.isFinite\(t\) && t > 0 \? t : 0\.02/);
});

test('[dimension tokens] corner wing and connector shell dimensions read canonical tokens', () => {
  const tokens = readProductDimensionTokens();
  assert.match(tokens, /shellMinWallHeightM:/);
  assert.match(tokens, /shellPanelMinLengthM:/);
  assert.match(tokens, /minBlindWidthM:/);

  for (const rel of [
    'esm/native/builder/corner_wing_carcass_shell_dividers.ts',
    'esm/native/builder/corner_wing_carcass_shell_floor_base.ts',
    'esm/native/builder/corner_connector_emit_shell_panels.ts',
  ]) {
    assertUsesToken(rel, 'CORNER_WING_DIMENSIONS');
  }

  const dividers = read('esm/native/builder/corner_wing_carcass_shell_dividers.ts');
  assert.doesNotMatch(dividers, /Math\.max\(0\.001, woodThick\)/);
  assert.doesNotMatch(dividers, /leftHRaw - 0\.002/);
  assert.doesNotMatch(dividers, /Math\.max\(0\.2, leftCell\.depth\)/);
  assert.doesNotMatch(dividers, /resolveCornerWingWallPlacement\(params, metrics, .*?, 0\.05\)/);

  const floorBase = read('esm/native/builder/corner_wing_carcass_shell_floor_base.ts');
  assert.doesNotMatch(floorBase, /woodThick \/ 2 \+ 0\.002/);
  assert.doesNotMatch(floorBase, /blindWidth > 0\.001/);
  assert.doesNotMatch(floorBase, /Math\.max\(0\.2, d0\)/);
  assert.doesNotMatch(floorBase, /resolveCornerWingHorizPlacement\(params, metrics, .*?, 0\.05\)/);

  const connectorPanels = read('esm/native/builder/corner_connector_emit_shell_panels.ts');
  assert.doesNotMatch(connectorPanels, /len0 <= 0\.01/);
  assert.doesNotMatch(connectorPanels, /len <= 0\.01/);
});

test('[dimension tokens] sketch drawer cut, handle placement, rods, and storage dimensions are centralized', () => {
  const tokens = readProductDimensionTokens();
  assert.match(tokens, /doorCutHorizontalOverlapMinM:/);
  assert.match(tokens, /rebuiltSegmentHandlePaddingHeightRatio:/);
  assert.match(tokens, /export const DRAWER_HANDLE_PLACEMENT_POLICY = Object\.freeze\(\{/);
  assert.match(tokens, /separatorBoardWidthClearanceM:/);
  assert.match(tokens, /clampPadWoodRatio:/);
  assertLinearDimensionsUseOwnersOrMeters('esm/shared/dimensions/handle_policy.ts');

  for (const rel of [
    'esm/native/builder/post_build_sketch_door_cuts_apply.ts',
    'esm/native/builder/post_build_sketch_door_cuts_rebuild_handles.ts',
    'esm/native/builder/post_build_sketch_door_cuts_rebuild_shared.ts',
  ]) {
    assertUsesToken(rel, 'DRAWER_DIMENSIONS');
  }
  for (const rel of [
    'esm/native/builder/post_build_sketch_door_cuts_intervals.ts',
    'esm/native/builder/post_build_sketch_door_cuts_rebuild_visual.ts',
  ]) {
    assertUsesToken(rel, 'DRAWER_SKETCH_DOOR_CUT_POLICY');
  }

  assertUsesToken('esm/native/builder/handles_apply_drawers.ts', 'DRAWER_HANDLE_PLACEMENT_POLICY');
  assertUsesToken('esm/native/builder/handles_apply_shared.ts', 'DRAWER_HANDLE_PLACEMENT_POLICY');
  assertUsesToken('esm/native/builder/edge_handle_profile.ts', 'EDGE_HANDLE_PROFILE_RENDER_POLICY');
  assertUsesToken('esm/native/builder/handles_mesh.ts', 'EDGE_HANDLE_SIZE_POLICY');
  assertUsesToken('esm/native/builder/handles_mesh.ts', 'STANDARD_HANDLE_RENDER_POLICY');

  assertUsesToken('esm/native/builder/render_interior_sketch_support_rods.ts', 'INTERIOR_ROD_RENDER_POLICY');
  for (const tokenName of [
    'INTERIOR_STORAGE_BARRIER_POLICY',
    'INTERIOR_STORAGE_CLAMP_POLICY',
    'INTERIOR_STORAGE_LAYOUT_POLICY',
    'INTERIOR_STORAGE_PREVIEW_POLICY',
  ]) {
    assertUsesToken('esm/native/builder/render_interior_sketch_support_storage.ts', tokenName);
  }

  assertUsesToken('esm/native/builder/external_drawer_shelf.ts', 'EXTERNAL_DRAWER_SEPARATOR_POLICY');

  const cutsApply = read('esm/native/builder/post_build_sketch_door_cuts_apply.ts');
  assert.doesNotMatch(cutsApply, /overlap > 0\.005/);
  assert.doesNotMatch(cutsApply, /<= 0\.002/);

  const intervals = read('esm/native/builder/post_build_sketch_door_cuts_intervals.ts');
  assert.doesNotMatch(intervals, /> 0\.01/);
  assert.doesNotMatch(intervals, /\+ 0\.002/);
  assert.doesNotMatch(intervals, /0\.012/);

  const rebuildHandles = read('esm/native/builder/post_build_sketch_door_cuts_rebuild_handles.ts');
  assert.doesNotMatch(rebuildHandles, /segHeight < 0\.12/);
  assert.doesNotMatch(rebuildHandles, /Math\.max\(0\.02, segHeight\)/);
  assert.doesNotMatch(rebuildHandles, /Math\.min\(0\.1, Math\.max\(0\.02, segHeight \* 0\.2\)\)/);

  const rebuildShared = read('esm/native/builder/post_build_sketch_door_cuts_rebuild_shared.ts');
  assert.doesNotMatch(rebuildShared, /Math\.max\(0\.02, width\)/);
  assert.doesNotMatch(rebuildShared, /Math\.max\(0\.002, thickness\)/);
  assert.doesNotMatch(rebuildShared, /padding = 0\.01/);

  const rebuildVisual = read('esm/native/builder/post_build_sketch_door_cuts_rebuild_visual.ts');
  assert.doesNotMatch(rebuildVisual, /Math\.max\(0\.02, width - 0\.004\)/);
  assert.doesNotMatch(rebuildVisual, /Math\.max\(0\.02, segHeight\)/);

  const handleDrawers = read('esm/native/builder/handles_apply_drawers.ts');
  assert.doesNotMatch(handleDrawers, /__doorWidth \|\| 0\.4/);
  assert.doesNotMatch(handleDrawers, /__doorHeight \|\| 0\.2/);
  assert.doesNotMatch(handleDrawers, /targetVisibleProtrusionZ = 0\.0135/);
  assert.doesNotMatch(handleDrawers, /drawH < 0\.21 \? 0\.02 : 0/);

  const handleShared = read('esm/native/builder/handles_apply_shared.ts');
  assert.doesNotMatch(handleShared, /H > 0\.05/);
  assert.doesNotMatch(handleShared, /Math\.min\(0\.1, Math\.max\(0\.02, H \* 0\.2\)\)/);

  const rods = read('esm/native/builder/render_interior_sketch_support_rods.ts');
  assert.doesNotMatch(rods, /Math\.max\(0\.05, innerW - 0\.06\)/);
  assert.doesNotMatch(rods, /CylinderGeometry\(0\.015, 0\.015, len, 12\)/);

  const storage = read('esm/native/builder/render_interior_sketch_support_storage.ts');
  assert.doesNotMatch(storage, /Math\.min\(0\.006, Math\.max\(0\.001, woodThick \* 0\.2\)\)/);
  assert.doesNotMatch(storage, /frontZ - 0\.06/);
  assert.doesNotMatch(storage, /Math\.max\(0\.05, innerW - 0\.025\)/);
  assert.doesNotMatch(storage, /woodThick \* 2 \+ 0\.02/);

  const externalPipeline = read('esm/native/builder/external_drawers_pipeline.ts');
  assert.doesNotMatch(externalPipeline, /innerW - 0\.025/);
});

test('[dimension tokens] External and Internal Drawer owners preserve focused production consumption', () => {
  const tokens = readProductDimensionTokens();
  assert.match(tokens, /export const EXTERNAL_DRAWER_POLICY = Object\.freeze\(\{/u);
  assert.match(tokens, /export const INTERNAL_DRAWER_POLICY = Object\.freeze\(\{/u);
  assert.match(tokens, /doorTopGapM: STACK_SPLIT_POLICY\.seam\.gapM/u);

  const expectedConsumers = [
    ['esm/native/builder/external_drawer_shelf.ts', 'EXTERNAL_DRAWER_SEPARATOR_POLICY'],
    ['esm/native/builder/render_drawer_ops_external.ts', 'EXTERNAL_DRAWER_FRONT_RENDER_POLICY'],
    ['esm/native/builder/render_drawer_ops_external.ts', 'EXTERNAL_DRAWER_CONTENTS_POLICY'],
    [
      'esm/native/builder/render_interior_sketch_boxes_fronts_drawers_box.ts',
      'EXTERNAL_DRAWER_CONTENTS_POLICY',
    ],
    ['esm/native/builder/render_interior_sketch_drawers_external_box.ts', 'EXTERNAL_DRAWER_CONTENTS_POLICY'],
    ['esm/native/builder/render_interior_sketch_drawers_external_motion.ts', 'EXTERNAL_DRAWER_MOTION_POLICY'],
  ];
  for (const [file, symbol] of expectedConsumers) assertUsesToken(file, symbol);

  for (const file of new Set(expectedConsumers.map(([file]) => file))) {
    assert.doesNotMatch(read(file), /\bDRAWER_DIMENSIONS\b/u);
  }
});

test('[dimension tokens] Interior Storage owner preserves focused production consumption', () => {
  const tokens = readProductDimensionTokens();
  for (const policyName of [
    'INTERIOR_STORAGE_GRID_POLICY',
    'INTERIOR_STORAGE_BARRIER_POLICY',
    'INTERIOR_STORAGE_PREVIEW_POLICY',
    'INTERIOR_STORAGE_CLAMP_POLICY',
    'INTERIOR_STORAGE_LAYOUT_POLICY',
    'INTERIOR_STORAGE_DEFAULTS_POLICY',
    'INTERIOR_STORAGE_POLICY',
  ]) {
    assert.match(tokens, new RegExp(`export const ${policyName} = Object\\.freeze\\(\\{`, 'u'));
  }

  const expectedConsumers = [
    ['esm/native/builder/render_interior_custom_ops_layout.ts', 'INTERIOR_STORAGE_BARRIER_POLICY'],
    ['esm/native/builder/render_interior_sketch_support_storage.ts', 'INTERIOR_STORAGE_BARRIER_POLICY'],
    ['esm/native/builder/render_interior_sketch_support_storage.ts', 'INTERIOR_STORAGE_CLAMP_POLICY'],
    ['esm/native/builder/render_interior_sketch_support_storage.ts', 'INTERIOR_STORAGE_LAYOUT_POLICY'],
    ['esm/native/builder/render_interior_sketch_support_storage.ts', 'INTERIOR_STORAGE_PREVIEW_POLICY'],
    [
      'esm/native/services/canvas_picking_manual_layout_free_box_commit.ts',
      'INTERIOR_STORAGE_BARRIER_POLICY',
    ],
    [
      'esm/native/services/canvas_picking_sketch_module_stack_commit_drawers.ts',
      'INTERIOR_STORAGE_GRID_POLICY',
    ],
    [
      'esm/native/services/canvas_picking_sketch_module_surface_preview_storage.ts',
      'INTERIOR_STORAGE_BARRIER_POLICY',
    ],
    [
      'esm/native/services/canvas_picking_sketch_module_surface_preview_storage.ts',
      'INTERIOR_STORAGE_PREVIEW_POLICY',
    ],
  ];
  for (const [file, symbol] of expectedConsumers) assertUsesToken(file, symbol);

  for (const file of new Set(expectedConsumers.map(([file]) => file))) {
    assert.doesNotMatch(read(file), /\bINTERIOR_FITTINGS_DIMENSIONS\b/u);
  }
});

test('[dimension tokens] Remaining Interior Fittings owner preserves focused production consumption', () => {
  const tokens = readProductDimensionTokens();
  for (const policyName of [
    'INTERIOR_SHELF_GEOMETRY_POLICY',
    'INTERIOR_SHELF_CONTENT_CLEARANCE_POLICY',
    'INTERIOR_SHELF_ROUNDED_RENDER_POLICY',
    'INTERIOR_SHELF_POLICY',
    'INTERIOR_SHELF_PIN_RENDER_POLICY',
    'INTERIOR_ROD_RENDER_POLICY',
    'INTERIOR_ROD_PLACEMENT_POLICY',
    'INTERIOR_ROD_DEPTH_CLEARANCE_POLICY',
    'INTERIOR_ROD_CONTENT_CLEARANCE_POLICY',
    'INTERIOR_ROD_POLICY',
    'INTERIOR_PRESET_SHELF_ROWS_POLICY',
    'INTERIOR_PRESET_ROD_FACTORS_POLICY',
    'INTERIOR_PRESET_POLICY',
    'INTERIOR_FITTINGS_POLICY',
  ]) {
    assert.match(tokens, new RegExp(`export const ${policyName} = Object\\.freeze\\(\\{`, 'u'));
  }
  assertLinearDimensionsUseOwnersOrMeters('esm/shared/dimensions/interior_fittings_policy.ts');

  const expectedConsumers = [
    ['esm/native/builder/render_interior_preset_ops_shelves.ts', 'INTERIOR_SHELF_POLICY'],
    ['esm/native/builder/render_interior_preset_ops_shelves.ts', 'INTERIOR_SHELF_PIN_RENDER_POLICY'],
    ['esm/native/builder/render_interior_rod_ops.ts', 'INTERIOR_ROD_RENDER_POLICY'],
    ['esm/native/builder/render_interior_rod_ops.ts', 'INTERIOR_ROD_DEPTH_CLEARANCE_POLICY'],
    ['esm/native/builder/render_interior_rod_ops.ts', 'INTERIOR_ROD_CONTENT_CLEARANCE_POLICY'],
    ['esm/native/builder/render_interior_sketch_support_materials.ts', 'INTERIOR_SHELF_PIN_RENDER_POLICY'],
    ['esm/native/builder/render_interior_sketch_support_rods.ts', 'INTERIOR_ROD_RENDER_POLICY'],
    ['esm/native/builder/render_interior_sketch_support_rods.ts', 'INTERIOR_ROD_DEPTH_CLEARANCE_POLICY'],
    ['esm/native/builder/render_interior_sketch_support_rods.ts', 'INTERIOR_ROD_CONTENT_CLEARANCE_POLICY'],
    ['esm/native/builder/render_interior_sketch_support_shelf_pins.ts', 'INTERIOR_SHELF_PIN_RENDER_POLICY'],
  ];
  for (const [file, symbol] of expectedConsumers) assertUsesToken(file, symbol);
  for (const file of new Set(expectedConsumers.map(([file]) => file))) {
    assert.doesNotMatch(read(file), /\bINTERIOR_FITTINGS_DIMENSIONS\b/u);
  }
});

test('[dimension tokens] pure Material consumers use the canonical thickness owner', () => {
  const expectedConsumers = [
    'esm/native/builder/render_preview_sketch_pipeline_shared.ts',
    'esm/native/services/canvas_picking_hover_preview_modes_divider.ts',
    'esm/native/services/canvas_picking_sketch_free_box_content_preview_doors.ts',
    'esm/native/services/canvas_picking_sketch_free_box_content_preview_stack.ts',
    'esm/native/services/canvas_picking_sketch_free_box_content_preview_vertical.ts',
    'esm/native/services/canvas_picking_sketch_free_box_hover_finalize.ts',
    'esm/native/services/canvas_picking_sketch_free_box_hover_scan.ts',
    'esm/native/services/canvas_picking_sketch_free_surface_preview_divider.ts',
    'esm/native/services/canvas_picking_sketch_free_surface_preview_placement.ts',
    'esm/native/services/canvas_picking_sketch_free_surface_preview_placement_remove.ts',
    'esm/native/services/canvas_picking_sketch_free_surface_preview_target_candidate.ts',
    'esm/native/services/canvas_picking_sketch_module_box_blockers.ts',
  ];

  for (const file of expectedConsumers) {
    assertUsesToken(file, 'MATERIAL_THICKNESS_POLICY');
    assert.doesNotMatch(read(file), /\bMATERIAL_DIMENSIONS\b/u);
    assert.doesNotMatch(read(file), /\b0\.018\b/u);
  }
});

test('[dimension tokens] Drawer Sketch owner preserves focused production consumption', () => {
  const tokens = readProductDimensionTokens();
  for (const policyName of [
    'DRAWER_SKETCH_SIZING_POLICY',
    'DRAWER_SKETCH_PREVIEW_RENDER_POLICY',
    'DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY',
    'DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY',
    'DRAWER_SKETCH_DOOR_CUT_POLICY',
    'DRAWER_SKETCH_COLLISION_ALIGNMENT_POLICY',
    'DRAWER_SKETCH_POLICY',
  ]) {
    assert.match(tokens, new RegExp(`export const ${policyName} = Object\\.freeze\\(\\{`, 'u'));
  }

  const expectedConsumers = [
    ['esm/native/builder/post_build_sketch_door_cuts_box.ts', 'DRAWER_SKETCH_DOOR_CUT_POLICY'],
    ['esm/native/builder/post_build_sketch_door_cuts_intervals.ts', 'DRAWER_SKETCH_DOOR_CUT_POLICY'],
    ['esm/native/builder/post_build_sketch_door_cuts_modules.ts', 'DRAWER_SKETCH_SIZING_POLICY'],
    ['esm/native/builder/post_build_sketch_door_cuts_rebuild_visual.ts', 'DRAWER_SKETCH_DOOR_CUT_POLICY'],
    [
      'esm/native/builder/render_interior_sketch_boxes_contents_drawers.ts',
      'DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY',
    ],
    [
      'esm/native/builder/render_interior_sketch_drawers_internal.ts',
      'DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY',
    ],
    [
      'esm/native/builder/render_interior_sketch_internal_drawer_cassette.ts',
      'DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY',
    ],
    [
      'esm/native/builder/render_interior_sketch_shared_external_drawers.ts',
      'DRAWER_SKETCH_COLLISION_ALIGNMENT_POLICY',
    ],
    [
      'esm/native/builder/render_interior_sketch_stack_collision.ts',
      'DRAWER_SKETCH_COLLISION_ALIGNMENT_POLICY',
    ],
    ['esm/native/features/sketch_box_regular_external_drawers.ts', 'DRAWER_SKETCH_SIZING_POLICY'],
    [
      'esm/native/services/canvas_picking_drawer_cross_family_preview.ts',
      'DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY',
    ],
    [
      'esm/native/services/canvas_picking_hover_preview_modes_ext_drawers.ts',
      'DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY',
    ],
    [
      'esm/native/services/canvas_picking_manual_layout_sketch_hover_standard_drawer.ts',
      'DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY',
    ],
    [
      'esm/native/services/canvas_picking_manual_layout_sketch_vertical_stack.ts',
      'DRAWER_SKETCH_COLLISION_ALIGNMENT_POLICY',
    ],
  ];
  for (const [file, symbol] of expectedConsumers) assertUsesToken(file, symbol);

  for (const file of new Set(expectedConsumers.map(([file]) => file))) {
    assert.doesNotMatch(read(file), /\bDRAWER_DIMENSIONS\b/u);
  }
});

test('[dimension tokens] final preview/sketch/drawer/interior sweep reads canonical dimensions', () => {
  const tokens = readProductDimensionTokens();
  for (const tokenPattern of [
    /sketchBoxClassic: SKETCH_BOX_CLASSIC_DOOR_VISUAL_POLICY/,
    /externalPreviewBoxMinDimensionM:/,
    /measurementLabelZOffsetM:/,
    /objectBoxPadXYWoodRatio:/,
    /barrierHeightMinM:/,
    /frontTrimZOffsetM:/,
    /opFrontZOffsetM:/,
    /renderMinSegmentHeightM:/,
    /placementClampPadMinM:/,
    /workspaceClampPadHeightRatio:/,
    /faceVerticalAlignmentEpsilonM:/,
    /panelMinLengthM:/,
    /shelfPlanMinDimensionM:/,
    /shelfCeilingClearanceM:/,
  ]) {
    assert.match(tokens, tokenPattern);
  }

  const expectedTokenUse = new Map([
    ['esm/native/builder/corner_wing_cell_layouts.ts', ['INTERIOR_FITTINGS_DIMENSIONS', 'presetDims']],
    ['esm/native/builder/render_door_ops_hinged.ts', ['HINGED_DOOR_RENDER_POLICY', 'hingedDims']],
    ['esm/native/builder/render_interior_preset_ops.ts', ['INTERIOR_FITTINGS_DIMENSIONS']],
    [
      'esm/native/builder/render_interior_sketch_boxes_fronts_door_accents.ts',
      ['SKETCH_BOX_CLASSIC_DOOR_VISUAL_POLICY'],
    ],
    ['esm/native/builder/render_interior_sketch_boxes_fronts_drawers_plan.ts', ['DRAWER_DIMENSIONS']],
    ['esm/native/builder/render_interior_sketch_drawers_external_plan.ts', ['DRAWER_DIMENSIONS']],
    ['esm/native/builder/render_interior_sketch_support_shelf_pins.ts', ['INTERIOR_SHELF_PIN_RENDER_POLICY']],
    ['esm/native/builder/render_interior_sketch_support_shelves.ts', ['INTERIOR_FITTINGS_DIMENSIONS']],
    ['esm/native/builder/render_interior_sketch_boxes_shell_geometry.ts', ['SKETCH_BOX_DIMENSIONS']],
    ['esm/native/builder/render_interior_sketch_support_placement.ts', ['SKETCH_BOX_DIMENSIONS']],
    [
      'esm/native/builder/render_interior_sketch_shared_external_drawers.ts',
      ['DRAWER_SKETCH_COLLISION_ALIGNMENT_POLICY'],
    ],
    ['esm/native/builder/hinged_doors_module_ops_full.ts', ['HINGED_DOOR_SPLIT_GEOMETRY_POLICY']],
    ['esm/native/builder/hinged_doors_module_ops_segments.ts', ['HINGED_DOOR_SPLIT_GEOMETRY_POLICY']],
    ['esm/native/builder/hinged_doors_module_ops_split_routes.ts', ['HINGED_DOOR_SPLIT_GEOMETRY_POLICY']],
    ['esm/native/builder/corner_wing_cell_doors_context.ts', ['CORNER_WING_DIMENSIONS']],
    ['esm/native/builder/corner_wing_cell_doors_split.ts', ['CORNER_WING_DIMENSIONS']],
    [
      'esm/native/builder/corner_wing_cell_interiors_storage.ts',
      ['CORNER_WING_DIMENSIONS', 'INTERIOR_FITTINGS_DIMENSIONS'],
    ],
    [
      'esm/native/builder/corner_connector_interior_special_apply.ts',
      ['CORNER_CONNECTOR_INTERIOR_DIMENSIONS'],
    ],
    [
      'esm/native/builder/render_preview_interior_hover_apply.ts',
      ['SKETCH_BOX_DIMENSIONS', 'INTERIOR_FITTINGS_DIMENSIONS'],
    ],
    ['esm/native/builder/render_preview_sketch_measurements_apply.ts', ['SKETCH_BOX_DIMENSIONS']],
    ['esm/native/builder/render_preview_sketch_pipeline_box_content_box.ts', ['SKETCH_BOX_DIMENSIONS']],
    ['esm/native/builder/render_preview_sketch_pipeline_linear.ts', ['SKETCH_BOX_DIMENSIONS']],
    ['esm/native/builder/render_preview_sketch_pipeline_object_boxes.ts', ['SKETCH_BOX_DIMENSIONS']],
    [
      'esm/native/services/canvas_picking_manual_layout_sketch_hover_module_context_base.ts',
      ['cmToM', 'SKETCH_BOX_DIMENSIONS', 'INTERIOR_FITTINGS_DIMENSIONS'],
    ],
    [
      'esm/native/services/canvas_picking_sketch_box_vertical_content_preview_storage.ts',
      ['SKETCH_BOX_DIMENSIONS', 'INTERIOR_FITTINGS_DIMENSIONS'],
    ],
    [
      'esm/native/services/canvas_picking_sketch_module_surface_commit_shared.ts',
      ['cmToM', 'SKETCH_BOX_DIMENSIONS', 'INTERIOR_FITTINGS_DIMENSIONS'],
    ],
    [
      'esm/native/services/canvas_picking_sketch_module_surface_commit_vertical.ts',
      ['SKETCH_BOX_DIMENSIONS'],
    ],
    [
      'esm/native/services/canvas_picking_sketch_module_surface_preview_content.ts',
      ['SKETCH_BOX_DIMENSIONS', 'INTERIOR_FITTINGS_DIMENSIONS'],
    ],
    [
      'esm/native/services/canvas_picking_sketch_module_surface_preview_flow.ts',
      ['SKETCH_BOX_DIMENSIONS', 'INTERIOR_FITTINGS_DIMENSIONS'],
    ],
    [
      'esm/native/services/canvas_picking_sketch_module_surface_preview_rod.ts',
      ['SKETCH_BOX_DIMENSIONS', 'INTERIOR_FITTINGS_DIMENSIONS'],
    ],
    [
      'esm/native/services/canvas_picking_sketch_module_surface_preview_shelf.ts',
      ['SKETCH_BOX_DIMENSIONS', 'INTERIOR_FITTINGS_DIMENSIONS'],
    ],
    ['esm/native/services/canvas_picking_sketch_neighbor_measurements.ts', ['INTERIOR_FITTINGS_DIMENSIONS']],
    [
      'esm/native/services/canvas_picking_manual_layout_sketch_tools.ts',
      ['MATERIAL_DIMENSIONS', 'SKETCH_BOX_DIMENSIONS'],
    ],
    [
      'esm/native/services/canvas_picking_click_manual_sketch_free_box.ts',
      ['SKETCH_BOX_DIMENSIONS', 'cmToM'],
    ],
    [
      'esm/native/services/canvas_picking_sketch_module_vertical_content_preview.ts',
      ['INTERIOR_FITTINGS_DIMENSIONS'],
    ],
    [
      'esm/native/services/canvas_picking_sketch_box_content_commit_doors.ts',
      ['MATERIAL_DIMENSIONS', 'SKETCH_BOX_DIMENSIONS'],
    ],
    [
      'esm/native/services/canvas_picking_sketch_free_box_hover_context.ts',
      ['MATERIAL_DIMENSIONS', 'SKETCH_BOX_DIMENSIONS'],
    ],
    ['esm/native/platform/render_loop_motion_doors.ts', ['DOOR_SYSTEM_DIMENSIONS', 'WARDROBE_DEFAULTS']],
  ]);

  for (const [rel, tokensToFind] of expectedTokenUse) {
    for (const tokenName of tokensToFind) assertUsesToken(rel, tokenName);
  }

  const previewHover = read('esm/native/builder/render_preview_interior_hover_apply.ts');
  assert.match(previewHover, /previewDims\.rodMinLengthM/);
  assert.match(previewHover, /storageDims\.barrierWidthClearanceM/);

  const measurements = read('esm/native/builder/render_preview_sketch_measurements_apply.ts');
  assert.match(measurements, /measurementLabelZOffsetM/);
  assert.match(measurements, /measurementScaleCellX/);

  const moduleRodPreview = read('esm/native/services/canvas_picking_sketch_module_surface_preview_rod.ts');
  assert.match(moduleRodPreview, /presetDims\.mixedRodYFactor/);
  assert.match(moduleRodPreview, /presetDims\.storageRodYFactor/);

  const commitShared = read('esm/native/services/canvas_picking_sketch_module_surface_commit_shared.ts');
  assert.match(commitShared, /cmToM\(n\)/);
  assert.match(commitShared, /storageDims\.barrierHeightMaxM/);

  const shellGeometry = read('esm/native/builder/render_interior_sketch_boxes_shell_geometry.ts');
  assert.doesNotMatch(shellGeometry, /Math\.min\(0\.006, Math\.max\(0\.001, woodThick \* 0\.2\)\)/);

  const sketchShelves = read('esm/native/builder/render_interior_sketch_support_shelves.ts');
  assert.doesNotMatch(sketchShelves, /isBrace \? 0\.002 : 0\.014/);

  const hingedSegments = read('esm/native/builder/hinged_doors_module_ops_segments.ts');
  assert.doesNotMatch(hingedSegments, /segH > 0\.1/);
  assert.doesNotMatch(hingedSegments, /doorFrontZ \+ 0\.01/);

  const manualSketchTools = read('esm/native/services/canvas_picking_manual_layout_sketch_tools.ts');
  assert.doesNotMatch(manualSketchTools, /\?\? 0\.018/);
  assert.doesNotMatch(manualSketchTools, /woodThick \* 0\.2/);

  const freeBoxHoverContext = read('esm/native/services/canvas_picking_sketch_free_box_hover_context.ts');
  assert.doesNotMatch(freeBoxHoverContext, /boxH \* 0\.02/);

  const clickFreeBox = read('esm/native/services/canvas_picking_click_manual_sketch_free_box.ts');
  assert.doesNotMatch(clickFreeBox, /Math\.max\(0\.05, \(heightCm \?\? 0\) \/ 100\)/);

  const cornerConnectorSpecial = read('esm/native/builder/corner_connector_interior_special_apply.ts');
  assert.doesNotMatch(cornerConnectorSpecial, /len <= 0\.01/);
  assert.doesNotMatch(cornerConnectorSpecial, /width <= 0\.05/);
  assert.doesNotMatch(cornerConnectorSpecial, /ceilBottomY - 0\.005/);

  const cornerWingSplit = read('esm/native/builder/corner_wing_cell_doors_split.ts');
  assert.doesNotMatch(cornerWingSplit, /0\.01 \+ state\.doorZShift/);

  const cornerWingStorage = read('esm/native/builder/corner_wing_cell_interiors_storage.ts');
  assert.doesNotMatch(cornerWingStorage, /cellRuntime\.__z\(0\.01\)/);

  const slidingMotion = read('esm/native/platform/render_loop_motion_doors.ts');
  assert.doesNotMatch(slidingMotion, /const overlap = 0\.03/);
  assert.doesNotMatch(slidingMotion, /d\.stackZStep, 0\.055/);
});
