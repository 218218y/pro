import test from 'node:test';
import assert from 'node:assert/strict';

import { assertLacksAll, assertMatchesAll, bundleSources, readSource } from './_source_bundle.js';

const families = [
  {
    key: 'runtime-access-family',
    label: 'runtime access family',
    namedOnlyPaths: [
      '../esm/native/runtime/app_roots_access.ts',
      '../esm/native/runtime/build_info_access.ts',
      '../esm/native/runtime/cloud_sync_access.ts',
      '../esm/native/runtime/errors_runtime_access.ts',
      '../esm/native/runtime/install_state_access.ts',
      '../esm/native/runtime/models_access.ts',
      '../esm/native/runtime/platform_boot_runtime_access.ts',
      '../esm/native/runtime/render_context_access.ts',
      '../esm/native/runtime/store_boot_access.ts',
      '../esm/native/runtime/store_reactivity_access.ts',
      '../esm/native/runtime/ui_boot_state_access.ts',
      '../esm/native/runtime/ui_modes_runtime_access.ts',
      '../esm/native/runtime/ui_notes_export_access.ts',
    ],
    bundlePatterns: [
      /export function ensureActionsRootSlot\(/,
      /export function ensureStoreRoot(?:<[^>]+>)?\(/,
      /export function ensureBuildInfoService\(/,
      /export function ensureCloudSyncServiceState\(/,
      /export function ensureErrorsRuntimeService\(/,
      /export function ensureServiceInstallState\(/,
      /ensureModelsService/,
      /export function ensurePlatformBootRuntimeService\(/,
      /export function getRenderContext\(/,
      /export function installStoreReactivityOrThrow\(/,
      /export function hasStoreReactivityInstalled\(/,
      /export function ensureUiBootRuntimeService\(/,
      /export function ensureUiModesRuntimeService\(/,
      /export function ensureUiNotesExportService\(/,
      /export function ensureUiNotesExportRuntimeService\(/,
    ],
    ownerChecks: [
      {
        label: 'models access owner',
        rel: '../esm/native/runtime/models_access.ts',
        patterns: [
          /from '\.\/models_access_shared\.js';/,
          /from '\.\/models_access_service\.js';/,
          /from '\.\/models_access_commands\.js';/,
          /export \{ normalizeModelsCommandReason \} from '\.\/models_access_shared\.js';/,
          /export \{[\s\S]*ensureModelsService,[\s\S]*\} from '\.\/models_access_service\.js';/,
          /export \{[\s\S]*mergeImportedModelsViaServiceOrThrow,[\s\S]*\} from '\.\/models_access_commands\.js';/,
        ],
      },
      {
        label: 'store boot owner',
        rel: '../esm/native/runtime/store_boot_access.ts',
        patterns: [
          /from '\.\/actions_access_core\.js';/,
          /export function installStoreReactivityOrThrow\(/,
          /export function commitBootSeedUiSnapshotOrThrow\(/,
          /const actions = getActions\(app\);/,
          /Canonical actions\.store\.installReactivity\(\) is required/,
          /Canonical actions\.commitUiSnapshot\(ui, meta\) is required/,
        ],
      },
      {
        label: 'ui notes export owner',
        rel: '../esm/native/runtime/ui_notes_export_access.ts',
        patterns: [
          /from '\.\/services_root_access\.js';/,
          /export function ensureUiNotesExportService\(/,
          /export function ensureUiNotesExportRuntimeService\(/,
          /export function markUiNotesExportInstalled\(/,
          /export function setNotesExportTransform\(/,
          /export function clearNotesExportTransform\(/,
        ],
      },
    ],
  },
  {
    key: 'runtime-helper-family',
    label: 'runtime helper family',
    namedOnlyPaths: [
      '../esm/native/runtime/throttled_errors.ts',
      '../esm/native/runtime/browser_file_read.ts',
      '../esm/native/runtime/door_trim_visuals_access.ts',
      '../esm/native/runtime/config_selectors.ts',
      '../esm/native/runtime/runtime_selectors.ts',
      '../esm/native/runtime/canvas_picking_access.ts',
      '../esm/native/runtime/internal_state.ts',
      '../esm/native/runtime/guard.ts',
      '../esm/native/runtime/install_idempotency_patterns.ts',
      '../esm/native/runtime/error_normalization.ts',
      '../esm/native/runtime/errors.ts',
      '../esm/native/runtime/history_system_access.ts',
      '../esm/native/runtime/runtime_config_validation.ts',
      '../esm/native/runtime/owned_async_singleflight.ts',
    ],
    bundlePatterns: [
      /readRuntimeStateFromApp/,
      /readRuntimeScalarOrDefaultFromApp/,
      /readConfigScalarOrDefaultFromApp/,
      /ensureCanvasPickingRuntime/,
      /ensureDoorTrimMaterialCache/,
      /readFileTextResultViaBrowser/,
      /normalizeUnknownError/,
      /guardVoid/,
      /getBootFlags/,
      /hasCallableContract/,
      /ensureHistoryService/,
      /validateRuntimeConfig/,
      /beginOwnedAsyncFamilyFlight/,
      /runOwnedAsyncFamilySingleFlight/,
      /reportErrorThrottled/,
    ],
    ownerChecks: [
      {
        label: 'runtime selectors owner',
        rel: '../esm/native/runtime/runtime_selectors.ts',
        patterns: [
          /from '\.\/root_state_access\.js';/,
          /from '\.\/store_surface_access\.js';/,
          /from '\.\/record\.js';/,
          /readRuntimeScalarOrDefaultFromApp/,
          /const DEFAULTS:/,
        ],
      },
      {
        label: 'config selectors owner',
        rel: '../esm/native/runtime/config_selectors.ts',
        patterns: [
          /from '\.\/config_selectors_scalars\.js';/,
          /from '\.\/config_selectors_readers\.js';/,
          /readConfigScalarOrDefaultFromApp/,
          /readConfigArrayFromSnapshot/,
          /readConfigLooseScalarFromApp/,
        ],
      },
      {
        label: 'history system owner',
        rel: '../esm/native/runtime/history_system_access.ts',
        patterns: [
          /from '\.\/history_system_access_services\.js';/,
          /from '\.\/history_system_access_system\.js';/,
          /ensureHistoryService/,
          /getHistorySystemMaybe/,
          /flushOrPushHistoryStateMaybe/,
        ],
      },
      {
        label: 'owned async singleflight owner',
        rel: '../esm/native/runtime/owned_async_singleflight.ts',
        patterns: [
          /beginOwnedAsyncFamilyFlight/,
          /runOwnedAsyncFamilySingleFlight/,
          /const pending = new Promise<T>\(/,
          /flights\.delete\(owner\)/,
        ],
      },
    ],
  },
  {
    key: 'service-ui-runtime-family',
    label: 'service/ui/runtime family',
    namedOnlyPaths: [
      '../esm/native/services/autosave.ts',
      '../esm/native/services/camera.ts',
      '../esm/native/services/history.ts',
      '../esm/native/services/scene_view.ts',
      '../esm/native/services/scene_runtime.ts',
      '../esm/native/services/render_surface_runtime.ts',
      '../esm/native/services/doors_runtime.ts',
      '../esm/native/services/config_compounds.ts',
      '../esm/native/services/textures_cache.ts',
      '../esm/native/platform/dirty_flag.ts',
      '../esm/native/platform/render_loop_visual_effects.ts',
      '../esm/native/ui/error_overlay.ts',
      '../esm/native/ui/confirmed_action_family_runtime.ts',
      '../esm/native/ui/cloud_sync_mutation_commands.ts',
      '../esm/native/ui/notes_service.ts',
      '../esm/native/ui/runtime/ui_runtime.ts',
      '../esm/native/ui/ui_manifest.ts',
      '../esm/native/ui/ui_boot_controller_runtime.ts',
      '../esm/native/ui/react/overlay_quick_actions_dock_controller_runtime.ts',
      '../esm/native/ui/react/tabs/design_tab_saved_swatches_dnd_controller_runtime.ts',
      '../esm/native/ui/react/tabs/design_tab_color_action_singleflight.ts',
      '../esm/native/ui/react/actions/cloud_sync_actions.ts',
      '../esm/native/services/canvas_picking_core.ts',
    ],
    bundlePatterns: [
      /installAutosaveService/,
      /installCameraService/,
      /installHistoryService/,
      /installSceneViewService/,
      /initializeSceneRuntime/,
      /createViewportSurface/,
      /installDoorsRuntimeService/,
      /installConfigCompoundsService/,
      /installTexturesCacheService/,
      /installDirtyFlag/,
      /createRenderLoopVisualEffects/,
      /showFatalOverlay/,
      /runAppConfirmedActionFamilySingleFlight/,
      /syncSketchNowCommand/,
      /installNotesService/,
      /getUiRuntime/,
      /resolveUiInstallOrder/,
      /createUiBootReporter/,
      /createQuickActionsDockController/,
      /createDesignTabSavedSwatchesDndController/,
      /runDesignTabColorActionSingleFlight/,
      /toggleSite2TabsGate/,
      /handleCanvasClickNDC/,
      /handleCanvasHoverNDC/,
    ],
    ownerChecks: [
      {
        label: 'ui manifest owner',
        rel: '../esm/native/ui/ui_manifest.ts',
        patterns: [
          /const UI_MODULES_MAIN:/,
          /const UI_MODULES_LATE:/,
          /resolveUiInstallOrder/,
          /allUiModules/,
        ],
      },
      {
        label: 'cloud sync mutation owner',
        rel: '../esm/native/ui/cloud_sync_mutation_commands.ts',
        patterns: [
          /from '\.\/react\/actions\/cloud_sync_actions\.js';/,
          /runAppConfirmedActionFamilySingleFlight/,
          /deleteTemporaryModelsWithConfirm/,
          /deleteTemporaryColorsWithConfirm/,
          /syncSketchNowCommand/,
        ],
      },
      {
        label: 'render surface runtime owner',
        rel: '../esm/native/services/render_surface_runtime.ts',
        patterns: [
          /createViewportSurface/,
          /assertThreeViaDeps/,
          /readRendererLike/,
          /writeVec3/,
          /DEFAULT_MIRROR_CUBE_SIZE/,
        ],
      },
      {
        label: 'render surface runtime support owner',
        rel: '../esm/native/services/render_surface_runtime_support.ts',
        patterns: [
          /render_surface_runtime_support_shared\.js/,
          /render_surface_runtime_support_readers\.js/,
          /render_surface_runtime_support_ops\.js/,
          /export \{[\s\S]*readCameraLike[\s\S]*\} from '\.\/render_surface_runtime_support_readers\.js';/,
          /export \{[\s\S]*cloneVec3Like[\s\S]*\} from '\.\/render_surface_runtime_support_ops\.js';/,
        ],
      },
      {
        label: 'render surface runtime support shared',
        rel: '../esm/native/services/render_surface_runtime_support_shared.ts',
        patterns: [
          /export type AppLike = AppContainer \|/,
          /export function readVec3Writable\(/,
          /export function readCameraWritable\(/,
          /export function readRendererWritable\(/,
          /export function clampNumber\(/,
        ],
      },
      {
        label: 'render surface runtime support readers',
        rel: '../esm/native/services/render_surface_runtime_support_readers.ts',
        patterns: [
          /function isVec3LikeValue\(/,
          /function isObject3DCompatible\(/,
          /export function readCameraLike\(/,
          /export function readControlsLike\(/,
          /export function readObject3DLike\(/,
        ],
      },
      {
        label: 'render surface runtime support ops',
        rel: '../esm/native/services/render_surface_runtime_support_ops.ts',
        patterns: [
          /export function writeVec3\(/,
          /export function cloneVec3Like\(/,
          /export function addNode\(/,
          /export function scalePositionAroundTarget\(/,
          /readObject3DLike\(child\)/,
        ],
      },
      {
        label: 'autosave owner',
        rel: '../esm/native/services/autosave.ts',
        patterns: [
          /installAutosaveService/,
          /ensureAutosaveService/,
          /bootstrapAutosaveInfoUi/,
          /commitAutosaveNow/,
          /scheduleAutosave/,
        ],
      },
    ],
  },
];

for (const family of families) {
  const bundle = bundleSources(family.namedOnlyPaths, import.meta.url, { stripNoise: false });

  test(`[${family.key}] named-only seams stay canonical and keep their public entrypoints`, () => {
    for (const rel of family.namedOnlyPaths) {
      const source = readSource(rel, import.meta.url);
      assertLacksAll(assert, source, [/export default\s+/], rel);
    }

    assertMatchesAll(assert, bundle, family.bundlePatterns, family.label + ' bundle');
  });

  test(`[${family.key}] key owners stay composition-first instead of rebuilding compat bags`, () => {
    for (const owner of family.ownerChecks) {
      const source = readSource(owner.rel, import.meta.url);
      assertMatchesAll(assert, source, owner.patterns, owner.label);
    }
  });
}
