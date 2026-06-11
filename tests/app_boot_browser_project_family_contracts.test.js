import test from 'node:test';
import assert from 'node:assert/strict';

import {
  bundleFirstExisting,
  bundleSources,
  readSource,
  assertMatchesAll,
  assertLacksAll,
} from './_source_bundle.js';

{
  const entryOwner = readSource('../esm/entry_pro.ts', import.meta.url);
  const entryBundle = bundleSources(
    [
      '../esm/entry_pro.ts',
      '../esm/entry_pro_shared.ts',
      '../esm/entry_pro_overlay.ts',
      '../esm/entry_pro_start.ts',
      '../esm/entry_pro_start_runtime.ts',
    ],
    import.meta.url
  );

  const mainOwner = readSource('../esm/main.ts', import.meta.url);
  const releaseMainOwner = readSource('../esm/release_main.ts', import.meta.url);
  const bootSequenceOwner = readSource('../esm/boot/boot_sequence.ts', import.meta.url);

  const entryMainOwner = readSource('../esm/entry_pro_main.ts', import.meta.url);
  const entryMainBundle = bundleSources(
    [
      '../esm/entry_pro_main.ts',
      '../esm/entry_pro_main_shared.ts',
      '../esm/entry_pro_main_boot_support.ts',
      '../esm/entry_pro_main_browser_boot.ts',
      '../esm/entry_pro_main_runtime.ts',
    ],
    import.meta.url
  );

  const bootManifestOwner = readSource('../esm/boot/boot_manifest.ts', import.meta.url);
  const bootManifestBundle = bundleSources(
    [
      '../esm/boot/boot_manifest.ts',
      '../esm/boot/boot_manifest_shared.ts',
      '../esm/boot/boot_manifest_steps.ts',
    ],
    import.meta.url
  );

  const bootMain = readSource('../esm/native/ui/boot_main.ts', import.meta.url);
  const uiBootController = readSource('../esm/native/ui/ui_boot_controller_runtime.ts', import.meta.url);
  const uiBootBundle = bundleSources(
    [
      '../esm/native/ui/ui_boot_controller_runtime.ts',
      '../esm/native/ui/ui_boot_controller_shared.ts',
      '../esm/native/ui/ui_boot_controller_reporter.ts',
      '../esm/native/ui/ui_boot_controller_viewport.ts',
      '../esm/native/ui/ui_boot_controller_store.ts',
      '../esm/native/ui/ui_boot_controller_interactions.ts',
    ],
    import.meta.url
  );

  const uiModesOwner = readSource('../esm/native/ui/modes.ts', import.meta.url);
  const uiModesBundle = bundleSources(
    [
      '../esm/native/ui/modes.ts',
      '../esm/native/ui/modes_shared.ts',
      '../esm/native/ui/modes_mode_opts.ts',
      '../esm/native/ui/modes_transition_policy.ts',
    ],
    import.meta.url
  );

  const sidebarApp = readSource('../esm/native/ui/react/sidebar_app.tsx', import.meta.url);
  const sidebarHeader = readSource('../esm/native/ui/react/sidebar_header.tsx', import.meta.url);
  const sidebarHeaderActions = readSource(
    '../esm/native/ui/react/sidebar_header_actions.ts',
    import.meta.url
  );
  const sidebarState = readSource('../esm/native/ui/react/use_sidebar_view_state.ts', import.meta.url);
  const sidebarShared = readSource('../esm/native/ui/react/sidebar_shared.ts', import.meta.url);
  const projectFeedback = readSource('../esm/native/ui/project_action_feedback.ts', import.meta.url);
  const projectSessionCommands = readSource('../esm/native/ui/project_session_commands.ts', import.meta.url);
  const projectUiActionController = readSource(
    '../esm/native/ui/react/project_ui_action_controller_runtime.ts',
    import.meta.url
  );
  const cloudSyncFeedback = bundleSources(
    [
      '../esm/native/ui/cloud_sync_action_feedback.ts',
      '../esm/native/ui/cloud_sync_action_feedback_shared.ts',
      '../esm/native/ui/cloud_sync_action_feedback_toasts.ts',
      '../esm/native/ui/cloud_sync_action_feedback_reports.ts',
    ],
    import.meta.url
  );
  const cloudSyncUiActionController = bundleSources(
    [
      '../esm/native/ui/react/cloud_sync_ui_action_controller_runtime.ts',
      '../esm/native/ui/react/cloud_sync_ui_action_controller_shared.ts',
      '../esm/native/ui/react/cloud_sync_ui_action_controller_commands.ts',
      '../esm/native/ui/react/cloud_sync_ui_action_controller_room.ts',
      '../esm/native/ui/react/cloud_sync_ui_action_controller_mutations.ts',
    ],
    import.meta.url
  );

  const projectLoadHelpers = readSource('../esm/native/io/project_io_load_helpers.ts', import.meta.url);
  const projectLoadHelpersBundle = bundleSources(
    [
      '../esm/native/io/project_io_load_helpers.ts',
      '../esm/native/io/project_io_load_helpers_shared.ts',
      '../esm/native/io/project_io_load_helpers_maps.ts',
      '../esm/native/io/project_io_load_helpers_config.ts',
    ],
    import.meta.url
  );
  const projectLoadOps = readSource('../esm/native/io/project_io_orchestrator_load_ops.ts', import.meta.url);
  const projectLoadOpsBundle = bundleSources(
    [
      '../esm/native/io/project_io_orchestrator_load_ops.ts',
      '../esm/native/io/project_io_orchestrator_project_load.ts',
      '../esm/native/io/project_io_orchestrator_load_file.ts',
      '../esm/native/io/project_io_orchestrator_restore.ts',
    ],
    import.meta.url
  );
  const projectSaveRuntime = readSource('../esm/native/ui/project_save_runtime.ts', import.meta.url);
  const projectSaveRuntimeBundle = bundleSources(
    [
      '../esm/native/ui/project_save_runtime.ts',
      '../esm/native/ui/project_save_runtime_contracts.ts',
      '../esm/native/ui/project_save_runtime_prompt.ts',
      '../esm/native/ui/project_save_runtime_results.ts',
      '../esm/native/ui/project_save_runtime_action.ts',
    ],
    import.meta.url
  );
  const projectResetBundle = bundleSources(
    [
      '../esm/native/services/project_reset_default.ts',
      '../esm/native/services/project_reset_default_payload.ts',
      '../esm/native/services/project_reset_default_action.ts',
    ],
    import.meta.url
  );

  const projectRuntimeDeletePassBundle = bundleSources(
    [
      '../esm/native/runtime/project_io_access.ts',
      '../esm/native/services/project_file_ingress_service.ts',
      '../esm/native/ui/react/project_ui_action_controller_runtime.ts',
      '../esm/native/ui/react/panels/project_panel_actions.ts',
      '../esm/native/ui/react/sidebar_header_actions.ts',
    ],
    import.meta.url
  );

  test('[app-boot-project-family] entry owners stay thin while startup and browser boot policy live on dedicated seams', () => {
    assertMatchesAll(
      assert,
      entryOwner,
      [
        /entry_pro_overlay\.js/,
        /entry_pro_start\.js/,
        /showBootFatalOverlayFallback/,
        /autoStartEntryPro\(\)/,
      ],
      'entryOwner'
    );
    assertLacksAll(
      assert,
      entryOwner,
      [/function installEarlyHandlers\(/, /async function startEntryPro\(/, /createBootErrorPolicy\(/],
      'entryOwner'
    );

    assertMatchesAll(
      assert,
      entryBundle,
      [
        /export type BootFatalFallbackOpts = \{/,
        /export function reportEntryBestEffort\(/,
        /export function showBootFatalOverlayFallback\(/,
        /installEntryProEarlyHandlers as installEarlyHandlers/,
        /startEntryProRuntime as startEntryPro/,
        /export async function startEntryProRuntime\(/,
      ],
      'entryBundle'
    );

    assertMatchesAll(
      assert,
      entryMainOwner,
      [
        /entry_pro_main_boot_support\.js/,
        /entry_pro_main_browser_boot\.js/,
        /entry_pro_main_runtime\.js/,
        /loadThreeEsm/,
        /resolveRuntimeConfig/,
        /runBrowserBootSetup/,
        /showFatalOverlayMaybe/,
      ],
      'entryMainOwner'
    );
    assertLacksAll(
      assert,
      entryMainOwner,
      [/function parseRuntimeConfigModule\(/, /async function loadThreeEsm\(/, /function installReactUi\(/],
      'entryMainOwner'
    );

    assertMatchesAll(
      assert,
      entryMainBundle,
      [
        /export function parseRuntimeConfigModule\(/,
        /export async function loadThreeEsm\(/,
        /export function resolveRuntimeConfig\(/,
        /export async function runBrowserBootSetup\(/,
        /export async function bootProEntryRuntime\(/,
      ],
      'entryMainBundle'
    );

    assertMatchesAll(
      assert,
      mainOwner,
      [
        /app_container\.js/,
        /boot_sequence\.js/,
        /export function createApp\(/,
        /export async function boot\(/,
      ],
      'mainOwner'
    );
    assertMatchesAll(
      assert,
      releaseMainOwner,
      [
        /createAppCore/,
        /bootCore/,
        /bootReactUi/,
        /export function createApp\(/,
        /export async function boot\(/,
      ],
      'releaseMainOwner'
    );
    assertMatchesAll(
      assert,
      bootSequenceOwner,
      [/runBootManifest\(/, /export async function bootSequence\(/],
      'bootSequenceOwner'
    );

    assertLacksAll(
      assert,
      [entryOwner, entryMainOwner, mainOwner, releaseMainOwner, bootSequenceOwner].join('\n'),
      [/export default\s+/],
      'entry/runtime boot surfaces named-only'
    );
  });

  test('[app-boot-project-family] boot manifest and ui boot seams stay canonical', () => {
    assertMatchesAll(
      assert,
      bootManifestOwner,
      [/boot_manifest_steps\.js/, /boot_manifest_shared\.js/, /export async function runBootManifest\(/],
      'bootManifestOwner'
    );
    assertMatchesAll(
      assert,
      bootManifestBundle,
      [
        /export function requireBootInstaller\(/,
        /export async function installUiModules\(/,
        /export const BOOT_STEPS:/,
        /installUiMainModulesStep/,
        /installUiLateModulesStep/,
      ],
      'bootManifestBundle'
    );

    assertMatchesAll(
      assert,
      bootMain,
      [
        /createUiBootReporter/,
        /ensureUiBootViewportContext/,
        /installUiBootStoreSeedAndHistory/,
        /installUiBootInteractions/,
        /primeUiBootCamera/,
      ],
      'bootMain'
    );
    assertLacksAll(assert, bootManifestOwner, [/export default\s+/], 'bootManifestOwner');
    assertLacksAll(
      assert,
      bootMain,
      [
        /export default\s+/,
        /createViewportSurface\(/,
        /initializeViewportSceneSync\(/,
        /installCanvasInteractions\(/,
        /commitBootSeedUiSnapshotOrThrow\(/,
      ],
      'bootMain'
    );

    assertMatchesAll(
      assert,
      uiBootController,
      [
        /export \{ createUiBootReporter \} from '\.\/ui_boot_controller_reporter\.js';/,
        /export \{[\s\S]*ensureUiBootViewportContext,[\s\S]*primeUiBootCamera,[\s\S]*\} from '\.\/ui_boot_controller_viewport\.js';/,
        /export \{ installUiBootStoreSeedAndHistory \} from '\.\/ui_boot_controller_store\.js';/,
        /export \{ installUiBootInteractions \} from '\.\/ui_boot_controller_interactions\.js';/,
      ],
      'uiBootController'
    );
    assertMatchesAll(
      assert,
      uiBootBundle,
      [
        /export function createUiBootReporter\(/,
        /export function ensureUiBootViewportContext\(/,
        /export function installUiBootStoreSeedAndHistory\(/,
        /export function installUiBootInteractions\(/,
        /runPlatformRenderFollowThrough\(App, \{ updateShadows: !!updateShadows, ensureRenderLoop: false \}\)/,
      ],
      'uiBootBundle'
    );
  });

  test('[app-boot-project-family] ui modes and sidebar keep canonical shells while helpers live on focused seams', () => {
    assertMatchesAll(
      assert,
      uiModesOwner,
      [
        /\.\/modes_shared\.js/,
        /\.\/modes_mode_opts\.js/,
        /\.\/modes_transition_policy\.js/,
        /export function applyModeOpts\(/,
        /export function installModesController\(/,
      ],
      'uiModesOwner'
    );
    assertMatchesAll(
      assert,
      uiModesBundle,
      [
        /export function getPrimaryModeValue\(/,
        /export function applyModeOptsImpl\(/,
        /export function enterPrimaryModeImpl\(/,
        /export function exitPrimaryModeImpl\(/,
        /export function togglePrimaryModeImpl\(/,
      ],
      'uiModesBundle'
    );

    assertMatchesAll(
      assert,
      sidebarApp,
      [
        /import \{ SidebarHeader \} from '\.\/sidebar_header\.js';/,
        /import \{ DeferredSidebarTabsLazy, TABS, prefetchDeferredSidebarTabs \} from '\.\/sidebar_shared\.js';/,
        /import \{ useSidebarViewState \} from '\.\/use_sidebar_view_state\.js';/,
        /export function ReactSidebarApp\(/,
      ],
      'sidebarApp'
    );
    assertLacksAll(
      assert,
      sidebarApp,
      [/function HeaderBar\(/, /function buildCleanDefaultProjectData\(/, /function readCloudSyncService\(/],
      'sidebarApp'
    );

    assertMatchesAll(
      assert,
      sidebarHeader,
      [
        /export function SidebarHeader\(/,
        /useSidebarHeaderActions\(\)/,
        /onClick=\{handleOpenPdf\}/,
        /onClick=\{handleSaveProject\}/,
      ],
      'sidebarHeader'
    );
    assertMatchesAll(
      assert,
      sidebarHeaderActions,
      [
        /export function useSidebarHeaderActions\(\): SidebarHeaderActionsState \{/,
        /createProjectUiActionController\(/,
        /createCloudSyncUiActionController\(/,
        /void projectUiController\.resetToDefault\(\);/,
        /projectUiController\.saveProject\(\);/,
        /await projectUiController\.handleLoadInputChange\(e\);/,
      ],
      'sidebarHeaderActions'
    );
    assertMatchesAll(
      assert,
      sidebarState,
      [
        /export function useSidebarViewState\(\): SidebarViewState \{/,
        /function prefetchSidebarTabIntent\(/,
        /exitPrimaryMode\(app, undefined, \{[\s\S]*source: 'react:sidebar:bgclick'/,
      ],
      'sidebarState'
    );
    assertMatchesAll(
      assert,
      sidebarShared,
      [
        /export function prefetchDeferredSidebarTabs\(/,
        /export const DeferredSidebarTabsLazy = (?:React\.lazy|lazy)/,
        /export function getSite2EnabledTabs\(/,
        /export function readCloudSyncService\(/,
      ],
      'sidebarShared'
    );
  });

  test('[app-boot-project-family] project command and feedback seams stay split across focused load/save/reset owners', () => {
    assertMatchesAll(
      assert,
      projectLoadHelpers,
      [
        /project_io_load_helpers_shared\.js/,
        /project_io_load_helpers_config\.js/,
        /export function buildProjectConfigSnapshot\(/,
      ],
      'projectLoadHelpers'
    );
    assertMatchesAll(
      assert,
      projectLoadHelpersBundle,
      [
        /export function captureProjectPrevUiMode\(/,
        /export function readMirrorLayoutConfigMap\(/,
        /export function buildProjectConfigSnapshot\(/,
      ],
      'projectLoadHelpersBundle'
    );

    assertMatchesAll(
      assert,
      projectLoadOps,
      [
        /project_io_orchestrator_load_file\.js/,
        /project_io_orchestrator_project_load\.js/,
        /project_io_orchestrator_restore\.js/,
        /export function createProjectIoLoadOps\(/,
      ],
      'projectLoadOps'
    );
    assertMatchesAll(
      assert,
      projectLoadOpsBundle,
      [
        /export function createProjectFileLoadHandler\(/,
        /export function createProjectDataLoader\(/,
        /export function createProjectSessionRestore\(/,
      ],
      'projectLoadOpsBundle'
    );

    assertMatchesAll(
      assert,
      projectFeedback,
      [
        /project_action_feedback_shared\.js/,
        /project_action_feedback_load_restore\.js/,
        /project_action_feedback_save_reset\.js/,
        /export function getProjectLoadToast\(/,
        /export function getProjectSaveToast\(/,
        /export function getResetDefaultToast\(/,
      ],
      'projectFeedback'
    );
    assertMatchesAll(
      assert,
      projectSessionCommands,
      [
        /project_session_commands_restore\.js/,
        /project_session_commands_reset\.js/,
        /export \{ restoreProjectSessionWithConfirm \} from '\.\/project_session_commands_restore\.js';/,
        /export \{ resetProjectToDefaultWithConfirm \} from '\.\/project_session_commands_reset\.js';/,
      ],
      'projectSessionCommands'
    );
    assertMatchesAll(
      assert,
      projectUiActionController,
      [
        /project_action_execution\.js/,
        /project_ui_action_controller_load\.js/,
        /project_ui_action_controller_recovery\.js/,
        /project_ui_action_controller_save\.js/,
        /export function createProjectUiActionController\(/,
        /runProjectUiLoadInputChange\(args, evt\)/,
        /runProjectUiResetToDefault\(args\)/,
        /runProjectUiSaveAction\(args\)/,
      ],
      'projectUiActionController'
    );
    assertMatchesAll(
      assert,
      cloudSyncFeedback,
      [
        /cloud_sync_action_feedback_shared\.js/,
        /cloud_sync_action_feedback_toasts\.js/,
        /cloud_sync_action_feedback_reports\.js/,
        /export function getSite2TabsGateToast\(/,
        /export function reportSite2TabsGateResult\(/,
      ],
      'cloudSyncFeedback'
    );
    assertMatchesAll(
      assert,
      cloudSyncUiActionController,
      [
        /cloud_sync_ui_action_controller_commands\.js/,
        /cloud_sync_ui_action_controller_room\.js/,
        /cloud_sync_ui_action_controller_mutations\.js/,
        /export function createCloudSyncUiActionController\(/,
        /runCloudSyncUiToggleRoomMode\(/,
        /runCloudSyncUiCopyShareLink\(/,
        /runCloudSyncUiToggleSite2TabsGate\(/,
      ],
      'cloudSyncUiActionController'
    );
  });

  test('[app-boot-project-family] project save and reset stay on canonical runtime/payload seams', () => {
    assertMatchesAll(
      assert,
      projectSaveRuntime,
      [
        /project_save_runtime_prompt\.js/,
        /project_save_runtime_action\.js/,
        /project_save_runtime_contracts\.js/,
        /export function runEnsureSaveProjectAction\(/,
      ],
      'projectSaveRuntime'
    );
    assertMatchesAll(
      assert,
      projectSaveRuntimeBundle,
      [
        /export function asUiFeedbackPrompt\(/,
        /export function createProjectSavePromptFallback\(/,
        /export function buildProjectSaveExportFailureResult\(/,
        /export function scheduleSaveResultToast\(/,
        /export function runEnsureSaveProjectAction\(/,
      ],
      'projectSaveRuntimeBundle'
    );
    assertMatchesAll(
      assert,
      projectResetBundle,
      [
        /export function buildResetDefaultProjectData\(/,
        /export function readResetDefaultProjectPayload\(/,
        /export function buildResetDefaultProjectLoadOpts\(/,
        /export function resetProjectToDefaultActionResult\(/,
        /export function resetProjectToDefault\(/,
      ],
      'projectResetBundle'
    );
    assertLacksAll(assert, projectResetBundle, [/export default\s+/], 'projectResetBundle');
    assertLacksAll(
      assert,
      projectRuntimeDeletePassBundle,
      [/export default\s+/],
      'projectRuntimeDeletePassBundle'
    );
    assertMatchesAll(
      assert,
      projectRuntimeDeletePassBundle,
      [
        /export \{[\s\S]*ensureProjectIoService,/,
        /export async function loadProjectFileInputViaService\(/,
        /export function createProjectUiActionController\(/,
        /export function useProjectPanelActions\(/,
        /export function useSidebarHeaderActions\(/,
      ],
      'projectRuntimeDeletePassBundle'
    );
  });
}

{
  const uiRuntime = readSource('../esm/native/ui/runtime/ui_runtime.ts', import.meta.url);
  const uiBootBundle = bundleSources(
    [
      '../esm/native/ui/boot_main.ts',
      '../esm/native/ui/ui_boot_controller_runtime.ts',
      '../esm/native/ui/ui_boot_controller_shared.ts',
      '../esm/native/ui/ui_boot_controller_interactions.ts',
      '../esm/native/ui/react/boot_react_ui.tsx',
    ],
    import.meta.url
  );
  const appLayerBundle = bundleFirstExisting(
    [
      ['../esm/app_container.ts', '../esm/app_container.js'],
      ['../esm/boot/boot_manifest.ts', '../esm/boot/boot_manifest.js'],
      ['../esm/native/core/install.ts', '../esm/native/core/install.js'],
      ['../esm/native/engine/install.ts', '../esm/native/engine/install.js'],
    ],
    import.meta.url,
    { stripNoise: true }
  );
  const runtimeParityBundle = bundleSources(
    [
      '../esm/native/runtime/boot_entry_access.ts',
      '../esm/native/runtime/platform_access.ts',
      '../esm/native/runtime/platform_access_shared.ts',
      '../esm/native/runtime/builder_deps_access.ts',
      '../esm/native/runtime/service_access.ts',
      '../esm/native/runtime/store_boot_access.ts',
      '../esm/native/runtime/store_reactivity_access.ts',
      '../esm/native/runtime/history_system_access.ts',
      '../esm/native/runtime/history_system_access_system.ts',
      '../esm/native/runtime/api.ts',
      '../esm/native/services/api.ts',
    ],
    import.meta.url,
    { stripNoise: true }
  );
  const projectDragDrop = readSource('../esm/native/ui/interactions/project_drag_drop.ts', import.meta.url);
  const projectDragDropController = [
    readSource('../esm/native/ui/interactions/project_drag_drop_controller_runtime.ts', import.meta.url),
    readSource('../esm/native/ui/interactions/project_drag_drop_controller_visual.ts', import.meta.url),
  ].join('\n');
  const primaryMode = readSource('../esm/native/ui/primary_mode.ts', import.meta.url);
  const projectPanel = readSource('../esm/native/ui/react/panels/ProjectPanel.tsx', import.meta.url);
  const sidebarHeader = readSource('../esm/native/ui/react/sidebar_header.tsx', import.meta.url);
  const cloudSyncPanel = readSource('../esm/native/ui/react/panels/CloudSyncPanel.tsx', import.meta.url);
  const exportTab = readSource('../esm/native/ui/react/tabs/ExportTab.tsx', import.meta.url);
  const orderPdfEditorSurface = readSource(
    '../esm/native/ui/react/pdf/order_pdf_overlay_editor_surface.tsx',
    import.meta.url
  );
  const orderPdfToolbar = readSource(
    '../esm/native/ui/react/pdf/order_pdf_overlay_toolbar.tsx',
    import.meta.url
  );
  const smoke = readSource('../tests/e2e/smoke.spec.ts', import.meta.url);
  const smokeHelpers = readSource('../tests/e2e/helpers/project_flows.ts', import.meta.url);
  const designTabColorSection = readSource(
    '../esm/native/ui/react/tabs/design_tab_color_section.tsx',
    import.meta.url
  );
  const userPaths = readSource('../tests/e2e/user_paths.spec.ts', import.meta.url);
  const resiliencePaths = readSource('../tests/e2e/resilience.spec.ts', import.meta.url);
  const authoringBuilds = readSource('../tests/e2e/authoring_builds.spec.ts', import.meta.url);
  const browserPerfSupport = readSource('../tools/wp_browser_perf_support.js', import.meta.url);
  const browserPerfSmoke = readSource('../tools/wp_browser_perf_smoke.mjs', import.meta.url);

  test('[ui-browser-boot] ui runtime keys stay ui:-namespaced and installers use the canonical runtime', () => {
    assertMatchesAll(
      assert,
      uiRuntime,
      [/function safeUiKey\(/, /return k\.startsWith\('ui:'\) \? k : '';/, /safeUiKey\(key\)/],
      'uiRuntime'
    );
    assert.ok(
      (uiRuntime.match(/safeUiKey\(key\)/g) || []).length >= 4,
      'safeUiKey(key) should guard install/get/set/clear'
    );

    assertMatchesAll(
      assert,
      uiBootBundle,
      [/\.install\('ui:/, /ui:viewerResize/, /ui:canvasInteractions/, /ui:historyUi/, /ui:projectDragDrop/],
      'uiBootBundle'
    );
  });

  test('[ui-browser-boot] app layers and runtime access parity stay on canonical helper seams', () => {
    assertMatchesAll(
      assert,
      appLayerBundle,
      [/layers:\s*ns\(\)/, /installCoreLayerSurface\(/, /installEngineLayerSurface\(/],
      'appLayerBundle'
    );

    assertMatchesAll(
      assert,
      runtimeParityBundle,
      [
        /getBootStartEntry\(/,
        /ensurePlatformService\(/,
        /getBuilderDepsRoot\(/,
        /getTools\(/,
        /getUiFeedback\(/,
        /installStoreReactivityMaybe\(/,
        /hasStoreReactivityInstalled\(/,
        /getHistorySystemMaybe\(/,
      ],
      'runtimeParityBundle'
    );
    assertLacksAll(
      assert,
      runtimeParityBundle,
      [
        /App\.services\.uiBoot/,
        /App\.services\.appStart/,
        /App\.services\.platform/,
        /App\.deps\.builder/,
        /a\.stateKernel/,
        /events_api\.js/,
        /\bbindPassive\b/,
        /\bbindOnce\b/,
        /\bonDomReady\b/,
      ],
      'runtimeParityBundle'
    );
    assert.doesNotMatch(runtimeParityBundle, /\bbind\b\s*,\s*\n/);
    assert.doesNotMatch(runtimeParityBundle, /\bunbind\b\s*,\s*\n/);
  });

  test('[ui-browser-boot] DOM/body-class, export surface, and project roundtrip seams stay shared', () => {
    assert.match(projectDragDrop, /createProjectDragDropController\(App, deps\)/);
    assert.match(projectDragDropController, /toggleBodyClass\(doc, 'is-dragover', false\)/);
    assert.match(projectDragDropController, /toggleBodyClass\(doc, 'is-dragover', true\)/);
    assert.match(primaryMode, /toggleBodyClass\(doc, 'wp-primary-mode-active', !!\(m && m !== NONE\)\)/);
    assert.doesNotMatch(projectDragDrop, /body\.classList\./);
    assert.doesNotMatch(primaryMode, /body\.classList\./);

    assert.match(projectPanel, /data-testid="project-name-input"/);
    assert.match(projectPanel, /data-testid="project-save-button"/);
    assert.match(projectPanel, /data-testid="project-load-input"/);
    assert.match(projectPanel, /data-testid="project-restore-button"/);
    assert.match(projectPanel, /readAutosaveInfoFromStorage\(/);

    assert.match(designTabColorSection, /data-testid="design-color-section"/);
    assert.match(designTabColorSection, /data-testid="design-color-swatch-row"/);
    assert.match(designTabColorSection, /data-testid="design-color-swatch-item"/);
    assert.match(designTabColorSection, /data-testid="design-custom-color-toggle"/);
    assert.match(designTabColorSection, /data-testid="design-custom-color-input"/);
    assert.match(designTabColorSection, /data-testid="design-custom-color-save-button"/);
    assert.match(designTabColorSection, /data-testid="design-selected-color-delete-button"/);
    assert.doesNotMatch(projectPanel, /JSON\.parse\(/);
    assert.doesNotMatch(projectPanel, /getStorageString\(/);

    assert.match(sidebarHeader, /data-testid="header-project-save-button"/);
    assert.match(sidebarHeader, /data-testid="header-project-load-button"/);
    assert.match(sidebarHeader, /data-testid="header-project-load-input"/);
    assert.match(sidebarHeader, /data-testid="header-sketch-toggle-button"/);
    assert.match(sidebarHeader, /data-testid="header-open-pdf-button"/);

    assert.match(cloudSyncPanel, /data-testid="cloud-sync-panel"/);
    assert.match(cloudSyncPanel, /data-testid="cloud-sync-status"/);
    assert.match(cloudSyncPanel, /data-testid="cloud-sync-room-mode-button"/);
    assert.match(cloudSyncPanel, /data-testid="cloud-sync-copy-link-button"/);
    assert.match(cloudSyncPanel, /data-testid="cloud-sync-sync-sketch-button"/);
    assert.match(cloudSyncPanel, /data-testid="cloud-sync-delete-models-button"/);
    assert.match(cloudSyncPanel, /data-testid="cloud-sync-delete-colors-button"/);
    assert.match(cloudSyncPanel, /data-testid="cloud-sync-floating-pin-toggle"/);

    assert.match(exportTab, /testId="export-snapshot-button"/);
    assert.match(exportTab, /testId="export-copy-button"/);
    assert.match(exportTab, /testId="export-render-sketch-button"/);
    assert.match(exportTab, /testId="export-dual-image-button"/);
    assert.match(exportTab, /testId="export-open-pdf-button"/);
    assert.match(orderPdfEditorSurface, /data-testid="order-pdf-overlay"/);
    assert.match(orderPdfToolbar, /data-testid="order-pdf-close-button"/);
    assert.match(orderPdfToolbar, /data-testid="order-pdf-refresh-button"/);
    assert.match(orderPdfToolbar, /data-testid="order-pdf-load-button"/);
    assert.match(orderPdfToolbar, /data-testid="order-pdf-load-input"/);
    assert.match(orderPdfToolbar, /data-testid="order-pdf-download-button"/);
    assert.match(orderPdfToolbar, /data-testid="order-pdf-print-button"/);
    assert.match(orderPdfToolbar, /data-testid="order-pdf-gmail-button"/);
    assert.match(orderPdfToolbar, /data-testid="order-pdf-download-gmail-button"/);
    assert.match(orderPdfToolbar, /data-testid="order-pdf-toggle-render-sketch"/);
    assert.match(orderPdfToolbar, /data-testid="order-pdf-toggle-open-closed"/);
    assert.match(smokeHelpers, /export async function expectOrderPdfOverlayToolbar/);
    assert.match(smoke, /expectOrderPdfOverlayToolbar\(/);

    assert.match(smokeHelpers, /export async function openMainTab/);
    assert.match(smokeHelpers, /export async function saveProjectViaHeader/);
    assert.match(smokeHelpers, /export async function loadProjectViaHeader/);
    assert.match(smokeHelpers, /export async function fillProjectName/);
    assert.match(smokeHelpers, /export async function openOrderPdfOverlayFromExport/);
    assert.match(smokeHelpers, /export async function closeOrderPdfOverlay/);
    assert.match(smokeHelpers, /export async function addSavedDesignColor/);
    assert.match(smokeHelpers, /export async function deleteSavedDesignColor/);
    assert.match(smokeHelpers, /export async function importSettingsBackupFromFile/);
    assert.match(smokeHelpers, /export async function readUiStateFingerprint/);
    assert.match(smokeHelpers, /export async function expectUiStateFingerprint/);
    assert.match(smokeHelpers, /export async function triggerRestoreLastSessionViaProjectPanel/);
    assert.match(smokeHelpers, /export async function expectRestoreLastSessionUnavailable/);
    assert.match(smokeHelpers, /export async function restoreLastSessionViaProjectPanel/);

    assert.match(smokeHelpers, /viewer\.locator\('canvas'\)\.first\(\)/);
    assert.doesNotMatch(smoke, /viewer\.locator\('canvas'\)\.first\(\)/);
    assert.match(smoke, /header-sketch-toggle-button/);
    assert.match(smokeHelpers, /export-open-pdf-button/);
    assert.doesNotMatch(smoke, /export-open-pdf-button/);
    assert.match(smoke, /openOrderPdfOverlayFromExport\(/);
    assert.match(smoke, /closeOrderPdfOverlay\(/);
    assert.match(smoke, /saveProjectViaHeader\(/);
    assert.match(smoke, /loadProjectViaHeader\(/);
    assert.match(smoke, /toHaveValue\(savedName\)/);

    assert.match(userPaths, /addSavedDesignColor\(/);
    assert.match(userPaths, /importSettingsBackupFromFile\(/);
    assert.match(userPaths, /expectUiStateFingerprint\(/);
    assert.match(userPaths, /restoreLastSessionViaProjectPanel\(/);
    assert.match(userPaths, /Repeated restore-last-session should remain stable/);
    assert.match(userPaths, /Repeated export\/pdf pressure should preserve user state/);
    assert.match(userPaths, /expectPerfMetricCount\(page, 'orderPdf\.open', 3\)/);
    assert.match(resiliencePaths, /expectRestoreLastSessionUnavailable\(/);
    assert.match(resiliencePaths, /expectUiStateFingerprint\(/);
    assert.match(resiliencePaths, /project\.restoreLastSession/);
    assert.match(resiliencePaths, /toEqual\(\[\]\)/);
    assert.match(resiliencePaths, /settingsBackup\.import/);
    assert.match(authoringBuilds, /measureBuildAndRenderDelta\(/);
    assert.match(authoringBuilds, /readBuildDebugStats\(/);
    assert.match(authoringBuilds, /readRenderDebugStats\(/);
    assert.match(
      authoringBuilds,
      /authored structure, design, and interior state rebuilds cleanly after project load/
    );
    assert.match(
      authoringBuilds,
      /corner cabinet authoring triggers real build work and roundtrips through project load/
    );
    assert.match(
      authoringBuilds,
      /chest authoring triggers real build work and roundtrips through project load/
    );
    assert.match(
      authoringBuilds,
      /library authoring triggers real build work and roundtrips through project load/
    );
    assert.match(authoringBuilds, /sliding structure authoring rebuilds cleanly after project load/);
    assert.match(
      authoringBuilds,
      /stack split and per-cell dimensions rebuild cleanly and keep lower stack isolated/
    );
    assert.match(authoringBuilds, /setCornerMode\(/);
    assert.match(authoringBuilds, /setChestMode\(/);
    assert.match(authoringBuilds, /setLibraryMode\(/);
    assert.match(authoringBuilds, /setStackSplitEnabled\(/);
    assert.match(authoringBuilds, /setCellDimsMode\(/);
    assert.match(authoringBuilds, /applyCellDimsToReachableLinearModule\(/);
    assert.match(authoringBuilds, /setStructureDoors\(/);
    assert.match(authoringBuilds, /expected a real build execution/);

    assert.match(browserPerfSupport, /export function classifyRuntimeMetricDomain\(/);
    assert.match(browserPerfSupport, /export function createPerfDomainSummary\(/);
    assert.match(browserPerfSupport, /export function createRuntimeOutcomeCoverageSummary\(/);
    assert.match(browserPerfSupport, /export function createRuntimeStatusTransitionSummary\(/);
    assert.match(browserPerfSupport, /const CLEAN_RECOVERY_OK_STREAK = 3/);
    assert.match(browserPerfSupport, /export function createRuntimeRecoverySequenceSummary\(/);
    assert.match(browserPerfSupport, /export function createRuntimeRecoveryDebtSummary\(/);
    assert.match(browserPerfSupport, /export function createStoreDebugSummary\(/);
    assert.match(browserPerfSupport, /export function createStoreFlowPressureSummary\(/);
    assert.match(browserPerfSupport, /export function createUserJourneySummary\(/);
    assert.match(browserPerfSupport, /export function createUserJourneyBudget\(/);
    assert.match(browserPerfSupport, /export function rankStoreDebugSources\(/);
    assert.match(browserPerfSupport, /export function rankStoreFlowPressure\(/);
    assert.match(browserPerfSupport, /export function rankUserJourneys\(/);
    assert.match(browserPerfSupport, /export function createRuntimeRecoveryHangoverSummary\(/);
    assert.match(browserPerfSupport, /export function rankPerfDomains\(/);
    assert.match(browserPerfSupport, /export function rankRuntimeOutcomeCoverage\(/);
    assert.match(browserPerfSupport, /export function rankRuntimeRecoverySequences\(/);
    assert.match(browserPerfSupport, /export function rankRuntimeRecoveryDebt\(/);
    assert.match(browserPerfSupport, /export function rankRuntimeRecoveryHangover\(/);
    assert.match(browserPerfSupport, /export function rankRuntimeStatusTransitions\(/);
    assert.match(browserPerfSupport, /runtimeDomainBudgetMs/);
    assert.match(browserPerfSupport, /runtimeRecoveryDebtBudgetMs/);
    assert.match(browserPerfSupport, /runtimeRecoveryHangoverBudget/);
    assert.match(browserPerfSupport, /storePressureBudget/);
    assert.match(browserPerfSupport, /userJourneyBudget/);
    assert.match(browserPerfSupport, /requiredUserJourneys/);
    assert.match(browserPerfSupport, /requiredUserJourneyMinimumStepCounts/);
    assert.match(browserPerfSupport, /Store write pressure/);
    assert.match(browserPerfSupport, /Customer journeys/);
    assert.match(browserPerfSupport, /Required customer journey coverage/);
    assert.match(browserPerfSupport, /requiredRuntimeDomains/);
    assert.match(browserPerfSupport, /requiredRuntimeOutcomeCoverage/);
    assert.match(browserPerfSupport, /requiredRuntimeRecoverySequences/);
    assert.match(browserPerfSupport, /cleanRecoveryCount/);
    assert.match(browserPerfSupport, /maxRelapseCount/);
    assert.match(browserPerfSupport, /Runtime recovery proveout/);
    assert.match(browserPerfSupport, /requiredRuntimeStatusTransitions/);
    assert.match(browserPerfSmoke, /windowPerfDomainSummary/);
    assert.match(browserPerfSmoke, /windowPerfOutcomeSummary/);
    assert.match(browserPerfSmoke, /windowPerfRecoverySequenceSummary/);
    assert.match(browserPerfSmoke, /windowPerfRecoveryDebtSummary/);
    assert.match(browserPerfSmoke, /windowPerfRecoveryHangoverSummary/);
    assert.match(browserPerfSmoke, /windowStoreDebugSummary/);
    assert.match(browserPerfSmoke, /userJourneySummary/);
    assert.match(browserPerfSmoke, /cabinet-core\.mixed-edit-burst/);
    assert.match(browserPerfSmoke, /project\.persistence-recovery\.burst/);
    assert.match(browserPerfSmoke, /cabinet-build-variants\.authoring-matrix/);
    assert.match(browserPerfSmoke, /cabinet-build-variants\.structure-material-door-burst/);
    assert.match(browserPerfSmoke, /cabinet-door-drawer-authoring\.configure/);
    assert.match(browserPerfSmoke, /cabinet-door-drawer-authoring\.layout-persistence-roundtrip/);
    assert.match(browserPerfSmoke, /cabinet-door-drawer-authoring\.layout-scenario-matrix-roundtrip/);
    assert.match(browserPerfSmoke, /USER_JOURNEYS/);
    assert.match(browserPerfSmoke, /resolveBrowserPerfBaselinePath/);
    assert.match(browserPerfSmoke, /windowStoreDebugTopSources/);
    assert.match(browserPerfSmoke, /windowStoreFlowPressureSummary/);
    assert.match(browserPerfSmoke, /windowPerfTransitionSummary/);
    assert.match(browserPerfSmoke, /createPerfDomainSummary\(/);
    assert.match(browserPerfSmoke, /createRuntimeOutcomeCoverageSummary\(/);
    assert.match(browserPerfSmoke, /createRuntimeRecoverySequenceSummary\(/);
    assert.match(browserPerfSmoke, /createRuntimeRecoveryDebtSummary\(/);
    assert.match(browserPerfSmoke, /createRuntimeRecoveryHangoverSummary\(/);
    assert.match(browserPerfSmoke, /createStoreDebugSummary\(/);
    assert.match(browserPerfSmoke, /createStoreFlowPressureSummary\(/);
    assert.match(browserPerfSmoke, /rankStoreDebugSources\(/);
    assert.match(browserPerfSmoke, /createRuntimeStatusTransitionSummary\(/);
    assert.match(browserPerfSmoke, /project\.load\.invalid-preserves-state/);
    assert.match(browserPerfSmoke, /project\.load\.recovery-restores-state/);
    assert.match(browserPerfSmoke, /project\.load\.recovery-stays-stable/);
    assert.match(browserPerfSmoke, /project\.load\.recovery-clean-window/);
    assert.match(browserPerfSmoke, /project\.restore-last-session\.missing-autosave-preserves-state/);
    assert.match(browserPerfSmoke, /project\.restore-last-session\.recovery-restores-state/);
    assert.match(browserPerfSmoke, /project\.restore-last-session\.recovery-stays-stable/);
    assert.match(browserPerfSmoke, /project\.restore-last-session\.recovery-clean-window/);
    assert.match(browserPerfSmoke, /settings-backup\.invalid-import-preserves-state/);
    assert.match(browserPerfSmoke, /settings-backup\.recovery-import-restores-state/);
    assert.match(browserPerfSmoke, /settings-backup\.recovery-import-stays-stable/);
    assert.match(browserPerfSmoke, /settings-backup\.recovery-import-clean-window/);
  });
}
