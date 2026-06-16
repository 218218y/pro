import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  bundleSources,
  readSource,
  assertMatchesAll,
  assertLacksAll,
  normalizeWhitespace,
} from './_source_bundle.js';
import { readFirstExisting } from './_read_src.js';

const storeUiActionFiles = [
  '../esm/native/ui/react/actions/store_actions_ui.ts',
  '../esm/native/ui/react/actions/store_actions_ui_writes.ts',
  '../esm/native/ui/react/actions/store_actions_ui_project.ts',
  '../esm/native/ui/react/actions/store_actions_ui_structure.ts',
  '../esm/native/ui/react/actions/store_actions_ui_render.ts',
];

const storeConfigActionFiles = [
  '../esm/native/ui/react/actions/store_actions_config.ts',
  '../esm/native/ui/react/actions/store_actions_config_contracts.ts',
  '../esm/native/ui/react/actions/store_actions_config_project.ts',
  '../esm/native/ui/react/actions/store_actions_config_maps.ts',
  '../esm/native/ui/react/actions/store_actions_config_modes.ts',
];
const read = rel => normalizeWhitespace(fs.readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8'));

const settingsTabOwner = readSource('../esm/native/ui/react/tabs/SettingsTab.tsx', import.meta.url);
const renderController = bundleSources(
  [
    '../esm/native/ui/react/tabs/use_settings_visual_controller.ts',
    '../esm/native/ui/react/tabs/use_settings_visual_controller_contracts.ts',
    '../esm/native/ui/react/tabs/use_settings_visual_controller_state.ts',
    '../esm/native/ui/react/tabs/use_settings_visual_controller_sections.ts',
  ],
  import.meta.url
);
const renderSectionsOwner = readSource(
  '../esm/native/ui/react/tabs/settings_visual_sections.tsx',
  import.meta.url
);
const renderSections = bundleSources(
  [
    '../esm/native/ui/react/tabs/settings_visual_sections.tsx',
    '../esm/native/ui/react/tabs/settings_visual_sections_display.tsx',
    '../esm/native/ui/react/tabs/settings_visual_sections_room.tsx',
    '../esm/native/ui/react/tabs/settings_visual_sections_lighting.tsx',
    '../esm/native/ui/react/tabs/settings_visual_sections_controls.tsx',
    '../esm/native/ui/react/tabs/settings_visual_sections_contracts.ts',
    '../esm/native/ui/react/tabs/settings_visual_sections_shared.ts',
  ],
  import.meta.url
);
const renderShared = bundleSources(
  [
    '../esm/native/ui/react/tabs/settings_visual_shared.ts',
    '../esm/native/ui/react/tabs/settings_visual_shared_contracts.ts',
    '../esm/native/ui/react/tabs/settings_visual_shared_normalize.ts',
    '../esm/native/ui/react/tabs/settings_visual_shared_lighting.ts',
    '../esm/native/ui/react/tabs/settings_visual_shared_room.ts',
    '../esm/native/ui/react/tabs/settings_visual_shared_room_defaults.ts',
    '../esm/native/ui/react/tabs/settings_visual_shared_interactions.ts',
  ],
  import.meta.url
);
const renderDisplayOwner = readSource(
  '../esm/native/ui/react/tabs/settings_visual_display_controller_runtime.ts',
  import.meta.url
);
const renderViewStateOwner = readSource(
  '../esm/native/ui/react/tabs/settings_visual_view_state_runtime.ts',
  import.meta.url
);
const renderRoomOwner = readSource(
  '../esm/native/ui/react/tabs/settings_visual_room_design_controller_runtime.ts',
  import.meta.url
);
const renderLightingOwner = readSource(
  '../esm/native/ui/react/tabs/settings_visual_lighting_controller_runtime.ts',
  import.meta.url
);
const renderBundle = bundleSources(
  [
    '../esm/native/ui/react/tabs/SettingsTab.tsx',
    '../esm/native/ui/react/tabs/use_settings_visual_controller.ts',
    '../esm/native/ui/react/tabs/use_settings_visual_controller_contracts.ts',
    '../esm/native/ui/react/tabs/use_settings_visual_controller_state.ts',
    '../esm/native/ui/react/tabs/use_settings_visual_controller_sections.ts',
    '../esm/native/ui/react/tabs/settings_visual_view_state_runtime.ts',
    '../esm/native/ui/react/tabs/settings_visual_display_controller_runtime.ts',
    '../esm/native/ui/react/tabs/use_settings_visual_room_design.ts',
    '../esm/native/ui/react/tabs/settings_visual_room_design_controller_runtime.ts',
    '../esm/native/ui/react/tabs/use_settings_visual_lighting.ts',
    '../esm/native/ui/react/tabs/settings_visual_lighting_controller_runtime.ts',
    '../esm/native/ui/react/tabs/settings_visual_sections.tsx',
    '../esm/native/ui/react/tabs/settings_visual_sections_display.tsx',
    '../esm/native/ui/react/tabs/settings_visual_sections_room.tsx',
    '../esm/native/ui/react/tabs/settings_visual_sections_lighting.tsx',
    '../esm/native/ui/react/tabs/settings_visual_sections_controls.tsx',
    '../esm/native/ui/react/tabs/settings_visual_sections_contracts.ts',
    '../esm/native/ui/react/tabs/settings_visual_sections_shared.ts',
    '../esm/native/ui/react/tabs/settings_visual_shared.ts',
    '../esm/native/ui/react/tabs/settings_visual_shared_contracts.ts',
    '../esm/native/ui/react/tabs/settings_visual_shared_normalize.ts',
    '../esm/native/ui/react/tabs/settings_visual_shared_lighting.ts',
    '../esm/native/ui/react/tabs/settings_visual_shared_room.ts',
    '../esm/native/ui/react/tabs/settings_visual_shared_room_defaults.ts',
    '../esm/native/ui/react/tabs/settings_visual_shared_interactions.ts',
  ],
  import.meta.url
);

const libraryPreset = read('esm/native/features/library_preset/library_preset.ts');
const libraryPresetFlow = normalizeWhitespace(
  [
    read('esm/native/features/library_preset/library_preset_flow.ts'),
    read('esm/native/features/library_preset/library_preset_flow_shared.ts'),
    read('esm/native/features/library_preset/library_preset_flow_toggle.ts'),
    read('esm/native/features/library_preset/library_preset_flow_invariants.ts'),
  ].join('\n')
);
const libraryPresetRuntime = read('esm/native/features/library_preset/library_preset_runtime.ts');
const libraryPresetShared = read('esm/native/features/library_preset/library_preset_shared.ts');
const libraryPresetTypes = read('esm/native/features/library_preset/library_preset_types.ts');
const libraryModuleDefaults = read('esm/native/features/library_preset/module_defaults.ts');
const storeActions = normalizeWhitespace(
  [
    read('esm/native/ui/react/actions/store_actions.ts'),
    ...storeConfigActionFiles.map(rel => read(rel.replace(/^\.\.\//, ''))),
    ...storeUiActionFiles.map(rel => read(rel.replace(/^\.\.\//, ''))),
  ].join('\n')
);
const structureTab = normalizeWhitespace(
  [
    read('esm/native/ui/react/tabs/StructureTab.view.tsx'),
    normalizeWhitespace(
      readFirstExisting(['../esm/native/ui/react/tabs/use_structure_tab_view_state.ts'], import.meta.url)
    ),
    normalizeWhitespace(
      readFirstExisting(['../esm/native/ui/react/tabs/use_structure_tab_workflows.tsx'], import.meta.url)
    ),
    normalizeWhitespace(
      readFirstExisting(
        ['../esm/native/ui/react/tabs/use_structure_tab_workflows_contracts.ts'],
        import.meta.url
      )
    ),
    normalizeWhitespace(
      readFirstExisting(
        ['../esm/native/ui/react/tabs/use_structure_tab_workflows_shared.ts'],
        import.meta.url
      )
    ),
    normalizeWhitespace(
      readFirstExisting(
        ['../esm/native/ui/react/tabs/use_structure_tab_workflows_controllers.tsx'],
        import.meta.url
      )
    ),
    normalizeWhitespace(
      readFirstExisting(
        ['../esm/native/ui/react/tabs/use_structure_tab_workflows_effects.ts'],
        import.meta.url
      )
    ),
    normalizeWhitespace(
      readFirstExisting(
        ['../esm/native/ui/react/tabs/use_structure_tab_workflows_render.tsx'],
        import.meta.url
      )
    ),
    normalizeWhitespace(
      readFirstExisting(
        ['../esm/native/ui/react/tabs/structure_tab_structural_controller_runtime.ts'],
        import.meta.url
      )
    ),
    normalizeWhitespace(
      readFirstExisting(
        ['../esm/native/ui/react/tabs/structure_tab_structural_controller_contracts.ts'],
        import.meta.url
      )
    ),
    normalizeWhitespace(
      readFirstExisting(
        ['../esm/native/ui/react/tabs/structure_tab_structural_controller_shared.ts'],
        import.meta.url
      )
    ),
    normalizeWhitespace(
      readFirstExisting(
        ['../esm/native/ui/react/tabs/structure_tab_structural_controller_sync.ts'],
        import.meta.url
      )
    ),
    normalizeWhitespace(
      readFirstExisting(
        ['../esm/native/ui/react/tabs/structure_tab_structural_controller_writes.ts'],
        import.meta.url
      )
    ),
    normalizeWhitespace(
      readFirstExisting(
        ['../esm/native/ui/react/tabs/structure_tab_workflows_controller_runtime.ts'],
        import.meta.url
      )
    ),
    normalizeWhitespace(
      readFirstExisting(
        ['../esm/native/ui/react/tabs/structure_tab_workflows_controller_contracts.ts'],
        import.meta.url
      )
    ),
    normalizeWhitespace(
      readFirstExisting(
        ['../esm/native/ui/react/tabs/structure_tab_workflows_controller_shared.ts'],
        import.meta.url
      )
    ),
    normalizeWhitespace(
      readFirstExisting(
        ['../esm/native/ui/react/tabs/structure_tab_workflows_controller_library.ts'],
        import.meta.url
      )
    ),
    normalizeWhitespace(
      readFirstExisting(
        ['../esm/native/ui/react/tabs/structure_tab_workflows_controller_cell_dims.ts'],
        import.meta.url
      )
    ),
    normalizeWhitespace(
      readFirstExisting(['../esm/native/ui/react/tabs/structure_tab_library_helpers.ts'], import.meta.url)
    ),
    normalizeWhitespace(
      readFirstExisting(['../esm/native/ui/react/tabs/structure_tab_controls.tsx'], import.meta.url)
    ),
    normalizeWhitespace(
      readFirstExisting(['../esm/native/ui/react/tabs/structure_tab_shared.ts'], import.meta.url)
    ),
    normalizeWhitespace(
      readFirstExisting(['../esm/native/ui/react/tabs/structure_tab_saved_models_panel.tsx'], import.meta.url)
    ),
    normalizeWhitespace(
      readFirstExisting(['../esm/native/ui/react/tabs/use_structure_tab_actions.ts'], import.meta.url)
    ),
    normalizeWhitespace(
      readFirstExisting(
        ['../esm/native/ui/react/tabs/structure_tab_actions_controller_runtime.ts'],
        import.meta.url
      )
    ),
    normalizeWhitespace(
      readFirstExisting(
        ['../esm/native/ui/react/tabs/structure_tab_actions_controller_shared.ts'],
        import.meta.url
      )
    ),
    normalizeWhitespace(
      readFirstExisting(
        ['../esm/native/ui/react/tabs/structure_tab_hinge_actions_controller.ts'],
        import.meta.url
      )
    ),
    normalizeWhitespace(
      readFirstExisting(
        ['../esm/native/ui/react/tabs/structure_tab_corner_chest_actions_controller.ts'],
        import.meta.url
      )
    ),
    normalizeWhitespace(
      readFirstExisting(
        ['../esm/native/ui/react/tabs/structure_tab_corner_chest_actions_controller_contracts.ts'],
        import.meta.url
      )
    ),
    normalizeWhitespace(
      readFirstExisting(
        ['../esm/native/ui/react/tabs/structure_tab_corner_chest_actions_controller_corner.ts'],
        import.meta.url
      )
    ),
    normalizeWhitespace(
      readFirstExisting(
        ['../esm/native/ui/react/tabs/structure_tab_corner_chest_actions_controller_chest.ts'],
        import.meta.url
      )
    ),
  ].join('\n')
);
const sidebarBundle = [
  read('esm/native/ui/react/sidebar_app.tsx'),
  read('esm/native/ui/react/sidebar_header.tsx'),
  read('esm/native/ui/react/sidebar_header_actions.ts'),
  read('esm/native/ui/react/use_sidebar_view_state.ts'),
  read('esm/native/ui/react/sidebar_shared.ts'),
].join('\n');

test('settings visual controls owner stays thin and delegates notes, room, lighting, and shared orchestration', () => {
  assertMatchesAll(
    assert,
    settingsTabOwner,
    [
      /use_settings_visual_controller\.js/,
      /<SettingsVisualDisplaySection/,
      /<SettingsVisualRoomSection/,
      /<SettingsVisualLightingSection/,
    ],
    'settingsTabOwner'
  );

  assertMatchesAll(
    assert,
    renderController,
    [
      /export function useSettingsVisualController\(/,
      /useSettingsVisualRoomDesign\(/,
      /useSettingsVisualLighting\(/,
      /createSettingsVisualDisplayController\(/,
      /useCfgSelectorShallow\(cfg => readSettingsVisualCfgState\(cfg\)\)/,
      /useUiSelectorShallow\(ui => readSettingsVisualUiState\(ui\)\)/,
      /useRuntimeSelectorShallow\(rt => readSettingsVisualRuntimeState\(rt\)\)/,
      /displayController\.syncGlobalClickState\(/,
    ],
    'renderController'
  );

  assertMatchesAll(
    assert,
    renderSectionsOwner,
    [
      /settings_visual_sections_display\.js/,
      /settings_visual_sections_room\.js/,
      /settings_visual_sections_lighting\.js/,
    ],
    'renderSectionsOwner'
  );

  assertMatchesAll(
    assert,
    renderSections,
    [
      /export function SettingsVisualDisplaySection/,
      /export function SettingsVisualRoomSection/,
      /export function SettingsVisualLightingSection/,
      /export function ActionTile/,
      /export function FloorStyleSwatch/,
      /export function LightSlider/,
      /export function handleSyntheticButtonKeyDown/,
      /export const LIGHT_PRESET_OPTIONS/,
      /export const FLOOR_TYPE_OPTIONS/,
    ],
    'renderSections'
  );

  assertMatchesAll(
    assert,
    renderShared,
    [
      /export const DEFAULT_FLOOR_STYLES/,
      /export const LIGHT_PRESETS/,
      /export function getRoomDesignData\(/,
      /export function getRoomDesignRuntime\(/,
      /export function syncGlobalClickMode\(/,
      /export function closeInteractiveStateOnGlobalOff\(/,
    ],
    'renderShared'
  );

  assertMatchesAll(
    assert,
    renderViewStateOwner,
    [
      /export function readSettingsVisualCfgState\(/,
      /export function readSettingsVisualUiState\(/,
      /export function readSettingsVisualRuntimeState\(/,
      /export function readSettingsVisualFloorStyleId\(/,
      /LIGHT_PRESETS\.default\.amb/,
    ],
    'renderViewStateOwner'
  );

  assertMatchesAll(
    assert,
    renderDisplayOwner,
    [
      /export function createSettingsVisualDisplayController\(/,
      /const onToggleShowDimensions =/,
      /const onToggleShowHanger =/,
      /const onToggleGlobalClick =/,
      /const onToggleDarkMode =/,
      /const syncGlobalClickState =/,
    ],
    'renderDisplayOwner'
  );

  assertMatchesAll(
    assert,
    renderRoomOwner,
    [
      /export function createSettingsVisualRoomDesignController\(/,
      /export function resolveSettingsVisualFloorStyle\(/,
    ],
    'renderRoomOwner'
  );

  assertMatchesAll(
    assert,
    renderLightingOwner,
    [
      /export function createSettingsVisualLightingController\(/,
      /export function buildSettingsVisualLightingPatch\(/,
    ],
    'renderLightingOwner'
  );

  assert.ok(
    renderBundle.includes('readSettingsVisualUiState'),
    'settings visual bundle should include view-state runtime owner'
  );
  assert.ok(
    renderBundle.includes('createSettingsVisualRoomDesignController'),
    'settings visual bundle should include room-design runtime owner'
  );
  assert.ok(
    renderBundle.includes('createSettingsVisualLightingController'),
    'settings visual bundle should include lighting runtime owner'
  );
});

test('library preset contracts stay typed and keep semantic write wrappers for structure/render hotspots', () => {
  assertMatchesAll(
    assert,
    libraryPreset,
    [
      /\.\/library_preset_flow\.js/,
      /import type \{ LibraryPresetController, LibraryPresetPreState \} from '\.\/library_preset_types\.js';/,
      /export type \{/,
      /LibraryPresetUiSnapshot/,
      /LibraryPresetConfigSnapshot/,
      /let preState: LibraryPresetPreState \| null = null;/,
      /let lastLibraryState: LibraryPresetPreState \| null = null;/,
      /lastLibraryState = captureLibraryPresetPreState\(env\);/,
      /preState = restoreLibraryPresetPreState\(env, args, helpers\.mergeUiOverride, preState\);/,
      /preState = applyLibraryPresetMode\(env, args, helpers\.mergeUiOverride, lastLibraryState\);/,
    ],
    'libraryPreset'
  );
  assertLacksAll(assert, libraryPreset, [/const c = cfg as AnyRecord;/], 'libraryPreset');

  assertMatchesAll(
    assert,
    libraryPresetFlow,
    [
      /function applyLibraryPresetUiRawState\(/,
      /export function captureLibraryPresetPreState\(/,
      /export function applyLibraryPresetMode\(/,
      /export function ensureLibraryPresetInvariants\(/,
      /runtime\.setCfgLibraryMode\(true, meta\);/,
      /const nextTopCfgs = buildNextLibraryModuleCfgList\(curTopCfgs, topCfgList\);/,
    ],
    'libraryPresetFlow'
  );

  assertMatchesAll(
    assert,
    libraryPresetTypes,
    [
      /export type LibraryPresetUiSnapshot = UnknownRecord & \{/,
      /export type LibraryPresetConfigSnapshot = UnknownRecord & \{/,
      /type LibraryPresetMetaSurface = \{[\s\S]*merge: \(meta\?: ActionMetaLike, defaults\?: ActionMetaLike, src\?: string\) => ActionMetaLike;/,
      /type LibraryPresetConfigSurface = \{[\s\S]*setModulesConfiguration: \(next: ModulesConfigurationLike \| null, meta\?: ActionMetaLike\) => unknown;/,
      /type LibraryPresetUiSurface = \{[\s\S]*setStackSplitLowerHeight: \(value: UiRawInputsLike\['stackSplitLowerHeight'\], meta\?: ActionMetaLike\) => unknown;/,
    ],
    'libraryPresetTypes'
  );

  assertMatchesAll(
    assert,
    libraryPresetRuntime,
    [
      /export function createLibraryPresetRuntime\(/,
      /metaNoBuild/,
      /metaNoHistory/,
      /runStructuralRecompute: \(uiOverride, src\) => env\.runStructuralRecompute\(uiOverride, src\)/,
    ],
    'libraryPresetRuntime'
  );

  assertMatchesAll(
    assert,
    libraryPresetShared,
    [
      /export function readLibraryPresetUiRawState\(/,
      /export function buildLibraryModuleConfigLists\(/,
      /export function normalizeLibraryStructureSelectForDoors\(/,
      /export function canPreserveLibraryModuleCfg\(/,
      /export function buildNextLibraryModuleCfgList\(/,
    ],
    'libraryPresetShared'
  );
  assertMatchesAll(
    assert,
    libraryModuleDefaults,
    [
      /export function buildLibraryModuleCfgs\(topDoorsSig: number\[\], bottomDoorsSig: number\[\]\): \{[\s\S]*topCfgList: ModulesConfigurationLike;/,
    ],
    'libraryModuleDefaults'
  );

  assertMatchesAll(
    assert,
    structureTab,
    [
      /import type \{[\s\S]*LibraryPresetEnv,[\s\S]*LibraryPresetUiOverride,[\s\S]*LibraryPresetUiSnapshot,[\s\S]*\} from '\.\.\/\.\.\/\.\.\/features\/library_preset\/library_preset\.js';/,
      /features\/library_preset\/library_preset\.js/,
      /function mergeUiOverride\(baseUi: LibraryPresetUiSnapshot, patch: LibraryPresetUiOverride\): LibraryPresetUiOverride \{/,
      /history: \{[\s\S]*batch: \(fn: \(\) => void, m\?: ActionMetaLike\) => runHistoryBatch\(app, fn, m\),[\s\S]*\}/,
      /MetaActionsNamespaceLike/,
      /const fn = metaNs\?\.merge;/,
      /const fn = metaNs\?\.noBuild;/,
      /const fn = metaNs\?\.noHistory;/,
      /(?:runStructuralModulesRecompute|runAppStructuralModulesRecompute)\(/,
      /setCfgLibraryMode\(app, !!on, m\)/,
      /setCfgMultiColorMode\(app, !!on, m\)/,
      /setUiStackSplitEnabled\(app, !!on, m\)/,
      /applyImmediateStructureUiPatch\(\s*args,\s*'react:structure:slidingTracksColor',\s*\{ slidingTracksColor: nextSlidingTracksColor \}/,
      /setUiSlidingTracksColor\(args\.app,\s*nextSlidingTracksColor,\s*meta\)/,
      /createStructureTabWorkflowController\(/,
      /createStructureTabWorkflowLibraryApi\(/,
      /buildStructureLibraryToggleArgs\(/,
      /computeStructureAutoWidth\(/,
      /setUiCornerMode\((?:args\.)?app,\s*!!nextOn,\s*actionMeta\)/,
      /setUiCornerDoors\((?:args\.)?app,\s*nextDoors,\s*actionMeta\)/,
    ],
    'structureTab'
  );
  assertLacksAll(assert, structureTab, [/setUiScalar\(app, 'slidingTracksColor'/], 'structureTab');

  assertMatchesAll(
    assert,
    storeActions,
    [
      /function setCfgShowDimensions\(/,
      /function setCfgLibraryMode\(/,
      /function setCfgMultiColorMode\(/,
      /function setCfgIndividualColors\(/,
      /function setCfgCurtainMap\(/,
      /function setCfgDoorSpecialMap\(/,
      /function setUiSite2TabsGateOpen\(/,
      /function setUiSlidingTracksColor\(/,
      /function setUiCornerMode\(/,
      /function setUiCornerDoors\(/,
      /function setUiStackSplitEnabled\(/,
      /function setUiStackSplitLowerHeight\(/,
      /function setUiStackSplitLowerDepthManual\(/,
    ],
    'storeActions'
  );
  assertMatchesAll(
    assert,
    sidebarBundle,
    [
      /cloudSyncUiController\.toggleSite2TabsGate\(!site2GateOpen,\s*meta\.uiOnlyImmediate\('react:site2:tabsGate'\)\)/,
    ],
    'sidebarBundle'
  );
  assertLacksAll(assert, sidebarBundle, [/setUiScalarSoft\(\s*app,\s*'site2TabsGateOpen'/m], 'sidebarBundle');
});
