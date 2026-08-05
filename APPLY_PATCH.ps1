$ErrorActionPreference = 'Stop'
$Root = $PSScriptRoot
$Required = @('package.json', 'esm', 'tests', 'tools')
foreach ($Item in $Required) {
  if (-not (Test-Path -LiteralPath (Join-Path $Root $Item))) {
    throw "Refusing to apply: '$Root' is not a complete WardrobePro project root (missing $Item). Extract the patch into the existing project root first."
  }
}
$Deleted = @(
  'docs/DIMENSION_MIGRATION_RETIREMENT_INVENTORY.md'
  'tests/corner_cells_ui_defaults_dimension_consolidation_contract.test.js'
  'tests/dimension_migration_final_closeout_contract.test.js'
  'tests/dimension_migration_retirement_inventory_contract.test.js'
  'tests/helpers/dimension_reviewed_ownership_contract_helper.mjs'
  'tests/interior_layout_presets_dimension_consolidation_contract.test.js'
  'tests/library_preset_dimension_consolidations_contract.test.js'
  'tests/module_config_dimension_consolidations_contract.test.js'
  'tests/sketch_drawer_dimension_consolidations_contract.test.js'
  'tests/stage19_20_three_remaining_cleanup_guard.test.js'
  'tests/stage2_hotspot_compression_guard.test.js'
  'tests/stage3_orchestration_boundary_cleanup_guard.test.js'
  'tests/stage4_ui_build_reactivity_behavior_runtime.test.ts'
  'tests/stage4_ui_build_reactivity_guard.test.js'
  'tests/stage4_workflow_owner_cleanup_guard.test.js'
  'tests/stage7_ui_surface_consolidation_guard.test.js'
  'tests/stageAB_render_ops_interior_dimensions_decomposition_guard.test.js'
  'tests/stageAG_manual_layout_sketch_contract_guard.test.js'
  'tests/stageAL_interiortab_sections_bundle_guard.test.js'
  'tests/stageAS_preset_stack_corner_cleanup_guard.test.js'
  'tests/stageAV_design_interior_surface_cleanup_guard.test.js'
  'tests/stageAX_sidebar_hooks_notes_selection_cleanup_guard.test.js'
  'tests/stageA_domain_corner_delegate_guard.test.js'
  'tests/stageBC_maps_doors_runtime_type_hardening_guard.test.js'
  'tests/stageBE_mode_transition_type_hardening_guard.test.js'
  'tests/stageBF_builder_render_room_type_hardening_guard.test.js'
  'tests/stageBG_meta_opts_surface_hardening_guard.test.js'
  'tests/stageBH_canonical_base_types_cleanup_guard.test.js'
  'tests/stageBI_builder_module_content_callable_hardening_guard.test.js'
  'tests/stageBK_three_builder_constructor_hardening_guard.test.js'
  'tests/stageBM_no_raw_unknown_rest_seams_guard.test.js'
  'tests/stageBN_preview_cloudsync_contract_hardening_guard.test.js'
  'tests/stageB_kernel_viewport_type_hardening_guard.test.js'
  'tests/stageB_notes_settings_type_hardening_guard.test.js'
  'tests/stageB_service_meta_type_hardening_guard.test.js'
  'tests/stageB_type_surface_hardening_guard.test.js'
  'tests/stageC_D_semantic_actions_dom_cleanup_guard.test.js'
  'tests/stageC_react_canonical_write_wrappers_guard.test.js'
  'tests/stageF_react_write_wrapper_sweep_guard.test.js'
  'tests/stageI_cfg_ui_semantic_cleanup_guard.test.js'
  'tests/stageJ_semantic_cfg_helper_expansion_guard.test.js'
  'tests/stageO_render_ops_preview_decomposition_guard.test.js'
  'tests/stageO_ui_surface_anyrecord_cleanup_guard.test.js'
  'tests/wave1_write_access_cleanup_guard.test.js'
  'tests/wave2_namespace_hardening_guard.test.js'
  'tests/wave3_react_hotspot_wrapper_cleanup_guard.test.js'
  'tests/wave4_hot_path_hardening_guard.test.js'
  'tests/wave7_project_io_decomposition_guard.test.js'
  'tests/wave8_render_ops_decomposition_guard.test.js'
  'tests/wave_c1_dimension_consolidation_contract.test.js'
  'tests/wave_c1_dimension_consolidation_runtime.test.ts'
  'tests/wave_c2_dimension_consolidation_contract.test.js'
  'tests/wave_c2_dimension_consolidation_runtime.test.ts'
  'tests/wave_c3_dimension_consolidation_contract.test.js'
  'tests/wave_c3_dimension_consolidation_runtime.test.ts'
  'tests/wave_d_corner_layout_reviewed_ownership_contract.test.js'
  'tests/wave_d_drawer_handle_reviewed_ownership_contract.test.js'
  'tests/wave_d_interior_storage_reviewed_ownership_contract.test.js'
  'tests/wave_d_sketch_geometry_reviewed_ownership_contract.test.js'
  'tests/wave_e_drawer_sketch_reviewed_ownership_contract.test.js'
  'tests/wave_e_interior_storage_reviewed_ownership_contract.test.js'
  'tests/wave_e_material_thickness_reviewed_ownership_contract.test.js'
  'tests/wave_e_remaining_reviewed_ownership_contract.test.js'
  'tests/wave_e_single_entry_family_inventory_contract.test.js'
  'tests/wp_layer_contract_reviewed_ownership_runtime.test.js'
  'tests/wp_layer_contract_v2_runtime.test.js'
  'tests/zustand_delete_pass_stage20_21_audit.md'
  'tests/zustand_routeA_deletepass_bigstep_stage8x_guard.test.js'
  'tools/check_dimension_ledger_closeout.mjs'
  'tools/wp_dimension_migration_retirement_inventory.json'
  'tools/wp_dimension_migration_retirement_inventory.mjs'
)
$Removed = 0
foreach ($RelativePath in $Deleted) {
  $Target = Join-Path $Root ($RelativePath -replace '/', [IO.Path]::DirectorySeparatorChar)
  if (Test-Path -LiteralPath $Target -PathType Leaf) {
    Remove-Item -LiteralPath $Target -Force
    $Removed++
  }
}
Write-Host "WardrobePro Phase 5 patch applied. Removed $Removed historical file(s); current files were already overlaid by extraction."
